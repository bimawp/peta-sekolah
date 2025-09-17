import styles from './Card.module.css';
import clsx from 'clsx'; // Pastikan sudah install: npm install clsx

/**
 * Komponen Card serbaguna.
 * @param {React.ReactNode} children - Konten yang akan ditampilkan di dalam card.
 * @param {string} className - Class CSS tambahan untuk kustomisasi.
 * @param {React.ElementType} as - Elemen HTML yang akan dirender, defaultnya 'div'.
 */
const Card = ({ children, className, as: Component = 'div' }) => {
  const finalClasses = clsx(styles.card, className);
  return <Component className={finalClasses}>{children}</Component>;
};

export default Card;