import { act, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Dashboard } from '../../components/Dashboard';
import type { Transaction, TransactionSummary } from '../../types/transaction';
import { createTransaction } from '../testUtils';

const waitMock = vi.fn(() => Promise.resolve());

vi.mock('../../helpers/wait', () => ({
  __esModule: true,
  default: () => waitMock(),
}));

const trackActivityMock = vi.fn();

vi.mock('../../contexts/UserContext', () => ({
  useUserContext: () => ({
    globalSettings: { theme: 'light', currency: 'USD' },
    notificationSettings: { email: true },
    updateGlobalSettings: vi.fn(),
    updateNotificationSettings: vi.fn(),
    trackActivity: trackActivityMock,
  }),
}));

vi.mock('../../hooks/useRiskAnalytics', () => ({
  useRiskAnalytics: () => ({
    riskAnalytics: { highRiskTransactions: 0 },
    isAnalyzing: false,
  }),
}));

const mockSummary = (transactions: Transaction[]): TransactionSummary => ({
  totalTransactions: transactions.length,
  totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0),
  totalCredits: transactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0),
  totalDebits: transactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0),
  avgTransactionAmount: transactions.length > 0 ? transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length : 0,
  categoryCounts: transactions.reduce<Record<string, number>>((acc, txn) => {
    acc[txn.category] = (acc[txn.category] ?? 0) + 1;
    return acc;
  }, {}),
});

class MockWorker {
  public listeners = new Map<string, Set<(event: MessageEvent<unknown>) => void>>();
  public posted: unknown[] = [];
  public terminate = vi.fn();

  constructor() {
    MockWorker.instances.push(this);
  }

  static instances: MockWorker[] = [];

  addEventListener(type: string, listener: (event: MessageEvent<unknown>) => void) {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener);
    this.listeners.set(type, set);
  }

  removeEventListener(type: string, listener: (event: MessageEvent<unknown>) => void) {
    const set = this.listeners.get(type);
    set?.delete(listener);
  }

  postMessage(message: unknown) {
    this.posted.push(message);
  }

  emit(data: unknown) {
    const handlers = this.listeners.get('message');
    const event = new MessageEvent('message', { data });
    handlers?.forEach(handler => handler(event));
  }
}

const renderDashboard = () => render(<Dashboard />);

const seedTransactions = [
  createTransaction({ id: 'seed-1', amount: 100, merchantName: 'Seed Merchant', description: 'Seed transaction 1' }),
  createTransaction({ id: 'seed-2', amount: 200, merchantName: 'Seed Merchant', description: 'Seed transaction 2' }),
];

const batchTransactions = [
  createTransaction({ id: 'batch-1', amount: 50, merchantName: 'Batch Merchant', description: 'Batch transaction' }),
];

describe('Dashboard integration: transaction generation', () => {
  beforeEach(() => {
    MockWorker.instances = [];
    waitMock.mockClear();
    vi.stubGlobal('Worker', MockWorker as unknown as typeof Worker);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('streams transactions and refreshes after completion', async () => {
    renderDashboard();

    const worker = MockWorker.instances.find(instance =>
      instance.posted.some(msg => (msg as { type?: string }).type === 'init')
    );

    if (!worker) {
      throw new Error('Dashboard did not create transaction worker');
    }

    await act(async () => {
      worker.emit({ type: 'seed', transactions: seedTransactions, summary: mockSummary(seedTransactions) });
    });

    const listRegion = await screen.findByRole('region', { name: /transaction list/i });
    const seedItem = await within(listRegion).findByText('Seed transaction 1');
    expect(seedItem).toBeInTheDocument();

    await act(async () => {
      worker.emit({
        type: 'batch',
        transactions: batchTransactions,
        summaryDelta: mockSummary(batchTransactions),
        done: false,
      });
    });

    await act(async () => {
      worker.emit({
        type: 'batch',
        transactions: [],
        summaryDelta: mockSummary([]),
        done: true,
      });
    });

    const batchItem = await within(listRegion).findByText('Batch transaction');
    expect(batchItem).toBeInTheDocument();

    await waitFor(() => {
      const initMessages = worker.posted.filter(msg => (msg as { type?: string }).type === 'init');
      expect(initMessages.length).toBeGreaterThanOrEqual(2);
    });
  });
});
