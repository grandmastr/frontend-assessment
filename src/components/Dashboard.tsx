import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FilterOptions,
  Transaction,
  TransactionSummary,
} from '../types/transaction';
import {
  calculateSummary,
  filterTransactions,
  searchTransactions,
} from '../utils/dataGenerator';
import { TransactionList } from './TransactionList';
import { SearchBar } from './SearchBar';
import { useUserContext } from '../contexts/UserContext';
import { Clock, DollarSign, TrendingDown, TrendingUp } from 'lucide-react';
import {
  GeneratorRequest,
  GeneratorResponse,
} from '../workers/transactionGenerator.ts';

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

const mergeSummaries = (
  current: TransactionSummary | null,
  delta: TransactionSummary
): TransactionSummary => {
  if (!current) {
    return delta;
  }

  return {
    totalTransactions: current.totalTransactions + delta.totalTransactions,
    totalAmount: current.totalAmount + delta.totalAmount,
    totalCredits: current.totalCredits + delta.totalCredits,
    totalDebits: current.totalDebits + delta.totalDebits,
    avgTransactionAmount:
      (current.totalAmount + delta.totalAmount) /
      (current.totalTransactions + delta.totalTransactions || 1),
    categoryCounts: Object.entries(delta.categoryCounts).reduce(
      (acc, [category, count]) => {
        acc[category] = (current.categoryCounts[category] ?? 0) + count;
        return acc;
      },
      { ...current.categoryCounts }
    ),
  };
};

export const Dashboard: React.FC = () => {
  const { globalSettings, trackActivity } = useUserContext();

  const workerRef = useRef<Worker | null>(null);
  const analyticsWorkerRef = useRef<Worker | null>(null);
  const analyticsTimeoutRef = useRef<number | null>(null);

  const transactionsRef = useRef<Transaction[]>([]);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<
    Transaction[]
  >([]);
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

  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/transactionGenerator.ts', import.meta.url),
      {
        type: 'module',
      }
    );

    workerRef.current = worker;

    const handleMessage = (event: MessageEvent<GeneratorResponse>) => {
      const payload = event.data;

      if (payload.type === 'seed') {
        transactionsRef.current = payload.transactions;
        setTransactions(payload.transactions);
        setSummary(payload.summary);
        setLoading(false);
        return;
      }

      transactionsRef.current = [
        ...transactionsRef.current,
        ...payload.transactions,
      ];

      setTransactions([...transactionsRef.current]);
      setSummary(prev => mergeSummaries(prev, payload.summaryDelta));

      if (payload.done) {
        setLoading(false);
      }
    };

    worker.addEventListener('message', handleMessage);
    worker.postMessage(
      { type: 'init', total: 10000, batchSize: 500 } satisfies GeneratorRequest
    );

    return () => {
      worker.removeEventListener('message', handleMessage);
      worker.postMessage({ type: 'kill' } satisfies GeneratorRequest);
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/analytics.worker.ts', import.meta.url),
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
      let filtered = [...source];

      if (search && search.length > 0) {
        filtered = searchTransactions(filtered, search);
      }

      if (currentFilters.type && currentFilters.type !== 'all') {
        filtered = filterTransactions(filtered, { type: currentFilters.type });
      }

      if (currentFilters.status && currentFilters.status !== 'all') {
        filtered = filterTransactions(filtered, {
          status: currentFilters.status,
        });
      }

      if (currentFilters.category) {
        filtered = filterTransactions(filtered, {
          category: currentFilters.category,
        });
      }

      if (userPreferences.compactView) {
        filtered = filtered.slice(0, userPreferences.itemsPerPage);
      }

      setFilteredTransactions(filtered);
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

  useEffect(() => {
    if (filteredTransactions.length === 0) {
      setSummary(null);
      return;
    }

    setSummary(calculateSummary(filteredTransactions));
  }, [filteredTransactions]);

  useEffect(() => {
    if (!analyticsWorkerRef.current) {
      return;
    }

    if (analyticsTimeoutRef.current) {
      window.clearTimeout(analyticsTimeoutRef.current);
      analyticsTimeoutRef.current = null;
    }

    if (filteredTransactions.length < MIN_ANALYTICS_SIZE) {
      analyticsWorkerRef.current.postMessage(
        { type: 'cancel' } satisfies AnalyticsWorkerRequest
      );
      setRiskAnalytics(null);
      setIsAnalyzing(false);
      return;
    }

    setIsAnalyzing(true);

    analyticsTimeoutRef.current = window.setTimeout(() => {
      analyticsWorkerRef.current?.postMessage(
        {
          type: 'analyze',
          transactions: filteredTransactions,
        } satisfies AnalyticsWorkerRequest
      );
    }, ANALYTICS_DEBOUNCE_MS);

    return () => {
      if (analyticsTimeoutRef.current) {
        window.clearTimeout(analyticsTimeoutRef.current);
        analyticsTimeoutRef.current = null;
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

      const searchResults = searchTransactions(transactions, value);
      const filtered = filterTransactions(searchResults, filters);
      setFilteredTransactions(filtered);
    },
    [filters, trackActivity, transactions]
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
      <div className="dashboard-header">
        <h1>FinTech Dashboard</h1>
        <div className="dashboard-stats">
          <div className="stat-card">
            <div className="stat-icon">
              <DollarSign size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">
                ${summary ? summary.totalAmount.toLocaleString() : '0'}
              </div>
              <div className="stat-label">Total Amount</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <TrendingUp size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">
                ${summary ? summary.totalCredits.toLocaleString() : '0'}
              </div>
              <div className="stat-label">Total Credits</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <TrendingDown size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">
                ${summary ? summary.totalDebits.toLocaleString() : '0'}
              </div>
              <div className="stat-label">Total Debits</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <Clock size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">
                {filteredTransactions.length.toLocaleString()}
                {filteredTransactions.length !== transactions.length && (
                  <span className="stat-total">
                    {' '}
                    of {transactions.length.toLocaleString()}
                  </span>
                )}
              </div>
              <div className="stat-label">
                Transactions
                {isAnalyzing && <span> (Analyzing...)</span>}
                {riskAnalytics && (
                  <span> - Risk: {riskAnalytics.highRiskTransactions}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

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
          transactions={filteredTransactions}
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
