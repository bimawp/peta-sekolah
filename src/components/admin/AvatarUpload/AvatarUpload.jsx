import React, { useState } from 'react';
import styles from './AvatarUpload.module.css';
import { supabase } from '../../../services/supabase/client';

const AvatarUpload = ({ avatar, onChange }) => {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const { data, error } = await supabase.storage
      .from('avatars')        // Pastikan bucket "avatars" sudah dibuat di Supabase
      .upload(fileName, file, { upsert: true });

    if (error) console.log(error);
    else {
      const url = supabase.storage.from('avatars').getPublicUrl(fileName).publicUrl;
      onChange(url);
    }
    setUploading(false);
  };

  return (
    <div className={styles.avatarUpload}>
      <img src={avatar || '/assets/placeholder-user.png'} alt="Avatar" className={styles.avatar} />
      <label className={styles.uploadLabel}>
        {uploading ? 'Uploading...' : 'Ubah Foto'}
        <input type="file" onChange={handleUpload} hidden />
      </label>
    </div>
  );
};

export default AvatarUpload;
