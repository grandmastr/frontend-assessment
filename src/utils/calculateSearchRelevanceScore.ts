/*
 * Calculates the relevance of the search results relative to the search term
 */
export const calculateSearchRelevanceScore = (item: string, term: string) => {
  let score = 0;

  // This avoids calling .toLowerCase() multiple times
  const lowerItem = item.toLowerCase();
  const lowerTerm = term.toLowerCase();

  // Checks for an exact match
  if (lowerItem === lowerTerm) {
    return 100;
  }

  // Checks for a prefix match
  if (lowerItem.startsWith(lowerTerm)) {
    score += 50;
  }

  // Checks for a substring match
  if (lowerItem.includes(lowerTerm)) {
    score += 25;
  }

  const minLength = Math.min(lowerItem.length, lowerTerm.length);
  for (let i = 0; i < minLength; i++) {
    if (lowerItem[i] === lowerTerm[i]) {
      score += 10;
    } else break;
  }

  return score;
};
