// src/store/slices/authSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import authApi from '../../services/api/authApi'

const initialState = {
  user: null,
  token: null,
  status: 'idle',
  error: null,
}

export const loginUser = createAsyncThunk('auth/loginUser', async (credentials) => {
  const response = await authApi.login(credentials)
  return response.data
})

export const logoutUser = createAsyncThunk('auth/logoutUser', async () => {
  await authApi.logout()
})

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    resetAuth(state) {
      state.user = null
      state.token = null
      state.status = 'idle'
      state.error = null
    },
  },
  extraReducers(builder) {
    builder
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.user = action.payload.user
        state.token = action.payload.token
        state.error = null
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null
        state.token = null
        state.status = 'idle'
      })
  },
})

export const { resetAuth } = authSlice.actions
export default authSlice.reducer
