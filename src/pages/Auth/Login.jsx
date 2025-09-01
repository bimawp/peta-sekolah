import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Login.module.css';
import { useAuth } from '../../contexts/AuthContext'; 
import { supabase } from '../../utils/supabase';

const Login = () => {
  const navigate = useNavigate();
  const { login, error, clearError, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [schools, setSchools] = useState([])  

  useEffect(()=> {
    const  getschools = async ()=> {
      const { data } = await supabase.from('schools').select()

      if (data.length > 1) {
        setSchools(data)
        console.log('test schools : ', data)
      }
    }

    getschools()
  },[])
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();

    const result = await login({ email, password });
    if (result.success) {
      navigate('/'); // redirect tetap di halaman root
    } else {
      alert(result.error);
    }
  };

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
          <br /> {/* 1 baris jarak sebelum tombol */}
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

            <button type="submit" className={styles.loginBtn} disabled={loading}>
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

          {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default Login;
