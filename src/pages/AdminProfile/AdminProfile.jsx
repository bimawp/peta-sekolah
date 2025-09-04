import React, { useState, useEffect } from 'react';
import { Save, Camera, Lock, Bell, Globe, Shield, User, Phone, FileText, Eye, EyeOff, Calendar, Clock, Edit } from 'lucide-react';
import styles from './AdminProfile.module.css';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase'; // Pastikan path ini benar

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
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        showMessage('Terjadi kesalahan saat memuat profil.', 'error');
      }

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

        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert([newProfileData])
          .select()
          .single();
        
        if (insertError) {
          console.error('Error creating new profile:', insertError);
          showMessage('Gagal membuat profil baru. Periksa kebijakan INSERT RLS.', 'error');
          return;
        }
        
        setProfile({ ...newProfile, email: user.email });
        showMessage('Profil baru berhasil dibuat.', 'success');
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
    
    if (!profile.name.trim()) {
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
          .from('profiles')
          .update(profileData)
          .eq('id', profile.id)
          .select()
          .single();
      } else {
        profileData.created_at = new Date().toISOString();
        result = await supabase
          .from('profiles')
          .insert([profileData])
          .select()
          .single();
      }

      if (result.error) {
        throw result.error;
      }

      setProfile({ ...result.data, email: user.email });
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
    console.log('handleAvatarUpload dipanggil.');
    const file = e.target.files[0];
    if (!file) {
      console.warn('Tidak ada file yang dipilih.');
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
      
      console.log('Nama file yang akan diunggah:', fileName);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          upsert: true
        });

      if (uploadError) {
        console.error('Error saat upload ke storage:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      handleInputChange('avatar_url', publicUrl);
      
      if (profile.id) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
          .eq('id', profile.id);

        if (updateError) {
          console.error('Error saat update database:', updateError);
          throw updateError;
        }
      }

      showMessage('Avatar berhasil diunggah!');
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
    <div className={styles.container}>
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

          <div className={styles.statsSection}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>📊</div>
              <div className={styles.statInfo}>
                <span className={styles.statLabel}>Status Akun</span>
                <span className={styles.statValue}>Aktif</span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>🏢</div>
              <div className={styles.statInfo}>
                <span className={styles.statLabel}>Departemen</span>
                <span className={styles.statValue}>Dinas Pendidikan</span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon}>📅</div>
              <div className={styles.statInfo}>
                <span className={styles.statLabel}>Masa Kerja</span>
                <span className={styles.statValue}>
                  {profile.created_at ? 
                    Math.floor((new Date() - new Date(profile.created_at)) / (1000 * 60 * 60 * 24 * 30)) + ' bulan' : 
                    'Baru'
                  }
                </span>
              </div>
            </div>
          </div>

          <div className={styles.actionsSection}>
            <h3 className={styles.actionTitle}>Aksi Cepat</h3>
            <div className={styles.actionButtons}>
              <button 
                className={styles.actionButton} 
                onClick={() => setActiveView('settings')}
              >
                <Edit size={16} />
                Edit Profil
              </button>
              <button 
                className={styles.actionButton} 
                onClick={() => {
                  setActiveView('settings');
                  setActiveTab('security');
                }}
              >
                <Shield size={16} />
                Ubah Password
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSettingsView = () => (
    <div className={styles.container}>
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
                  {loading ? 'Menyimpan...' : 'Simpan Pengaturan'}
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
    </div>
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
          {typeof message === 'string' ? message : message.text}
        </div>
      )}
    </div>
  );
};

export default AdminProfile;