import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';

const RANGE_URL = 'https://api.pwnedpasswords.com/range/';
const REQUEST_TIMEOUT_MS = 1500;
const RANGE_ROW = /^[A-F0-9]{35}:\d+$/i;

const OFFLINE_BLOCKLIST = new Set([
  '123456789012345',
  '1234567890123456',
  'password1234567',
  'password12345678',
  'qwerty123456789',
  'qwertyuiopasdfgh',
  'abcdefghijklmnopqrstuvwxyz',
  'correcthorsebatterystaple',
]);

@Injectable()
export class PasswordBreachService {
  async isBlocked(password: string): Promise<boolean> {
    if (OFFLINE_BLOCKLIST.has(password)) return true;

    const digest = createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase();
    const prefix = digest.slice(0, 5);
    const suffix = digest.slice(5);

    try {
      const response = await fetch(`${RANGE_URL}${prefix}`, {
        headers: { 'Add-Padding': 'true' },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        redirect: 'error',
      });
      if (!response.ok) return false;

      const rows = (await response.text()).trim().split(/\r?\n/);
      return rows.some(
        (row) =>
          RANGE_ROW.test(row) &&
          row.slice(0, 35).toUpperCase() === suffix &&
          Number(row.slice(36)) > 0,
      );
    } catch {
      return false;
    }
  }
}
