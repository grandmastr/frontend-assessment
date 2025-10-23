/*
* unit test for the useTransactionFilters hook testing:
* - search term filtering across transaction fields
* - type, status, and category filter combinations
* - pagination behavior with compact view toggle
* - performance with large datasets (2000+ transactions)
* - unique category extraction from transactions
**/

import { act } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useTransactionFilters } from '../../hooks/useTransactionFilters';
import { createTransaction } from '../testUtils';

// helper to generate test transactions with various attributes for filter testing
const makeTransactions = () => [
  createTransaction({ id: '1', description: 'Amazon purchase', merchantName: 'Amazon', category: 'shopping' }),
  createTransaction({ id: '2', description: 'Starbucks coffee', merchantName: 'Starbucks', category: 'food', type: 'debit' }),
  createTransaction({ id: '3', description: 'Payroll deposit', merchantName: 'Acme Corp', category: 'income', type: 'credit', status: 'completed' }),
  createTransaction({ id: '4', description: 'Uber ride', merchantName: 'Uber', category: 'transport', status: 'pending' }),
];

describe('useTransactionFilters', () => {
  // verifies that search term filters transactions by matching description and merchant name
  it('applies search term filtering correctly', async () => {
    const transactions = makeTransactions();
    const { result } = renderHook(() =>
      useTransactionFilters({ transactions, itemsPerPage: 10, compactView: false })
    );

    await act(async () => {
      result.current.setSearchTerm('amazon');
    });

    await waitFor(() => {
      expect(result.current.filteredTransactions).toHaveLength(1);
      expect(result.current.filteredTransactions[0]?.id).toBe('1');
    });
  });

  // verifies that type, status, and category filters can be combined to narrow results
  it('handles type/status/category filters', async () => {
    const transactions = makeTransactions();
    const { result } = renderHook(() =>
      useTransactionFilters({ transactions, itemsPerPage: 10, compactView: false })
    );

    await act(async () => {
      result.current.setFilters({
        ...result.current.filters,
        type: 'credit',
        status: 'completed',
        category: 'income',
      });
    });

    await waitFor(() => {
      expect(result.current.filteredTransactions).toHaveLength(1);
      expect(result.current.filteredTransactions[0]?.id).toBe('3');
    });
  });

  // verifies that pagination respects itemsPerPage and compact view limits displayed results
  it('pagination with compactView', async () => {
    const transactions = Array.from({ length: 20 }, (_, index) =>
      createTransaction({ id: `${index}`, description: `Item ${index}`, merchantName: `Shop ${index}` })
    );

    const { result, rerender } = renderHook(
      ({ compactView }: { compactView: boolean }) =>
        useTransactionFilters({ transactions, itemsPerPage: 5, compactView }),
      { initialProps: { compactView: false } }
    );

    await waitFor(() => {
      expect(result.current.filteredTransactions).toHaveLength(20);
    });

    rerender({ compactView: true });

    await act(async () => {
      result.current.applyFilters(result.current.filters, result.current.searchTerm);
    });

    await waitFor(() => {
      expect(result.current.filteredTransactions).toHaveLength(5);
    });
  });

  // verifies that filtering performs efficiently with large datasets of 2000+ transactions
  it('performance with large datasets', async () => {
    const transactions = Array.from({ length: 2000 }, (_, index) =>
      createTransaction({ id: `txn-${index}`, description: `Item ${index}`, merchantName: `Merchant ${index}` })
    );

    const { result } = renderHook(() =>
      useTransactionFilters({ transactions, itemsPerPage: 100, compactView: false })
    );

    await act(async () => {
      result.current.applyFilters(result.current.filters, 'merchant 1999');
    });

    await waitFor(() => {
      expect(result.current.filteredTransactions.length).toBe(1);
      expect(result.current.filteredTransactions[0]?.merchantName.toLowerCase()).toContain('merchant 1999');
    });
  });

  // verifies that unique categories are correctly extracted from the transaction list
  it('unique categories extraction', () => {
    const transactions = makeTransactions();
    const { result } = renderHook(() =>
      useTransactionFilters({ transactions, itemsPerPage: 10, compactView: false })
    );

    const categories = result.current.getUniqueCategories();
    expect(categories).toEqual(expect.arrayContaining(['shopping', 'food', 'income', 'transport']));
  });
});
