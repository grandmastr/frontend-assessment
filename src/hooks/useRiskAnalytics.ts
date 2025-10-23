import { useEffect, useRef, useState } from 'react';
import { Transaction } from '../types/transaction';

const ANALYTICS_CHUNK_SIZE = 1000;

export interface AnalyticsSummary {
  totalRisk: number;
  highRiskTransactions: number;
  patterns: Record<string, number>;
  anomalies: Record<string, number>;
  generatedAt: number;
}

type AnalyticsWorkerMessage =
  | {
      type: 'partial';
      summary: AnalyticsSummary;
      processed: number;
      total: number;
    }
  | {
      type: 'complete';
      summary: AnalyticsSummary;
      processed: number;
      total: number;
    };

type AnalyticsWorkerRequest =
  | { type: 'analyze'; transactions: Transaction[]; chunkSize?: number }
  | { type: 'kill' }
  | { type: 'cancel' };

interface UseRiskAnalyticsOptions {
  transactions: Transaction[];
  minSize: number;
  debounceMs: number;
  onComplete?: () => void;
}

interface UseRiskAnalyticsReturn {
  riskAnalytics: AnalyticsSummary | null;
  isAnalyzing: boolean;
}

/* manages risk analytics processing via dedicated worker with debounced execution
 * handles worker lifecycle, minimum size thresholds, and completion callbacks */
export const useRiskAnalytics = ({
  transactions,
  minSize,
  debounceMs,
  onComplete,
}: UseRiskAnalyticsOptions): UseRiskAnalyticsReturn => {
  const analyticsWorkerRef = useRef<Worker | null>(null);
  const analyticsTimeoutRef = useRef<number | null>(null);
  const [riskAnalytics, setRiskAnalytics] = useState<AnalyticsSummary | null>(
    null
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // initialize analytics worker and set up message handling for lifecycle management
  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/analytics.worker.ts', import.meta.url),
      {
        type: 'module',
      }
    );

    analyticsWorkerRef.current = worker;

    // processes analytics worker messages and updates state based on analysis progress
    const handleMessage = (event: MessageEvent<AnalyticsWorkerMessage>) => {
      const payload = event.data;

      // update analytics with partial results during processing
      if (payload.type === 'partial') {
        setRiskAnalytics(payload.summary);
        return;
      }

      // handle completed analysis and trigger completion callback
      if (payload.type === 'complete') {
        setRiskAnalytics(payload.summary);
        setIsAnalyzing(false);
        onComplete?.();
      }
    };

    worker.addEventListener('message', handleMessage);

    // cleanup function to properly terminate analytics worker and prevent memory leaks
    return () => {
      worker.removeEventListener('message', handleMessage);
      worker.postMessage({ type: 'kill' } satisfies AnalyticsWorkerRequest);
      worker.terminate();
      analyticsWorkerRef.current = null;
    };
  }, [onComplete]);

  // debounced analytics execution with minimum size threshold enforcement
  useEffect(() => {
    if (!analyticsWorkerRef.current) {
      return;
    }

    // clear existing timeout to implement debouncing behavior
    if (analyticsTimeoutRef.current) {
      window.clearTimeout(analyticsTimeoutRef.current);
      analyticsTimeoutRef.current = null;
    }

    // cancel analysis if transaction count is below minimum threshold
    if (transactions.length < minSize) {
      analyticsWorkerRef.current.postMessage({
        type: 'cancel',
      } satisfies AnalyticsWorkerRequest);
      setRiskAnalytics(null);
      setIsAnalyzing(false);
      return;
    }

    setIsAnalyzing(true);

    // schedule debounced analysis execution with specified chunk size
    analyticsTimeoutRef.current = window.setTimeout(() => {
      analyticsWorkerRef.current?.postMessage({
        type: 'analyze',
        transactions: transactions,
        chunkSize: ANALYTICS_CHUNK_SIZE,
      } satisfies AnalyticsWorkerRequest);
    }, debounceMs);

    // cleanup timeout and cancel ongoing analysis when effect dependencies change
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
  }, [transactions, minSize, debounceMs]);

  // cleanup timeout on component unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (analyticsTimeoutRef.current) {
        window.clearTimeout(analyticsTimeoutRef.current);
      }
    };
  }, []);

  return {
    riskAnalytics,
    isAnalyzing,
  };
};

