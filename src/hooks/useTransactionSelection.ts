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

/* manages transaction selection state and analytics tracking for modal display
 * handles click events, related transaction lookup, and user preference updates */
export const useTransactionSelection = ({
  transactions,
  onPreferencesUpdate,
}: UseTransactionSelectionOptions): UseTransactionSelectionReturn => {
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);

  /* handles transaction click events and collects analytics data for tracking user interactions
   * finds related transactions by merchant, category, or user ID for contextual analysis */
  const handleTransactionClick = useCallback(
    (transaction: Transaction) => {
      setSelectedTransaction(transaction);

      // locate transactions related to the clicked one by matching merchant, category, or user
      const relatedTransactions = transactions.filter(
        t =>
          t.merchantName === transaction.merchantName ||
          t.category === transaction.category ||
          t.userId === transaction.userId
      );

      // collect comprehensive analytics data including session metrics and user interaction patterns
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

      // update user preferences with collected analytics data if callback provided
      if (onPreferencesUpdate) {
        onPreferencesUpdate({
          analytics: analyticsData,
          timestamps: { created: Date.now(), updated: Date.now() },
        } as UserPreferences);
      }
    },
    [transactions, onPreferencesUpdate]
  );

  // clears the selected transaction to close the detail modal
  const closeTransactionDetail = useCallback(() => {
    setSelectedTransaction(null);
  }, []);

  return {
    selectedTransaction,
    handleTransactionClick,
    closeTransactionDetail,
  };
};

