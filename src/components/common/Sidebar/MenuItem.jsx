import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import styles from './Sidebar.module.css';

const MenuItem = ({ item, isActive, onItemClick }) => {
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
  const location = useLocation();
  const hasSubmenu = item.submenu && item.submenu.length > 0;

  const handleClick = () => {
    if (hasSubmenu) {
      setIsSubmenuOpen(!isSubmenuOpen);
    } else {
      onItemClick && onItemClick();
    }
  };

  const isSubmenuActive = hasSubmenu && 
    item.submenu.some(subItem => location.pathname === subItem.path);

  return (
    <li className={styles.menuItem}>
      {hasSubmenu ? (
        <button
          className={`${styles.menuButton} ${(isActive || isSubmenuActive) ? styles.active : ''}`}
          onClick={handleClick}
        >
          <div className={styles.menuItemContent}>
            <div className={styles.menuItemLeft}>
              <item.icon size={20} className={styles.menuIcon} />
              <span className={styles.menuText}>{item.label}</span>
            </div>
            <div className={styles.menuItemRight}>
              {item.badge && (
                <span className={styles.badge}>{item.badge}</span>
              )}
              {isSubmenuOpen ? (
                <ChevronDown size={16} className={styles.chevron} />
              ) : (
                <ChevronRight size={16} className={styles.chevron} />
              )}
            </div>
          </div>
        </button>
      ) : (
        <Link
          to={item.path}
          className={`${styles.menuLink} ${isActive ? styles.active : ''}`}
          onClick={onItemClick}
        >
          <div className={styles.menuItemContent}>
            <div className={styles.menuItemLeft}>
              <item.icon size={20} className={styles.menuIcon} />
              <span className={styles.menuText}>{item.label}</span>
            </div>
            {item.badge && (
              <span className={styles.badge}>{item.badge}</span>
            )}
          </div>
        </Link>
      )}

      {/* Submenu */}
      {hasSubmenu && isSubmenuOpen && (
        <ul className={styles.submenu}>
          {item.submenu.map((subItem, index) => (
            <li key={index} className={styles.submenuItem}>
              <Link
                to={subItem.path}
                className={`${styles.submenuLink} ${
                  location.pathname === subItem.path ? styles.active : ''
                }`}
                onClick={onItemClick}
              >
                <span className={styles.submenuText}>{subItem.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
};

export default MenuItem;