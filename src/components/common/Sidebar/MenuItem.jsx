import React from 'react';
import { Link } from 'react-router-dom';
import styles from './MenuItem.module.css';

const MenuItem = ({ icon, label, to, active, collapsed }) => {
  return (
    <Link 
      to={to} 
      className={`${styles.menuItem} ${active ? styles.active : ''}`}
      title={collapsed ? label : undefined} // tooltip saat collapsed
    >
      <div className={styles.icon}>{icon}</div>
      {!collapsed && <span className={styles.label}>{label}</span>}
    </Link>
  );
};

export default MenuItem;
