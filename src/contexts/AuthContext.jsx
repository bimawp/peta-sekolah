import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { authApi } from '../services/api/authApi';

// Auth State
const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
  error: null
};

// Auth Actions
const authActions = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  REGISTER_START: 'REGISTER_START',
  REGISTER_SUCCESS: 'REGISTER_SUCCESS',
  REGISTER_FAILURE: 'REGISTER_FAILURE',
  LOAD_USER: 'LOAD_USER',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_LOADING: 'SET_LOADING'
};

// Auth Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case authActions.LOGIN_START:
    case authActions.REGISTER_START:
      return {
        ...state,
        loading: true,
        error: null
      };
    
    case authActions.LOGIN_SUCCESS:
    case authActions.REGISTER_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
        error: null
      };
    
    case authActions.LOGIN_FAILURE:
    case authActions.REGISTER_FAILURE:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: action.payload
      };
    
    case authActions.LOGOUT:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: null
      };
    
    case authActions.LOAD_USER:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false
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

  // Load user on app start
  useEffect(() => {
    loadUser();
  }, []);

  // Load user from localStorage/API
  const loadUser = async () => {
    try {
      dispatch({ type: authActions.SET_LOADING, payload: true });
      
      const token = localStorage.getItem('token');
      if (!token) {
        dispatch({ type: authActions.SET_LOADING, payload: false });
        return;
      }

      // For demo purposes, create a mock user
      // In real app, you would validate token with backend
      const mockUser = {
        id: 1,
        name: 'Admin User',
        email: 'admin@disdik.go.id',
        role: 'admin',
        avatar: null
      };

      dispatch({
        type: authActions.LOAD_USER,
        payload: {
          user: mockUser,
          token: token
        }
      });
    } catch (error) {
      localStorage.removeItem('token');
      dispatch({ type: authActions.SET_LOADING, payload: false });
    }
  };

  // Login function
  const login = async (credentials) => {
    try {
      dispatch({ type: authActions.LOGIN_START });
      
      // For demo purposes, simulate API call
      // In real app: const response = await authApi.login(credentials);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock successful login
      if (credentials.email === 'admin@disdik.go.id' && credentials.password === 'admin123') {
        const mockResponse = {
          user: {
            id: 1,
            name: 'Admin User',
            email: 'admin@disdik.go.id',
            role: 'admin',
            avatar: null
          },
          token: 'mock-jwt-token-' + Date.now()
        };

        // Store token
        localStorage.setItem('token', mockResponse.token);
        
        dispatch({
          type: authActions.LOGIN_SUCCESS,
          payload: mockResponse
        });
        
        return { success: true };
      } else {
        throw new Error('Email atau password salah');
      }
    } catch (error) {
      dispatch({
        type: authActions.LOGIN_FAILURE,
        payload: error.message
      });
      return { success: false, error: error.message };
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      dispatch({ type: authActions.REGISTER_START });
      
      // For demo purposes, simulate API call
      // In real app: const response = await authApi.register(userData);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock successful registration
      const mockResponse = {
        user: {
          id: Date.now(),
          name: userData.name,
          email: userData.email,
          role: 'user',
          avatar: null
        },
        token: 'mock-jwt-token-' + Date.now()
      };

      // Store token
      localStorage.setItem('token', mockResponse.token);
      
      dispatch({
        type: authActions.REGISTER_SUCCESS,
        payload: mockResponse
      });
      
      return { success: true };
    } catch (error) {
      dispatch({
        type: authActions.REGISTER_FAILURE,
        payload: error.message
      });
      return { success: false, error: error.message };
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    dispatch({ type: authActions.LOGOUT });
  };

  // Update user profile
  const updateProfile = async (userData) => {
    try {
      // In real app: const response = await authApi.updateProfile(userData);
      // For demo, just update local state
      const updatedUser = { ...state.user, ...userData };
      
      dispatch({
        type: authActions.LOAD_USER,
        payload: {
          user: updatedUser,
          token: state.token
        }
      });
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: authActions.CLEAR_ERROR });
  };

  // Check if user has permission
  const hasPermission = (requiredRole) => {
    if (!state.user) return false;
    
    const roles = ['user', 'admin'];
    const userRoleIndex = roles.indexOf(state.user.role);
    const requiredRoleIndex = roles.indexOf(requiredRole);
    
    return userRoleIndex >= requiredRoleIndex;
  };

  const value = {
    user: state.user,
    token: state.token,
    isAuthenticated: state.isAuthenticated,
    loading: state.loading,
    error: state.error,
    login,
    register,
    logout,
    updateProfile,
    clearError,
    hasPermission
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