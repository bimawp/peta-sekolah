// src/contexts/AuthContext.jsx - NUCLEAR FIX
import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { supabase } from '../utils/supabase';

// Auth State
const initialState = {
  user: null,
  profile: null,
  session: null,
  isAuthenticated: false,
  loading: true,
  error: null
};

// Auth Actions
const authActions = {
  AUTH_START: 'AUTH_START',
  AUTH_SUCCESS: 'AUTH_SUCCESS',
  AUTH_FAILURE: 'AUTH_FAILURE',
  LOGOUT: 'LOGOUT',
  SET_SESSION: 'SET_SESSION',
  SET_PROFILE: 'SET_PROFILE',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_LOADING: 'SET_LOADING'
};

// Auth Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case authActions.AUTH_START:
      return {
        ...state,
        loading: true,
        error: null
      };
    
    case authActions.AUTH_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        session: action.payload.session,
        isAuthenticated: true,
        loading: false,
        error: null
      };
    
    case authActions.AUTH_FAILURE:
      return {
        ...state,
        user: null,
        session: null,
        profile: null,
        isAuthenticated: false,
        loading: false,
        error: action.payload
      };
    
    case authActions.LOGOUT:
      return {
        ...state,
        user: null,
        session: null,
        profile: null,
        isAuthenticated: false,
        loading: false,
        error: null
      };
    
    case authActions.SET_SESSION:
      return {
        ...state,
        user: action.payload.user,
        session: action.payload.session,
        isAuthenticated: !!action.payload.session,
        loading: false
      };

    case authActions.SET_PROFILE:
      return {
        ...state,
        profile: action.payload
      };
    
    case authActions.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };
    
    case authActions.SET_LOADING:
      return {
        ...state,
        loading: action.payload
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

  // NUCLEAR OPTION - Force clear everything on app start
  useEffect(() => {
    const nuclearClear = async () => {
      try {
        console.log('🚨 NUCLEAR CLEAR - Starting complete auth cleanup...');
        
        // 1. Clear Supabase auth
        await supabase.auth.signOut();
        
        // 2. Clear ALL localStorage
        localStorage.clear();
        
        // 3. Clear sessionStorage  
        sessionStorage.clear();
        
        // 4. Clear any IndexedDB (Supabase might use this)
        if ('indexedDB' in window) {
          try {
            await new Promise((resolve, reject) => {
              const deleteReq = indexedDB.deleteDatabase('supabase-auth-token');
              deleteReq.onsuccess = () => resolve();
              deleteReq.onerror = () => resolve(); // Don't fail if doesn't exist
            });
          } catch (err) {
            console.log('IndexedDB clear failed (probably doesn\'t exist)');
          }
        }
        
        // 5. Force state to logout
        dispatch({ type: authActions.LOGOUT });
        
        console.log('✅ NUCLEAR CLEAR completed - all auth data destroyed');
        
        // 6. Small delay then check session
        setTimeout(async () => {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              console.log('❌ Session still exists after nuclear clear!', session);
              // Try again
              await supabase.auth.signOut();
              dispatch({ type: authActions.LOGOUT });
            } else {
              console.log('✅ Confirmed: No session exists');
            }
          } catch (err) {
            console.log('Session check after nuclear clear failed:', err);
          }
        }, 100);
        
      } catch (error) {
        console.error('❌ Nuclear clear failed:', error);
        // Force logout anyway
        dispatch({ type: authActions.LOGOUT });
      }
    };

    // ALWAYS do nuclear clear on app start for now
    nuclearClear();
  }, []);

  // Load user profile from profiles table
  const loadUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
        return;
      }

      dispatch({
        type: authActions.SET_PROFILE,
        payload: data
      });
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  // Check if session is valid
  const isSessionValid = (session) => {
    if (!session || !session.expires_at) return false;
    
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at;
    
    // Add 5 minute buffer
    return expiresAt > (now + 300);
  };

  // Listen for auth changes ONLY - no initial session check
  useEffect(() => {
    let mounted = true;

    console.log('🔄 Setting up auth state listener...');

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, session?.user?.email || 'no user');
        
        if (!mounted) return;

        // Handle different events
        if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' && !session) {
          console.log('🚪 User signed out or token refresh failed');
          dispatch({ type: authActions.LOGOUT });
          return;
        }

        if (event === 'SIGNED_IN' && session && isSessionValid(session)) {
          console.log('✅ User signed in successfully:', session.user.email);
          dispatch({
            type: authActions.AUTH_SUCCESS,
            payload: {
              user: session.user,
              session: session
            }
          });
          
          // Load user profile
          await loadUserProfile(session.user.id);
        } else if (session && !isSessionValid(session)) {
          console.log('❌ Received invalid session, signing out...');
          await supabase.auth.signOut();
          dispatch({ type: authActions.LOGOUT });
        }
      }
    );

    // Cleanup subscription
    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Login function - ONLY way to authenticate
  const login = async (credentials) => {
    try {
      dispatch({ type: authActions.AUTH_START });
      
      console.log('🚀 Starting login for:', credentials.email);
      
      // Make sure we're starting clean
      await supabase.auth.signOut();
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      });

      if (error) {
        console.error('❌ Login error:', error);
        throw error;
      }

      if (!data.user || !data.session) {
        throw new Error('Login berhasil tapi tidak mendapat session yang valid');
      }

      if (!isSessionValid(data.session)) {
        throw new Error('Session yang diterima tidak valid atau sudah expired');
      }

      console.log('✅ Login successful for:', data.user.email);
      
      // State akan update via onAuthStateChange listener
      return { success: true, data };
    } catch (error) {
      console.error('❌ Login failed:', error);
      dispatch({
        type: authActions.AUTH_FAILURE,
        payload: error.message
      });
      return { success: false, error: error.message };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      console.log('🚪 Starting logout...');
      dispatch({ type: authActions.SET_LOADING, payload: true });
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error);
        throw error;
      }
      
      console.log('✅ Logout successful');
      // State will be updated via onAuthStateChange
      
    } catch (error) {
      console.error('Error logging out:', error);
      // Force logout di state meskipun ada error
      dispatch({ type: authActions.LOGOUT });
    }
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: authActions.CLEAR_ERROR });
  };

  // Get user display info
  const getUserDisplayInfo = () => {
    if (!state.user) return null;

    return {
      id: state.user.id,
      email: state.user.email,
      name: state.profile?.full_name || 
            state.profile?.name || 
            state.user.user_metadata?.full_name || 
            'User',
      avatar: state.profile?.avatar_url || null,
      role: state.profile?.role || 'user',
      createdAt: state.user.created_at
    };
  };

  const value = {
    // State
    user: state.user,
    profile: state.profile,
    session: state.session,
    isAuthenticated: state.isAuthenticated,
    loading: state.loading,
    error: state.error,
    
    // User info helper
    userInfo: getUserDisplayInfo(),
    
    // Auth functions
    login,
    logout,
    
    // Utility functions
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};