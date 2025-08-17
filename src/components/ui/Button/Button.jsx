import React from 'react';
import styles from './Button.module.css';

const Button = ({ onClick, children, type = 'button', className = '' }) => {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`${styles.button} ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;
