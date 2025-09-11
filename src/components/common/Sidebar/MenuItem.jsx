// src/components/common/Sidebar/MenuItem.jsx

import React from 'react';
import { Link } from 'react-router-dom';
import styles from './MenuItem.module.css';

const MenuItem = ({ 
  icon, 
  label, 
  to, 
  active = false, 
  collapsed = false, 
  onClick,
  description,
  ...props 
}) => {
  const itemClasses = [
    styles.menuItem,
    active ? styles.active : '',
    collapsed ? styles.collapsed : ''
  ].filter(Boolean).join(' ');

  return (
    <Link 
      to={to} 
      className={itemClasses}
      onClick={onClick}
      title={collapsed ? label : description}
      aria-current={active ? 'page' : undefined}
      {...props}
    >
      <div className={styles.iconWrapper}>
        {icon}
        {active && <div className={styles.activeIndicator} />}
      </div>
      
      {!collapsed && (
        <div className={styles.textContent}>
          <span className={styles.label}>{label}</span>
          {description && (
            <span className={styles.description}>{description}</span>
          )}
        </div>
      )}
      
      {!collapsed && (
        <div className={styles.hoverEffect} />
      )}
    </Link>
  );
};

export default MenuItem;