import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TransactionList } from './TransactionList';
import { SearchBar } from './SearchBar';
import { Stats } from './Stats';
import { FilterControls } from './FilterControls';
import { TransactionDetailModal } from './TransactionDetailModal';
import { useUserContext } from '../contexts/UserContext';
import { useTransactionGenerator } from '../hooks/useTransactionGenerator';
import { useRiskAnalytics } from '../hooks/useRiskAnalytics';
import { useTransactionFilters } from '../hooks/useTransactionFilters';
import { useTransactionSelection } from '../hooks/useTransactionSelection';
import { FilterOptions } from '../types/transaction';

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

  const { transactions, summary, loading, scheduleNextBatch } =
    useTransactionGenerator({
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

  const { riskAnalytics, isAnalyzing } = useRiskAnalytics({
    transactions: filteredTransactions,
    minSize: MIN_ANALYTICS_SIZE,
    debounceMs: ANALYTICS_DEBOUNCE_MS,
  });

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
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading transactions...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>FinTech Dashboard</h1>
      </div>

      <div className="dashboard-controls">
        <SearchBar onSearch={handleSearch} />
        <FilterControls
          filters={filters}
          categories={getUniqueCategories()}
          onFilterChange={handleFilterChange}
        />
      </div>

      <Stats
        isAnalyzing={isAnalyzing}
        summary={summary}
        filteredTransactions={filteredTransactions}
        txnCount={transactions.length}
        highRiskTransactions={riskAnalytics?.highRiskTransactions}
      />

      <div className="dashboard-content">
        <TransactionList
          transactions={filteredTransactions}
          totalTransactions={transactions.length}
          onTransactionClick={handleTransactionClick}
        />
      </div>

      <TransactionDetailModal
        transaction={selectedTransaction}
        onClose={closeTransactionDetail}
      />
    </div>
  );
};
