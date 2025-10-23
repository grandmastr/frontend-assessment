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

/* manages web worker lifecycle for transaction generation with streaming batch processing
 * handles worker instantiation, cleanup, and processes seed and streaming batch messages */
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

    // create and initialize the transaction generator worker with module type support
    const worker = new Worker(
      new URL('../workers/transactionGenerator.worker.ts', import.meta.url),
      {
        type: 'module',
      }
    );

    workerRef.current = worker;

    // queues a new transaction generation job with specified total and batch size
    const queueGeneratorJob = (total: number) => {
      worker.postMessage({
        type: 'init',
        total,
        batchSize: streamBatchTotal,
      } satisfies GeneratorRequest);
    };

    // schedules the next batch generation after waiting for the refresh interval
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

    /* processes worker messages and updates transaction state based on message type
     * handles both initial seed data and subsequent streaming batches */
    const handleMessage = (event: MessageEvent<GeneratorResponse>) => {
      const payload = event.data;
      const nextTransactions = payload?.transactions ?? [];

      // handle initial seed data with summary information
      if (payload.type === 'seed') {
        setTransactions(prev =>
          hasLoadedOnce ? prev.concat(nextTransactions) : nextTransactions
        );

        // set summary and mark as loaded only on first seed
        if (!hasLoadedOnce) {
          setSummary(payload.summary);
          setLoading(false);
          hasLoadedOnce = true;
        }

        return;
      }

      // append new transactions from streaming batches
      if (nextTransactions.length > 0) {
        setTransactions(prev => prev.concat(nextTransactions));
      }

      // ensure loading state is cleared even for non-seed messages
      if (!hasLoadedOnce) {
        setLoading(false);
        hasLoadedOnce = true;
      }

      // handle batch completion - call idle callback or schedule next batch
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

    // cleanup function to properly terminate worker and prevent memory leaks
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
