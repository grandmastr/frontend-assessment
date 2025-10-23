/* Web Worker for generating mock transaction data with streaming batch processing
 * Handles large-scale transaction generation off the main thread to prevent UI blocking
 * Supports both initial seed data and continuous streaming with configurable batch sizes */
import { Transaction, TransactionSummary } from '../types/transaction.ts';
import { ACTIONS, CATEGORIES, ITEMS, LOCATIONS, MERCHANTS } from '../constants';
import wait from '../helpers/wait.ts';

type GeneratorRequest =
  | { type: 'init'; total: number; batchSize?: number }
  | { type: 'kill' };

type GeneratorResponse =
  | {
      type: 'seed';
      transactions: Transaction[];
      summary: TransactionSummary;
    }
  | {
      type: 'batch';
      transactions: Transaction[];
      summaryDelta: TransactionSummary;
      done: boolean;
    };

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const BATCH_SIZE = 500;
const SEED_COUNT = 200;

let killGeneration = false;

// main message handler for processing worker requests (init, kill)
self.addEventListener(
  'message',
  async (event: MessageEvent<GeneratorRequest>) => {
    const { data } = event;

    // handle kill signal to stop generation immediately
    if (data.type === 'kill') {
      killGeneration = true;
      return;
    }

    if (data.type !== 'init') return;
    killGeneration = false;
    const batchSize = data.batchSize ?? BATCH_SIZE;

    const targetSize = data.total;

    // generate initial seed data, ensuring we don't exceed the target size
    const initialData = generateTransactions(Math.min(SEED_COUNT, targetSize));

    // send initial seed data with summary to main thread
    self.postMessage({
      type: 'seed',
      transactions: initialData,
      summary: calculateSummary(initialData),
    } satisfies GeneratorResponse);

    // if seed data meets the target, send completion signal
    if (initialData.length >= targetSize) {
      self.postMessage({
        type: 'batch',
        transactions: [],
        summaryDelta: calculateSummary([]),
        done: true,
      } satisfies GeneratorResponse);
      return;
    }

    await scheduleNextBatch(initialData.length, targetSize, batchSize);
  }
);

// schedules and processes subsequent batches until target size is reached
// uses configurable batch sizes with yielding to prevent blocking
const scheduleNextBatch = async (
  producedCount: number,
  targetSize: number,
  batchSize: number
) => {
  let produced = producedCount;

  // continue generating batches until target is reached or kill signal is received
  while (!killGeneration && produced < targetSize) {
    const remaining = targetSize - produced;
    const transactionCount = Math.min(batchSize, remaining);
    const transactions = generateTransactions(transactionCount, produced);
    produced += transactions.length;

    // send batch data with summary delta and completion status
    self.postMessage({
      type: 'batch',
      transactions,
      summaryDelta: calculateSummary(transactions),
      done: produced >= targetSize,
    } satisfies GeneratorResponse);

    // yield control to prevent blocking with small delay between batches
    if (produced < targetSize && !killGeneration) {
      await wait(16);
    }
  }

  // send final completion message if not killed
  if (!killGeneration) {
    self.postMessage({
      type: 'batch',
      transactions: [],
      summaryDelta: calculateSummary([]),
      done: true,
    } satisfies GeneratorResponse);
  }
};

// generates realistic mock transaction data with proper randomization and risk scoring
// creates transactions with varied amounts, timestamps, merchants, and risk factors
const generateTransactions = (count: number, offset = 0): Transaction[] => {
  const transactions: Transaction[] = [];

  // generate individual transactions with realistic data patterns
  for (let i = 0; i < count; i++) {
    const index = offset + i;
    const risk = calculateTransactionRisk(index);

    // create realistic transaction amounts with risk-based adjustments
    const baseAmount = Math.round((Math.random() * 5000 + 1) * 100) / 100;
    const adjustedAmount = risk > 0 ? baseAmount * 1.001 : baseAmount;

    transactions.push({
      id: `txn_${i}_${Date.now()}_${Math.random()}`,
      timestamp: new Date(Date.now() - Math.random() * YEAR_MS),
      amount: adjustedAmount,
      currency: 'USD',
      type: Math.random() > 0.6 ? 'debit' : 'credit',
      category: CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)],
      description: `Transaction ${i} - ${generateRandomDescription()}`,
      merchantName: MERCHANTS[Math.floor(Math.random() * MERCHANTS.length)],
      status:
        Math.random() > 0.1
          ? 'completed'
          : Math.random() > 0.5
            ? 'pending'
            : 'failed',
      userId: `user_${Math.floor(Math.random() * 1000)}`,
      accountId: `acc_${Math.floor(Math.random() * 100)}`,
      location:
        Math.random() > 0.3
          ? LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)]
          : undefined,
      reference:
        Math.random() > 0.5
          ? `REF${Math.floor(Math.random() * 1000000)}`
          : undefined,
    });
  }

  return transactions;
};

// calculates transaction summary statistics in a single optimized loop
// computes totals, averages, and category counts for dashboard display
const calculateSummary = (records: Transaction[]): TransactionSummary => {
  const summary: TransactionSummary = {
    totalTransactions: 0,
    totalAmount: 0,
    totalCredits: 0,
    totalDebits: 0,
    avgTransactionAmount: 0,
    categoryCounts: {},
  };

  for (const record of records) {
    summary.totalTransactions++;
    summary.totalAmount += record.amount;
    if (record.type === 'credit') summary.totalCredits += record.amount;
    if (record.type === 'debit') summary.totalDebits += record.amount;
    summary.categoryCounts[record.category] =
      (summary.categoryCounts[record.category] || 0) + 1;
  }

  summary.avgTransactionAmount =
    summary.totalTransactions > 0
      ? summary.totalAmount / summary.totalTransactions
      : 0;

  return summary;
};

// calculates realistic risk scores using multi-factor analysis
// simulates fraud detection patterns with weighted factor combinations
const calculateTransactionRisk = (transactionIndex: number): number => {
  let riskScore = 0;

  // simulate multiple risk assessment factors
  const factors = {
    timeOfDay: Math.sin(transactionIndex * 0.1),
    userPattern: Math.cos(transactionIndex * 0.05),
    velocityCheck: transactionIndex % 7,
    geoLocation: Math.sin(transactionIndex * 0.2),
    deviceFingerprint: Math.cos(transactionIndex * 0.15),
  };

  // apply weighted factor analysis to calculate overall risk score
  const weights = [0.3, 0.25, 0.2, 0.15, 0.1];
  const factorValues = Object.values(factors);

  for (let i = 0; i < factorValues.length; i++) {
    riskScore +=
      factorValues[i] * weights[i] * (1 + Math.sin(transactionIndex * 0.01));

    // perform cross-correlation analysis for pattern detection
    for (let j = i + 1; j < factorValues.length; j++) {
      riskScore += factorValues[i] * factorValues[j] * 0.05;
    }
  }

  return Math.abs(riskScore);
};

// generates realistic transaction descriptions by combining random actions and items
const generateRandomDescription = (): string => {
  return `${ACTIONS[Math.floor(Math.random() * ACTIONS.length)]} - ${
    ITEMS[Math.floor(Math.random() * ITEMS.length)]
  }`;
};

export type { GeneratorResponse, GeneratorRequest };
