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
  const handleStatusChange = useCallback((status: string) => {
    onFiltersChange({
      ...filters,
      status: status === 'all' ? undefined : status as 'pending' | 'completed' | 'failed'
    });
  }, [filters, onFiltersChange]);

  const handleTypeChange = useCallback((type: string) => {
    onFiltersChange({
      ...filters,
      type: type === 'all' ? undefined : type as 'debit' | 'credit'
    });
  }, [filters, onFiltersChange]);

  const handleCategoryChange = useCallback((category: string) => {
    onFiltersChange({
      ...filters,
      category: category === 'all' ? undefined : category
    });
  }, [filters, onFiltersChange]);

  return (
    <div className={styles.filterBar}>
      <div className={styles.filters}>
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