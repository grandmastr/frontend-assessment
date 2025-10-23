/* calculates the relevance of search results relative to the search term using weighted scoring
 * returns a score from 0-100+ based on exact matches, prefixes, substrings, and character similarity
 * higher scores indicate better matches for search result ranking */
export const calculateSearchRelevanceScore = (item: string, term: string) => {
  let score = 0;

  // cache lowercase versions to avoid repeated conversions
  const lowerItem = item.toLowerCase();
  const lowerTerm = term.toLowerCase();

  // perfect match gets highest score (100)
  if (lowerItem === lowerTerm) {
    return 100;
  }

  // prefix match gets high score (50 points)
  if (lowerItem.startsWith(lowerTerm)) {
    score += 50;
  }

  // substring match gets medium score (25 points)
  if (lowerItem.includes(lowerTerm)) {
    score += 25;
  }

  // award points for consecutive matching characters from the beginning
  const minLength = Math.min(lowerItem.length, lowerTerm.length);
  for (let i = 0; i < minLength; i++) {
    if (lowerItem[i] === lowerTerm[i]) {
      score += 10;
    } else break;
  }

  return score;
};
