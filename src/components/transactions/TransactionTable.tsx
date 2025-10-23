import React, { CSSProperties, useCallback, useMemo, useState } from 'react';
import { List, type RowComponentProps } from 'react-window';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import styles from './TransactionTable.module.css';
import { Transaction } from '../../types/transaction';
import { formatCurrency } from '../../utils/dateHelpers';

interface TransactionTableProps {
  transactions: Transaction[];
  onTransactionClick: (transaction: Transaction) => void;
}

type SortField = keyof Pick<
  Transaction,
  'timestamp' | 'amount' | 'merchantName' | 'status'
>;
type SortDirection = 'asc' | 'desc';

interface RowItemData {
  transactions: Transaction[];
  onTransactionClick: (transaction: Transaction) => void;
}

const ROW_HEIGHT = 56;
const HEADER_HEIGHT = 44;
const HEIGHT = 600;

export const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  onTransactionClick,
}) => {
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        setSortField(field);
        setSortDirection(field === 'timestamp' ? 'desc' : 'asc');
      }
    },
    [sortField, sortDirection]
  );

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'timestamp':
          aValue = new Date(a.timestamp).getTime();
          bValue = new Date(b.timestamp).getTime();
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'merchantName':
          aValue = a.merchantName.toLowerCase();
          bValue = b.merchantName.toLowerCase();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [transactions, sortField, sortDirection]);

  const itemData = useMemo(
    () => ({
      transactions: sortedTransactions,
      onTransactionClick,
    }),
    [sortedTransactions, onTransactionClick]
  );

  const getSortIcon = (field: SortField): React.ReactNode => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp size={14} />
    ) : (
      <ChevronDown size={14} />
    );
  };

  const rowRenderer = useCallback(
    (props: RowComponentProps<RowItemData>) => {
      const { index, style, transactions, onTransactionClick } = props;
      const transaction = transactions[index];

      if (!transaction) return null;

      return (
        <TransactionRow
          key={transaction.id}
          style={style}
          transaction={transaction}
          onTransactionClick={onTransactionClick}
        />
      );
    },
    []
  );

  return (
    <div className={styles.table}>
      <div className={styles.header} role="table" aria-label="Transactions">
        <div role="row" className={styles.headerRow}>
          <div
            role="columnheader"
            className={`${styles.headerCell} ${styles.merchant}`}
            aria-sort={
              sortField === 'merchantName'
                ? sortDirection === 'asc'
                  ? 'ascending'
                  : 'descending'
                : 'none'
            }
          >
            <button
              onClick={() => handleSort('merchantName')}
              className={styles.sortButton}
              aria-label={`Sort by merchant ${sortField === 'merchantName' ? sortDirection : ''}`}
            >
              Merchant
              {getSortIcon('merchantName')}
            </button>
          </div>

          <div
            role="columnheader"
            className={`${styles.headerCell} ${styles.amount}`}
            aria-sort={
              sortField === 'amount'
                ? sortDirection === 'asc'
                  ? 'ascending'
                  : 'descending'
                : 'none'
            }
          >
            <button
              onClick={() => handleSort('amount')}
              className={styles.sortButton}
              aria-label={`Sort by amount ${sortField === 'amount' ? sortDirection : ''}`}
            >
              Amount
              {getSortIcon('amount')}
            </button>
          </div>

          <div
            role="columnheader"
            className={`${styles.headerCell} ${styles.status}`}
            aria-sort={
              sortField === 'status'
                ? sortDirection === 'asc'
                  ? 'ascending'
                  : 'descending'
                : 'none'
            }
          >
            <button
              onClick={() => handleSort('status')}
              className={styles.sortButton}
              aria-label={`Sort by status ${sortField === 'status' ? sortDirection : ''}`}
            >
              Status
              {getSortIcon('status')}
            </button>
          </div>

          <div
            role="columnheader"
            className={`${styles.headerCell} ${styles.date}`}
            aria-sort={
              sortField === 'timestamp'
                ? sortDirection === 'asc'
                  ? 'ascending'
                  : 'descending'
                : 'none'
            }
          >
            <button
              onClick={() => handleSort('timestamp')}
              className={styles.sortButton}
              aria-label={`Sort by date ${sortField === 'timestamp' ? sortDirection : ''}`}
            >
              Date
              {getSortIcon('timestamp')}
            </button>
          </div>
        </div>
      </div>

      <div className={styles.body} style={{ height: HEIGHT - HEADER_HEIGHT }}>
        <List
          rowComponent={rowRenderer}
          rowCount={sortedTransactions.length}
          rowHeight={ROW_HEIGHT}
          rowProps={itemData}
          overscanCount={10}
          style={{
            height: HEIGHT - HEADER_HEIGHT,
            width: '100%',
          }}
        />
      </div>
    </div>
  );
};

interface TransactionRowProps {
  style: CSSProperties;
  transaction: Transaction;
  onTransactionClick: (transaction: Transaction) => void;
}

const TransactionRow: React.FC<TransactionRowProps> = ({
  style,
  transaction,
  onTransactionClick,
}) => {

  const formatDate = (date: Date): string => {
    return format(date, 'MMM dd, yyyy');
  };

  const formatTime = (date: Date): string => {
    return format(date, 'HH:mm');
  };

  const handleClick = () => {
    onTransactionClick(transaction);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div style={style}>
      <div
        role="row"
        className={styles.row}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        aria-label={`${transaction.merchantName} transaction for ${formatCurrency(transaction.amount)}`}
      >
        <div role="gridcell" className={`${styles.cell} ${styles.merchant}`}>
          <div className={styles.merchantInfo}>
            <div className={styles.merchantName}>
              {transaction.merchantName}
            </div>
            <div className={styles.description}>{transaction.description}</div>
          </div>
        </div>

        <div role="gridcell" className={`${styles.cell} ${styles.amount}`}>
          <div className={`${styles.amountValue} ${styles[transaction.type]}`}>
            {transaction.type === 'debit' ? '-' : '+'}
            {formatCurrency(transaction.amount)}
          </div>
        </div>

        <div role="gridcell" className={`${styles.cell} ${styles.status}`}>
          <span
            className={`${styles.statusBadge} ${styles[transaction.status]}`}
          >
            {transaction.status}
          </span>
        </div>

        <div role="gridcell" className={`${styles.cell} ${styles.date}`}>
          <div className={styles.dateInfo}>
            <div className={styles.dateValue}>
              {formatDate(transaction.timestamp)}
            </div>
            <div className={styles.timeValue}>
              {formatTime(transaction.timestamp)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
