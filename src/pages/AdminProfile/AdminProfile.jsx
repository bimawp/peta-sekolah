import React, { useState, useEffect } from 'react';
import styles from './AdminProfile.module.css';
import ProfileForm from '../../components/admin/ProfileForm/ProfileForm';
import AvatarUpload from '../../components/admin/AvatarUpload/AvatarUpload';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase/client';

const AdminProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    role: 'admin',
    avatar_url: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) console.log(error);
      else setProfile({ ...data, email: user.email });
    };
    fetchProfile();
  }, [user]);

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { error } = await supabase
      .from('profiles')
      .update({
        name: profile.name
      })
      .eq('user_id', user.id);

    if (error) console.log(error);
    else alert('Profil berhasil diperbarui!');
  };

  // Live update avatar ke Supabase
  const handleAvatarChange = async (url) => {
    setProfile({ ...profile, avatar_url: url });

    if (!user) return;
const { error } = await supabase
  .from('profiles')
  .update({
    name: profile.name,
    email: profile.email,
    role: profile.role,
    avatar_url: profile.avatar_url
  })
  .eq('user_id', user.id);

    if (error) console.log(error);
  };

  return (
    <div className={styles.container}>
      <h2>Profil Admin</h2>
      <div className={styles.avatarSection}>
        <AvatarUpload avatar={profile.avatar_url} onChange={handleAvatarChange} />
      </div>
      <form onSubmit={handleSubmit} className={styles.form}>
        <ProfileForm profile={profile} onChange={handleChange} />
        <button type="submit" className={styles.submitButton}>Simpan Perubahan</button>
      </form>
    </div>
  );
};

export default AdminProfile;
