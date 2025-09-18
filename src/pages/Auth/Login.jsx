// src/pages/Auth/Login.jsx - KODE LENGKAP FINAL

import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import styles from './Login.module.css';

// Skema validasi
const schema = yup.object().shape({
  email: yup.string().email('Email tidak valid').required('Email wajib diisi'),
  password: yup.string().min(6, 'Password minimal 6 karakter').required('Password wajib diisi'),
});

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data) => {
    try {
      // Ganti dengan fungsi login Anda yang sebenarnya
      await login(data.email, data.password);
      navigate('/dashboard');
    } catch (error) {
      console.error("Login gagal:", error);
      // Anda bisa menambahkan state untuk menampilkan pesan error di UI
      // misalnya: setError('email', { type: 'manual', message: 'Email atau password salah' });
    }
  };

  return (
    <div className={styles.loginContainer}>
      <form onSubmit={handleSubmit(onSubmit)} className={styles.loginForm}>
        <h2>Login Admin</h2>

        <div className={styles.inputGroup}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            {...register('email')}
          />
          {errors.email && <p className={styles.error}>{errors.email.message}</p>}
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            {...register('password')}
          />
          {errors.password && <p className={styles.error}>{errors.password.message}</p>}
        </div>

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Memproses...' : 'Login'}
        </button>
      </form>
    </div>
  );
};

export default Login;