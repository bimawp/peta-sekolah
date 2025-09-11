// src/pages/AdminProfile/AdminProfile.jsx

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Save, Camera, Lock, Bell, Globe, Shield, User, Phone, FileText, Eye, EyeOff, Mail } from 'lucide-react';
import styles from './AdminProfile.module.css';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase';

const AdminProfile = () => {
    const { user, profile, setProfileData, loading: authLoading } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    
    const [activeView, setActiveView] = useState('profile');
    const [activeTab, setActiveTab] = useState('profile');

    const [formData, setFormData] = useState(profile || {});
    const [newEmail, setNewEmail] = useState(profile?.email || '');
    
    const [settings, setSettings] = useState({
        emailNotifications: true,
        inAppNotifications: false,
        language: 'id',
        theme: 'light',
    });

    const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [showPasswords, setShowPasswords] = useState({ new: false, confirm: false });

    useEffect(() => {
        if (profile) {
            setFormData(profile);
            setNewEmail(profile.email);
        }
    }, [profile]);
    
    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const viewParam = searchParams.get('view');
        const tabParam = searchParams.get('tab');

        if (viewParam === 'settings') {
            setActiveView('settings');
            setActiveTab(tabParam || 'profile');
        } else {
            setActiveView('profile');
        }
    }, [location]);

    const showMessage = (text, type = 'success') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(''), 5000);
    };

    const handleFormChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { showMessage('Ukuran file maksimal 5MB', 'error'); return; }
        if (!file.type.startsWith('image/')) { showMessage('File harus berupa gambar', 'error'); return; }

        setLoading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
            setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
            showMessage('Pratinjau foto berhasil diubah. Klik "Simpan Perubahan" untuk menyimpan.', 'info');
        } catch (error) {
            showMessage('Error: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name?.trim()) { showMessage('Nama tidak boleh kosong', 'error'); return; }

        setLoading(true);
        try {
            const profileUpdates = {
                name: formData.name,
                role: formData.role,
                avatar_url: formData.avatar_url,
                bio: formData.bio,
                phone: formData.phone,
                updated_at: new Date().toISOString()
            };

            const { data, error } = await supabase.from('profile').update(profileUpdates).eq('user_id', user.id).select().single();
            if (error) throw error;
            
            setProfileData({ ...data, email: user.email }); // Update context
            showMessage('Profil berhasil diperbarui!');
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
            console.log("Menyimpan pengaturan:", settings);
            await new Promise(resolve => setTimeout(resolve, 1000));
            showMessage('Pengaturan berhasil disimpan!');
        } catch (error) {
            showMessage('Error: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        if (newEmail === user.email) { showMessage('Email baru sama dengan email saat ini.', 'info'); return; }
        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ email: newEmail });
            if (error) throw error;
            showMessage('PENTING: Link konfirmasi telah dikirim. Email akan berubah setelah dikonfirmasi.', 'success');
        } catch (error) {
            showMessage(`Gagal mengubah email: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) { showMessage('Konfirmasi password tidak cocok', 'error'); return; }
        if (passwordData.newPassword.length < 8) { showMessage('Password baru minimal 8 karakter', 'error'); return; }
        
        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: passwordData.newPassword });
            if (error) throw error;
            setPasswordData({ newPassword: '', confirmPassword: '' });
            showMessage('Password berhasil diubah!');
        } catch (error) {
            showMessage('Error: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };
    
    const handleSettingChange = (field, value) => setSettings(prev => ({ ...prev, [field]: value }));
    const handlePasswordChange = (e) => setPasswordData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const togglePasswordVisibility = (field) => setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
    const getInitials = (name) => name ? name.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase() : (user?.email?.[0].toUpperCase() || 'A');
    const getRoleDisplayName = (role) => (role?.replace('_', ' ') || '').replace(/\b\w/g, l => l.toUpperCase());

    // RENDER FUNCTIONS
    const renderProfileView = () => (
        <>
            <div className={styles.header}><h1>Profil Admin</h1><p>Informasi lengkap profil administrator</p></div>
            <div className={styles.profileCard}>
                <div className={styles.avatarSection}>
                    <div className={styles.avatarContainer}>
                        {formData.avatar_url ? <img src={formData.avatar_url} alt="Avatar" className={styles.avatar} /> : <div className={styles.avatarPlaceholder}><span>{getInitials(formData.name)}</span></div>}
                    </div>
                    <div className={styles.basicInfo}>
                        <h2>{formData.name || 'Nama belum diisi'}</h2>
                        <span><Shield size={14} />{getRoleDisplayName(formData.role)}</span>
                    </div>
                </div>
                <div className={styles.detailsSection}>
                    <h3>Informasi Kontak</h3>
                    <p><Mail size={16} /> Email: {formData.email || 'N/A'}</p>
                    <p><Phone size={16} /> Telepon: {formData.phone || 'Belum diisi'}</p>
                </div>
            </div>
        </>
    );

    const renderSettingsView = () => (
        <>
            <div className={styles.header}>
                <h1>Pengaturan Akun</h1><p>Kelola profil dan preferensi akun Anda</p>
                <button className={styles.backButton} onClick={() => navigate('/admin/profile')}>← Kembali ke Profil</button>
            </div>
            <div className={styles.tabContainer}>
                <div className={styles.tabList}>
                    <button className={`${styles.tab} ${activeTab === 'profile' ? styles.activeTab : ''}`} onClick={() => navigate('?view=settings&tab=profile')}><User size={16} /> Profil</button>
                    <button className={`${styles.tab} ${activeTab === 'notifications' ? styles.activeTab : ''}`} onClick={() => navigate('?view=settings&tab=notifications')}><Bell size={16} /> Notifikasi</button>
                    <button className={`${styles.tab} ${activeTab === 'preferences' ? styles.activeTab : ''}`} onClick={() => navigate('?view=settings&tab=preferences')}><Globe size={16} /> Preferensi</button>
                    <button className={`${styles.tab} ${activeTab === 'security' ? styles.activeTab : ''}`} onClick={() => navigate('?view=settings&tab=security')}><Shield size={16} /> Keamanan</button>
                </div>
                <div className={styles.tabContent}>
                    {activeTab === 'profile' && (
                        <form onSubmit={handleProfileSubmit} className={styles.form}>
                            <div className={styles.sectionHeader}><h2>Informasi Profil</h2><p>Perbarui info profil dan foto.</p></div>
                            <div className={styles.avatarUpload}>
                                <div className={styles.currentAvatar}>{formData.avatar_url ? <img src={formData.avatar_url} alt="Avatar" /> : <div className={styles.avatarPlaceholder}><span>{getInitials(formData.name)}</span></div>}</div>
                                <div><h3>Foto Profil</h3><p>JPG/PNG, maks 5MB.</p><label className={styles.uploadButton}><Camera size={16} /> Ubah Foto<input type="file" accept="image/*" onChange={handleAvatarUpload} disabled={loading} /></label></div>
                            </div>
                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}><label><User size={16} /> Nama Lengkap</label><input type="text" name="name" value={formData.name || ''} onChange={handleFormChange} required /></div>
                                <div className={styles.formGroup}><label><Phone size={16} /> Nomor Telepon</label><input type="tel" name="phone" value={formData.phone || ''} onChange={handleFormChange} /></div>
                            </div>
                            <div className={styles.formGroup}><label><FileText size={16} /> Biodata</label><textarea name="bio" value={formData.bio || ''} onChange={handleFormChange} rows={4}></textarea></div>
                            <button type="submit" className={styles.saveButton} disabled={loading}><Save size={16} /> {loading ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
                        </form>
                    )}
                    {activeTab === 'notifications' && (
                        <form onSubmit={handleSettingsSubmit} className={styles.form}>
                            <div className={styles.sectionHeader}><h2>Notifikasi</h2><p>Pilih cara Anda menerima notifikasi.</p></div>
                            <div className={styles.settingItem}>
                                <div><h3>Notifikasi Email</h3><p>Terima email tentang aktivitas penting.</p></div>
                                <label className={styles.switch}><input type="checkbox" checked={settings.emailNotifications} onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)} /><span className={styles.slider}></span></label>
                            </div>
                            <div className={styles.settingItem}>
                                <div><h3>Notifikasi di Aplikasi</h3><p>Tampilkan notifikasi di dalam dasbor.</p></div>
                                <label className={styles.switch}><input type="checkbox" checked={settings.inAppNotifications} onChange={(e) => handleSettingChange('inAppNotifications', e.target.checked)} /><span className={styles.slider}></span></label>
                            </div>
                            <button type="submit" className={styles.saveButton} disabled={loading}><Save size={16} /> Simpan Pengaturan</button>
                        </form>
                    )}
                    {activeTab === 'preferences' && (
                         <form onSubmit={handleSettingsSubmit} className={styles.form}>
                            <div className={styles.sectionHeader}><h2>Preferensi</h2><p>Atur bahasa dan tema aplikasi.</p></div>
                            <div className={styles.formGroup}><label><Globe size={16} /> Bahasa</label><select value={settings.language} onChange={(e) => handleSettingChange('language', e.target.value)}><option value="id">Bahasa Indonesia</option><option value="en">English</option></select></div>
                            <div className={styles.formGroup}><label><Globe size={16} /> Tema</label><select value={settings.theme} onChange={(e) => handleSettingChange('theme', e.target.value)}><option value="light">Terang</option><option value="dark">Gelap</option></select></div>
                            <button type="submit" className={styles.saveButton} disabled={loading}><Save size={16} /> Simpan Preferensi</button>
                        </form>
                    )}
                    {activeTab === 'security' && (
                        <>
                            <form onSubmit={handleEmailSubmit} className={styles.form}>
                                <div className={styles.sectionHeader}><h2>Ubah Email</h2><p>Ubah alamat email yang terhubung dengan akun ini.</p></div>
                                <div className={styles.formGroup}><label><Mail size={16} /> Email Baru</label><input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required /></div>
                                <button type="submit" className={styles.saveButton} disabled={loading}><Save size={16} /> Simpan Email</button>
                            </form>
                            <hr className={styles.divider} />
                            <form onSubmit={handlePasswordSubmit} className={styles.form}>
                                <div className={styles.sectionHeader}><h2>Ubah Password</h2><p>Password baru harus minimal 8 karakter.</p></div>
                                <div className={styles.formGroup}><label><Lock size={16} /> Password Baru</label><div className={styles.passwordInput}><input type={showPasswords.new ? "text" : "password"} name="newPassword" value={passwordData.newPassword} onChange={handlePasswordChange} required /><button type="button" onClick={() => togglePasswordVisibility('new')}>{showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div>
                                <div className={styles.formGroup}><label><Lock size={16} /> Konfirmasi Password Baru</label><div className={styles.passwordInput}><input type={showPasswords.confirm ? "text" : "password"} name="confirmPassword" value={passwordData.confirmPassword} onChange={handlePasswordChange} required /><button type="button" onClick={() => togglePasswordVisibility('confirm')}>{showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div>
                                <button type="submit" className={styles.saveButton} disabled={loading}><Save size={16} /> Ubah Password</button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </>
    );

    if (authLoading || !profile) {
        return <div className={styles.loadingState}><div className={styles.spinner}></div><p>Memuat profil pengguna...</p></div>;
    }
    
    return (
        <div className={styles.container}>
            {activeView === 'profile' ? renderProfileView() : renderSettingsView()}
            {message && (<div className={`${styles.message} ${message.type === 'error' ? styles.error : styles.success}`}>{message.text}</div>)}
        </div>
    );
};

export default AdminProfile;