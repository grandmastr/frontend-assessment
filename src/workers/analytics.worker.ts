/* Web Worker for processing risk analytics and fraud detection on transaction data
 * Performs computationally intensive analysis off the main thread with chunked processing
 * Supports cancellation, partial results, and progress reporting for responsive UI */
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

// main message handler for analytics requests (analyze, kill, cancel)
self.addEventListener('message', async (event: MessageEvent<AnalyticsRequest>) => {
  const { data } = event;

  // handle kill signal to terminate worker completely
  if (data.type === 'kill') {
    currentJobToken += 1;
    shouldCancel = true;
    return;
  }

  // handle cancel signal to stop current analysis job
  if (data.type === 'cancel') {
    currentJobToken += 1;
    shouldCancel = true;
    return;
  }

  if (data.type !== 'analyze') {
    return;
  }

  // create new job token for cancellation tracking
  currentJobToken += 1;
  const jobToken = currentJobToken;
  shouldCancel = false;

  // initialize analytics processing with configurable chunk size
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

  // process each transaction with comprehensive risk analysis
  for (let index = 0; index < total; index += 1) {
    // check for cancellation before processing each transaction
    if (shouldCancel || jobToken !== currentJobToken) {
      return;
    }

    const transaction = transactions[index];
    // perform multi-factor risk assessment
    const risk = calculateRiskFactors(transaction, transactions);
    const patternScore = analyzeTransactionPatterns(transaction, transactions);
    const anomalyScore = detectAnomalies(transaction, transactions);

    // accumulate risk metrics and classify high-risk transactions
    summary.totalRisk += risk;
    if (risk > 0.7) {
      summary.highRiskTransactions += 1;
    }

    // store per-transaction pattern and anomaly scores
    summary.patterns[transaction.id] = patternScore;
    summary.anomalies[transaction.id] = anomalyScore;

    const processed = index + 1;
    // determine if we should send partial results based on chunk size
    const reachedChunkBoundary =
      processed % effectiveChunkSize === 0 || processed === total;

    // send partial results and yield control at chunk boundaries
    if (reachedChunkBoundary) {
      if (shouldCancel || jobToken !== currentJobToken) {
        return;
      }

      summary.generatedAt = Date.now();

      // send partial results to keep UI responsive during long operations
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

  // final cancellation check before sending completion message
  if (shouldCancel || jobToken !== currentJobToken) {
    return;
  }

  summary.generatedAt = Date.now();

  // send final results with completion status
  self.postMessage({
    type: 'complete',
    summary,
    processed: total,
    total,
  } satisfies AnalyticsResponse);
});

// calculates comprehensive risk factors based on merchant history, amount, and timing
// returns combined risk score from multiple weighted factors
const calculateRiskFactors = (
  transaction: Transaction,
  allTransactions: Transaction[]
): number => {
  // analyze merchant transaction history for risk assessment
  const merchantHistory = allTransactions.filter(
    t => t.merchantName === transaction.merchantName
  );

  // assess risk based on merchant familiarity, transaction amount, and timing
  const merchantRisk = merchantHistory.length < 5 ? 0.8 : 0.2;
  const amountRisk = transaction.amount > 1000 ? 0.6 : 0.1;
  const transactionHour = new Date(transaction.timestamp).getHours();
  const timeRisk = transactionHour < 6 ? 0.4 : 0.1;

  return merchantRisk + amountRisk + timeRisk;
}

// analyzes transaction patterns to detect suspicious behavior and velocity
// examines similar transactions and user activity patterns within time windows
const analyzeTransactionPatterns = (
  transaction: Transaction,
  allTransactions: Transaction[]
): number => {
  // find transactions with similar merchant and amount characteristics
  const similarTransactions = allTransactions.filter(
    t =>
      t.merchantName === transaction.merchantName &&
      Math.abs(t.amount - transaction.amount) < 10
  );

  // check for high-frequency transactions from same user within 1-hour window
  const velocityCheck = allTransactions.filter(t => {
    if (t.userId !== transaction.userId) {
      return false;
    }

    const diff =
      new Date(t.timestamp).getTime() - new Date(transaction.timestamp).getTime();

    return Math.abs(diff) < 60 * 60 * 1000;
  });

  let score = 0;

  // award pattern scores based on suspicious activity thresholds
  if (similarTransactions.length > 3) {
    score += 0.3;
  }

  if (velocityCheck.length > 5) {
    score += 0.5;
  }

  return score;
}

// detects anomalies in user behavior based on historical patterns and location
// calculates deviation scores for amounts and unusual location activity
const detectAnomalies = (
  transaction: Transaction,
  allTransactions: Transaction[]
): number => {
  // filter transactions for the specific user to establish baseline behavior
  const userTransactions = allTransactions.filter(
    txn => txn.userId === transaction.userId
  );

  // calculate user's average transaction amount for deviation analysis
  const totalAmount = userTransactions.reduce((sum, t) => sum + t.amount, 0);
  const avgAmount = userTransactions.length > 0 ? totalAmount / userTransactions.length : 0;

  // calculate how much this transaction deviates from user's normal amounts
  const amountDeviation = avgAmount > 0
    ? Math.abs(transaction.amount - avgAmount) / avgAmount
    : 0;

  // check if transaction location is unusual based on recent history
  const recentTransactions = userTransactions.slice(-10);
  const locationAnomaly =
    transaction.location &&
    !recentTransactions.some(t => t.location === transaction.location)
      ? 0.4
      : 0;

  // combine anomaly scores with cap at 1.0
  return Math.min(amountDeviation * 0.3 + locationAnomaly, 1);
}
