// Secret redaction for captured text. docs/PRIVACY.md requires common secret patterns to be
// redacted before persistence and export. Pure function; no DOM and no Node APIs.

const REDACTED = '[REDACTED]';

/** Whole-match patterns: the full match is a secret. Order matters: specific formats first. */
const TOKEN_PATTERNS: readonly RegExp[] = [
  /\bAKIA[0-9A-Z]{16}\b/g, // AWS access key id
  /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g, // GitHub tokens
  /\bgithub_pat_[A-Za-z0-9_]{22,}\b/g, // GitHub fine-grained tokens
  /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g, // Slack tokens
  /\bAIza[0-9A-Za-z_-]{35}\b/g, // Google API keys
  /\b[sr]k_(?:live|test)_[0-9A-Za-z]{16,}\b/g, // Stripe secret and restricted keys
  /\bsk-[A-Za-z0-9_-]{20,}/g, // OpenAI-style keys, including sk-proj-
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, // JSON Web Tokens
];

const PRIVATE_KEY = /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g;
const BEARER = /\b(Bearer\s+)[A-Za-z0-9._~+/-]{20,}=*/g;
/** "label: value" or "label=value": keep the label, hide a value of 8 or more characters. */
const LABELLED =
  /\b(api[_-]?key|client[_-]?secret|access[_-]?token|auth[_-]?token|secret|token|password|passwd|pwd)(\s*[:=]\s*)(["']?)([^\s"'<>]{8,})\3/gi;

export function redactSecrets(input: string): { text: string; count: number } {
  let count = 0;
  let text = input.replace(PRIVATE_KEY, () => {
    count += 1;
    return '[REDACTED PRIVATE KEY]';
  });
  for (const pattern of TOKEN_PATTERNS) {
    text = text.replace(pattern, () => {
      count += 1;
      return REDACTED;
    });
  }
  text = text.replace(BEARER, (_match, prefix: string) => {
    count += 1;
    return `${prefix}${REDACTED}`;
  });
  text = text.replace(LABELLED, (match, label: string, separator: string, quote: string, value) => {
    if (value === REDACTED || String(value).startsWith('[REDACTED')) return match;
    count += 1;
    return `${label}${separator}${quote}${REDACTED}${quote}`;
  });
  return { text, count };
}

const EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

/** Email addresses are personal data, not secrets: the user decides whether to hide them. */
export function hideEmails(input: string): { text: string; count: number } {
  let count = 0;
  const text = input.replace(EMAIL, () => {
    count += 1;
    return '[email hidden]';
  });
  return { text, count };
}

export function countEmails(input: string): number {
  return input.match(EMAIL)?.length ?? 0;
}
