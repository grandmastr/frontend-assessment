/*
* unit test for the useRiskAnalytics hook testing:
* - debouncing mechanism to prevent excessive worker calls
* - minimum transaction size threshold before analysis
* - worker message handling (partial and complete)
* - cleanup and termination on unmount
**/

import { act } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRiskAnalytics } from '../../hooks/useRiskAnalytics';
import { createTransaction } from '../testUtils';
import type { AnalyticsSummary } from '../../hooks/useRiskAnalytics';

interface WorkerMessage {
  type: string;
  summary?: AnalyticsSummary;
  processed?: number;
  total?: number;
}

type Listener = (event: MessageEvent<WorkerMessage>) => void;

// mock worker to simulate analytics worker events and message passing
class MockAnalyticsWorker {
  public posted: WorkerMessage[] = [];
  public listeners = new Map<string, Set<Listener>>();
  public terminate = vi.fn();
  constructor() {
    MockAnalyticsWorker.instances.push(this);
  }
  static instances: MockAnalyticsWorker[] = [];
  addEventListener(type: string, listener: Listener) {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener);
    this.listeners.set(type, set);
  }
  removeEventListener(type: string, listener: Listener) {
    const set = this.listeners.get(type);
    set?.delete(listener);
  }
  postMessage(message: WorkerMessage) {
    this.posted.push(message);
  }
  emit(data: WorkerMessage) {
    const handlers = this.listeners.get('message');
    const event = new MessageEvent('message', { data });
    handlers?.forEach(handler => handler(event));
  }
}

describe('useRiskAnalytics', () => {
  // setup fake timers and stub Worker before each test
  beforeEach(() => {
    vi.useFakeTimers();
    MockAnalyticsWorker.instances = [];
    vi.stubGlobal('Worker', MockAnalyticsWorker as unknown as typeof Worker);
  });

  // cleanup timers and global stubs after each test
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  // helper to render the hook with test transactions and return worker instance
  const renderAnalytics = (transactions = [createTransaction({ id: '1' }), createTransaction({ id: '2' })]) => {
    const onComplete = vi.fn();
    const hook = renderHook(({ txns }) =>
      useRiskAnalytics({
        transactions: txns,
        minSize: 2,
        debounceMs: 200,
        onComplete,
      })
    , {
      initialProps: { txns: transactions },
    });
    return { ...hook, worker: MockAnalyticsWorker.instances.at(-1)!, onComplete };
  };

  // verifies that rapid transaction updates are debounced to avoid excessive worker calls
  it('debouncing mechanism', async () => {
    const txns = [createTransaction({ id: 'a' }), createTransaction({ id: 'b' }), createTransaction({ id: 'c' })];
    const { rerender, worker } = renderAnalytics(txns);

    rerender({ txns: [...txns, createTransaction({ id: 'd' })] });
    rerender({ txns: [...txns, createTransaction({ id: 'e' })] });

    vi.advanceTimersByTime(200);

    await waitFor(() => {
      expect(worker.posted.filter(msg => msg.type === 'analyze').length).toBe(1);
    });
  });

  // verifies that analysis does not trigger when transaction count is below minimum threshold
  it('minimum size threshold', async () => {
    const { result, worker } = renderAnalytics([createTransaction({ id: 'only-one' })]);

    await waitFor(() => {
      expect(result.current.isAnalyzing).toBe(false);
      expect(result.current.riskAnalytics).toBeNull();
    });

    expect(worker.posted.some(msg => msg.type === 'analyze')).toBe(false);
  });

  /*
  * verifies worker message handling:
  * - partial messages update state while keeping isAnalyzing true
  * - complete messages finalize state, set isAnalyzing to false, and trigger onComplete callback
  */
  it('worker message handling', async () => {
    const { result, worker, onComplete } = renderAnalytics();

    vi.advanceTimersByTime(200);

    await waitFor(() => {
      expect(worker.posted.some(msg => msg.type === 'analyze')).toBe(true);
    });

    const partialSummary: AnalyticsSummary = {
      totalRisk: 10,
      highRiskTransactions: 2,
      patterns: {},
      anomalies: {},
      generatedAt: Date.now(),
    };

    await act(async () => {
      worker.emit({ type: 'partial', summary: partialSummary, processed: 1, total: 2 });
    });

    expect(result.current.riskAnalytics).toEqual(partialSummary);
    expect(result.current.isAnalyzing).toBe(true);

    const completeSummary = { ...partialSummary, totalRisk: 20 };

    await act(async () => {
      worker.emit({ type: 'complete', summary: completeSummary, processed: 2, total: 2 });
    });

    expect(result.current.riskAnalytics).toEqual(completeSummary);
    expect(result.current.isAnalyzing).toBe(false);
    expect(onComplete).toHaveBeenCalled();
  });

  // verifies that worker is properly killed and terminated on component unmount
  it('cleanup on unmount', () => {
    const { unmount, worker } = renderAnalytics();

    unmount();

    expect(worker.posted.some(msg => msg.type === 'kill')).toBe(true);
    expect(worker.terminate).toHaveBeenCalled();
  });
});
