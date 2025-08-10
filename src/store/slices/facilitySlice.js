// src/store/slices/facilitySlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import facilityApi from '../../services/api/facilityApi'

const initialState = {
  facilities: [],
  status: 'idle',
  error: null,
}

export const fetchFacilities = createAsyncThunk('facility/fetchFacilities', async () => {
  const response = await facilityApi.getFacilities()
  return response.data
})

const facilitySlice = createSlice({
  name: 'facility',
  initialState,
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(fetchFacilities.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchFacilities.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.facilities = action.payload
      })
      .addCase(fetchFacilities.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message
      })
  },
})

export default facilitySlice.reducer
