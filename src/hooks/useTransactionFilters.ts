import { useCallback, useEffect, useMemo, useState } from 'react';
import { FilterOptions, Transaction } from '../types/transaction';

// determines if a transaction matches the search term across multiple fields
// performs case-insensitive search on description, merchant, category, ID, and amount
const transactionMatchesSearch = (transaction: Transaction, term: string) => {
  const lowerTerm = term.toLowerCase();
  return (
    transaction.description.toLowerCase().includes(lowerTerm) ||
    transaction.merchantName.toLowerCase().includes(lowerTerm) ||
    transaction.category.toLowerCase().includes(lowerTerm) ||
    transaction.id.toLowerCase().includes(lowerTerm) ||
    transaction.amount.toString().includes(lowerTerm)
  );
};

interface UseTransactionFiltersOptions {
  transactions: Transaction[];
  itemsPerPage: number;
  compactView: boolean;
}

interface UseTransactionFiltersReturn {
  filteredTransactions: Transaction[];
  filters: FilterOptions;
  searchTerm: string;
  setFilters: (filters: FilterOptions) => void;
  setSearchTerm: (term: string) => void;
  applyFilters: (filters: FilterOptions, search: string) => void;
  getUniqueCategories: () => string[];
}

/* handles all filtering, searching, and category extraction with efficient ID-based filtering
 * supports search term matching, type/status/category filters, and compact view with pagination */
export const useTransactionFilters = ({
  transactions,
  itemsPerPage,
  compactView,
}: UseTransactionFiltersOptions): UseTransactionFiltersReturn => {
  const [filteredIds, setFilteredIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({
    type: 'all',
    status: 'all',
    category: '',
    searchTerm: '',
  });

  /* applies all filters to the transaction list and returns array indices of matching items
   * uses ID-based filtering to avoid array duplication and supports pagination limits */
  const applyFilters = useCallback(
    (currentFilters: FilterOptions, search: string) => {
      const lowerSearch = search.trim().toLowerCase();
      const nextIds: number[] = [];
      const limit = compactView ? itemsPerPage : Number.POSITIVE_INFINITY;

      // iterate through transactions and apply all filter criteria
      for (let index = 0; index < transactions.length; index += 1) {
        const transaction = transactions[index];

        // skip transactions that don't match search term
        if (
          lowerSearch &&
          !transactionMatchesSearch(transaction, lowerSearch)
        ) {
          continue;
        }

        // apply type filter (debit/credit)
        if (
          currentFilters.type &&
          currentFilters.type !== 'all' &&
          transaction.type !== currentFilters.type
        ) {
          continue;
        }

        // apply status filter (pending/completed/failed)
        if (
          currentFilters.status &&
          currentFilters.status !== 'all' &&
          transaction.status !== currentFilters.status
        ) {
          continue;
        }

        // apply category filter
        if (
          currentFilters.category &&
          transaction.category !== currentFilters.category
        ) {
          continue;
        }

        // add matching transaction index to results
        nextIds.push(index);

        // stop if we've reached the pagination limit
        if (nextIds.length >= limit) {
          break;
        }
      }

      setFilteredIds(nextIds);
    },
    [transactions, compactView, itemsPerPage]
  );

  useEffect(() => {
    applyFilters(filters, searchTerm);
  }, [transactions, filters, searchTerm, applyFilters]);

  // converts filtered IDs back to transaction objects with null safety
  const filteredTransactions = useMemo(
    () =>
      filteredIds
      .map(id => transactions[id])
      .filter((txn): txn is Transaction => Boolean(txn)),
    [filteredIds, transactions]
  );

  // extracts unique categories from all transactions for filter dropdown
  const getUniqueCategories = useCallback(() => {
    const categories = new Set<string>();
    transactions.forEach(t => categories.add(t.category));
    return Array.from(categories);
  }, [transactions]);

  return {
    filteredTransactions,
    filters,
    searchTerm,
    setFilters,
    setSearchTerm,
    applyFilters,
    getUniqueCategories,
  };
};

