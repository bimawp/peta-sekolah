import React, { useState, useEffect } from 'react';
import { Save, Camera, Lock, Bell, Globe, Shield, User, Phone, FileText, Eye, EyeOff, X, Check, Loader2 } from 'lucide-react';

const Setting = ({ userId }) => {
  const [profile, setProfile] = useState({
    name: '',
    role: 'admin',
    avatar_url: '',
    phone: '',
    bio: ''
  });
  
  const [avatarFile, setAvatarFile] = useState(null);
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

  useEffect(() => {
    if (userId) {
      fetchProfile();
      fetchSettings();
    }
  }, [userId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/profiles/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      } else if (response.status === 404) {
        console.log('Profile not found, using defaults');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      showMessage('Error mengambil data profil', 'error');
    } finally {
      setLoading(false);
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
      const formData = new FormData();
      formData.append('name', profile.name);
      formData.append('role', profile.role);
      formData.append('phone', profile.phone);
      formData.append('bio', profile.bio);
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }

      // Gunakan method 'POST' untuk mengirim FormData
      const response = await fetch(`/api/profiles/${userId}`, {
        method: 'POST',
        body: formData, // Langsung kirim objek FormData
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleAvatarSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setProfile(prev => ({ ...prev, avatar_url: URL.createObjectURL(file) }));
    }
  };

  const handleSettingChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handlePasswordChange = (field, value) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const getRoleDisplayName = (role) => {
    const roleMap = {
      'admin': 'Administrator', 'kepala_dinas': 'Kepala Dinas', 'staff': 'Staff', 'guru': 'Guru', 'operator': 'Operator'
    };
    return roleMap[role] || role;
  };

  return (
    <div className="flex justify-center p-6 bg-gray-100 min-h-screen font-sans antialiased">
      <div className="w-full max-w-4xl bg-white shadow-xl rounded-2xl overflow-hidden">
        <div className="p-8">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-200">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-800">Pengaturan Akun</h1>
              <p className="mt-1 text-gray-500">Kelola profil dan preferensi akun Anda</p>
            </div>
            <button
              onClick={() => console.log('Tutup form')}
              className="p-2 rounded-full text-gray-500 hover:bg-gray-200 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
          
          {message.text && (
            <div 
              className={`p-4 mb-4 rounded-lg flex items-center gap-2 ${
                message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {message.type === 'success' ? <Check size={20} /> : <X size={20} />}
              <span className="font-medium">{message.text}</span>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 mb-6 p-4 rounded-xl bg-gray-50">
            <button 
              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg font-medium transition-colors ${activeTab === 'profile' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
              onClick={() => setActiveTab('profile')}
            >
              <User size={18} /> Profil
            </button>
            <button 
              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg font-medium transition-colors ${activeTab === 'notifications' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
              onClick={() => setActiveTab('notifications')}
            >
              <Bell size={18} /> Notifikasi
            </button>
            <button 
              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg font-medium transition-colors ${activeTab === 'preferences' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
              onClick={() => setActiveTab('preferences')}
            >
              <Globe size={18} /> Preferensi
            </button>
            <button 
              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg font-medium transition-colors ${activeTab === 'security' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
              onClick={() => setActiveTab('security')}
            >
              <Shield size={18} /> Keamanan
            </button>
          </div>

          <div className="bg-gray-50 p-6 rounded-xl shadow-inner">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="pb-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-800">Informasi Profil</h2>
                  <p className="text-sm text-gray-500">Perbarui informasi profil dan foto Anda</p>
                </div>
                
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="relative w-24 h-24 flex-shrink-0">
                      <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <User size={40} />
                        )}
                      </div>
                      <div className="absolute bottom-0 right-0 p-1 bg-white rounded-full border border-gray-200 shadow-md">
                        <label className="cursor-pointer">
                          <Camera size={20} className="text-gray-600" />
                          <input type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
                        </label>
                      </div>
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                      <h3 className="text-base font-semibold text-gray-800">Foto Profil</h3>
                      <p className="text-sm text-gray-500 mb-2">JPG, PNG atau GIF. Maksimal 5MB</p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap *</label>
                      <div className="relative">
                        <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={profile.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          placeholder="Masukkan nama lengkap"
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Jabatan/Role *</label>
                      <div className="relative">
                        <Shield size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <select
                          value={profile.role}
                          onChange={(e) => handleInputChange('role', e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                          required
                        >
                          <option value="admin">Administrator</option>
                          <option value="kepala_dinas">Kepala Dinas</option>
                          <option value="staff">Staff</option>
                          <option value="guru">Guru</option>
                          <option value="operator">Operator</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Telepon</label>
                      <div className="relative">
                        <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="tel"
                          value={profile.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          placeholder="Contoh: +62 812-3456-7890"
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Biodata</label>
                    <div className="relative">
                      <FileText size={18} className="absolute left-3 top-3 text-gray-400" />
                      <textarea
                        value={profile.bio}
                        onChange={(e) => handleInputChange('bio', e.target.value)}
                        placeholder="Ceritakan tentang diri Anda, pengalaman kerja, dan latar belakang pendidikan..."
                        rows={4}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      />
                    </div>
                    <small className="block mt-1 text-xs text-gray-500">Maksimal 500 karakter</small>
                  </div>
                  
                  <button 
                    type="submit" 
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-colors disabled:bg-indigo-400"
                    disabled={loading}
                  >
                    {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={16} />}
                    {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div className="pb-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-800">Pengaturan Notifikasi</h2>
                  <p className="text-sm text-gray-500">Kelola cara Anda menerima pemberitahuan</p>
                </div>
                
                <form onSubmit={handleSettingsSubmit} className="space-y-4">
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-base font-semibold text-gray-700 mb-4">Notifikasi Push</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-800">Notifikasi Desktop</h4>
                          <p className="text-sm text-gray-500">Terima notifikasi langsung di perangkat desktop</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={settings.notifications} onChange={(e) => handleSettingChange('notifications', e.target.checked)} className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-800">Notifikasi Email</h4>
                          <p className="text-sm text-gray-500">Terima pemberitahuan penting melalui email</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={settings.emailNotifications} onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)} className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-800">Notifikasi SMS</h4>
                          <p className="text-sm text-gray-500">Terima pemberitahuan darurat melalui SMS</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={settings.smsNotifications} onChange={(e) => handleSettingChange('smsNotifications', e.target.checked)} className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                  <button 
                    type="submit" 
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-colors disabled:bg-indigo-400"
                    disabled={loading}
                  >
                    {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={16} />}
                    {loading ? 'Menyimpan...' : 'Simpan Pengaturan'}
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div className="space-y-6">
                <div className="pb-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-800">Preferensi Sistem</h2>
                  <p className="text-sm text-gray-500">Atur bahasa, tema, dan preferensi lainnya</p>
                </div>
                
                <form onSubmit={handleSettingsSubmit} className="space-y-4">
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="grid sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Bahasa Interface</label>
                        <div className="relative">
                          <Globe size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <select
                            value={settings.language}
                            onChange={(e) => handleSettingChange('language', e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                          >
                            <option value="id">Bahasa Indonesia</option>
                            <option value="en">English</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Zona Waktu</label>
                        <div className="relative">
                          <Globe size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <select
                            value={settings.timezone}
                            onChange={(e) => handleSettingChange('timezone', e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                          >
                            <option value="Asia/Jakarta">WIB (Jakarta)</option>
                            <option value="Asia/Makassar">WITA (Makassar)</option>
                            <option value="Asia/Jayapura">WIT (Jayapura)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button 
                    type="submit" 
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-colors disabled:bg-indigo-400"
                    disabled={loading}
                  >
                    {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={16} />}
                    {loading ? 'Menyimpan...' : 'Simpan Preferensi'}
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="pb-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-800">Keamanan Akun</h2>
                  <p className="text-sm text-gray-500">Kelola password dan keamanan akun Anda</p>
                </div>
                
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-base font-semibold text-gray-700 mb-4">Ubah Password</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password Saat Ini *</label>
                        <div className="relative">
                          <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type={showPasswords.current ? "text" : "password"}
                            value={passwordData.currentPassword}
                            onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                            placeholder="Masukkan password saat ini"
                            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility('current')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password Baru *</label>
                        <div className="relative">
                          <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type={showPasswords.new ? "text" : "password"}
                            value={passwordData.newPassword}
                            onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                            placeholder="Masukkan password baru"
                            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                            required
                            minLength={8}
                          />
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility('new')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        <small className="block mt-1 text-xs text-gray-500">Minimal 8 karakter</small>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Konfirmasi Password Baru *</label>
                        <div className="relative">
                          <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type={showPasswords.confirm ? "text" : "password"}
                            value={passwordData.confirmPassword}
                            onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                            placeholder="Konfirmasi password baru"
                            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility('confirm')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button 
                    type="submit" 
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 transition-colors disabled:bg-red-400"
                    disabled={loading}
                  >
                    {loading ? <Loader2 size={20} className="animate-spin" /> : <Lock size={16} />}
                    {loading ? 'Mengubah...' : 'Ubah Password'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
      <script src="https://cdn.tailwindcss.com"></script>
    </div>
  );
};

export default Setting
