import { describe, expect, it } from 'vitest';
import { redactSecrets } from '../../src/shared/redact';

describe('redactSecrets', () => {
  it('redacts well-known token formats', () => {
    const samples = [
      'AKIAIOSFODNN7EXAMPLE',
      `ghp_${'a'.repeat(36)}`,
      `github_pat_${'B1'.repeat(15)}`,
      `xoxb-${'1234567890'}-abcdefghij`,
      `AIza${'C'.repeat(35)}`,
      `sk_live_${'d'.repeat(24)}`,
      `sk-proj-${'e'.repeat(32)}`,
      `eyJhbGciOiJIUzI1NiJ9.${'f'.repeat(20)}.${'g'.repeat(20)}`,
    ];
    for (const secret of samples) {
      const { text, count } = redactSecrets(`key here: ${secret} end`);
      expect(text, secret).not.toContain(secret);
      expect(text).toContain('[REDACTED]');
      expect(count).toBe(1);
    }
  });

  it('redacts bearer tokens and private key blocks', () => {
    const bearer = redactSecrets(`Authorization: Bearer ${'h'.repeat(30)}`);
    expect(bearer.text).toBe('Authorization: Bearer [REDACTED]');
    const pem = redactSecrets(
      'a\n-----BEGIN RSA PRIVATE KEY-----\nMIIEow\nxyz\n-----END RSA PRIVATE KEY-----\nb',
    );
    expect(pem.text).toBe('a\n[REDACTED PRIVATE KEY]\nb');
  });

  it('keeps the label and hides the value of labelled secrets', () => {
    expect(redactSecrets('password: hunter2hunter2').text).toBe('password: [REDACTED]');
    expect(redactSecrets('api_key="abcd1234efgh"').text).toBe('api_key="[REDACTED]"');
    expect(redactSecrets('Client-Secret = s3cr3tvalue99').text).toBe('Client-Secret = [REDACTED]');
  });

  it('leaves ordinary text alone', () => {
    const plain =
      'Password reset link sent. Token: abc. Revenue 1,284.50 EUR on 2026-11-23. ' +
      'Order 77812345 shipped.';
    expect(redactSecrets(plain)).toEqual({ text: plain, count: 0 });
  });
});
