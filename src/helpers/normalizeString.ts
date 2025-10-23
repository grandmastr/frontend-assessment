// maps accented and special characters to their ASCII equivalents for search normalization
// enables case-insensitive, accent-insensitive search by converting international characters
const ASCII_MAP: Record<string, string> = {
  'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a',
  'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
  'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
  'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o',
  'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u',
  'ñ': 'n', 'ç': 'c', 'ÿ': 'y',
  'æ': 'ae', 'œ': 'oe', 'ß': 'ss'
};

// regex pattern matching all characters defined in ASCII_MAP for efficient replacement
const REGEX = /[àáâãäåèéêëìíîïòóôõöùúûüñçÿæœß]/g;

/* normalizes a string for consistent search and comparison
* converts to lowercase, removes accents, strips special characters, and collapses whitespace
* returns empty string for null/undefined inputs to prevent errors
 */
export const normalizeString = (value: string): string => {
  if (!value) return '';

  // convert to lowercase and trim leading/trailing whitespace
  let val = value.toLowerCase().trim();

  // replace accented characters with ASCII equivalents using the map
  val = val.replace(REGEX, char => ASCII_MAP[char]);

  // remove all non-alphanumeric characters except spaces, then collapse multiple spaces
  val = val
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return val;
};
