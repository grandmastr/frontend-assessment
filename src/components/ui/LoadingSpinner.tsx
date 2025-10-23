import React from 'react';
import styles from './LoadingSpinner.module.css';
import { VisuallyHidden } from './VisuallyHidden';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  label = 'Loading...'
}) => {
  return (
    <div className={`${styles.spinner} ${styles[size]}`} role="status" aria-live="polite">
      <div className={styles.circle} />
      <VisuallyHidden>{label}</VisuallyHidden>
    </div>
  );
};