import React, { useCallback } from 'react';
import * as Select from '@radix-ui/react-select';
import { ChevronDown } from 'lucide-react';
import styles from './FilterBar.module.css';
import { FilterOptions } from '../../types/transaction';

interface FilterBarProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  categories: string[];
  totalCount: number;
  filteredCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFiltersChange,
  categories,
  totalCount,
  filteredCount
}) => {
  // handles status filter changes, converting 'all' to undefined to clear the filter
  // updates only the status field while preserving other active filters
  const handleStatusChange = useCallback((status: string) => {
    onFiltersChange({
      ...filters,
      status: status === 'all' ? undefined : status as 'pending' | 'completed' | 'failed'
    });
  }, [filters, onFiltersChange]);

  // handles transaction type filter changes (debit/credit)
  // clears the type filter when 'all' is selected to show all transaction types
  const handleTypeChange = useCallback((type: string) => {
    onFiltersChange({
      ...filters,
      type: type === 'all' ? undefined : type as 'debit' | 'credit'
    });
  }, [filters, onFiltersChange]);

  // handles category filter changes from the dynamic category list
  // allows filtering by transaction category or clearing with 'all' option
  const handleCategoryChange = useCallback((category: string) => {
    onFiltersChange({
      ...filters,
      category: category === 'all' ? undefined : category
    });
  }, [filters, onFiltersChange]);

  return (
    <div className={styles.filterBar}>
      {/* filter controls section with three dropdown selects for status, type, and category */}
      <div className={styles.filters}>
        {/* status filter dropdown: allows filtering by completed, pending, or failed transactions */}
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Status</label>
          <Select.Root
            value={filters.status || 'all'}
            onValueChange={handleStatusChange}
          >
            <Select.Trigger className={styles.trigger}>
              <Select.Value placeholder="All Statuses" />
              <Select.Icon>
                <ChevronDown size={16} />
              </Select.Icon>
              {/* visual indicator dot shown when a status filter is actively applied */}
              {filters.status && filters.status !== 'all' && (
                <div className={styles.activeIndicator} aria-hidden="true" />
              )}
            </Select.Trigger>

            <Select.Portal>
              <Select.Content className={styles.content}>
                <Select.Viewport>
                  <Select.Item value="all" className={styles.item}>
                    <Select.ItemText>All Statuses</Select.ItemText>
                  </Select.Item>
                  <Select.Item value="completed" className={styles.item}>
                    <Select.ItemText>Completed</Select.ItemText>
                  </Select.Item>
                  <Select.Item value="pending" className={styles.item}>
                    <Select.ItemText>Pending</Select.ItemText>
                  </Select.Item>
                  <Select.Item value="failed" className={styles.item}>
                    <Select.ItemText>Failed</Select.ItemText>
                  </Select.Item>
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>

        {/* transaction type filter dropdown: filters by debit or credit transactions */}
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Type</label>
          <Select.Root
            value={filters.type || 'all'}
            onValueChange={handleTypeChange}
          >
            <Select.Trigger className={styles.trigger}>
              <Select.Value placeholder="All Types" />
              <Select.Icon>
                <ChevronDown size={16} />
              </Select.Icon>
              {/* visual indicator dot shown when a type filter is actively applied */}
              {filters.type && filters.type !== 'all' && (
                <div className={styles.activeIndicator} aria-hidden="true" />
              )}
            </Select.Trigger>

            <Select.Portal>
              <Select.Content className={styles.content}>
                <Select.Viewport>
                  <Select.Item value="all" className={styles.item}>
                    <Select.ItemText>All Types</Select.ItemText>
                  </Select.Item>
                  <Select.Item value="debit" className={styles.item}>
                    <Select.ItemText>Debit</Select.ItemText>
                  </Select.Item>
                  <Select.Item value="credit" className={styles.item}>
                    <Select.ItemText>Credit</Select.ItemText>
                  </Select.Item>
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>

        {/* category filter dropdown: dynamically populated with unique categories from transactions */}
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Category</label>
          <Select.Root
            value={filters.category || 'all'}
            onValueChange={handleCategoryChange}
          >
            <Select.Trigger className={styles.trigger}>
              <Select.Value placeholder="All Categories" />
              <Select.Icon>
                <ChevronDown size={16} />
              </Select.Icon>
              {/* visual indicator dot shown when a category filter is actively applied */}
              {filters.category && filters.category !== 'all' && (
                <div className={styles.activeIndicator} aria-hidden="true" />
              )}
            </Select.Trigger>

            <Select.Portal>
              <Select.Content className={styles.content}>
                <Select.Viewport>
                  <Select.Item value="all" className={styles.item}>
                    <Select.ItemText>All Categories</Select.ItemText>
                  </Select.Item>
                  {/* dynamically render category options from the provided categories array */}
                  {categories.map(category => (
                    <Select.Item key={category} value={category} className={styles.item}>
                      <Select.ItemText>{category}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>
      </div>

      {/* summary section displaying the count of filtered transactions vs total transactions */}
      <div className={styles.summary}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryValue}>{filteredCount}</span>
          <span>filtered</span>
        </div>
        <div className={styles.summaryItem}>
          <span>of</span>
          <span className={styles.summaryValue}>{totalCount}</span>
          <span>total</span>
        </div>
      </div>
    </div>
  );
};
