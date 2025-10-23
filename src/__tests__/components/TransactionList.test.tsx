import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { TransactionList } from '../../components/TransactionList';
import { createTransaction } from '../testUtils';

type RowProps = {
  index: number;
  style: React.CSSProperties;
  transactions: ReturnType<typeof createTransactions>;
};

type ListProps = {
  rowComponent: (props: RowProps & Record<string, unknown>) => React.ReactElement | null;
  rowCount: number;
  rowHeight: number;
  rowProps: Record<string, unknown>;
  overscanCount: number;
  style?: React.CSSProperties;
};

const createTransactions = () => [
  createTransaction({ id: '1', merchantName: 'Coffee Shop', timestamp: new Date('2024-03-01T10:00:00Z'), amount: 25 }),
  createTransaction({ id: '2', merchantName: 'Book Store', timestamp: new Date('2024-03-02T12:00:00Z'), amount: 40, type: 'credit' }),
  createTransaction({ id: '3', merchantName: 'Grocery', timestamp: new Date('2024-02-25T09:00:00Z'), amount: 60 }),
];

vi.mock('react-window', () => ({
  List: ({ rowComponent, rowCount, rowProps }: ListProps) => (
    <div data-testid="virtual-list">
      {Array.from({ length: rowCount }, (_, index) => {
        const element = rowComponent({
          index,
          style: {},
          ...rowProps,
        } as RowProps & Record<string, unknown>);
        return <React.Fragment key={index}>{element}</React.Fragment>;
      })}
    </div>
  ),
}));

describe('TransactionList', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('virtual list rendering', () => {
    const onClick = vi.fn();
    render(<TransactionList transactions={createTransactions()} onTransactionClick={onClick} />);

    expect(screen.getAllByRole('gridcell')).toHaveLength(3);
  });

  it('item selection behavior', () => {
    const onClick = vi.fn();
    render(<TransactionList transactions={createTransactions()} onTransactionClick={onClick} />);

    const firstRow = screen.getAllByRole('gridcell')[0];
    fireEvent.click(firstRow);

    expect(onClick).toHaveBeenCalled();
    expect(firstRow).toHaveAttribute('aria-selected', 'true');
  });

  it('currency formatting', () => {
    const onClick = vi.fn();
    render(
      <TransactionList transactions={createTransactions()} totalTransactions={10} onTransactionClick={onClick} />
    );

    expect(screen.getByText(/Total:/)).toHaveTextContent('$');
  });

  it('sorting functionality', () => {
    const onClick = vi.fn();
    render(<TransactionList transactions={createTransactions()} onTransactionClick={onClick} />);

    const merchantNames = screen.getAllByText(/Shop|Store|Grocery/).map(node => node.textContent);
    expect(merchantNames[0]).toBe('Book Store');
  });

  it('accessibility features', () => {
    const onClick = vi.fn();
    render(<TransactionList transactions={createTransactions()} onTransactionClick={onClick} />);

    expect(screen.getByRole('region', { name: /Transaction list/i })).toBeInTheDocument();
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });
});
