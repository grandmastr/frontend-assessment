import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Building,
  Calendar,
  CreditCard,
  Hash,
  MapPin,
  User,
  X
} from 'lucide-react';
import styles from './TransactionDetailSheet.module.css';
import { Transaction } from '../../types/transaction';
import { Button } from '../ui/Button';
import { formatCurrency, formatDateTime } from '../../utils/dateHelpers';

interface TransactionDetailSheetProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TransactionDetailSheet: React.FC<TransactionDetailSheetProps> = ({
  transaction,
  isOpen,
  onClose
}) => {
  if (!transaction) {
    return null;
  }

  // returns the appropriate CSS class for the transaction status badge (completed, pending, failed)
  const getStatusClass = (status: string) => {
    return `${styles.status} ${styles[`status--${status}`]}`;
  };

  // returns the appropriate CSS class for the amount display based on transaction type (debit/credit)
  // applies different styling for negative (debit) vs positive (credit) amounts
  const getAmountClass = (type: string) => {
    return `${styles.amount} ${styles[`amount--${type}`]}`;
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.content}>
          <Dialog.Title className={styles.title}>
            Transaction Details
          </Dialog.Title>
          <Dialog.Description className={styles.description}>
            Detailed information about this transaction
          </Dialog.Description>

          <div className={styles.header}>
            <Dialog.Close asChild>
              <Button
                variant="ghost"
                size="sm"
                className={styles.closeButton}
                aria-label="Close transaction details"
              >
                <X size={20} />
              </Button>
            </Dialog.Close>
          </div>

          <div className={styles.body}>
            <div className={styles.mainInfo}>
              <div className={styles.merchantSection}>
                <h3 className={styles.merchantName}>{transaction.merchantName}</h3>
                <p className={styles.transactionDescription}>{transaction.description}</p>
              </div>

              <div className={styles.amountSection}>
                <div className={getAmountClass(transaction.type)}>
                  {transaction.type === 'debit' ? '-' : '+'}
                  {formatCurrency(transaction.amount)}
                </div>
                <div className={styles.currency}>{transaction.currency}</div>
              </div>
            </div>

            <div className={styles.statusRow}>
              <div className={styles.statusItem}>
                <span className={styles.label}>Status</span>
                <span className={getStatusClass(transaction.status)}>
                  {transaction.status}
                </span>
              </div>
              <div className={styles.statusItem}>
                <span className={styles.label}>Type</span>
                <span className={styles.typeValue}>
                  {transaction.type === 'debit' ? 'Debit' : 'Credit'}
                </span>
              </div>
            </div>

            {/* Detailed Information */}
            <div className={styles.detailsSection}>
              <h4 className={styles.sectionTitle}>Transaction Information</h4>

              <div className={styles.detailRow}>
                <div className={styles.detailItem}>
                  <div className={styles.detailLabel}>
                    <Calendar size={16} aria-hidden="true" />
                    <span>Date & Time</span>
                  </div>
                  <div className={styles.detailValue}>
                    {formatDateTime(transaction.timestamp)}
                  </div>
                </div>
              </div>

              <div className={styles.detailRow}>
                <div className={styles.detailItem}>
                  <div className={styles.detailLabel}>
                    <Hash size={16} aria-hidden="true" />
                    <span>Transaction ID</span>
                  </div>
                  <div className={styles.detailValue}>
                    <code className={styles.transactionId}>{transaction.id}</code>
                  </div>
                </div>
              </div>

              <div className={styles.detailRow}>
                <div className={styles.detailItem}>
                  <div className={styles.detailLabel}>
                    <CreditCard size={16} aria-hidden="true" />
                    <span>Category</span>
                  </div>
                  <div className={styles.detailValue}>
                    {transaction.category}
                  </div>
                </div>
              </div>

              {transaction.location && (
                <div className={styles.detailRow}>
                  <div className={styles.detailItem}>
                    <div className={styles.detailLabel}>
                      <MapPin size={16} aria-hidden="true" />
                      <span>Location</span>
                    </div>
                    <div className={styles.detailValue}>
                      {transaction.location}
                    </div>
                  </div>
                </div>
              )}

              {transaction.reference && (
                <div className={styles.detailRow}>
                  <div className={styles.detailItem}>
                    <div className={styles.detailLabel}>
                      <Hash size={16} aria-hidden="true" />
                      <span>Reference</span>
                    </div>
                    <div className={styles.detailValue}>
                      <code className={styles.reference}>{transaction.reference}</code>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.detailsSection}>
              <h4 className={styles.sectionTitle}>Account Information</h4>

              <div className={styles.detailRow}>
                <div className={styles.detailItem}>
                  <div className={styles.detailLabel}>
                    <User size={16} aria-hidden="true" />
                    <span>User ID</span>
                  </div>
                  <div className={styles.detailValue}>
                    <code className={styles.userId}>{transaction.userId}</code>
                  </div>
                </div>
              </div>

              <div className={styles.detailRow}>
                <div className={styles.detailItem}>
                  <div className={styles.detailLabel}>
                    <Building size={16} aria-hidden="true" />
                    <span>Account ID</span>
                  </div>
                  <div className={styles.detailValue}>
                    <code className={styles.accountId}>{transaction.accountId}</code>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.footer}>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
