import React, { createContext, useContext, useEffect, useReducer } from 'react';

// State awal
const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true, // Selalu mulai dengan loading true
  error: null
};

// Actions
const authActions = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  LOAD_USER_SUCCESS: 'LOAD_USER_SUCCESS',
  LOAD_USER_FINISH: 'LOAD_USER_FINISH', // Aksi baru untuk menandai selesai load
  CLEAR_ERROR: 'CLEAR_ERROR'
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case authActions.LOGIN_START:
      return { ...state, loading: true, error: null };
    
    case authActions.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
        error: null
      };
    
    case authActions.LOGIN_FAILURE:
      return {
        ...state,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: action.payload
      };

    case authActions.LOGOUT:
      return {
        ...initialState,
        loading: false // Pastikan loading false setelah logout
      };

    case authActions.LOAD_USER_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false
      };

    case authActions.LOAD_USER_FINISH:
      // Aksi ini dipanggil ketika tidak ada token, menandakan proses load selesai.
      return { ...state, loading: false };

    case authActions.CLEAR_ERROR:
      return { ...state, error: null };
    
    default:
      return state;
  }
};

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    // Fungsi ini sinkron dan tidak perlu async
    const loadUserFromStorage = () => {
      try {
        const token = localStorage.getItem('token');

        if (token) {
          // Jika ada token, kita asumsikan valid (sesuai logika mock Anda)
          const mockUser = {
            id: 1, name: 'Admin User', email: 'admin@disdik.go.id', role: 'admin', avatar: null
          };
          dispatch({
            type: authActions.LOAD_USER_SUCCESS,
            payload: { user: mockUser, token }
          });
        } else {
          // Jika tidak ada token, proses loading selesai
          dispatch({ type: authActions.LOAD_USER_FINISH });
        }
      } catch (error) {
        console.error("Failed to load user:", error);
        dispatch({ type: authActions.LOAD_USER_FINISH });
      }
    };

    loadUserFromStorage();
  }, []);

  const login = async (credentials) => {
    dispatch({ type: authActions.LOGIN_START });
    try {
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulasi network delay
      
      if (credentials.email === 'admin@disdik.go.id' && credentials.password === 'admin123') {
        const mockResponse = {
          user: { id: 1, name: 'Admin User', email: 'admin@disdik.go.id', role: 'admin', avatar: null },
          token: 'mock-jwt-token-' + Date.now()
        };

        localStorage.setItem('token', mockResponse.token);
        dispatch({ type: authActions.LOGIN_SUCCESS, payload: mockResponse });
        return { success: true };
      } else {
        throw new Error('Email atau password salah');
      }
    } catch (error) {
      dispatch({ type: authActions.LOGIN_FAILURE, payload: error.message });
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    dispatch({ type: authActions.LOGOUT });
  };
  
  // Fungsi lain (register, updateProfile, dll.) tetap sama...

  const value = { ...state, login, logout, /* ...fungsi lain */ };

  return (
    <AuthContext.Provider value={value}>
      {!state.loading ? children : <div>Loading Authentication...</div>}
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