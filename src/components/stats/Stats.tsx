import React from 'react';
import { Clock, DollarSign, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';
import { Transaction, TransactionSummary } from '../../types/transaction';
import { AnalyticsSummary } from '../../hooks/useRiskAnalytics';
import styles from './Stats.module.css';

interface StatsProps {
  summary: TransactionSummary | null;
  filteredTransactions: Transaction[];
  txnCount: number;
  isAnalyzing: boolean;
  riskAnalytics: AnalyticsSummary | null;
}

export const Stats = ({
  summary,
  filteredTransactions,
  txnCount,
  isAnalyzing,
  riskAnalytics,
}: StatsProps): React.ReactElement => {
  return (
    <div className={styles.stats}>
      {/* total amount card displaying the sum of all transaction amounts */}
      <div className={styles.card}>
        <div className={`${styles.iconContainer} ${styles.total}`}>
          <DollarSign size={28} />
        </div>
        <div className={styles.content}>
          <div className={styles.value}>
            ${summary ? summary.totalAmount.toLocaleString() : '0'}
          </div>
          <div className={styles.label}>Total Amount</div>
        </div>
      </div>

      {/* total credits card showing sum of all credit (incoming) transactions */}
      <div className={styles.card}>
        <div className={`${styles.iconContainer} ${styles.credits}`}>
          <TrendingUp size={28} />
        </div>
        <div className={styles.content}>
          <div className={styles.value}>
            ${summary ? summary.totalCredits.toLocaleString() : '0'}
          </div>
          <div className={styles.label}>Total Credits</div>
        </div>
      </div>

      {/* total debits card showing sum of all debit (outgoing) transactions */}
      <div className={styles.card}>
        <div className={`${styles.iconContainer} ${styles.debits}`}>
          <TrendingDown size={28} />
        </div>
        <div className={styles.content}>
          <div className={styles.value}>
            ${summary ? summary.totalDebits.toLocaleString() : '0'}
          </div>
          <div className={styles.label}>Total Debits</div>
        </div>
      </div>

      {/* transaction count card showing filtered count vs total count when filters are active */}
      <div className={styles.card}>
        <div className={`${styles.iconContainer} ${styles.transactions}`}>
          <Clock size={28} />
        </div>
        <div className={styles.content}>
          <div className={styles.value}>
            {filteredTransactions.length.toLocaleString()}
            {/* displays secondary count showing total when different from filtered count */}
            {filteredTransactions.length !== txnCount && (
              <span className={styles.secondary}>
                {' '}
                of {txnCount.toLocaleString()}
              </span>
            )}
          </div>
          <div className={styles.label}>
            Transactions
          </div>
        </div>
      </div>

      {/* high risk transactions card, only shown when risk analytics are available or analyzing
          displays a loading spinner when analysis is in progress */}
      {(riskAnalytics?.highRiskTransactions || isAnalyzing) && (
        <div className={`${styles.card} ${isAnalyzing ? styles.cardLoading : ''}`}>
          <div className={`${styles.iconContainer} ${styles.risk}`}>
            <AlertTriangle size={28} />
          </div>
          <div className={styles.content}>
            <div className={styles.value}>
              {riskAnalytics?.highRiskTransactions || 0}
            </div>
            <div className={styles.label}>
              High Risk Transactions
            </div>
          </div>
          {isAnalyzing && (
            <div className={styles.spinner}></div>
          )}
        </div>
      )}
    </div>
  );
};
