// src/pages/Login/Login.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Login.module.css';
import { useAuth } from '../../contexts/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login, error, clearError, loading, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  console.log('🔍 Login component render:', {
    isAuthenticated,
    loading,
    isSubmitting,
    pathname: window.location.pathname,
  });

  // Redirect jika sudah login
  useEffect(() => {
    if (isAuthenticated && !loading) {
      console.log('✅ Login: User authenticated, redirecting...');
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting || loading) {
      console.log('⏳ Login: Already submitting/loading, skip');
      return;
    }

    setIsSubmitting(true);
    clearError();

    console.log('🚀 Login: Starting login for:', email);

    try {
      const result = await login({ email, password });
      console.log('🔍 Login: Result:', result);

      if (result.success) {
        console.log('✅ Login: Success!');
        // Redirect handled by useEffect
      } else {
        console.error('❌ Login: Failed:', result.error);
        alert(result.error || 'Login gagal, coba lagi.');
      }
    } catch (err) {
      console.error('❌ Login Exception:', err);
      alert('Terjadi kesalahan: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // State loading
  if (loading) {
    console.log('⏳ Login: Showing loading state');
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <div>Loading Authentication...</div>
      </div>
    );
  }

  console.log('📝 Login: Rendering form');

  return (
    <div className={styles.loginContainer}>
      {/* Kiri */}
      <div className={styles.loginLeft}>
        <img
          src="/assets/logo-disdik.png"
          alt="Logo DISDIK"
          className={styles.bgLogo}
        />
        <div className={styles.loginContent}>
          <h1 className={styles.mainTitle}>e-PlanDISDIK</h1>
          <p className={styles.subtitle}>Electronic Planning Dinas Pendidikan</p>
          <p className={styles.subtitle}>Kabupaten - Garut</p>
          <br />
          <a
            href="https://disdikkabgarut.org/"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.selengkapnyaBtn}
          >
            Selengkapnya
          </a>
        </div>
        <div className={styles.bottomText}>DINAS PENDIDIKAN KABUPATEN GARUT</div>
      </div>

      {/* Kanan */}
      <div className={styles.loginRight}>
        <div className={styles.loginFormContainer}>
          <div className={styles.topLogoWrapper}>
            <img
              src="/assets/icon-disdik.png"
              alt="Icon DISDIK"
              className={styles.topLogo}
            />
          </div>

          <div className={styles.formHeader}>
            <h2>Selamat Datang di</h2>
            <h3>e-PlanDISDIK</h3>
            <p>Silahkan Login untuk mengelola data</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.loginForm}>
            <div className={styles.inputGroup}>
              <div className={styles.inputWrapper}>
                <span className={styles.inputIcon}>✉</span>
                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={styles.formInput}
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <div className={styles.inputWrapper}>
                <span className={styles.inputIcon}>🔒</span>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={styles.formInput}
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <button
              type="submit"
              className={styles.loginBtn}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

          {error && (
            <p
              style={{
                color: 'red',
                marginTop: '10px',
                textAlign: 'center',
              }}
            >
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
