import React from 'react';
import styles from './DashboardLayout.module.css';

interface DashboardLayoutProps {
  header: React.ReactNode;
  filters: React.ReactNode;
  main: React.ReactNode;
  sidePanel?: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  header,
  filters,
  main,
  sidePanel
}) => {
  return (
    <div className={styles.layout}>
      <a href="#mainContent" className={styles.skipLink}>
        Skip to main content
      </a>

      <header className={styles.header} role="banner">
        {header}
      </header>

      <div className={styles.filters} aria-label="Filters and search">
        {filters}
      </div>

      <main id="mainContent" className={styles.main} role="main">
        {main}
      </main>

      {sidePanel && (
        <aside className={styles.sidePanel} role="complementary">
          {sidePanel}
        </aside>
      )}
    </div>
  );
};
