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

  const pendingBatchRef = useRef(false);
  const scheduleNextBatchRef = useRef<(() => void) | null>(null);
  const isAnalyzingRef = useRef(false);

  const actualRefreshRate = refreshInterval || 10000;

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

  const handleGeneratorIdle = useCallback(() => {
    if (isAnalyzingRef.current) {
      pendingBatchRef.current = true;
      return;
    }

    scheduleNextBatchRef.current?.();
  }, []);

  const { transactions, loading, scheduleNextBatch } = useTransactionGenerator({
    initialTotal: INITIAL_TOTAL,
    streamBatchTotal: STREAM_BATCH_TOTAL,
    refreshInterval: actualRefreshRate,
    onIdle: handleGeneratorIdle,
  });

  scheduleNextBatchRef.current = scheduleNextBatch;

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

  const { isAnalyzing, riskAnalytics } = useRiskAnalytics({
    transactions: filteredTransactions,
    minSize: MIN_ANALYTICS_SIZE,
    debounceMs: ANALYTICS_DEBOUNCE_MS,
  });

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

  isAnalyzingRef.current = isAnalyzing;

  useEffect(() => {
    if (!isAnalyzing && pendingBatchRef.current) {
      pendingBatchRef.current = false;
      scheduleNextBatchRef.current?.();
    }
  }, [isAnalyzing]);

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

  const {
    selectedTransaction,
    handleTransactionClick,
    closeTransactionDetail,
  } = useTransactionSelection({
    transactions,
    onPreferencesUpdate: handlePreferencesUpdate,
  });

  const handleSearch = useCallback(
    (value: string) => {
      setSearchTerm(value);
      applyFilters(filters, value);
    },
    [applyFilters, filters, setSearchTerm]
  );

  const handleFilterChange = useCallback(
    (newFilters: FilterOptions) => {
      setFilters(newFilters);
      applyFilters(newFilters, searchTerm);
    },
    [applyFilters, searchTerm, setFilters]
  );

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
