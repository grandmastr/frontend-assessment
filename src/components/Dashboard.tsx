import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { DashboardLayout } from './layout/DashboardLayout';
import { DashboardHeader } from './layout/DashboardHeader';
import { FilterBar } from './filters/FilterBar';
import { TransactionTable } from './transactions/TransactionTable';
import { TransactionDetailSheet } from './transactions/TransactionDetailSheet';
import { Stats } from './stats/Stats.tsx';
import { useUserContext } from '../contexts/UserContext';
import { useTransactionGenerator } from '../hooks/useTransactionGenerator';
import { useRiskAnalytics } from '../hooks/useRiskAnalytics';
import { useTransactionFilters } from '../hooks/useTransactionFilters';
import { useTransactionSelection } from '../hooks/useTransactionSelection';
import {
  FilterOptions,
  Transaction,
  TransactionSummary,
} from '../types/transaction';

const MIN_ANALYTICS_SIZE = 500;
const ANALYTICS_DEBOUNCE_MS = 250;
const INITIAL_TOTAL = 10000;
const STREAM_BATCH_TOTAL = 200;

export const Dashboard: React.FC = () => {
  const { globalSettings } = useUserContext();

  const [refreshInterval, setRefreshInterval] = useState<number>(10000);
  const [userPreferences, setUserPreferences] = useState({
    theme: globalSettings.theme,
    currency: globalSettings.currency,
    itemsPerPage: 50,
    sortOrder: 'desc',
    enableNotifications: true,
    autoRefresh: true,
    showAdvancedFilters: false,
    compactView: false,
    timestamps: { created: Date.now(), updated: Date.now() },
  });

  // tracks whether a batch generation is pending, waiting for analytics to complete
  const pendingBatchRef = useRef(false);
  // reference to the scheduleNextBatch function from transaction generator hook
  const scheduleNextBatchRef = useRef<(() => void) | null>(null);
  // tracks current analyzing state to coordinate with transaction generation
  const isAnalyzingRef = useRef(false);

  const actualRefreshRate = refreshInterval || 10000;

  // exposes refresh controls to window for debugging and testing purposes
  const refreshControls = {
    currentRate: refreshInterval,
    updateRate: setRefreshInterval,
    isActive: actualRefreshRate > 0,
  };

  if (typeof window !== 'undefined') {
    (
      window as { dashboardControls?: typeof refreshControls }
    ).dashboardControls = refreshControls;
  }

  /**
   * handles the idle state from transaction generator
   * if analytics are running, marks batch as pending instead of immediately scheduling
   * ensures analytics complete before generating more transactions to avoid overwhelming the system
   */
  const handleGeneratorIdle = useCallback(() => {
    if (isAnalyzingRef.current) {
      pendingBatchRef.current = true;
      return;
    }

    scheduleNextBatchRef.current?.();
  }, []);

  /**
   * initializes transaction generator with streaming configuration
   * generates initial seed and continuously streams new batches at refresh interval
   */
  const { transactions, loading, scheduleNextBatch } = useTransactionGenerator({
    initialTotal: INITIAL_TOTAL,
    streamBatchTotal: STREAM_BATCH_TOTAL,
    refreshInterval: actualRefreshRate,
    onIdle: handleGeneratorIdle,
  });

  scheduleNextBatchRef.current = scheduleNextBatch;

  /**
   * manages transaction filtering and search functionality
   * provides filtered results, current filters, and methods to update them
   */
  const {
    filteredTransactions,
    filters,
    searchTerm,
    setFilters,
    setSearchTerm,
    applyFilters,
    getUniqueCategories,
  } = useTransactionFilters({
    transactions,
    itemsPerPage: userPreferences.itemsPerPage,
    compactView: userPreferences.compactView,
  });

  /**
   * performs risk analytics on filtered transactions in a web worker
   * only runs when transaction count exceeds MIN_ANALYTICS_SIZE threshold
   * debounces re-analysis to avoid excessive computation during rapid updates
   */
  const { isAnalyzing, riskAnalytics } = useRiskAnalytics({
    transactions: filteredTransactions,
    minSize: MIN_ANALYTICS_SIZE,
    debounceMs: ANALYTICS_DEBOUNCE_MS,
  });

  /**
   * calculates summary statistics for a set of transactions
   * computes totals for amount, credits, debits, transaction count, average, and category distribution
   */
  const calculateSummary = useCallback(
    (txns: Transaction[]): TransactionSummary => {
      const categoryCounts: Record<string, number> = {};
      const result = txns.reduce(
        (acc, txn) => {
          const amount = txn.amount;
          acc.totalAmount += Math.abs(amount);
          acc.totalTransactions += 1;
          if (amount > 0) {
            acc.totalCredits += amount;
          } else {
            acc.totalDebits += Math.abs(amount);
          }
          categoryCounts[txn.category] =
            (categoryCounts[txn.category] || 0) + 1;
          return acc;
        },
        {
          totalAmount: 0,
          totalCredits: 0,
          totalDebits: 0,
          totalTransactions: 0,
        }
      );
      return {
        ...result,
        avgTransactionAmount:
          result.totalTransactions > 0
            ? result.totalAmount / result.totalTransactions
            : 0,
        categoryCounts,
      };
    },
    []
  );

  // syncs analyzing state to ref for use in callbacks
  isAnalyzingRef.current = isAnalyzing;

  /**
   * watches for analytics completion and triggers pending batch if one was deferred
   * ensures transaction generation resumes after analytics finish
   */
  useEffect(() => {
    if (!isAnalyzing && pendingBatchRef.current) {
      pendingBatchRef.current = false;
      scheduleNextBatchRef.current?.();
    }
  }, [isAnalyzing]);

  // updates user preferences while maintaining timestamps for tracking changes
  const handlePreferencesUpdate = useCallback(
    (updates: Partial<typeof userPreferences>) => {
      setUserPreferences(prev => ({
        ...prev,
        ...updates,
        timestamps: { ...prev.timestamps, updated: Date.now() },
      }));
    },
    []
  );

  /**
   * manages transaction selection for detail sheet modal
   * provides selected transaction, click handler, and close handler
   */
  const {
    selectedTransaction,
    handleTransactionClick,
    closeTransactionDetail,
  } = useTransactionSelection({
    transactions,
    onPreferencesUpdate: handlePreferencesUpdate,
  });

  // handles search input changes from header component
  // updates search term and re-applies filters with new search value
  const handleSearch = useCallback(
    (value: string) => {
      setSearchTerm(value);
      applyFilters(filters, value);
    },
    [applyFilters, filters, setSearchTerm]
  );

  // handles filter changes from filter bar component
  // updates filters and re-applies them with current search term
  const handleFilterChange = useCallback(
    (newFilters: FilterOptions) => {
      setFilters(newFilters);
      applyFilters(newFilters, searchTerm);
    },
    [applyFilters, searchTerm, setFilters]
  );

  // shows loading spinner while initial transaction seed is generating
  if (loading) {
    return (
      <div className="loading-container">
        <LoadingSpinner size="lg" />
        <p className="loading-text">Loading transactions...</p>
      </div>
    );
  }

  const headerComponent = (
    <DashboardHeader onSearch={handleSearch} searchValue={searchTerm} />
  );

  const filtersComponent = (
    <FilterBar
      filters={filters}
      onFiltersChange={handleFilterChange}
      categories={getUniqueCategories()}
      totalCount={transactions.length}
      filteredCount={filteredTransactions.length}
    />
  );

  const summary = calculateSummary(transactions);

  const mainComponent = (
    <>
      <Stats
        summary={summary}
        filteredTransactions={filteredTransactions}
        txnCount={transactions.length}
        isAnalyzing={isAnalyzing}
        riskAnalytics={riskAnalytics}
      />
      <TransactionTable
        transactions={filteredTransactions}
        onTransactionClick={handleTransactionClick}
      />
    </>
  );

  return (
    <>
      <DashboardLayout
        header={headerComponent}
        filters={filtersComponent}
        main={mainComponent}
      />
      <TransactionDetailSheet
        transaction={selectedTransaction}
        isOpen={!!selectedTransaction}
        onClose={closeTransactionDetail}
      />
    </>
  );
};
