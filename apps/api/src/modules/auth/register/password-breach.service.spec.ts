import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PasswordBreachService } from './password-breach.service.js';

const password = 'synthetic test passphrase';
const digest = createHash('sha1').update(password).digest('hex').toUpperCase();
const prefix = digest.slice(0, 5);
const suffix = digest.slice(5);

describe('PasswordBreachService', () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    [`${suffix}:7\r\n`, true],
    [`${suffix}:0\r\n`, false],
    [`${'0'.repeat(35)}:12\r\n`, false],
  ])('checks the suffix locally and ignores padding (%#)', async (body, expected) => {
    const fetchRange = vi.fn<typeof fetch>().mockResolvedValue(new Response(body));
    vi.stubGlobal('fetch', fetchRange);

    await expect(new PasswordBreachService().isBlocked(password)).resolves.toBe(expected);
    expect(fetchRange).toHaveBeenCalledExactlyOnceWith(
      `https://api.pwnedpasswords.com/range/${prefix}`,
      expect.objectContaining({
        headers: { 'Add-Padding': 'true' },
        signal: expect.any(AbortSignal) as unknown,
      }),
    );
  });

  it.each([new Error('Network unavailable'), new DOMException('Timed out', 'TimeoutError')])(
    'uses the local blocklist when the range request fails (%s)',
    async (failure) => {
      const fetchRange = vi.fn<typeof fetch>().mockRejectedValue(failure);
      vi.stubGlobal('fetch', fetchRange);
      const service = new PasswordBreachService();

      await expect(service.isBlocked(password)).resolves.toBe(false);
      await expect(service.isBlocked('123456789012345')).resolves.toBe(true);
      expect(fetchRange).toHaveBeenCalledTimes(1);
    },
  );

  it('continues with the local check when HIBP sends a non-success response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 503 })),
    );

    await expect(new PasswordBreachService().isBlocked(password)).resolves.toBe(false);
  });
});
