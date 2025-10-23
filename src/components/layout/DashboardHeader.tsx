import React from 'react';
import { SearchBar } from '../search/SearchBar';
import styles from './DashboardHeader.module.css';

interface DashboardHeaderProps {
  onSearch?: (query: string) => void;
  searchValue?: string;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  onSearch
}) => {
  // provides a fallback no-op function if onSearch prop is not provided
  // ensures SearchBar always has a valid callback to prevent runtime errors
  const handleSearch = onSearch || (() => {});

  return (
    <div className={styles.header}>
      <div className={styles.brand}>
        <h1 className={styles.title}>FinTech Dashboard</h1>
      </div>

      <div className={styles.search} role="search">
        <SearchBar onSearch={handleSearch} />
      </div>
    </div>
  );
};
