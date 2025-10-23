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

describe('SearchBar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('input normalization functions', async () => {
    const { input, user, onSearch } = renderSearchBar();

    await user.type(input, ' Café ');
    vi.runAllTimers();

    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith('cafe');
    });
  });

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

  it('relevance scoring algorithm', async () => {
    const { input, user } = renderSearchBar();

    await user.type(input, 'stripe');
    vi.runAllTimers();

    await waitFor(() => {
      const suggestions = screen.getAllByRole('option');
      expect(suggestions[0]).toHaveTextContent(/^stripe$/i);
    });
  });

  it('security validation features', async () => {
    const { input, user, onSearch } = renderSearchBar();

    await user.type(input, ' <script>alert(1)</script> ');
    vi.runAllTimers();

    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith('scriptalert1script');
    });
  });
});
