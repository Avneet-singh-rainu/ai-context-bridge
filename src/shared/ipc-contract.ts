// IPC contract shared by the main process, the preload script and the renderer.
// The renderer imports types only; it never gets Electron or Node objects.

export const IPC_CHANNELS = {
  getAppInfo: 'app:get-info',
  recognizeText: 'ocr:recognize',
  saveContextPackage: 'context:save',
} as const;

export interface AppInfo {
  name: string;
  version: string;
  electron: string;
  chrome: string;
}

export type OcrEngineId = 'windows' | 'tesseract';

export const OCR_ENGINE_LABELS: Record<OcrEngineId, string> = {
  windows: 'Windows OCR',
  tesseract: 'Tesseract',
};

export interface OcrRequest {
  /** The original image file bytes. Main checks the size and file signature again. */
  bytes: Uint8Array;
}

export interface OcrResult {
  engine: OcrEngineId;
  /** Recognized text, one line per text line, trimmed. Empty when no text was found. */
  text: string;
  lineCount: number;
  durationMs: number;
  /** Mean word confidence from 0 to 100. Tesseract only; Windows OCR gives none. */
  confidence?: number;
  /** Why the earlier engine failed, when a fallback engine produced this result. */
  fallbackReason?: string;
}

export type OcrResponse = { ok: true; result: OcrResult } | { ok: false; error: string };

export interface SaveContextRequest {
  markdown: string;
  /** File name only; main sanitizes it and puts it in the Documents folder by default. */
  suggestedName: string;
}

export type SaveContextResponse =
  | { saved: true; filePath: string }
  | { saved: false; error?: string };

/** The API the preload script exposes to the renderer as `window.bridge`. */
export interface BridgeApi {
  getAppInfo(): Promise<AppInfo>;
  recognizeText(request: OcrRequest): Promise<OcrResponse>;
  saveContextPackage(request: SaveContextRequest): Promise<SaveContextResponse>;
}
