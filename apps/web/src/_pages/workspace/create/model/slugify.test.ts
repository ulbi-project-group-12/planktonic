import { describe, expect, it } from 'vitest';
import { slugify } from './slugify';

describe('slugify', () => {
  it('transliterates Cyrillic and joins words with hyphens', () => {
    expect(slugify('Команда маркетинга')).toBe('komanda-marketinga');
  });

  it('keeps latin letters and digits, collapses separators', () => {
    expect(slugify('My  Team!! 2026')).toBe('my-team-2026');
  });

  it('strips hyphens from the edges', () => {
    expect(slugify(' — тест — ')).toBe('test');
  });

  it('handles ё and soft signs', () => {
    expect(slugify('Ёлка друзья')).toBe('yolka-druzya');
  });

  it('caps the result at 40 chars without a trailing hyphen', () => {
    const slug = slugify('team '.repeat(20));
    expect(slug.length).toBeLessThanOrEqual(40);
    expect(slug).not.toMatch(/-$/);
  });

  it('returns an empty string when nothing is slug-able', () => {
    expect(slugify('!!!')).toBe('');
  });
});
