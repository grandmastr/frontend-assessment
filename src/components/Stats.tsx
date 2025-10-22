import React from 'react';
import { Clock, DollarSign, TrendingDown, TrendingUp } from 'lucide-react';
import { Transaction, TransactionSummary } from '../types/transaction.ts';

interface StatsProps {
  summary: TransactionSummary | null,
  filteredTransactions: Transaction[];
  txnCount: number;
  isAnalyzing: boolean;
  highRiskTransactions?: number;
}

export const Stats = ({
  summary,
  filteredTransactions,
  txnCount,
  isAnalyzing,
  highRiskTransactions = 0,
}: StatsProps): React.ReactElement => {
  return (
    <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon">
            <DollarSign size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">
              ${summary ? summary.totalAmount.toLocaleString() : '0'}
            </div>
            <div className="stat-label">Total Amount</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">
              ${summary ? summary.totalCredits.toLocaleString() : '0'}
            </div>
            <div className="stat-label">Total Credits</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <TrendingDown size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">
              ${summary ? summary.totalDebits.toLocaleString() : '0'}
            </div>
            <div className="stat-label">Total Debits</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">
              {filteredTransactions.length.toLocaleString()}
              {filteredTransactions.length !== txnCount && (
                <span className="stat-total">
                  {' '}
                  of {txnCount.toLocaleString()}
                </span>
              )}
            </div>
            <div className="stat-label">
              Transactions
              {isAnalyzing && <span> (Analyzing...)</span>}
              {highRiskTransactions && (
                <span> - Risk: {highRiskTransactions}</span>
              )}
            </div>
          </div>
        </div>
      </div>
  );
};
