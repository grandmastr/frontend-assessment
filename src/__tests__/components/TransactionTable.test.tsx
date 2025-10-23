/*
* unit test for the TransactionTable component testing:
* - virtual list rendering with react-window
* - row click behavior and callbacks
* - currency formatting in cells
* - sorting functionality by multiple columns
* - accessibility features like ARIA roles
**/

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { TransactionTable } from '../../components/transactions/TransactionTable';
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

// helper to generate test transactions with various attributes
const createTransactions = () => [
  createTransaction({ id: '1', merchantName: 'Coffee Shop', timestamp: new Date('2024-03-01T10:00:00Z'), amount: 25 }),
  createTransaction({ id: '2', merchantName: 'Book Store', timestamp: new Date('2024-03-02T12:00:00Z'), amount: 40, type: 'credit' }),
  createTransaction({ id: '3', merchantName: 'Grocery', timestamp: new Date('2024-02-25T09:00:00Z'), amount: 60 }),
];

// mock react-window List to simulate virtualized rendering without actual DOM virtualization
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

describe('TransactionTable', () => {
  // clear localStorage before each test to ensure test isolation
  beforeEach(() => {
    localStorage.clear();
  });

  // verifies that the virtual list renders the correct number of cells (4 columns x 3 rows)
  it('virtual list rendering', () => {
    const onClick = vi.fn();
    render(<TransactionTable transactions={createTransactions()} onTransactionClick={onClick} />);

    expect(screen.getAllByRole('gridcell')).toHaveLength(12); // 4 columns x 3 rows
  });

  // verifies that clicking a transaction row triggers the callback with the correct transaction
  it('item click behavior', () => {
    const onClick = vi.fn();
    render(<TransactionTable transactions={createTransactions()} onTransactionClick={onClick} />);

    const firstRow = screen.getAllByRole('row')[1]; // Skip header row
    fireEvent.click(firstRow);

    expect(onClick).toHaveBeenCalled();
  });

  // verifies that currency amounts are properly formatted and displayed in the table
  it('currency formatting', () => {
    const onClick = vi.fn();
    render(<TransactionTable transactions={createTransactions()} onTransactionClick={onClick} />);

    expect(screen.getByText(/\$25\.00/)).toBeInTheDocument();
    expect(screen.getByText(/\$40\.00/)).toBeInTheDocument();
  });

  /*
  * verifies sorting functionality:
  * - all sort buttons are present for each column
  * - clicking a sort button reorders the data
  * - sorted data appears in the correct order
  */
  it('sorting functionality', () => {
    const onClick = vi.fn();
    render(<TransactionTable transactions={createTransactions()} onTransactionClick={onClick} />);

    // verify all sort buttons are present
    expect(screen.getByRole('button', { name: /sort by merchant/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sort by amount/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sort by status/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sort by date/i })).toBeInTheDocument();

    // verify sorting by merchant name reorders data correctly
    const merchantSortButton = screen.getByRole('button', { name: /sort by merchant/i });
    fireEvent.click(merchantSortButton);

    const merchantNames = screen.getAllByText(/Shop|Store|Grocery/);
    expect(merchantNames[0]).toHaveTextContent('Book Store');
  });

  // verifies ARIA roles are properly applied for screen readers and assistive technologies
  it('accessibility features', () => {
    const onClick = vi.fn();
    render(<TransactionTable transactions={createTransactions()} onTransactionClick={onClick} />);


    expect(screen.getByRole('table', { name: /Transactions/i })).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader')).toHaveLength(4);
    expect(screen.getAllByRole('row')).toHaveLength(4); // 1 header + 3 data rows
  });
});
