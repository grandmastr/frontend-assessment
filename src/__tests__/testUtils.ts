import type { Transaction } from '../types/transaction';

export const createTransaction = (
  overrides: Partial<Transaction> = {}
): Transaction => ({
  id: overrides.id ?? `txn-${Math.random().toString(36).slice(2)}`,
  timestamp: overrides.timestamp ?? new Date('2024-01-01T00:00:00Z'),
  amount: overrides.amount ?? 100,
  currency: overrides.currency ?? 'USD',
  type: overrides.type ?? 'debit',
  category: overrides.category ?? 'general',
  description: overrides.description ?? 'Test transaction',
  merchantName: overrides.merchantName ?? 'Test Merchant',
  status: overrides.status ?? 'completed',
  userId: overrides.userId ?? 'user-1',
  accountId: overrides.accountId ?? 'acc-1',
  location: overrides.location,
  reference: overrides.reference,
});
