import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { Clock, Search, X } from 'lucide-react';
import { useImmer } from 'use-immer';
import { calculateSearchRelevanceScore } from '../../utils/calculateSearchRelevanceScore.ts';
import { normalizeString } from '../../helpers/normalizeString.ts';
import { getHighlightedText } from '../../utils/getHighlightedText.tsx';
import { debounce } from '../../helpers/debounce.ts';

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

const SEARCH_HISTORY_KEY = 'transaction-search-history';

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

  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // picks up search history from localstorage
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory);
        setSearch(draft => {
          draft.searchHistory = parsedHistory;
        });
      }
    } catch (error) {
      console.warn('Failed to load search history:', error);
    }
  }, [setSearch]);

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
          const newHistory = [term, ...draft.searchHistory.filter(h => h !== term)];
          // ensures only the last 20 items are kept
          draft.searchHistory = newHistory.slice(0, 20);
        });

        // save to localStorage
        try {
          const newHistory = [term, ...search.searchHistory.filter(h => h !== term)].slice(0, 20);
          localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
        } catch (error) {
          console.warn('Failed to save search history:', error);
        }
      }
    },
    [setSearch, search.searchHistory]
  );

  const debounceSearch = useMemo(
    () =>
      debounce((searchTerm: string) => {
        const processedTerm = normalizeString(searchTerm);
        onSearch(processedTerm);
        generateSuggestions(processedTerm);
        // after teh users searchs, add the searched term to history
        if (processedTerm.length > 2) {
          addTermToHistory(processedTerm);
        }
      }, 300),
    [generateSuggestions, onSearch, addTermToHistory]
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

  // fetches all availalle options
  const allOptions = useMemo(() => {
    const options: Array<{ item: string; type: 'suggestion' | 'history' }> = [];

    search.suggestions.forEach(suggestion => {
      options.push({ item: suggestion, type: 'suggestion' });
    });

    if (search.term.length === 0) {
      search.searchHistory.slice(0, 10).forEach(historyItem => {
        options.push({ item: historyItem, type: 'history' });
      });
    }

    return options;
  }, [search.suggestions, search.searchHistory, search.term]);

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      setSearch(draft => {
        draft.term = suggestion;
        draft.suggestions = [];
      });
      setShowDropdown(false);
      setFocusedIndex(-1);
      onSearch(suggestion);
      addTermToHistory(suggestion);
      inputRef.current?.focus();
    },
    [addTermToHistory, onSearch, setSearch]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const maxIndex = allOptions.length - 1;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setShowDropdown(true);
          setFocusedIndex(prev => (prev < maxIndex ? prev + 1 : 0));
          break;

        case 'ArrowUp':
          e.preventDefault();
          setShowDropdown(true);
          setFocusedIndex(prev => (prev > 0 ? prev - 1 : maxIndex));
          break;

        case 'Enter':
          if (focusedIndex >= 0 && allOptions[focusedIndex]) {
            e.preventDefault();
            const selectedOption = allOptions[focusedIndex];
            handleSuggestionClick(selectedOption.item);
          } else if (search.term.length > 2) {
            addTermToHistory(search.term);
          }
          break;

        case 'Escape':
          setShowDropdown(false);
          setFocusedIndex(-1);
          inputRef.current?.blur();
          break;

        default:
          if (e.key.length === 1) {
            setShowDropdown(true);
          }
      }
    },
    [
      allOptions,
      focusedIndex,
      search.term,
      handleSuggestionClick,
      addTermToHistory,
    ]
  );

  const handleClear = useCallback(() => {
    setSearch(draft => {
      draft.term = '';
      draft.suggestions = [];
    });
    onSearch('');
  }, [onSearch, setSearch]);

  const handleFocus = useCallback(() => {
    setShowDropdown(true);
  }, []);

  const handleBlur = useCallback((e: React.FocusEvent) => {
    setTimeout(() => {
      if (!dropdownRef.current?.contains(e.relatedTarget as Node)) {
        setShowDropdown(false);
        setFocusedIndex(-1);
      }
    }, 150);
  }, []);

  return (
    <div className="search-bar">
      <div className="search-input-container">
        <div className="search-icon">
          <Search size={20} />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={search.term}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="search-input"
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          aria-owns="search-dropdown"
          aria-autocomplete="list"
          aria-describedby="search-help"
          role="combobox"
        />
        {search.term && (
          <button onClick={handleClear} className="clear-button" type="button">
            <X size={16} />
          </button>
        )}
      </div>

      {showDropdown && allOptions.length > 0 && (
        <div
          ref={dropdownRef}
          id="search-dropdown"
          className="search-dropdown"
          role="listbox"
          aria-live="polite"
          aria-label={
            search.term.length > 0 ? 'Search suggestions' : 'Recent searches'
          }
        >
          {search.suggestions.length > 0 && (
            <div className="dropdown-section">
              <div
                className="section-header"
                role="group"
                aria-labelledby="suggestions-heading"
              >
                <span id="suggestions-heading" className="sr-only">
                  Suggestions
                </span>
                {search.suggestions.map((suggestion, index) => (
                  <div
                    key={`suggestion-${suggestion}`}
                    className={`suggestion-item ${index === focusedIndex ? 'focused' : ''}`}
                    onClick={() => handleSuggestionClick(suggestion)}
                    onMouseEnter={() => setFocusedIndex(index)}
                    role="option"
                    aria-selected={index === focusedIndex}
                    aria-label={`Search suggestion: ${suggestion}`}
                  >
                    <Search
                      size={14}
                      className="item-icon"
                      aria-hidden="true"
                    />
                    {getHighlightedText(suggestion, search.term)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {search.searchHistory.length > 0 && search.term.length === 0 && (
            <div className="dropdown-section">
              <div
                className="section-header"
                role="group"
                aria-labelledby="history-heading"
              >
                <span id="history-heading" className="section-title">
                  Recent searches
                </span>
                {search.searchHistory.slice(0, 10).map((item, index) => {
                  const optionIndex = search.suggestions.length + index;
                  return (
                    <div
                      key={`history-${index}`}
                      className={`history-item ${optionIndex === focusedIndex ? 'focused' : ''}`}
                      onClick={() => handleSuggestionClick(item)}
                      onMouseEnter={() => setFocusedIndex(optionIndex)}
                      role="option"
                      aria-selected={optionIndex === focusedIndex}
                      aria-label={`Recent search: ${item}`}
                    >
                      <Clock
                        size={14}
                        className="item-icon"
                        aria-hidden="true"
                      />
                      {item}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
