// src/components/common/ErrorMessage/ErrorMessage.jsx - FILE BARU

import React from 'react';
import styles from './ErrorMessage.module.css';
import { AlertTriangle } from 'lucide-react';

const ErrorMessage = ({ message, onRetry }) => {
  return (
    <div className={styles.errorContainer}>
      <div className={styles.errorContent}>
        <AlertTriangle size={48} className={styles.errorIcon} />
        <h3 className={styles.errorTitle}>Oops! Terjadi Kesalahan</h3>
        <p className={styles.errorMessage}>
          {message || 'Tidak dapat memuat data. Silakan coba lagi nanti.'}
        </p>
        {onRetry && (
          <button onClick={onRetry} className={styles.retryButton}>
            Coba Lagi
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorMessage;