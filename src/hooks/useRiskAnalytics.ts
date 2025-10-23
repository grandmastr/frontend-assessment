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

      if (payload.type === 'partial') {
        setRiskAnalytics(payload.summary);
        return;
      }

      if (payload.type === 'complete') {
        setRiskAnalytics(payload.summary);
        setIsAnalyzing(false);
        onComplete?.();
      }
    };

    worker.addEventListener('message', handleMessage);

    return () => {
      worker.removeEventListener('message', handleMessage);
      worker.postMessage({ type: 'kill' } satisfies AnalyticsWorkerRequest);
      worker.terminate();
      analyticsWorkerRef.current = null;
    };
  }, [onComplete]);

  useEffect(() => {
    if (!analyticsWorkerRef.current) {
      return;
    }

    if (analyticsTimeoutRef.current) {
      window.clearTimeout(analyticsTimeoutRef.current);
      analyticsTimeoutRef.current = null;
    }

    if (transactions.length < minSize) {
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
        transactions: transactions,
        chunkSize: ANALYTICS_CHUNK_SIZE,
      } satisfies AnalyticsWorkerRequest);
    }, debounceMs);

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

