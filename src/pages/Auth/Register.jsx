import React, { useState } from 'react';
import styles from './Auth.module.css';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const handleSubmit = e => {
    e.preventDefault();
    if(password !== confirm) {
      alert('Password dan konfirmasi tidak sama');
      return;
    }
    // Logika register
  };

  return (
    <div className={styles.auth}>
      <h1>Daftar</h1>
      <form onSubmit={handleSubmit}>
        <label>Email:</label>
        <input 
          type="email" 
          value={email} 
          onChange={e => setEmail(e.target.value)} 
          required 
        />
        <label>Password:</label>
        <input 
          type="password" 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
          required 
        />
        <label>Konfirmasi Password:</label>
        <input 
          type="password" 
          value={confirm} 
          onChange={e => setConfirm(e.target.value)} 
          required 
        />
        <button type="submit">Daftar</button>
      </form>
    </div>
  );
};

export default Register;
