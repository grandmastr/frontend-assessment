// This is a map of common ASCII characters against their normalized versions
const ASCII_MAP: Record<string, string> = {
  à: 'a',
  á: 'a',
  â: 'a',
  ã: 'a',
  ä: 'a',
  å: 'a',
  è: 'e',
  é: 'e',
  ê: 'e',
  ë: 'e',
  ì: 'i',
  í: 'i',
  î: 'i',
  ï: 'i',
  ò: 'o',
  ó: 'o',
  ô: 'o',
  õ: 'o',
  ö: 'o',
  ù: 'u',
  ú: 'u',
  û: 'u',
  ü: 'u',
  ñ: 'n',
  ç: 'c',
  ÿ: 'y',
  æ: 'ae',
  œ: 'oe',
  ß: 'ss',
};

const REGEX = /[àáâãäåèéêëìíîïòóôõöùúûüñçÿæœß]/g;

/*
 * Takes in a string with NON_ASCII/international and returns a normalized
 * version of such string, while avoiding looping over each character in the
 * value manually
 */
export const normalizeString = (value: string): string => {
  if (!value) return '';

  let val = value.toLowerCase().trim();
  val = val.replace(REGEX, char => ASCII_MAP[char]);
  val = val
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return val;
};
