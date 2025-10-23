import { useEffect, useRef, useState } from 'react';
import { Transaction, TransactionSummary } from '../types/transaction';
import {
  GeneratorRequest,
  GeneratorResponse,
} from '../workers/transactionGenerator.worker.ts';
import wait from '../helpers/wait';

interface UseTransactionGeneratorOptions {
  initialTotal: number;
  streamBatchTotal: number;
  refreshInterval: number;
  onIdle?: () => void;
}

interface UseTransactionGeneratorReturn {
  transactions: Transaction[];
  summary: TransactionSummary | null;
  loading: boolean;
  scheduleNextBatch: () => void;
}

export const useTransactionGenerator = ({
  initialTotal,
  streamBatchTotal,
  refreshInterval,
  onIdle,
}: UseTransactionGeneratorOptions): UseTransactionGeneratorReturn => {
  const workerRef = useRef<Worker | null>(null);
  const scheduleNextBatchRef = useRef<() => void>(() => {});
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let hasLoadedOnce = false;

    const worker = new Worker(
      new URL('../workers/transactionGenerator.worker.ts', import.meta.url),
      {
        type: 'module',
      }
    );

    workerRef.current = worker;

    const queueGeneratorJob = (total: number) => {
      worker.postMessage({
        type: 'init',
        total,
        batchSize: streamBatchTotal,
      } satisfies GeneratorRequest);
    };

    const scheduleNextBatch = async () => {
      if (cancelled) return;
      await wait(refreshInterval);
      if (!cancelled) {
        queueGeneratorJob(streamBatchTotal);
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
        if (onIdle) {
          onIdle();
        } else {
          scheduleNextBatchRef.current?.();
        }
      }
    };

    worker.addEventListener('message', handleMessage);
    queueGeneratorJob(initialTotal);

    return () => {
      cancelled = true;
      worker.removeEventListener('message', handleMessage);
      worker.postMessage({ type: 'kill' } satisfies GeneratorRequest);
      worker.terminate();
      workerRef.current = null;
      scheduleNextBatchRef.current = () => {};
    };
  }, [initialTotal, streamBatchTotal, refreshInterval, onIdle]);

  return {
    transactions,
    summary,
    loading,
    scheduleNextBatch: () => scheduleNextBatchRef.current(),
  };
};
