import { useCallback, useEffect, useMemo, useState } from 'react';
import { FilterOptions, Transaction } from '../types/transaction';

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

  const applyFilters = useCallback(
    (currentFilters: FilterOptions, search: string) => {
      const lowerSearch = search.trim().toLowerCase();
      const nextIds: number[] = [];
      const limit = compactView ? itemsPerPage : Number.POSITIVE_INFINITY;

      for (let index = 0; index < transactions.length; index += 1) {
        const transaction = transactions[index];

        if (
          lowerSearch &&
          !transactionMatchesSearch(transaction, lowerSearch)
        ) {
          continue;
        }

        if (
          currentFilters.type &&
          currentFilters.type !== 'all' &&
          transaction.type !== currentFilters.type
        ) {
          continue;
        }

        if (
          currentFilters.status &&
          currentFilters.status !== 'all' &&
          transaction.status !== currentFilters.status
        ) {
          continue;
        }

        if (
          currentFilters.category &&
          transaction.category !== currentFilters.category
        ) {
          continue;
        }

        nextIds.push(index);

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

  const filteredTransactions = useMemo(
    () =>
      filteredIds
        .map(id => transactions[id])
        .filter((txn): txn is Transaction => Boolean(txn)),
    [filteredIds, transactions]
  );

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

