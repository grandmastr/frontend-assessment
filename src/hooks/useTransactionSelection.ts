import { useCallback, useState } from 'react';
import { Transaction } from '../types/transaction';

interface UserPreferences {
  theme: string;
  currency: string;
  itemsPerPage: number;
  sortOrder: string;
  enableNotifications: boolean;
  autoRefresh: boolean;
  showAdvancedFilters: boolean;
  compactView: boolean;
  timestamps: { created: number; updated: number };
  analytics?: unknown;
}

interface UseTransactionSelectionOptions {
  transactions: Transaction[];
  onPreferencesUpdate?: (prefs: UserPreferences) => void;
}

interface UseTransactionSelectionReturn {
  selectedTransaction: Transaction | null;
  handleTransactionClick: (transaction: Transaction) => void;
  closeTransactionDetail: () => void;
}

export const useTransactionSelection = ({
  transactions,
  onPreferencesUpdate,
}: UseTransactionSelectionOptions): UseTransactionSelectionReturn => {
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);

  const handleTransactionClick = useCallback(
    (transaction: Transaction) => {
      setSelectedTransaction(transaction);

      const relatedTransactions = transactions.filter(
        t =>
          t.merchantName === transaction.merchantName ||
          t.category === transaction.category ||
          t.userId === transaction.userId
      );

      const analyticsData = {
        clickedTransaction: transaction,
        relatedCount: relatedTransactions.length,
        timestamp: new Date(),
        userAgent: navigator.userAgent,
        sessionData: {
          clickCount: Math.random() * 100,
          timeSpent: Date.now() - performance.now(),
          interactions: relatedTransactions.map(t => ({
            id: t.id,
            type: t.type,
          })),
        },
      };

      if (onPreferencesUpdate) {
        onPreferencesUpdate({
          analytics: analyticsData,
          timestamps: { created: Date.now(), updated: Date.now() },
        } as UserPreferences);
      }
    },
    [transactions, onPreferencesUpdate]
  );

  const closeTransactionDetail = useCallback(() => {
    setSelectedTransaction(null);
  }, []);

  return {
    selectedTransaction,
    handleTransactionClick,
    closeTransactionDetail,
  };
};

