import React, { useCallback, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { useImmer } from 'use-immer';
import { calculateSearchRelevanceScore } from '../utils/calculateSearchRelevanceScore.ts';
import { normalizeString } from '../helpers/normalizeString.ts';
import { getHighlightedText } from '../utils/getHighlightedText.tsx';
import { debounce } from '../helpers/debounce.ts';

interface SearchBarProps {
  onSearch: (searchTerm: string) => void;
  placeholder?: string;
}

interface Search {
  term: string;
  isSearching: boolean;
  searchHistory: string[];
  suggestions: string[];
}

const commonTerms = [
  'amazon',
  'starbucks',
  'walmart',
  'target',
  'mcdonalds',
  'shell',
  'netflix',
  'spotify',
  'uber',
  'lyft',
  'apple',
  'google',
  'paypal',
  'venmo',
  'square',
  'stripe',
];

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  placeholder = 'Search transactions...',
}) => {
  const [search, setSearch] = useImmer<Search>({
    term: '',
    isSearching: false,
    searchHistory: [],
    suggestions: [],
  });

  const generateSuggestions = useCallback(
    (term: string) => {
      const lowerTerm = term.toLowerCase();

      const sortedFilter = commonTerms
        .filter(item => {
          return item.includes(lowerTerm) || lowerTerm.includes(item);
        })
        .sort((a, b) => {
          const aScore = calculateSearchRelevanceScore(a, term);
          const bScore = calculateSearchRelevanceScore(b, term);
          return bScore - aScore;
        });

      setSearch(draft => {
        draft.suggestions = sortedFilter.slice(0, 5);
      });
    },
    [setSearch]
  );

  const addTermToHistory = useCallback(
    (term: string) => {
      if (term.length > 2) {
        setSearch(draft => {
          draft.searchHistory = [...new Set([...draft.searchHistory, term])];
        });
      }
    },
    [setSearch]
  );

  const debounceSearch = useMemo(
    () =>
      debounce((searchTerm: string) => {
        const processedTerm = normalizeString(searchTerm);
        onSearch(processedTerm);
        generateSuggestions(processedTerm);
      }, 300),
    [generateSuggestions, onSearch]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;

      setSearch(draft => {
        draft.term = value;
      });

      if (value.length > 0) {
        debounceSearch(value);
      } else {
        onSearch('');
        setSearch(draft => {
          draft.suggestions = [];
        });
      }
    },
    [debounceSearch, onSearch, setSearch]
  );

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && search.term.length > 2) {
        addTermToHistory(search.term);
      }
    },
    [addTermToHistory, search.term]
  );

  const handleClear = useCallback(() => {
    setSearch(draft => {
      draft.term = '';
      draft.suggestions = [];
    });
    onSearch('');
  }, [onSearch, setSearch]);

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      setSearch(draft => {
        draft.term = suggestion;
        draft.suggestions = [];
      });
      onSearch(suggestion);
      addTermToHistory(suggestion);
    },
    [addTermToHistory, onSearch, setSearch]
  );

  return (
    <div className="search-bar">
      <div className="search-input-container">
        <div className="search-icon">
          <Search size={20} />
        </div>
        <input
          type="text"
          value={search.term}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="search-input"
          onKeyDown={handleKeyPress}
        />
        {search.term && (
          <button onClick={handleClear} className="clear-button" type="button">
            <X size={16} />
          </button>
        )}
        {search.isSearching && (
          <div className="search-loading">
            <div className="spinner"></div>
          </div>
        )}
      </div>

      {search.suggestions.length > 0 && (
        <div className="search-suggestions" role="listbox" aria-live="polite">
          {search.suggestions.map(suggestion => (
            <div
              key={suggestion}
              className="suggestion-item"
              onClick={() => handleSuggestionClick(suggestion)}
              role="option"
              aria-selected={false}
              tabIndex={0}
              aria-describedby={`${suggestion}-description`}
            >
              {getHighlightedText(suggestion, search.term)}
            </div>
          ))}
        </div>
      )}

      {search.searchHistory.length > 0 && search.term.length === 0 && (
        <div className="search-history">
          <div className="history-header">Recent searches</div>
          {search.searchHistory.slice(-10).map((item, index) => (
            <div
              key={index}
              className="history-item"
              onClick={() => handleSuggestionClick(item)}
            >
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
