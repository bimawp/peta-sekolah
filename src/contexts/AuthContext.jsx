import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { supabase } from '../utils/supabase'; // Pastikan path ini benar

// Auth State
const initialState = {
  user: null,
  profile: null, // Tambahkan profile ke state
  isAuthenticated: false,
  loading: true,
  error: null
};

// Auth Actions
const authActions = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  UPDATE_PROFILE: 'UPDATE_PROFILE', // Tambahkan action untuk update profile
};

// Auth Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case authActions.LOGIN:
      return {
        ...state,
        user: action.payload.user,
        profile: action.payload.profile,
        isAuthenticated: !!action.payload.user,
        loading: false,
        error: null,
      };
    case authActions.LOGOUT:
      return {
        ...state,
        user: null,
        profile: null,
        isAuthenticated: false,
        loading: false,
        error: null,
      };
    case authActions.UPDATE_PROFILE:
      return {
        ...state,
        profile: action.payload,
      };
    case authActions.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
      };
    case authActions.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false,
      };
    case authActions.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
};

// Create Auth Context
const AuthContext = createContext();

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Fungsi untuk set profile dari AdminProfile.jsx
  const setProfileData = (profileData) => {
    dispatch({ 
      type: authActions.UPDATE_PROFILE, 
      payload: profileData 
    });
  };

  const loadUser = async (session) => {
    if (session) {
      let profile = null;
      
      // Ambil data profil dari tabel 'profile' (sesuai dengan AdminProfile.jsx)
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profile') // Menggunakan 'profile' (tanpa 's') sesuai AdminProfile.jsx
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error fetching profile:', profileError);
        } else if (profileData) {
          profile = profileData;
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      }
      
      dispatch({ 
        type: authActions.LOGIN, 
        payload: { 
          user: session.user, 
          profile: profile 
        } 
      });
    } else {
      dispatch({ type: authActions.LOGOUT });
    }
  };

  useEffect(() => {
    // Ambil session saat komponen dimuat
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadUser(session);
    });

    // Dengarkan perubahan state autentikasi dari Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          loadUser(session);
        }
        if (event === 'SIGNED_OUT') {
          dispatch({ type: authActions.LOGOUT });
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const login = async (credentials) => {
    dispatch({ type: authActions.SET_LOADING, payload: true });
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      dispatch({
        type: authActions.SET_ERROR,
        payload: error.message,
      });
      return { success: false, error: error.message };
    } finally {
      dispatch({ type: authActions.SET_LOADING, payload: false });
    }
  };

  const register = async (userData) => {
    console.warn('Fungsi register belum diimplementasikan dengan Supabase.');
    return { success: false, error: 'Fungsi register belum diimplementasikan.' };
  };

  const logout = async () => {
    try {
      dispatch({ type: authActions.SET_LOADING, payload: true });
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      dispatch({ type: authActions.LOGOUT });
    } catch (error) {
      dispatch({
        type: authActions.SET_ERROR,
        payload: error.message,
      });
    } finally {
      dispatch({ type: authActions.SET_LOADING, payload: false });
    }
  };

  // Fungsi untuk refresh profile data
  const refreshProfile = async () => {
    if (!state.user) return;
    
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profile')
        .select('*')
        .eq('user_id', state.user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error refreshing profile:', profileError);
        return;
      }

      if (profileData) {
        dispatch({ 
          type: authActions.UPDATE_PROFILE, 
          payload: profileData 
        });
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };

  const updateProfile = async (profileData) => {
    if (!state.user) {
      return { success: false, error: 'User tidak ditemukan' };
    }

    try {
      const updateData = {
        ...profileData,
        user_id: state.user.id,
        updated_at: new Date().toISOString()
      };

      let result;
      if (state.profile?.id) {
        // Update existing profile
        result = await supabase
          .from('profile')
          .update(updateData)
          .eq('id', state.profile.id)
          .select()
          .single();
      } else {
        // Create new profile
        updateData.created_at = new Date().toISOString();
        result = await supabase
          .from('profile')
          .insert([updateData])
          .select()
          .single();
      }

      if (result.error) {
        throw result.error;
      }

      // Update profile in context
      if (result.data) {
        dispatch({ 
          type: authActions.UPDATE_PROFILE, 
          payload: result.data 
        });
      }

      return { success: true, data: result.data };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    user: state.user,
    profile: state.profile, // Export profile
    isAuthenticated: state.isAuthenticated,
    loading: state.loading,
    error: state.error,
    login,
    register,
    logout,
    updateProfile,
    refreshProfile, // Export refreshProfile function
    setProfileData, // Export setProfileData function
    clearError: () => dispatch({ type: authActions.CLEAR_ERROR }),
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