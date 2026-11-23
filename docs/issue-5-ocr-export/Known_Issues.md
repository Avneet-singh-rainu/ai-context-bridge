# Known Issues - issue-5

## 1. The installer carries WebAssembly builds the app never loads

**Status:** Accepted gap - pending sign-off

**Found:** 2026-11-23

**What happens:** the installer is about 138 MB. `tesseract.js-core` adds about 44 MB unpacked:
six WebAssembly builds, of which the app loads one LSTM build (OEM `LSTM_ONLY`); the three
non-LSTM builds are never used.

**Why it was not fixed here:** leaving them out needs `files` exclusions in
`electron-builder.yml` and another packaged OCR test; it does not change behaviour.

**Blast radius:** download size only.

## 2. Each Windows OCR call starts powershell.exe

**Status:** Accepted by design

**Found:** 2026-11-23

**What happens:** every screenshot costs about 1 second of PowerShell start-up before OCR starts.
Five screenshots took about 6 seconds in total.

**Why it was not fixed here:** a long-running PowerShell process or a native addon would remove
the start-up cost but adds process management or a native build. See D1 in
[AI_Decisions.md](AI_Decisions.md).

**Blast radius:** OCR speed for larger batches.

## 3. The Tesseract fallback reads English only

**Status:** Accepted gap

**Found:** 2026-11-23

**What happens:** Windows OCR uses the user's installed languages, but when it fails, Tesseract
reads with the English model only.

**Why it was not fixed here:** each extra Tesseract language adds several MB to the installer;
the MVP targets English.

**Blast radius:** non-English screenshots that Windows OCR cannot read.

## 4. Locked-down PCs fall back to Tesseract for every screenshot

**Status:** Accepted by design - not tested

**Found:** 2026-11-23

**What happens:** where PowerShell runs in Constrained Language Mode (AppLocker or WDAC), loading
WinRT types fails, so every screenshot goes to Tesseract.

**Why it was not fixed here:** the fallback covers it; no locked-down PC was available to test.

**Blast radius:** users on managed PCs with PowerShell restrictions.
