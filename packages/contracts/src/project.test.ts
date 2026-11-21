import { describe, expect, it } from 'vitest';
import { ProjectKey } from './project.js';

describe('ProjectKey', () => {
  it.each(['WEB', 'AB', 'MOBILE2', 'A1B2C3D4E5'])('accepts %s', (key) => {
    expect(ProjectKey.safeParse(key).success).toBe(true);
  });

  it.each([
    ['lowercase', 'web'],
    ['create lowercase', 'create'],
    ['single letter', 'W'],
    ['starts with digit', '1WEB'],
    ['eleven characters', 'ABCDEFGHIJK'],
    ['hyphen', 'WE-B'],
    ['empty', ''],
  ])('rejects %s', (_, key) => {
    expect(ProjectKey.safeParse(key).success).toBe(false);
  });
});
