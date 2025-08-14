import React, { useState } from 'react';
import styles from './Login.module.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Login attempt:', { email, password });
  };

  return (
    <div className={styles.loginContainer}>
      {/* Kiri */}
      <div className={styles.loginLeft}>
        {/* Logo besar transparan */}
        <img
          src="/assets/logo-disdik.png"
          alt="Logo DISDIK"
          className={styles.bgLogo}
        />
        {/* Konten */}
        <div className={styles.loginContent}>
          <h1 className={styles.mainTitle}>e-PlanDISDIK</h1>
          <p className={styles.subtitle}>Electronic Planning Dinas Pendidikan</p>
          <p className={styles.subtitle}>Kabupaten - Garut</p>
          <a
            href="https://disdikkabgarut.org/"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.selengkapnyaBtn}
          >
            Selengkapnya
          </a>
        </div>
        <div className={styles.bottomText}>
          DINAS PENDIDIKAN KABUPATEN GARUT
        </div>
      </div>

      {/* Kanan */}
      <div className={styles.loginRight}>
        <div className={styles.loginFormContainer}>
          {/* Logo kecil di atas kiri */}
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
                />
              </div>
            </div>
            <button type="submit" className={styles.loginBtn}>
              Masuk
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
