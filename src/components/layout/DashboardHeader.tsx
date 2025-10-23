import React from 'react';
import { SearchBar } from '../search/SearchBar.tsx';
import styles from './DashboardHeader.module.css';

interface DashboardHeaderProps {
  onSearch?: (query: string) => void;
  searchValue?: string;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  onSearch
}) => {
  return (
    <div className={styles.header}>
      <div className={styles.brand}>
        <h1 className={styles.title}>FinTech Dashboard</h1>
      </div>

      <div className={styles.search} role="search">
        <SearchBar onSearch={onSearch || (() => {})} />
      </div>
    </div>
  );
};
