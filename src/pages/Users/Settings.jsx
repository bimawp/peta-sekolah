import React from 'react';
import styles from './Users.module.css';

const Settings = () => {
  return (
    <div className={styles.container}>
      <h1>Settings</h1>
      <div className={styles.settingsCard}>
        <p>Opsi pengaturan user akan muncul di sini.</p>
        <p>(Contoh: Ubah password, notifikasi, preferensi tampilan, dsb.)</p>
      </div>
    </div>
  );
};

export default Settings;
