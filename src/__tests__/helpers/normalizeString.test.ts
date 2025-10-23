import { describe, expect, it } from 'vitest';
import { normalizeString } from '../../helpers/normalizeString';

describe('normalizeString', () => {
  it('lowercases and trims input', () => {
    expect(normalizeString('  HéLLo ')).toBe('hello');
  });

  it('replaces accented characters', () => {
    expect(normalizeString('café ')).toBe('cafe');
  });

  it('removes unsafe characters', () => {
    expect(normalizeString('<script>alert(1)</script>')).toBe('scriptalert1script');
  });
});
