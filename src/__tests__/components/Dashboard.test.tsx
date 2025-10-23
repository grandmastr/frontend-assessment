/*
* Unit test for the Dashboard component testing the following features
* - Transaction streaming and batch updates
* - Worker integration and message handling
* - Transaction list rendering
* - Summary calculation and refresh
* - User context and analytics hooks
**/

import React, { act } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Dashboard } from '../../components/Dashboard';
import type { Transaction, TransactionSummary } from '../../types/transaction';
import { createTransaction } from '../testUtils';

//  mock wait helper to control async timing in tests
const waitMock = vi.fn(() => Promise.resolve());

vi.mock('../../helpers/wait', () => ({
  __esModule: true,
  default: () => waitMock(),
}));

// mock user context to isolate Dashboard from real context and track user actions
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

// mock risk analytics hook to control risk state and avoid real analytics logic
vi.mock('../../hooks/useRiskAnalytics', () => ({
  useRiskAnalytics: () => ({
    riskAnalytics: { highRiskTransactions: 0 },
    isAnalyzing: false,
  }),
}));

type RowProps = {
  index: number;
  style: React.CSSProperties;
  transactions: ReturnType<typeof createTransaction>[];
};

type ListProps = {
  rowComponent: (
    props: RowProps & Record<string, unknown>
  ) => React.ReactElement | null;
  rowCount: number;
  rowHeight: number;
  rowProps: Record<string, unknown>;
  overscanCount: number;
  style?: React.CSSProperties;
};

// mock react-window List to simulate virtualized transaction rendering in tests
vi.mock('react-window', () => ({
  List: ({ rowComponent, rowCount, rowProps }: ListProps) => (
    <div data-testid="virtual-list">
      {Array.from({ length: rowCount }, (_, index) => {
        const element = rowComponent({
          index,
          style: {},
          ...rowProps,
        } as RowProps & Record<string, unknown>);
        return <React.Fragment key={index}>{element}</React.Fragment>;
      })}
    </div>
  ),
}));

// generate a summary object for a set of transactions for assertions
const mockSummary = (transactions: Transaction[]): TransactionSummary => ({
  totalTransactions: transactions.length,
  totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0),
  totalCredits: transactions
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0),
  totalDebits: transactions
    .filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0),
  avgTransactionAmount:
    transactions.length > 0
      ? transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length
      : 0,
  categoryCounts: transactions.reduce<Record<string, number>>((acc, txn) => {
    acc[txn.category] = (acc[txn.category] ?? 0) + 1;
    return acc;
  }, {}),
});

// Mock Worker: simulates transaction worker events and message passing for Dashboard
class MockWorker {
  public listeners = new Map<
    string,
    Set<(event: MessageEvent<unknown>) => void>
  >();
  public posted: unknown[] = [];
  public terminate = vi.fn();

  constructor() {
    MockWorker.instances.push(this);
  }

  static instances: MockWorker[] = [];

  addEventListener(
    type: string,
    listener: (event: MessageEvent<unknown>) => void
  ) {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener);
    this.listeners.set(type, set);
  }

  removeEventListener(
    type: string,
    listener: (event: MessageEvent<unknown>) => void
  ) {
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

// Helper: renders the Dashboard component for integration tests
const renderDashboard = () => render(<Dashboard />);

// Test data: initial seed transactions for worker simulation
const seedTransactions = [
  createTransaction({
    id: 'seed-1',
    amount: 100,
    merchantName: 'Seed Merchant',
    description: 'Seed transaction 1',
  }),
  createTransaction({
    id: 'seed-2',
    amount: 200,
    merchantName: 'Seed Merchant',
    description: 'Seed transaction 2',
  }),
];

// Test data: batch transactions for worker simulation
const batchTransactions = [
  createTransaction({
    id: 'batch-1',
    amount: 50,
    merchantName: 'Batch Merchant',
    description: 'Batch transaction',
  }),
];

// Integration test: verifies transaction streaming, batch updates, and worker refresh
// Ensures Dashboard correctly receives, displays, and refreshes transactions from worker
// Also checks worker re-initialization after batch completion

describe('Dashboard integration: transaction generation', () => {
  // Before each test: reset worker mocks and stub global Worker
  beforeEach(() => {
    MockWorker.instances = [];
    waitMock.mockClear();
    vi.stubGlobal('Worker', MockWorker as unknown as typeof Worker);
  });

  // After each test: cleanup global stubs and mocks
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  // Test: Dashboard streams transactions and refreshes after batch completion
  it('streams transactions and refreshes after completion', async () => {
    renderDashboard();

    // Find the created worker instance for transaction generation
    const worker = MockWorker.instances.find(instance =>
      instance.posted.some(msg => (msg as { type?: string }).type === 'init')
    );

    if (!worker) {
      throw new Error('Dashboard did not create transaction worker');
    }

    // Simulate worker sending seed transactions
    await act(async () => {
      worker.emit({
        type: 'seed',
        transactions: seedTransactions,
        summary: mockSummary(seedTransactions),
      });
    });

    // Assert: seed transaction is rendered in the virtual list
    const virtualList = await screen.findByTestId('virtual-list');
    const seedItem = await within(virtualList).findByText('Seed transaction 1');
    expect(seedItem).toBeInTheDocument();

    // Simulate worker sending batch transactions
    await act(async () => {
      worker.emit({
        type: 'batch',
        transactions: batchTransactions,
        summaryDelta: mockSummary(batchTransactions),
        done: false,
      });
    });

    // Simulate worker sending batch completion event
    await act(async () => {
      worker.emit({
        type: 'batch',
        transactions: [],
        summaryDelta: mockSummary([]),
        done: true,
      });
    });

    // Assert: batch transaction is rendered in the virtual list
    const batchItem = await within(virtualList).findByText('Batch transaction');
    expect(batchItem).toBeInTheDocument();

    // Assert: worker is re-initialized after batch completion
    await waitFor(() => {
      const initMessages = worker.posted.filter(
        msg => (msg as { type?: string }).type === 'init'
      );
      expect(initMessages.length).toBeGreaterThanOrEqual(2);
    });
  });
});
