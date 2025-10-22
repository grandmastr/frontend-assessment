import React from 'react';
import { FilterOptions } from '../types/transaction';

interface FilterControlsProps {
  filters: FilterOptions;
  categories: string[];
  onFilterChange: (filters: FilterOptions) => void;
}

export const FilterControls: React.FC<FilterControlsProps> = ({
  filters,
  categories,
  onFilterChange,
}) => {
  return (
    <div className="filter-controls">
      <select
        value={filters.type || 'all'}
        onChange={e =>
          onFilterChange({
            ...filters,
            type: e.target.value as 'debit' | 'credit' | 'all',
          })
        }
      >
        <option value="all">All Types</option>
        <option value="debit">Debit</option>
        <option value="credit">Credit</option>
      </select>

      <select
        value={filters.status || 'all'}
        onChange={e =>
          onFilterChange({
            ...filters,
            status: e.target.value as
              | 'pending'
              | 'completed'
              | 'failed'
              | 'all',
          })
        }
      >
        <option value="all">All Status</option>
        <option value="completed">Completed</option>
        <option value="pending">Pending</option>
        <option value="failed">Failed</option>
      </select>

      <select
        value={filters.category || ''}
        onChange={e =>
          onFilterChange({ ...filters, category: e.target.value })
        }
      >
        <option value="">All Categories</option>
        {categories.map(category => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
    </div>
  );
};

