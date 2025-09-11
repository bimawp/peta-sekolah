// src/contexts/AuthContext.jsx

import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { supabase } from '../utils/supabase';

const initialState = {
  user: null,
  profile: null,
  isAuthenticated: false,
  loading: true, // SELALU mulai dengan loading = true
  error: null
};

// ... (Actions dan Reducer tidak berubah, Anda bisa biarkan)
const authActions = {
    LOGIN: 'LOGIN', LOGOUT: 'LOGOUT', SET_LOADING: 'SET_LOADING', SET_ERROR: 'SET_ERROR', 
    CLEAR_ERROR: 'CLEAR_ERROR', UPDATE_PROFILE: 'UPDATE_PROFILE'
};
const authReducer = (state, action) => {
    switch (action.type) {
        case authActions.LOGIN: return { ...state, user: action.payload.user, profile: action.payload.profile, isAuthenticated: !!action.payload.user, loading: false, error: null };
        case authActions.LOGOUT: return { ...state, user: null, profile: null, isAuthenticated: false, loading: false, error: null };
        case authActions.UPDATE_PROFILE: return { ...state, profile: action.payload };
        case authActions.SET_LOADING: return { ...state, loading: action.payload };
        case authActions.SET_ERROR: return { ...state, error: action.payload, loading: false };
        case authActions.CLEAR_ERROR: return { ...state, error: null };
        default: return state;
    }
};


const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    // Fungsi ini sekarang lebih sederhana, hanya untuk fetch profil
    const fetchUserProfile = async (sessionUser) => {
      try {
        const { data: profileData, error } = await supabase
          .from('profile')
          .select('*')
          .eq('user_id', sessionUser.id)
          .single();
        if (error && error.code !== 'PGRST116') throw error;
        return { ...profileData, email: sessionUser.email };
      } catch (error) {
        console.error("Error fetching profile:", error);
        return null; // Kembalikan null jika gagal
      }
    };

    // PERBAIKAN UTAMA ADA DI SINI
    // Listener ini sekarang menjadi satu-satunya sumber kebenaran.
    // Ia akan menangani sesi awal, login, logout, dan update.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`Supabase Auth Event: ${event}`);
        
        if (session) {
          // Jika ada sesi (setelah login atau verifikasi email)
          const profile = await fetchUserProfile(session.user);
          dispatch({
            type: authActions.LOGIN,
            payload: { user: session.user, profile },
          });
        } else {
          // Jika tidak ada sesi (setelah logout)
          dispatch({ type: authActions.LOGOUT });
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []); // Cukup dijalankan sekali saat aplikasi dimuat

  const login = async (credentials) => {
    const { error } = await supabase.auth.signInWithPassword(credentials);
    if (error) {
      dispatch({ type: authActions.SET_ERROR, payload: error.message });
      return { success: false, error: error.message };
    }
    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };
  
  const value = {
    ...state,
    login,
    logout,
    setProfileData: (profileData) => dispatch({ type: authActions.UPDATE_PROFILE, payload: profileData }),
    clearError: () => dispatch({ type: authActions.CLEAR_ERROR }),
  };

  // Tampilkan anak komponen HANYA setelah loading selesai
  // Ini mencegah redirect ke login terlalu dini
  return (
    <AuthContext.Provider value={value}>
      {!state.loading && children}
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