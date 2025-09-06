import React, { useState, useEffect } from 'react';
import { Save, Camera, Lock, Bell, Globe, Shield, User, Phone, FileText, Eye, EyeOff, Calendar, Clock, Edit } from 'lucide-react';
import styles from './AdminProfile.module.css';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase';

const AdminProfile = () => {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState('profile');
  const [activeTab, setActiveTab] = useState('profile');

  const [profile, setProfile] = useState({
    id: null,
    user_id: null,
    name: '',
    email: '',
    role: 'admin',
    avatar_url: '',
    bio: '',
    phone: '',
    created_at: null,
    updated_at: null
  });

  const [settings, setSettings] = useState({
    notifications: true,
    emailNotifications: true,
    smsNotifications: false,
    language: 'id',
    theme: 'light',
    timezone: 'Asia/Jakarta'
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [message, setMessage] = useState('');
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchSettings();
    } else {
      setIsFetching(false);
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) {
      setIsFetching(false);
      return;
    }
    
    setIsFetching(true);
    try {
      const { data, error } = await supabase
        .from('profile')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
      }
      console.log('Data profil yang diambil:', data);
      if (data) {
        setProfile({ 
          ...data, 
          email: user.email || data.email 
        });
      } else {
        console.log('Profil tidak ditemukan. Mencoba membuat profil baru...');
        
        const newProfileData = {
          user_id: user.id,
          name: user.user_metadata?.full_name || '',
          email: user.email,
          role: 'admin',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // PERBAIKAN: Memastikan nama tabel konsisten 'profile' (tanpa 's')
        const { data: newProfile, error: insertError } = await supabase
          .from('profile')
          .insert([newProfileData])
          .select()
          .single();
        
        if (insertError) {
          console.error('Error creating new profile:', insertError);
          showMessage('Gagal membuat profil baru. Periksa kebijakan INSERT RLS.', 'error');
        } else {
          setProfile({ ...newProfile, email: user.email });
          showMessage('Profil baru berhasil dibuat.', 'success');
        }
      }
    } catch (error) {
      console.error('Terjadi kesalahan fatal saat fetchProfile:', error);
      showMessage('Terjadi kesalahan fatal saat memuat profil.', 'error');
    } finally {
      setIsFetching(false);
    }
  };

  const fetchSettings = async () => {
    setSettings({
      notifications: true,
      emailNotifications: true,
      smsNotifications: false,
      language: 'id',
      theme: 'light',
      timezone: 'Asia/Jakarta'
    });
  };

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(''), 4000);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    
    // PERBAIKAN: Validasi .trim() yang lebih aman untuk mencegah error
    if (!profile.name || !profile.name.trim()) {
      showMessage('Nama tidak boleh kosong', 'error');
      return;
    }

    setLoading(true);
    
    try {
      const profileData = {
        user_id: user.id,
        name: profile.name,
        role: profile.role,
        avatar_url: profile.avatar_url,
        bio: profile.bio,
        phone: profile.phone,
        updated_at: new Date().toISOString()
      };

      let result;
      if (profile.id) {
        result = await supabase
          .from('profile')
          .update(profileData)
          .eq('id', profile.id)
          .select()
          .single(); // PERBAIKAN: .single() diaktifkan agar mendapat objek, bukan array
      } else {
        profileData.created_at = new Date().toISOString();
        result = await supabase
          .from('profile')
          .insert([profileData])
          .select()
          .single(); // PERBAIKAN: .single() diaktifkan agar mendapat objek, bukan array
      }

      if (result.error) {
        throw result.error;
      }
      
      if (result.data) {
        setProfile({ ...result.data, email: user.email });
      }
      showMessage('Profil berhasil diperbarui!');
    } catch (error) {
      console.error('Error updating profile:', error);
      showMessage('Error: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      showMessage('Pengaturan berhasil disimpan!');
    } catch (error) {
      showMessage('Error: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      showMessage('Semua field password harus diisi', 'error');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showMessage('Konfirmasi password tidak cocok', 'error');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      showMessage('Password baru minimal 8 karakter', 'error');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });
      if (error) throw error;
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showMessage('Password berhasil diubah!');
    } catch (error) {
      showMessage('Error: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSettingChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePasswordChange = (field, value) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showMessage('Ukuran file maksimal 5MB', 'error');
      return;
    }
    if (!file.type.startsWith('image/')) {
      showMessage('File harus berupa gambar', 'error');
      return;
    }
    setLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      let result;
      if (profile.id) {
        result = await supabase
          .from('profile')
          .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
          .eq('id', profile.id)
          .select()
          .single();
      } else {
        const newProfileData = {
          user_id: user.id,
          name: profile.name,
          email: user.email,
          role: profile.role,
          avatar_url: publicUrl,
          bio: profile.bio,
          phone: profile.phone,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        result = await supabase
          .from('profile')
          .insert([newProfileData])
          .select()
          .single();
      }

      if (result.error) {
        throw result.error;
      }
      
      if(result.data){
        setProfile({ ...result.data, email: user.email });
      }
      showMessage('Avatar berhasil diunggah dan disimpan!');
    } catch (error) {
      console.error('Terjadi kesalahan:', error);
      showMessage('Error: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  };

  const getRelativeTime = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInSeconds = Math.floor((now - date) / 1000);
      
      if (diffInSeconds < 60) return 'Baru saja';
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} menit lalu`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} jam lalu`;
      if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} hari lalu`;
      return formatDate(dateString);
    } catch (error) {
      return formatDate(dateString);
    }
  };

  const getRoleBadgeClass = (role) => {
    const roleClasses = {
      'admin': styles.roleAdmin,
      'kepala_dinas': styles.roleKepalaDinas,
      'staff': styles.roleStaff,
      'guru': styles.roleGuru,
      'operator': styles.roleOperator
    };
    return roleClasses[role?.toLowerCase()] || styles.roleDefault;
  };

  const getRoleDisplayName = (role) => {
    const roleNames = {
      'admin': 'Administrator',
      'kepala_dinas': 'Kepala Dinas',
      'staff': 'Staff',
      'guru': 'Guru',
      'operator': 'Operator'
    };
    return roleNames[role?.toLowerCase()] || role?.replace('_', ' ').toUpperCase() || 'Unknown';
  };

  const getInitials = (name) => {
    if (!name) return user?.email?.charAt(0).toUpperCase() || 'U';
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };
  
  const renderProfileView = () => (
    <>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>Profil Admin</h1>
          <p className={styles.subtitle}>Informasi lengkap profil administrator</p>
        </div>
        <button 
          className={styles.editButton} 
          onClick={() => setActiveView('settings')}
        >
          <Edit size={16} />
          Edit Profil
        </button>
      </div>
      <div className={styles.profileCard}>
        <div className={styles.avatarSection}>
          <div className={styles.avatarContainer}>
            {profile.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt={`Foto profil ${profile.name}`}
                className={styles.avatar}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div 
              className={styles.avatarPlaceholder}
              style={{ display: profile.avatar_url ? 'none' : 'flex' }}
            >
              <span className={styles.initials}>
                {getInitials(profile.name)}
              </span>
            </div>
          </div>
          
          <div className={styles.basicInfo}>
            <h2 className={styles.name}>{profile.name || 'Nama belum diisi'}</h2>
            <span className={`${styles.roleBadge} ${getRoleBadgeClass(profile.role)}`}>
              <Shield size={14} />
              {getRoleDisplayName(profile.role)}
            </span>
            {profile.bio && (
              <p className={styles.shortBio}>
                {profile.bio.length > 100 
                  ? profile.bio.substring(0, 100) + '...' 
                  : profile.bio
                }
              </p>
            )}
          </div>
        </div>

        <div className={styles.detailsSection}>
          <div className={styles.infoGrid}>
            <div className={styles.infoGroup}>
              <h3 className={styles.groupTitle}>Informasi Kontak</h3>
              
              <div className={styles.infoItem}>
                <div className={styles.infoIcon}>
                  <Phone size={18} />
                </div>
                <div className={styles.infoContent}>
                  <label>Nomor Telepon</label>
                  <span>{profile.phone || 'Belum diisi'}</span>
                </div>
              </div>

              <div className={styles.infoItem}>
                <div className={styles.infoIcon}>
                  <FileText size={18} />
                </div>
                <div className={styles.infoContent}>
                  <label>Email</label>
                  <span>{profile.email || 'Belum diisi'}</span>
                </div>
              </div>
            </div>

            <div className={styles.infoGroup}>
              <h3 className={styles.groupTitle}>Informasi Sistem</h3>
              
              <div className={styles.infoItem}>
                <div className={styles.infoIcon}>
                  <User size={18} />
                </div>
                <div className={styles.infoContent}>
                  <label>User ID</label>
                  <span className={styles.userId}>{profile.user_id || user?.id}</span>
                </div>
              </div>

              <div className={styles.infoItem}>
                <div className={styles.infoIcon}>
                  <Calendar size={18} />
                </div>
                <div className={styles.infoContent}>
                  <label>Bergabung Sejak</label>
                  <span>{formatDate(profile.created_at)}</span>
                </div>
              </div>

              <div className={styles.infoItem}>
                <div className={styles.infoIcon}>
                  <Clock size={18} />
                </div>
                <div className={styles.infoContent}>
                  <label>Terakhir Diperbarui</label>
                  <span>{getRelativeTime(profile.updated_at)}</span>
                </div>
              </div>
            </div>
          </div>

          {profile.bio && (
            <div className={styles.bioSection}>
              <h3 className={styles.bioTitle}>
                <User size={18} />
                Tentang Saya
              </h3>
              <div className={styles.bioContent}>
                <p className={styles.bio}>{profile.bio}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );

  const renderSettingsView = () => (
    <>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>Pengaturan Akun</h1>
          <p className={styles.subtitle}>Kelola profil dan preferensi akun Anda</p>
        </div>
        <button 
          className={styles.backButton} 
          onClick={() => setActiveView('profile')}
        >
          ← Kembali ke Profil
        </button>
      </div>
      <div className={styles.tabContainer}>
        <div className={styles.tabList}>
          <button 
            className={`${styles.tab} ${activeTab === 'profile' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={16} />
            Profil
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'notifications' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            <Bell size={16} />
            Notifikasi
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'preferences' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('preferences')}
          >
            <Globe size={16} />
            Preferensi
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'security' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <Shield size={16} />
            Keamanan
          </button>
        </div>

        <div className={styles.tabContent}>
          {activeTab === 'profile' && (
            <div className={styles.profileSection}>
              <div className={styles.sectionHeader}>
                <h2>Informasi Profil</h2>
                <p>Perbarui informasi profil dan foto Anda</p>
              </div>
              
              <form onSubmit={handleProfileSubmit} className={styles.form}>
                <div className={styles.avatarUpload}>
                  <div className={styles.currentAvatar}>
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="Avatar" />
                    ) : (
                      <div className={styles.avatarPlaceholder}>
                        <span className={styles.initials}>
                          {getInitials(profile.name)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className={styles.avatarInfo}>
                    <h3>Foto Profil</h3>
                    <p>JPG, PNG atau GIF. Maksimal 5MB</p>
                    
                    <label className={styles.uploadButton}>
                      <Camera size={16} />
                      {loading ? 'Mengunggah...' : 'Ubah Foto'}
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleAvatarUpload}
                        disabled={loading}
                      />
                    </label>
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label>
                      <User size={16} />
                      Nama Lengkap *
                    </label>
                    <input
                      type="text"
                      value={profile.name || ''}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Masukkan nama lengkap"
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>
                      <Shield size={16} />
                      Jabatan/Role *
                    </label>
                    <select
                      value={profile.role}
                      onChange={(e) => handleInputChange('role', e.target.value)}
                      required
                    >
                      <option value="admin">Administrator</option>
                      <option value="kepala_dinas">Kepala Dinas</option>
                      <option value="staff">Staff</option>
                      <option value="guru">Guru</option>
                      <option value="operator">Operator</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>
                      <Phone size={16} />
                      Nomor Telepon
                    </label>
                    <input
                      type="tel"
                      value={profile.phone || ''}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="Contoh: +62 812-3456-7890"
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>
                    <FileText size={16} />
                    Biodata
                  </label>
                  <textarea
                    value={profile.bio || ''}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    placeholder="Ceritakan tentang diri Anda, pengalaman kerja, dan latar belakang pendidikan..."
                    rows={4}
                  />
                  <small>Maksimal 500 karakter</small>
                </div>

                <button 
                  type="submit" 
                  className={styles.saveButton}
                  disabled={loading}
                >
                  <Save size={16} />
                  {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className={styles.notificationSection}>
                {/* Konten Notifikasi */}
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className={styles.preferencesSection}>
                {/* Konten Preferensi */}
            </div>
          )}

          {activeTab === 'security' && (
            <div className={styles.securitySection}>
                {/* Konten Keamanan */}
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className={styles.container}>
      {isFetching ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Memuat data profil...</p>
        </div>
      ) : (
        activeView === 'profile' ? renderProfileView() : renderSettingsView()
      )}
      
      {message && (
        <div className={`${styles.message} ${message.type === 'error' ? styles.error : styles.success}`}>
          {message.text}
        </div>
      )}
    </div>
  );
};

export default AdminProfile;