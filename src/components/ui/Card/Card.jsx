import React from 'react';
import styles from './Card.module.css';

const Card = ({ 
  children, 
  className = '', 
  hover = false, 
  padding = 'default',
  shadow = 'default',
  ...props 
}) => {
  const cardClasses = [
    styles.card,
    styles[`padding-${padding}`],
    styles[`shadow-${shadow}`],
    hover && styles.hover,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClasses} {...props}>
      {children}
    </div>
  );
};

export default Card;