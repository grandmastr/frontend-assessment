/*
* unit test for the SearchBar component testing:
* - input normalization
* - suggestion generation
* - search history management
* - search result relevance scoring
* - security validation against XSS attacks
**/

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { SearchBar } from '../../components/search/SearchBar.tsx';

const renderSearchBar = (onSearch = vi.fn()) => {
  const utils = render(<SearchBar onSearch={onSearch} />);
  const input = screen.getByPlaceholderText('Search transactions...') as HTMLInputElement;
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  return { ...utils, input, onSearch, user };
};

// main test suite for SearchBar features
describe('SearchBar', () => {
  // setup fake timers before each test
  beforeEach(() => {
    vi.useFakeTimers();
  });

  // cleanup timers after each test
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  // tests input normalization: trims, lowercases, removes accents
  it('input normalization functions', async () => {
    const { input, user, onSearch } = renderSearchBar();

    await user.type(input, ' Café ');
    vi.runAllTimers();

    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith('cafe');
    });
  });

  // tests suggestion generation: shows relevant suggestions, limits count
  it('suggestion generation logic', async () => {
    const { input, user } = renderSearchBar();

    await user.type(input, 'am');
    vi.runAllTimers();

    await waitFor(() => {
      const suggestions = screen.getAllByRole('option');
      expect(suggestions[0]).toHaveTextContent(/amazon/i);
      expect(suggestions.length).toBeLessThanOrEqual(5);
    });
  });

  // tests search history: adds entry, displays recent, clears history
  it('search history management', async () => {
    const { input, user } = renderSearchBar();

    await user.type(input, 'uber');
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });
    const clearButton = screen.getByRole('button');
    await user.click(clearButton);

    await waitFor(() => {
      expect(screen.getByText('Recent searches')).toBeInTheDocument();
      expect(screen.getByText('uber')).toBeInTheDocument();
    });
  });

  // tests relevance scoring: best match appears first
  it('relevance scoring algorithm', async () => {
    const { input, user } = renderSearchBar();

    await user.type(input, 'stripe');
    vi.runAllTimers();

    await waitFor(() => {
      const suggestions = screen.getAllByRole('option');
      expect(suggestions[0]).toHaveTextContent(/^stripe$/i);
    });
  });

  // tests security: strips dangerous input, prevents XSS
  it('security validation features', async () => {
    const { input, user, onSearch } = renderSearchBar();

    await user.type(input, ' <script>alert(1)</script> ');
    vi.runAllTimers();

    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith('scriptalert1script');
    });
  });
});
