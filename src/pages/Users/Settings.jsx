import React, { useState, useEffect } from 'react';
import { Save, Camera, Lock, Bell, Globe, Shield, User, Phone, FileText, Eye, EyeOff } from 'lucide-react';
import styles from './Settings.module.css';

const Settings = ({ userId }) => {
  const [profile, setProfile] = useState({
    name: '',
    role: 'admin',
    avatar_url: '',
    bio: '',
    phone: ''
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
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('profile');
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // Fetch data on component mount
  useEffect(() => {
    if (userId) {
      fetchProfile();
      fetchSettings();
    }
  }, [userId]);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`/api/profiles/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      } else if (response.status === 404) {
        // Profile doesn't exist, keep default values
        console.log('Profile not found, using defaults');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      showMessage('Error mengambil data profil', 'error');
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch(`/api/settings/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setSettings(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(''), 4000);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    
    if (!profile.name.trim()) {
      showMessage('Nama tidak boleh kosong', 'error');
      return;
    }

    setLoading(true);
    
    try {
      const method = profile.id ? 'PUT' : 'POST';
      const response = await fetch(`/api/profiles/${userId}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...profile,
          updated_at: new Date().toISOString()
        }),
      });

      if (response.ok) {
        const updatedProfile = await response.json();
        setProfile(updatedProfile);
        showMessage('Profil berhasil diperbarui!');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal memperbarui profil');
      }
    } catch (error) {
      showMessage('Error: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/settings/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        showMessage('Pengaturan berhasil disimpan!');
      } else {
        throw new Error('Gagal menyimpan pengaturan');
      }
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
      const response = await fetch('/api/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        }),
      });

      if (response.ok) {
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        showMessage('Password berhasil diubah!');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal mengubah password');
      }
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
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      showMessage('Ukuran file maksimal 5MB', 'error');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showMessage('File harus berupa gambar', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);
    formData.append('userId', userId);

    try {
      setLoading(true);
      const response = await fetch('/api/upload-avatar', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        handleInputChange('avatar_url', data.avatarUrl);
        showMessage('Avatar berhasil diupload!');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal upload avatar');
      }
    } catch (error) {
      showMessage('Error uploading avatar: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const getRoleDisplayName = (role) => {
    const roleMap = {
      'admin': 'Administrator',
      'kepala_dinas': 'Kepala Dinas',
      'staff': 'Staff',
      'guru': 'Guru',
      'operator': 'Operator'
    };
    return roleMap[role] || role;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Pengaturan Akun</h1>
        <p className={styles.subtitle}>Kelola profil dan preferensi akun Anda</p>
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
                        <User size={40} />
                      </div>
                    )}
                  </div>
                  <div className={styles.avatarInfo}>
                    <h3>Foto Profil</h3>
                    <p>JPG, PNG atau GIF. Maksimal 5MB</p>
                    <label className={styles.uploadButton}>
                      <Camera size={16} />
                      Ubah Foto
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
                      value={profile.name}
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
                      value={profile.phone}
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
                    value={profile.bio}
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
              <div className={styles.sectionHeader}>
                <h2>Pengaturan Notifikasi</h2>
                <p>Kelola cara Anda menerima pemberitahuan</p>
              </div>
              
              <form onSubmit={handleSettingsSubmit} className={styles.form}>
                <div className={styles.settingGroup}>
                  <h3>Notifikasi Push</h3>
                  
                  <div className={styles.settingItem}>
                    <div className={styles.settingInfo}>
                      <h4>Notifikasi Desktop</h4>
                      <p>Terima notifikasi langsung di perangkat desktop</p>
                    </div>
                    <label className={styles.switch}>
                      <input
                        type="checkbox"
                        checked={settings.notifications}
                        onChange={(e) => handleSettingChange('notifications', e.target.checked)}
                      />
                      <span className={styles.slider}></span>
                    </label>
                  </div>

                  <div className={styles.settingItem}>
                    <div className={styles.settingInfo}>
                      <h4>Notifikasi Email</h4>
                      <p>Terima pemberitahuan penting melalui email</p>
                    </div>
                    <label className={styles.switch}>
                      <input
                        type="checkbox"
                        checked={settings.emailNotifications}
                        onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                      />
                      <span className={styles.slider}></span>
                    </label>
                  </div>

                  <div className={styles.settingItem}>
                    <div className={styles.settingInfo}>
                      <h4>Notifikasi SMS</h4>
                      <p>Terima pemberitahuan darurat melalui SMS</p>
                    </div>
                    <label className={styles.switch}>
                      <input
                        type="checkbox"
                        checked={settings.smsNotifications}
                        onChange={(e) => handleSettingChange('smsNotifications', e.target.checked)}
                      />
                      <span className={styles.slider}></span>
                    </label>
                  </div>
                </div>

                <button 
                  type="submit" 
                  className={styles.saveButton}
                  disabled={loading}
                >
                  <Save size={16} />
                  {loading ? 'Menyimpan...' : 'Simpan Pengaturan'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className={styles.preferencesSection}>
              <div className={styles.sectionHeader}>
                <h2>Preferensi Sistem</h2>
                <p>Atur bahasa, tema, dan preferensi lainnya</p>
              </div>

              <form onSubmit={handleSettingsSubmit} className={styles.form}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label>
                      <Globe size={16} />
                      Bahasa Interface
                    </label>
                    <select
                      value={settings.language}
                      onChange={(e) => handleSettingChange('language', e.target.value)}
                    >
                      <option value="id">Bahasa Indonesia</option>
                      <option value="en">English</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>
                      <Globe size={16} />
                      Zona Waktu
                    </label>
                    <select
                      value={settings.timezone}
                      onChange={(e) => handleSettingChange('timezone', e.target.value)}
                    >
                      <option value="Asia/Jakarta">WIB (Jakarta)</option>
                      <option value="Asia/Makassar">WITA (Makassar)</option>
                      <option value="Asia/Jayapura">WIT (Jayapura)</option>
                    </select>
                  </div>
                </div>

                <button 
                  type="submit" 
                  className={styles.saveButton}
                  disabled={loading}
                >
                  <Save size={16} />
                  {loading ? 'Menyimpan...' : 'Simpan Preferensi'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'security' && (
            <div className={styles.securitySection}>
              <div className={styles.sectionHeader}>
                <h2>Keamanan Akun</h2>
                <p>Kelola password dan keamanan akun Anda</p>
              </div>
              
              <form onSubmit={handlePasswordSubmit} className={styles.form}>
                <div className={styles.passwordSection}>
                  <h3>Ubah Password</h3>
                  
                  <div className={styles.formGroup}>
                    <label>
                      <Lock size={16} />
                      Password Saat Ini *
                    </label>
                    <div className={styles.passwordInput}>
                      <input
                        type={showPasswords.current ? "text" : "password"}
                        value={passwordData.currentPassword}
                        onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                        placeholder="Masukkan password saat ini"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('current')}
                        className={styles.passwordToggle}
                      >
                        {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label>
                      <Lock size={16} />
                      Password Baru *
                    </label>
                    <div className={styles.passwordInput}>
                      <input
                        type={showPasswords.new ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                        placeholder="Masukkan password baru"
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('new')}
                        className={styles.passwordToggle}
                      >
                        {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <small>Minimal 8 karakter</small>
                  </div>

                  <div className={styles.formGroup}>
                    <label>
                      <Lock size={16} />
                      Konfirmasi Password Baru *
                    </label>
                    <div className={styles.passwordInput}>
                      <input
                        type={showPasswords.confirm ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                        placeholder="Konfirmasi password baru"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('confirm')}
                        className={styles.passwordToggle}
                      >
                        {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className={styles.securityButton}
                    disabled={loading}
                  >
                    <Lock size={16} />
                    {loading ? 'Mengubah...' : 'Ubah Password'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {message && (
        <div className={`${styles.message} ${message.type === 'error' ? styles.error : styles.success}`}>
          {typeof message === 'string' ? message : message.text}
        </div>
      )}
    </div>
  );
};

export default Settings;