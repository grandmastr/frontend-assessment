import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  FilterOptions,
  Transaction,
  TransactionSummary,
} from '../types/transaction';
import { TransactionList } from './TransactionList';
import { SearchBar } from './SearchBar';
import { Stats } from './Stats.tsx';
import { useUserContext } from '../contexts/UserContext';
import {
  GeneratorRequest,
  GeneratorResponse,
} from '../workers/transactionGenerator.ts';
import wait from '../helpers/wait';

type AnalyticsSummary = {
  totalRisk: number;
  highRiskTransactions: number;
  patterns: Record<string, number>;
  anomalies: Record<string, number>;
  generatedAt: number;
};

type AnalyticsWorkerMessage = { type: 'result'; summary: AnalyticsSummary };

type AnalyticsWorkerRequest =
  | { type: 'analyze'; transactions: Transaction[]; chunkSize?: number }
  | { type: 'kill' }
  | { type: 'cancel' };

const MIN_ANALYTICS_SIZE = 500;
const ANALYTICS_DEBOUNCE_MS = 250;
const INITIAL_TOTAL = 10000;
const STREAM_BATCH_TOTAL = 200;

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

export const Dashboard: React.FC = () => {
  const { globalSettings, trackActivity } = useUserContext();

  const workerRef = useRef<Worker | null>(null);
  const analyticsWorkerRef = useRef<Worker | null>(null);
  const analyticsTimeoutRef = useRef<number | null>(null);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredIds, setFilteredIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({
    type: 'all',
    status: 'all',
    category: '',
    searchTerm: '',
  });
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
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

  const [riskAnalytics, setRiskAnalytics] = useState<AnalyticsSummary | null>(
    null
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const isAnalyzingRef = useRef(isAnalyzing);
  useEffect(() => {
    isAnalyzingRef.current = isAnalyzing;
  }, [isAnalyzing]);

  const actualRefreshRate = refreshInterval || 10000;

  if (import.meta.env.DEV) {
    console.log('Refresh rate configured:', actualRefreshRate);
  }

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

  const pendingBatchRef = useRef(false);
  const scheduleNextBatchRef = useRef<() => void>(() => {});

  useEffect(() => {
    let cancelled = false;
    let hasLoadedOnce = false;

    const worker = new Worker(
      new URL('../workers/transactionGenerator.ts', import.meta.url),
      {
        type: 'module',
      }
    );

    workerRef.current = worker;

    const queueGeneratorJob = (total: number) => {
      worker.postMessage({
        type: 'init',
        total,
        batchSize: STREAM_BATCH_TOTAL,
      } satisfies GeneratorRequest);
    };

    const scheduleNextBatch = async () => {
      if (cancelled) return;
      await wait(actualRefreshRate);
      if (!cancelled) {
        queueGeneratorJob(STREAM_BATCH_TOTAL);
      }
    };
    scheduleNextBatchRef.current = () => {
      void scheduleNextBatch();
    };

    const handleMessage = (event: MessageEvent<GeneratorResponse>) => {
      const payload = event.data;

      const nextTransactions = payload?.transactions ?? [];

      if (payload.type === 'seed') {
        setTransactions(prev =>
          hasLoadedOnce ? prev.concat(nextTransactions) : nextTransactions
        );

        if (!hasLoadedOnce) {
          setSummary(payload.summary);
          setLoading(false);
          hasLoadedOnce = true;
        }

        return;
      }

      if (nextTransactions.length > 0) {
        setTransactions(prev => prev.concat(nextTransactions));
      }

      if (!hasLoadedOnce) {
        setLoading(false);
        hasLoadedOnce = true;
      }

      if (payload?.done && nextTransactions.length === 0) {
        if (isAnalyzingRef.current) {
          pendingBatchRef.current = true;
        } else {
          void scheduleNextBatch();
        }
      }
    };

    worker.addEventListener('message', handleMessage);
    queueGeneratorJob(INITIAL_TOTAL);

    return () => {
      cancelled = true;
      worker.removeEventListener('message', handleMessage);
      worker.postMessage({ type: 'kill' } satisfies GeneratorRequest);
      worker.terminate();
      workerRef.current = null;
      scheduleNextBatchRef.current = () => {};
    };
  }, [actualRefreshRate]);

  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/analytics.ts', import.meta.url),
      {
        type: 'module',
      }
    );

    analyticsWorkerRef.current = worker;

    const handleMessage = (event: MessageEvent<AnalyticsWorkerMessage>) => {
      const payload = event.data;
      if (payload.type !== 'result') {
        return;
      }

      setRiskAnalytics(payload.summary);
      setIsAnalyzing(false);
      if (pendingBatchRef.current) {
        pendingBatchRef.current = false;
        scheduleNextBatchRef.current();
      }
    };

    worker.addEventListener('message', handleMessage);

    return () => {
      worker.removeEventListener('message', handleMessage);
      worker.postMessage({ type: 'kill' } satisfies AnalyticsWorkerRequest);
      worker.terminate();
      analyticsWorkerRef.current = null;
    };
  }, []);

  const applyFilters = useCallback(
    (source: Transaction[], currentFilters: FilterOptions, search: string) => {
      const lowerSearch = search.trim().toLowerCase();
      const nextIds: number[] = [];
      const limit = userPreferences.compactView
        ? userPreferences.itemsPerPage
        : Number.POSITIVE_INFINITY;

      for (let index = 0; index < source.length; index += 1) {
        const transaction = source[index];

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
      setUserPreferences(prev => ({
        ...prev,
        timestamps: { ...prev.timestamps, updated: Date.now() },
      }));
    },
    [userPreferences.compactView, userPreferences.itemsPerPage]
  );

  useEffect(() => {
    applyFilters(transactions, filters, searchTerm);
  }, [transactions, filters, searchTerm, applyFilters]);

  const filteredTransactions = useMemo(
    () =>
      filteredIds
        .map(id => transactions[id])
        .filter((txn): txn is Transaction => Boolean(txn)),
    [filteredIds, transactions]
  );

  useEffect(() => {
    if (!analyticsWorkerRef.current) {
      return;
    }

    if (analyticsTimeoutRef.current) {
      window.clearTimeout(analyticsTimeoutRef.current);
      analyticsTimeoutRef.current = null;
    }

    if (filteredTransactions.length < MIN_ANALYTICS_SIZE) {
      analyticsWorkerRef.current.postMessage({
        type: 'cancel',
      } satisfies AnalyticsWorkerRequest);
      setRiskAnalytics(null);
      setIsAnalyzing(false);
      return;
    }

    setIsAnalyzing(true);

    analyticsTimeoutRef.current = window.setTimeout(() => {
      analyticsWorkerRef.current?.postMessage({
        type: 'analyze',
        transactions: filteredTransactions,
      } satisfies AnalyticsWorkerRequest);
    }, ANALYTICS_DEBOUNCE_MS);

    return () => {
      if (analyticsTimeoutRef.current) {
        window.clearTimeout(analyticsTimeoutRef.current);
        analyticsTimeoutRef.current = null;
        analyticsWorkerRef.current?.postMessage({
          type: 'cancel',
        } satisfies AnalyticsWorkerRequest);
        setIsAnalyzing(false);
      }
    };
  }, [filteredTransactions]);

  useEffect(() => {
    return () => {
      if (analyticsTimeoutRef.current) {
        window.clearTimeout(analyticsTimeoutRef.current);
      }
    };
  }, []);

  const handleSearch = useCallback(
    (value: string) => {
      setSearchTerm(value);
      trackActivity(`search:${value}`);
      applyFilters(transactions, filters, value);
    },
    [applyFilters, filters, trackActivity, transactions]
  );

  const handleFilterChange = useCallback(
    (newFilters: FilterOptions) => {
      setFilters(newFilters);
      applyFilters(transactions, newFilters, searchTerm);
    },
    [applyFilters, searchTerm, transactions]
  );

  const handleTransactionClick = useCallback(
    (transaction: Transaction) => {
      setSelectedTransaction(transaction);

      const relatedTransactions = transactions.filter(
        t =>
          t.merchantName === transaction.merchantName ||
          t.category === transaction.category ||
          t.userId === transaction.userId
      );

      const analyticsData = {
        clickedTransaction: transaction,
        relatedCount: relatedTransactions.length,
        timestamp: new Date(),
        userAgent: navigator.userAgent,
        sessionData: {
          clickCount: Math.random() * 100,
          timeSpent: Date.now() - performance.now(),
          interactions: relatedTransactions.map(t => ({
            id: t.id,
            type: t.type,
          })),
        },
      };

      setUserPreferences(prev => ({
        ...prev,
        analytics: analyticsData,
        timestamps: { ...prev.timestamps, updated: Date.now() },
      }));
    },
    [transactions]
  );

  const getUniqueCategories = useCallback(() => {
    const categories = new Set<string>();
    transactions.forEach(t => categories.add(t.category));
    return Array.from(categories);
  }, [transactions]);

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
      <Stats
        isAnalyzing={isAnalyzing}
        summary={summary}
        filteredTransactions={filteredTransactions}
        txnCount={transactions.length}
        highRiskTransactions={riskAnalytics?.highRiskTransactions}
      />

      <div className="dashboard-controls">
        <SearchBar onSearch={handleSearch} />

        <div className="filter-controls">
          <select
            value={filters.type || 'all'}
            onChange={e =>
              handleFilterChange({
                ...filters,
                type: e.target.value as 'debit' | 'credit' | 'all',
              })
            }
          >
            <option value="all">All Types</option>
            <option value="debit">Debit</option>
            <option value="credit">Credit</option>
          </select>

          <select
            value={filters.status || 'all'}
            onChange={e =>
              handleFilterChange({
                ...filters,
                status: e.target.value as
                  | 'pending'
                  | 'completed'
                  | 'failed'
                  | 'all',
              })
            }
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>

          <select
            value={filters.category || ''}
            onChange={e =>
              handleFilterChange({ ...filters, category: e.target.value })
            }
          >
            <option value="">All Categories</option>
            {getUniqueCategories().map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="dashboard-content">
        <TransactionList
          transactions={filteredIds.map(id => transactions[id])}
          totalTransactions={transactions.length}
          onTransactionClick={handleTransactionClick}
        />
      </div>

      {selectedTransaction && (
        <div className="transaction-detail-modal">
          <div className="modal-content">
            <h3>Transaction Details</h3>
            <div className="transaction-details">
              <p>
                <strong>ID:</strong> {selectedTransaction.id}
              </p>
              <p>
                <strong>Merchant:</strong> {selectedTransaction.merchantName}
              </p>
              <p>
                <strong>Amount:</strong> ${selectedTransaction.amount}
              </p>
              <p>
                <strong>Category:</strong> {selectedTransaction.category}
              </p>
              <p>
                <strong>Status:</strong> {selectedTransaction.status}
              </p>
              <p>
                <strong>Date:</strong>{' '}
                {selectedTransaction.timestamp.toLocaleString()}
              </p>
            </div>
            <button onClick={() => setSelectedTransaction(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};
