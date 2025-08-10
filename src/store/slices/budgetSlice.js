// src/store/slices/budgetSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import budgetApi from '../../services/api/budgetApi'

const initialState = {
  budgets: [],
  status: 'idle',
  error: null,
}

export const fetchBudgets = createAsyncThunk('budget/fetchBudgets', async () => {
  const response = await budgetApi.getBudgets()
  return response.data
})

const budgetSlice = createSlice({
  name: 'budget',
  initialState,
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(fetchBudgets.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchBudgets.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.budgets = action.payload
      })
      .addCase(fetchBudgets.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message
      })
  },
})

export default budgetSlice.reducer
