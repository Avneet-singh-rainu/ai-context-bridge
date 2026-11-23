import { spawn } from 'node:child_process';
import type { OcrProvider } from './recognize';

const TIMEOUT_MS = 60_000;

/**
 * Windows PowerShell 5.1 script that runs Windows.Media.Ocr on the file named in ACB_OCR_IMAGE
 * and prints {"language": "...", "lines": [...]} as JSON. PowerShell 7 cannot load WinRT types,
 * so the app always starts powershell.exe (5.1), which ships with Windows 10 and 11.
 *
 * The whole script is one `& { ... }` block followed by a blank line: with `-Command -`,
 * PowerShell reads stdin like a console and runs a multi-line block only after a blank line.
 */
const SCRIPT = `& {
  [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false
  $ErrorActionPreference = 'Stop'
  try {
    Add-Type -AssemblyName System.Runtime.WindowsRuntime
    $null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
    $null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]
    $null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics, ContentType = WindowsRuntime]
    $asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
      $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and
      $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1'
    } | Select-Object -First 1
    function Await($operation, [Type]$type) {
      $task = $asTask.MakeGenericMethod($type).Invoke($null, @($operation))
      $null = $task.Wait(-1)
      $task.Result
    }
    $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
    if ($null -eq $engine) { throw 'No Windows OCR language is installed.' }
    $file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($env:ACB_OCR_IMAGE)) ([Windows.Storage.StorageFile])
    $stream = Await ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
    try {
      $decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
      $max = [Windows.Media.Ocr.OcrEngine]::MaxImageDimension
      if ($decoder.PixelWidth -gt $max -or $decoder.PixelHeight -gt $max) {
        throw "The image is larger than $max pixels on one side."
      }
      $bitmap = Await ($decoder.GetSoftwareBitmapAsync([Windows.Graphics.Imaging.BitmapPixelFormat]::Bgra8, [Windows.Graphics.Imaging.BitmapAlphaMode]::Premultiplied)) ([Windows.Graphics.Imaging.SoftwareBitmap])
      $result = Await ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
      $lines = @($result.Lines | ForEach-Object { $_.Text })
      [pscustomobject]@{ language = $engine.RecognizerLanguage.LanguageTag; lines = $lines } | ConvertTo-Json -Compress
    } finally {
      $stream.Dispose()
    }
  } catch {
    $inner = $_.Exception
    while ($null -ne $inner.InnerException) { $inner = $inner.InnerException }
    [Console]::Error.WriteLine($inner.Message)
    exit 1
  }
}

`;

interface WindowsOcrOutput {
  language?: string;
  lines?: unknown;
}

function firstLine(text: string): string {
  return text.replace(/^﻿/, '').trim().split(/\r?\n/)[0] ?? '';
}

function runPowerShell(imagePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-NoLogo', '-Command', '-'],
      { env: { ...process.env, ACB_OCR_IMAGE: imagePath }, windowsHide: true },
    );
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`Windows OCR did not finish within ${TIMEOUT_MS / 1000} seconds.`));
    }, TIMEOUT_MS);

    child.stdout.setEncoding('utf8').on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.setEncoding('utf8').on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(new Error(`PowerShell could not start: ${error.message}`));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout);
      else reject(new Error(firstLine(stderr) || `PowerShell exited with code ${code}.`));
    });

    child.stdin.end(SCRIPT, 'utf8');
  });
}

/** Windows.Media.Ocr through Windows PowerShell 5.1. Uses the user's installed OCR languages. */
export const windowsOcrProvider: OcrProvider = {
  id: 'windows',
  async recognize(imagePath) {
    if (process.platform !== 'win32') throw new Error('Windows OCR needs Windows.');
    const stdout = await runPowerShell(imagePath);
    let output: WindowsOcrOutput;
    try {
      output = JSON.parse(stdout.replace(/^﻿/, '').trim()) as WindowsOcrOutput;
    } catch {
      throw new Error('Windows OCR returned output that could not be read.');
    }
    const lines = Array.isArray(output.lines) ? output.lines.map(String) : [];
    return { text: lines.join('\n') };
  },
};
