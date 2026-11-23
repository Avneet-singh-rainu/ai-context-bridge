// No Electron imports, so Vitest can test this in Node.

/**
 * Keeps only the tokens a normal Chrome user agent has. Electron adds `Electron/x` and an app
 * token (for example `AIContextBridge/0.1.0`); some sites block or degrade unknown browsers.
 */
export function plainChromeUserAgent(userAgent: string): string {
  return userAgent.replace(
    /\s(?!(?:Mozilla|AppleWebKit|Chrome|Safari)\/)[A-Za-z][\w.-]*\/\S+/g,
    '',
  );
}
