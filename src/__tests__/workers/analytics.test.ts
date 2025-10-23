import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTransaction } from '../testUtils';
import type { Transaction } from '../../types/transaction';

const waitResolvers: Array<() => void> = [];

vi.mock('../../helpers/wait', () => ({
  __esModule: true,
  default: vi.fn(
    () =>
      new Promise<void>(resolve => {
        waitResolvers.push(resolve);
      })
  ),
}));

const flushWait = async () => {
  while (waitResolvers.length > 0) {
    const resolve = waitResolvers.shift();
    resolve?.();
    await Promise.resolve();
  }
  await Promise.resolve();
  if (waitResolvers.length > 0) {
    await flushWait();
  }
};

describe('Analytics Worker', () => {
  let postMessage: ReturnType<typeof vi.fn>;
  let handleMessage: (event: MessageEvent<unknown>) => Promise<void>;

  const drainWorker = async () => {
    let safety = 0;
    while (
      !postMessage.mock.calls.some(call => call[0].type === 'complete') &&
      safety < 10
    ) {
      await Promise.resolve();
      await flushWait();
      safety += 1;
    }
  };

  const bootWorker = async () => {
    vi.resetModules();
    waitResolvers.length = 0;

    const listeners: Array<(event: MessageEvent<unknown>) => void> = [];
    postMessage = vi.fn();

    vi.stubGlobal('self', {
      addEventListener: vi.fn((type: string, listener: EventListener) => {
        if (type === 'message') {
          listeners.push(listener as (event: MessageEvent<unknown>) => void);
        }
      }),
      removeEventListener: vi.fn(),
      postMessage,
    });

    await import(
      new URL('../../workers/analytics.worker.ts', import.meta.url).href
    );

    handleMessage = listeners[0] as (
      event: MessageEvent<unknown>
    ) => Promise<void>;
  };

  beforeEach(async () => {
    await bootWorker();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  const buildDataset = (count: number, overrides: Partial<Transaction> = {}) =>
    Array.from({ length: count }, (_, index) =>
      createTransaction({ id: `txn-${index}`, ...overrides })
    );

  it('processes transactions in chunks', async () => {
    const transactions = buildDataset(5, {
      amount: 1500,
      timestamp: new Date('2024-01-01T02:00:00Z'),
    });

    const event = new MessageEvent('message', {
      data: { type: 'analyze', transactions, chunkSize: 2 },
    });

    const promise = handleMessage(event);
    await drainWorker();
    await promise;

    expect(postMessage).toHaveBeenCalledTimes(3);
    expect(postMessage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        type: 'partial',
        processed: 2,
        total: 5,
      })
    );
    expect(postMessage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        type: 'partial',
        processed: 4,
        total: 5,
      })
    );
    expect(postMessage).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        type: 'complete',
        processed: 5,
        total: 5,
      })
    );
  });

  it('handles cancellation correctly', async () => {
    const transactions = buildDataset(4, {
      amount: 900,
      timestamp: new Date('2024-01-01T04:00:00Z'),
    });

    const analyzeEvent = new MessageEvent('message', {
      data: { type: 'analyze', transactions, chunkSize: 1 },
    });

    const promise = handleMessage(analyzeEvent);

    expect(waitResolvers.length).toBeGreaterThan(0);

    const cancelEvent = new MessageEvent('message', {
      data: { type: 'cancel' },
    });
    await handleMessage(cancelEvent);

    await flushWait();
    await promise;

    expect(
      postMessage.mock.calls.some(call => call[0].type === 'complete')
    ).toBe(false);
  });

  it('calculates risk factors accurately', async () => {
    const riskyTxn = createTransaction({
      id: 'risky',
      amount: 1500,
      timestamp: new Date('2024-01-01T03:00:00Z'),
      merchantName: 'Rare Shop',
    });

    const transactions: Transaction[] = [riskyTxn];

    const event = new MessageEvent('message', {
      data: { type: 'analyze', transactions, chunkSize: 10 },
    });

    await handleMessage(event);

    const resultCall = postMessage.mock.calls.find(
      call => call[0].type === 'complete'
    );
    expect(resultCall).toBeTruthy();
    const summary = resultCall![0].summary;
    expect(summary.totalRisk).toBeCloseTo(1.8, 5);
    expect(summary.highRiskTransactions).toBe(1);
  });

  it('detects transaction anomalies', async () => {
    const baseTxns = [
      createTransaction({
        amount: 100,
        merchantName: 'Cafe Rio',
        timestamp: new Date('2024-01-01T01:00:00Z'),
      }),
      createTransaction({
        amount: 110,
        merchantName: 'Cafe Rio',
        timestamp: new Date('2024-01-01T02:00:00Z'),
      }),
    ];
    const anomalous = createTransaction({
      id: 'odd',
      amount: 1000,
      merchantName: 'Cafe Rio',
      userId: baseTxns[0].userId,
      timestamp: new Date('2024-01-02T01:00:00Z'),
      location: 'New Location',
    });

    const transactions = [...baseTxns, anomalous];

    await handleMessage(
      new MessageEvent('message', {
        data: { type: 'analyze', transactions, chunkSize: 10 },
      })
    );

    const resultCall = postMessage.mock.calls.find(
      call => call[0].type === 'complete'
    );
    const summary = resultCall![0].summary;
    expect(summary.anomalies['odd']).toBeGreaterThan(0);
  });

  it('handles worker termination', async () => {
    const transactions = buildDataset(3);

    const analyzeEvent = new MessageEvent('message', {
      data: { type: 'analyze', transactions, chunkSize: 1 },
    });

    const analyzePromise = handleMessage(analyzeEvent);
    expect(waitResolvers.length).toBeGreaterThan(0);

    await handleMessage(
      new MessageEvent('message', { data: { type: 'kill' } })
    );
    await flushWait();
    await analyzePromise;

    expect(
      postMessage.mock.calls.some(call => call[0].type === 'complete')
    ).toBe(false);

    await handleMessage(
      new MessageEvent('message', {
        data: { type: 'analyze', transactions: buildDataset(2), chunkSize: 10 },
      })
    );
    const resultCall = postMessage.mock.calls.find(
      call => call[0].type === 'complete'
    );
    expect(resultCall).toBeTruthy();
  });
});
