import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import Card from '../../ui/Card/Card';
import styles from './StatCard.module.css';

const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color = 'blue', 
  trend, 
  subtitle,
  loading = false 
}) => {
  if (loading) {
    return (
      <Card className={`${styles.statCard} ${styles.loading}`}>
        <div className={styles.loadingContent}>
          <div className={styles.skeleton} />
        </div>
      </Card>
    );
  }

  return (
    <Card className={`${styles.statCard} ${styles[color]}`}>
      <div className={styles.cardContent}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.iconWrapper}>
            <Icon size={24} className={styles.icon} />
          </div>
          {trend && (
            <div className={`${styles.trend} ${trend.isPositive ? styles.positive : styles.negative}`}>
              {trend.isPositive ? (
                <TrendingUp size={16} />
              ) : (
                <TrendingDown size={16} />
              )}
              <span>{trend.value}%</span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className={styles.body}>
          <h3 className={styles.title}>{title}</h3>
          <div className={styles.valueContainer}>
            <span className={styles.value}>{value}</span>
            {subtitle && (
              <span className={styles.subtitle}>{subtitle}</span>
            )}
          </div>
        </div>

        {/* Footer */}
        {(trend || subtitle) && (
          <div className={styles.footer}>
            {trend && (
              <span className={`${styles.trendText} ${trend.isPositive ? styles.positive : styles.negative}`}>
                {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}% {subtitle}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Background Pattern */}
      <div className={styles.backgroundPattern}>
        <div className={styles.pattern} />
      </div>
    </Card>
  );
};

export default StatCard;