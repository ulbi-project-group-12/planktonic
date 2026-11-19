const TIMESTAMP_LIMIT = 2 ** 48;

/**
 * A UUIDv7 (RFC 9562): 48-bit Unix millisecond timestamp, version 7, variant `10`, the remaining
 * 74 bits random from the Web Crypto `getRandomValues`. The contracts require v7 for a message's
 * `clientMsgId` (UL-126), and its time-ordered prefix keeps keys roughly sorted by creation.
 * No dependency: the generator is a handful of byte writes.
 *
 * @param now milliseconds since the Unix epoch, a safe integer in [0, 2^48)
 */
export function uuidv7(now: number = Date.now()): string {
  if (!Number.isSafeInteger(now) || now < 0 || now >= TIMESTAMP_LIMIT) {
    throw new RangeError(`uuidv7: timestamp ${String(now)} is outside [0, 2^48)`);
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  // Big-endian 48-bit timestamp in bytes 0..5. Division, not 32-bit bitwise operators, which
  // would truncate everything above 2^32.
  let rest = now;
  for (let index = 5; index >= 0; index -= 1) {
    bytes[index] = rest % 256;
    rest = Math.floor(rest / 256);
  }
  bytes[6] = 0x70 | ((bytes[6] ?? 0) & 0x0f);
  bytes[8] = 0x80 | ((bytes[8] ?? 0) & 0x3f);
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
