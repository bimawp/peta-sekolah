import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("[AuthProvider] Memulai pengecekan sesi...");

    const checkSession = async () => {
      try {
        // Langsung panggil getSession()
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error("[AuthProvider] Error saat getSession:", error.message);
          setLoading(false); // Tetap selesaikan loading meskipun error
          return;
        }

        if (session) {
          console.log("[AuthProvider] Sesi ditemukan:", session.user.email);
          setUser(session.user);
          setIsAuthenticated(true);
        } else {
          console.log("[AuthProvider] Tidak ada sesi aktif.");
        }

      } catch (e) {
        console.error("[AuthProvider] Terjadi kesalahan kritis:", e.message);
      } finally {
        // Ini adalah baris paling penting.
        // Apapun yang terjadi, pastikan loading selesai.
        console.log("✅ [AuthProvider] Pengecekan sesi selesai. Menghentikan loading.");
        setLoading(false);
      }
    };

    checkSession();

    // Listener untuk login/logout di tab lain
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN') {
          setUser(session.user);
          setIsAuthenticated(true);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setIsAuthenticated(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []); // <-- Dependency array kosong, hanya berjalan sekali

  const value = {
    user,
    isAuthenticated,
    loading,
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