import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { supabase } from '../utils/supabase'; // Pastikan path ini benar

// Auth State
const initialState = {
  user: null,
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
};

// Auth Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case authActions.LOGIN:
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        loading: false,
        error: null,
      };
    case authActions.LOGOUT:
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null,
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

  const loadUser = async (session) => {
    if (session) {
      // Ambil data profil dari tabel 'profiles'
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
      }
      
      const userWithProfile = profile ? { ...session.user, ...profile } : session.user;
      dispatch({ type: authActions.LOGIN, payload: userWithProfile });
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

  const updateProfile = async (userData) => {
    console.warn('Fungsi updateProfile perlu diimplementasikan.');
    return { success: false, error: 'Fungsi updateProfile belum diimplementasikan.' };
  };

  const value = {
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    loading: state.loading,
    error: state.error,
    login,
    register,
    logout,
    updateProfile,
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