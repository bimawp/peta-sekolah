import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import styles from './Profile.module.css';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatar, setAvatar] = useState(user?.avatar || null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    const res = await updateProfile({ name, email, avatar });
    if (res.success) {
      setMessage('Profil berhasil diperbarui!');
    } else {
      setMessage(`Error: ${res.error}`);
    }
    setLoading(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleReset = () => {
    setName(user?.name || '');
    setEmail(user?.email || '');
    setAvatar(user?.avatar || null);
    setMessage('');
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Preview foto
      const reader = new FileReader();
      reader.onload = () => {
        setAvatar(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className={styles.container}>
      <h1>Profile Admin</h1>
      <div className={styles.profileCard}>
        <div className={styles.avatar}>
          {avatar ? <img src={avatar} alt="Avatar" /> : <span>{(user?.name?.charAt(0) || 'A').toUpperCase()}</span>}
          <input
            type="file"
            accept="image/*"
            className={styles.fileInput}
            onChange={handleAvatarChange}
          />
        </div>
        <div className={styles.form}>
          <label>
            Name:
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} disabled={loading} />
          </label>
          <label>
            Email:
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
          </label>
          <p><strong>Role:</strong> {user?.role || 'admin'}</p>
          <div className={styles.buttonGroup}>
            <button onClick={handleSave} disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan'}</button>
            <button onClick={handleReset} disabled={loading}>Reset</button>
          </div>
          {message && <p className={styles.message}>{message}</p>}
        </div>
      </div>
    </div>
  );
};

export default Profile;
