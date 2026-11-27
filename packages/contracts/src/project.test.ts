import { describe, expect, it } from 'vitest';
import {
  CreateProjectRequestSchema,
  PROJECT_DESCRIPTION_MAX_LENGTH,
  ProjectKey,
  ProjectKeyConflictResponseSchema,
} from './project.js';

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

describe('CreateProjectRequestSchema', () => {
  it('trims the name and defaults an omitted description to an empty string', () => {
    expect(CreateProjectRequestSchema.parse({ name: '  Сайт  ', key: 'WEB' })).toEqual({
      name: 'Сайт',
      key: 'WEB',
      description: '',
    });
  });

  it.each([
    { name: ' ' },
    { key: 'web' },
    { description: 'x'.repeat(PROJECT_DESCRIPTION_MAX_LENGTH + 1) },
    { description: 'text\u0000' },
  ])('rejects invalid project fields', (fields) => {
    expect(
      CreateProjectRequestSchema.safeParse({ name: 'Сайт', key: 'WEB', ...fields }).success,
    ).toBe(false);
  });
});

it('requires a key field issue for a project key conflict', () => {
  const error = { statusCode: 409, message: 'Key taken', error: 'Conflict' };
  expect(
    ProjectKeyConflictResponseSchema.safeParse({
      ...error,
      issues: [{ path: 'key', message: 'Taken' }],
    }).success,
  ).toBe(true);
  expect(
    ProjectKeyConflictResponseSchema.safeParse({
      ...error,
      issues: [{ path: 'name', message: 'Taken' }],
    }).success,
  ).toBe(false);
});
