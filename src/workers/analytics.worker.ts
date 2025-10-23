import { Transaction } from '../types/transaction';
import wait from '../helpers/wait';

type AnalyticsRequest =
  | { type: 'analyze'; transactions: Transaction[]; chunkSize?: number }
  | { type: 'kill' }
  | { type: 'cancel' };

type AnalyticsSummary = {
  totalRisk: number;
  highRiskTransactions: number;
  patterns: Record<string, number>;
  anomalies: Record<string, number>;
  generatedAt: number;
};

type AnalyticsResponse =
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

let currentJobToken = 0;
let shouldCancel = false;

self.addEventListener('message', async (event: MessageEvent<AnalyticsRequest>) => {
  const { data } = event;

  if (data.type === 'kill') {
    currentJobToken += 1;
    shouldCancel = true;
    return;
  }

  if (data.type === 'cancel') {
    currentJobToken += 1;
    shouldCancel = true;
    return;
  }

  if (data.type !== 'analyze') {
    return;
  }

  currentJobToken += 1;
  const jobToken = currentJobToken;
  shouldCancel = false;

  const { transactions, chunkSize = 1000 } = data;
  const summary: AnalyticsSummary = {
    totalRisk: 0,
    highRiskTransactions: 0,
    patterns: {},
    anomalies: {},
    generatedAt: Date.now(),
  };

  const total = transactions.length;
  const effectiveChunkSize = Math.max(1, chunkSize);

  for (let index = 0; index < total; index += 1) {
    if (shouldCancel || jobToken !== currentJobToken) {
      return;
    }

    const transaction = transactions[index];
    const risk = calculateRiskFactors(transaction, transactions);
    const patternScore = analyzeTransactionPatterns(transaction, transactions);
    const anomalyScore = detectAnomalies(transaction, transactions);

    summary.totalRisk += risk;
    if (risk > 0.7) {
      summary.highRiskTransactions += 1;
    }

    summary.patterns[transaction.id] = patternScore;
    summary.anomalies[transaction.id] = anomalyScore;

    const processed = index + 1;
    const reachedChunkBoundary =
      processed % effectiveChunkSize === 0 || processed === total;

    if (reachedChunkBoundary) {
      if (shouldCancel || jobToken !== currentJobToken) {
        return;
      }

      summary.generatedAt = Date.now();

      if (processed < total) {
        self.postMessage({
          type: 'partial',
          summary,
          processed,
          total,
        } satisfies AnalyticsResponse);
        await wait(0);
      }
    }
  }

  if (shouldCancel || jobToken !== currentJobToken) {
    return;
  }

  summary.generatedAt = Date.now();

  self.postMessage({
    type: 'complete',
    summary,
    processed: total,
    total,
  } satisfies AnalyticsResponse);
});

const calculateRiskFactors = (
  transaction: Transaction,
  allTransactions: Transaction[]
): number => {
  const merchantHistory = allTransactions.filter(
    t => t.merchantName === transaction.merchantName
  );

  const merchantRisk = merchantHistory.length < 5 ? 0.8 : 0.2;
  const amountRisk = transaction.amount > 1000 ? 0.6 : 0.1;
  const transactionHour = new Date(transaction.timestamp).getHours();
  const timeRisk = transactionHour < 6 ? 0.4 : 0.1;

  return merchantRisk + amountRisk + timeRisk;
}

const analyzeTransactionPatterns = (
  transaction: Transaction,
  allTransactions: Transaction[]
): number => {
  const similarTransactions = allTransactions.filter(
    t =>
      t.merchantName === transaction.merchantName &&
      Math.abs(t.amount - transaction.amount) < 10
  );

  const velocityCheck = allTransactions.filter(t => {
    if (t.userId !== transaction.userId) {
      return false;
    }

    const diff =
      new Date(t.timestamp).getTime() - new Date(transaction.timestamp).getTime();

    return Math.abs(diff) < 60 * 60 * 1000;
  });

  let score = 0;

  if (similarTransactions.length > 3) {
    score += 0.3;
  }

  if (velocityCheck.length > 5) {
    score += 0.5;
  }

  return score;
}

const detectAnomalies = (
  transaction: Transaction,
  allTransactions: Transaction[]
): number => {
  const userTransactions = allTransactions.filter(
    txn => txn.userId === transaction.userId
  );

  const totalAmount = userTransactions.reduce((sum, t) => sum + t.amount, 0);
  const avgAmount = userTransactions.length > 0 ? totalAmount / userTransactions.length : 0;

  const amountDeviation = avgAmount > 0
    ? Math.abs(transaction.amount - avgAmount) / avgAmount
    : 0;

  const recentTransactions = userTransactions.slice(-10);
  const locationAnomaly =
    transaction.location &&
    !recentTransactions.some(t => t.location === transaction.location)
      ? 0.4
      : 0;

  return Math.min(amountDeviation * 0.3 + locationAnomaly, 1);
}
