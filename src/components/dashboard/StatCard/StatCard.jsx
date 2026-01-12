import Card from '../../ui/Card/Card'; // <-- Impor komponen Card baru
import styles from './StatCard.module.css';

const StatCard = ({ icon, label, value }) => {
  // Kita menggunakan komponen Card sebagai pembungkus utama
  return (
    <Card className={styles.statCard}>
      <div className={styles.iconWrapper}>{icon}</div>
      <div className={styles.textWrapper}>
        <p className={styles.label}>{label}</p>
        <p className={styles.value}>{value}</p>
      </div>
    </Card>
  );
};

export default StatCard;