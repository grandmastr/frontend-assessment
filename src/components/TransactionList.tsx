import React, {
  CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { List, type RowComponentProps } from 'react-window';
import { Transaction } from '../types/transaction';
import { format } from 'date-fns';

const ROW_GAP = 12;
const ITEM_HEIGHT = 176;
const ROW_HEIGHT = ITEM_HEIGHT + ROW_GAP;
const MAX_LIST_HEIGHT = 600;

interface TransactionListProps {
  transactions: Transaction[];
  totalTransactions?: number;
  onTransactionClick: (transaction: Transaction) => void;
}

type ListItemData = {
  transactions: Transaction[];
  selectedItems: Set<string>;
  hoveredItem: string | null;
  onItemClick: (transaction: Transaction) => void;
  onMouseEnter: (id: string) => void;
  onMouseLeave: () => void;
  formatCurrency: (amount: number) => string;
  rowGap: number;
  itemHeight: number;
};

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  totalTransactions,
  onTransactionClick,
}) => {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }),
    []
  );

  useEffect(() => {
    setSelectedItems(new Set());
    if (transactions.length > 0) {
      localStorage.setItem(
        'lastTransactionCount',
        transactions.length.toString()
      );
    }
  }, [transactions]);

  const handleItemClick = useCallback(
    (transaction: Transaction) => {
      setSelectedItems(prev => {
        const updatedSelected = new Set(prev);
        if (updatedSelected.has(transaction.id)) {
          updatedSelected.delete(transaction.id);
        } else {
          updatedSelected.add(transaction.id);
        }
        return updatedSelected;
      });
      onTransactionClick(transaction);
    },
    [onTransactionClick]
  );

  const handleMouseEnter = useCallback((id: string) => {
    setHoveredItem(id);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredItem(null);
  }, []);

  const sortedTransactions = useMemo(
    () =>
      [...transactions].sort((a, b) => {
        return (
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      }),
    [transactions]
  );

  const totalAmount = useMemo(
    () => sortedTransactions.reduce((sum, t) => sum + t.amount, 0),
    [sortedTransactions]
  );

  const formatCurrency = useCallback(
    (amount: number) => currencyFormatter.format(amount),
    [currencyFormatter]
  );

  const itemData = useMemo<ListItemData>(
    () => ({
      transactions: sortedTransactions,
      selectedItems,
      hoveredItem,
      onItemClick: handleItemClick,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      formatCurrency,
      rowGap: ROW_GAP,
      itemHeight: ITEM_HEIGHT,
    }),
    [
      sortedTransactions,
      selectedItems,
      hoveredItem,
      handleItemClick,
      handleMouseEnter,
      handleMouseLeave,
      formatCurrency,
    ]
  );

  const rowRenderer = useCallback(
    (props: RowComponentProps<ListItemData>) => {
      const {
        index,
        style,
        transactions,
        selectedItems,
        hoveredItem,
        onItemClick,
        onMouseEnter,
        onMouseLeave,
        formatCurrency,
        rowGap,
        itemHeight,
      } = props;

      const transaction = transactions[index];
      if (!transaction) return null;

      return (
        <TransactionItem
          key={transaction.id}
          transaction={transaction}
          isSelected={selectedItems.has(transaction.id)}
          isHovered={hoveredItem === transaction.id}
          onClick={() => onItemClick(transaction)}
          onMouseEnter={() => onMouseEnter(transaction.id)}
          onMouseLeave={onMouseLeave}
          rowIndex={index}
          style={style}
          formatCurrency={formatCurrency}
          rowGap={rowGap}
          itemHeight={itemHeight}
        />
      );
    },
    []
  );

  return (
    <div
      className="transaction-list"
      role="region"
      aria-label="Transaction list"
    >
      <div className="transaction-list-header">
        <h2 id="transaction-list-title">
          Transactions ({transactions.length}
          {totalTransactions && totalTransactions !== transactions.length && (
            <span> of {totalTransactions}</span>
          )}
          )
        </h2>
        <span className="total-amount" aria-live="polite">
          Total:{' '}
          {formatCurrency(totalAmount)}
        </span>
      </div>

      <div
        className="transaction-list-container"
        role="grid"
        aria-labelledby="transaction-list-title"
        aria-rowcount={sortedTransactions.length}
        tabIndex={0}
      >
        <List
          rowComponent={rowRenderer}
          rowCount={sortedTransactions.length}
          rowHeight={ROW_HEIGHT}
          rowProps={itemData}
          overscanCount={8}
          style={{
            height: Math.max(
              ROW_HEIGHT,
              Math.min(MAX_LIST_HEIGHT, sortedTransactions.length * ROW_HEIGHT)
            ),
            width: '100%',
            boxSizing: 'border-box'
          }}
        />
      </div>
    </div>
  );
};

