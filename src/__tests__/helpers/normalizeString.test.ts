/*
* unit test for the normalizeString helper testing:
* - lowercase conversion and whitespace trimming
* - accent and diacritic removal
* - unsafe character stripping for security
**/

import { describe, expect, it } from 'vitest';
import { normalizeString } from '../../helpers/normalizeString';

describe('normalizeString', () => {
  // verifies that input is converted to lowercase and trimmed of leading/trailing whitespace
  it('lowercases and trims input', () => {
    expect(normalizeString('  HéLLo ')).toBe('hello');
  });

  // verifies that accented characters are replaced with their non-accented equivalents
  it('replaces accented characters', () => {
    expect(normalizeString('café ')).toBe('cafe');
  });

  // verifies that potentially unsafe characters like HTML tags are stripped out
  it('removes unsafe characters', () => {
    expect(normalizeString('<script>alert(1)</script>')).toBe('scriptalert1script');
  });
});
