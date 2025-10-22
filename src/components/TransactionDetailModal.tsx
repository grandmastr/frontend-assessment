import React from 'react';
import { Transaction } from '../types/transaction';

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  onClose: () => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  onClose,
}) => {
  if (!transaction) return null;

  return (
    <div className="transaction-detail-modal">
      <div className="modal-content">
        <h3>Transaction Details</h3>
        <div className="transaction-details">
          <p>
            <strong>ID:</strong> {transaction.id}
          </p>
          <p>
            <strong>Merchant:</strong> {transaction.merchantName}
          </p>
          <p>
            <strong>Amount:</strong> ${transaction.amount}
          </p>
          <p>
            <strong>Category:</strong> {transaction.category}
          </p>
          <p>
            <strong>Status:</strong> {transaction.status}
          </p>
          <p>
            <strong>Date:</strong>{' '}
            {transaction.timestamp.toLocaleString()}
          </p>
        </div>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

