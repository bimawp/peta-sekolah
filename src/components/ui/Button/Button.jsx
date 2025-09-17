import styles from './Button.module.css';
import clsx from 'clsx';

/**
 * Komponen Button serbaguna.
 * @param {React.ReactNode} children - Teks atau ikon di dalam tombol.
 * @param {function} onClick - Fungsi yang dijalankan saat tombol diklik.
 * @param {string} variant - Varian tombol ('primary', 'secondary'). Default: 'primary'.
 * @param {string} className - Class CSS tambahan.
 * @param {string} type - Tipe tombol ('button', 'submit'). Default: 'button'.
 */
const Button = ({ children, onClick, variant = 'primary', className, type = 'button' }) => {
  // Menggabungkan class dasar, class varian, dan class tambahan
  const finalClasses = clsx(
    styles.button,
    styles[variant], // Terapkan class varian, misal: styles.primary
    className
  );

  return (
    <button type={type} className={finalClasses} onClick={onClick}>
      {children}
    </button>
  );
};

export default Button;