const TransactionItem: React.FC<{
  transaction: Transaction;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  rowIndex: number;
  style: CSSProperties;
  formatCurrency: (amount: number) => string;
  rowGap: number;
  itemHeight: number;
}> = ({
  transaction,
  isSelected,
  isHovered,
  onClick,
  onMouseEnter,
  onMouseLeave,
  rowIndex,
  style,
  formatCurrency,
  rowGap,
  itemHeight,
}) => {
  const formatDate = (date: Date) => format(date, 'MMM dd, yyyy HH:mm');
  const displayTimestamp =
    transaction.timestamp instanceof Date
      ? transaction.timestamp
      : new Date(transaction.timestamp);

  const getItemStyle = () => {
    const baseStyle = {
      backgroundColor: isSelected ? '#e3f2fd' : '#ffffff',
      borderColor: isHovered ? '#2196f3' : '#e0e0e0',
      boxShadow: isHovered
        ? '0 4px 8px rgba(0,0,0,0.1)'
        : '0 2px 4px rgba(0,0,0,0.05)',
      transition: 'transform 120ms ease',
      transform: isHovered ? 'translateY(-1px)' : 'translateY(0)',
    };

    if (transaction.type === 'debit') {
      return {
        ...baseStyle,
        borderLeft: '4px solid #f44336',
      };
    }

    return {
      ...baseStyle,
      borderLeft: '4px solid #4caf50',
    };
  };

  return (
    <div
      style={{
        ...style,
        paddingBottom: rowGap,
        width: '100%',
      }}
    >
      <div
        className="transaction-item"
        style={{
          ...getItemStyle(),
          marginBottom: 0,
          minHeight: itemHeight,
        }}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        role="gridcell"
        aria-rowindex={rowIndex + 1}
        aria-selected={isSelected}
        aria-describedby={`transaction-${transaction.id}-details`}
        tabIndex={0}
      >
        <div className="transaction-main">
          <div className="transaction-merchant">
            <span className="merchant-name">{transaction.merchantName}</span>
            <span className="transaction-category">{transaction.category}</span>
          </div>
          <div className="transaction-amount">
            <span className={`amount ${transaction.type}`}>
              {transaction.type === 'debit' ? '-' : '+'}
              {formatCurrency(transaction.amount)}
            </span>
          </div>
        </div>
        <div
          className="transaction-details"
          id={`transaction-${transaction.id}-details`}
        >
          <div
            className="transaction-description"
            aria-label={`Description: ${transaction.description}`}
          >
            {transaction.description}
          </div>
          <div className="transaction-meta">
            <span
              className="transaction-date"
              aria-label={`Date: ${formatDate(displayTimestamp)}`}
            >
              {formatDate(displayTimestamp)}
            </span>
            <span
              className={`transaction-status ${transaction.status}`}
              aria-label={`Status: ${transaction.status}`}
              aria-live="polite"
            >
              {transaction.status}
            </span>
            {transaction.location && (
              <span
                className="transaction-location"
                aria-label={`Location: ${transaction.location}`}
              >
                {transaction.location}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
