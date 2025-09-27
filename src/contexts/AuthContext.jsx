import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Efek 1: HANYA menangani status autentikasi pengguna (login/logout)
  useEffect(() => {
    // onAuthStateChange akan langsung memberikan status sesi saat aplikasi dimuat
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setIsAuthenticated(!!currentUser);
      // Hentikan loading segera setelah kita mengetahui status login
      setLoading(false);
    });

    // Hentikan listener saat komponen tidak lagi digunakan
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Efek 2: HANYA menangani pengambilan data profil SETELAH pengguna diketahui
  useEffect(() => {
    // Jika ada pengguna yang login, ambil profilnya
    if (user) {
      supabase
        .from('profile')
        .select('*')
        .eq('user_id', user.id)
        .single()
        .then(({ data, error }) => {
          if (error && error.code !== 'PGRST116') {
            console.error("Gagal mengambil profil:", error);
          }
          setProfile(data);
        });
    } else {
      // Jika pengguna logout, kosongkan data profil
      setProfile(null);
    }
  }, [user]); // <-- Efek ini hanya berjalan saat 'user' berubah

  const login = async ({ email, password }) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // Listener di atas akan menangani pembaruan state dan redirect
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    navigate('/login'); // Arahkan ke login secara manual untuk respons yang lebih cepat
  };

  const value = {
    user,
    profile,
    isAuthenticated,
    loading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

