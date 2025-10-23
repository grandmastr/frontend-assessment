import React from 'react';
import styles from './DashboardLayout.module.css';

interface DashboardLayoutProps {
  header: React.ReactNode;
  filters: React.ReactNode;
  main: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  header,
  filters,
  main,
}) => {
  return (
    <div className={styles.layout}>
      {/* skip link for keyboard users to bypass header and filters and jump directly to main content */}
      <a href="#mainContent" className={styles.skipLink}>
        Skip to main content
      </a>

      {/* header section contains branding and search functionality */}
      <header className={styles.header} role="banner">
        {header}
      </header>

      {/* filters section provides transaction filtering controls and search */}
      <div className={styles.filters} aria-label="Filters and search">
        {filters}
      </div>

      {/* main content area displays the transaction list and primary dashboard content */}
      <main id="mainContent" className={styles.main} role="main">
        {main}
      </main>
    </div>
  );
};
