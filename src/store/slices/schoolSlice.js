// src/store/slices/schoolSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getSchoolsByRegion, getAllSchools, getSchoolById, searchSchools } from '../../services/api/schoolApi.js';

// Async thunks
export const fetchSchoolsByRegion = createAsyncThunk(
  'schools/fetchByRegion',
  async (regionBounds, { rejectWithValue }) => {
    try {
      const data = await getSchoolsByRegion(regionBounds);
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchAllSchools = createAsyncThunk(
  'schools/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const data = await getAllSchools();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchSchoolById = createAsyncThunk(
  'schools/fetchById',
  async (schoolId, { rejectWithValue }) => {
    try {
      const data = await getSchoolById(schoolId);
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchSearchResults = createAsyncThunk(
  'schools/search',
  async (searchTerm, { rejectWithValue }) => {
    try {
      const data = await searchSchools(searchTerm);
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Initial state
const initialState = {
  data: [],
  filteredData: [],
  selectedSchool: null,
  searchResults: [],
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
  filters: {
    level: '',
    type: '',
    village: '',
  },
  searchTerm: '',
};

// Slice
const schoolSlice = createSlice({
  name: 'schools',
  initialState,
  reducers: {
    // Synchronous actions
    setSchools: (state, action) => {
      state.data = action.payload;
      state.filteredData = action.payload;
      state.status = 'succeeded';
      state.error = null;
    },
    
    setSelectedSchool: (state, action) => {
      state.selectedSchool = action.payload;
    },
    
    setLoading: (state, action) => {
      state.status = action.payload ? 'loading' : 'idle';
    },
    
    setError: (state, action) => {
      state.error = action.payload;
      state.status = 'failed';
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
      // Apply filters
      state.filteredData = applyFilters(state.data, state.filters, state.searchTerm);
    },
    
    setSearchTerm: (state, action) => {
      state.searchTerm = action.payload;
      // Apply search
      state.filteredData = applyFilters(state.data, state.filters, action.payload);
    },
    
    clearFilters: (state) => {
      state.filters = initialState.filters;
      state.searchTerm = '';
      state.filteredData = state.data;
    },
    
    resetState: (state) => {
      Object.assign(state, initialState);
    },
  },
  
  extraReducers: (builder) => {
    // fetchSchoolsByRegion
    builder
      .addCase(fetchSchoolsByRegion.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchSchoolsByRegion.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
        state.filteredData = applyFilters(action.payload, state.filters, state.searchTerm);
        state.error = null;
      })
      .addCase(fetchSchoolsByRegion.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // fetchAllSchools
      .addCase(fetchAllSchools.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchAllSchools.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
        state.filteredData = applyFilters(action.payload, state.filters, state.searchTerm);
        state.error = null;
      })
      .addCase(fetchAllSchools.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // fetchSchoolById
      .addCase(fetchSchoolById.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchSchoolById.fulfilled, (state, action) => {
        state.selectedSchool = action.payload;
        state.status = 'succeeded';
        state.error = null;
      })
      .addCase(fetchSchoolById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // fetchSearchResults
      .addCase(fetchSearchResults.fulfilled, (state, action) => {
        state.searchResults = action.payload;
      })
      .addCase(fetchSearchResults.rejected, (state, action) => {
        console.error('Search failed:', action.payload);
      });
  },
});

// Helper function untuk apply filters
const applyFilters = (data, filters, searchTerm) => {
  if (!Array.isArray(data)) return [];
  
  let filtered = data;

  // Apply level filter
  if (filters.level && filters.level !== '') {
    filtered = filtered.filter(school => 
      school.level && school.level.toLowerCase().includes(filters.level.toLowerCase())
    );
  }

  // Apply type filter
  if (filters.type && filters.type !== '') {
    filtered = filtered.filter(school => 
      school.type && school.type.toLowerCase().includes(filters.type.toLowerCase())
    );
  }

  // Apply village filter
  if (filters.village && filters.village !== '') {
    filtered = filtered.filter(school => 
      school.village && school.village.toLowerCase().includes(filters.village.toLowerCase())
    );
  }

  // Apply search term
  if (searchTerm && searchTerm.trim() !== '') {
    const term = searchTerm.toLowerCase().trim();
    filtered = filtered.filter(school => 
      (school.name && school.name.toLowerCase().includes(term)) ||
      (school.npsn && school.npsn.toLowerCase().includes(term)) ||
      (school.address && school.address.toLowerCase().includes(term)) ||
      (school.village && school.village.toLowerCase().includes(term))
    );
  }

  return filtered;
};

// Export actions
export const {
  setSchools,
  setSelectedSchool,
  setLoading,
  setError,
  clearError,
  setFilters,
  setSearchTerm,
  clearFilters,
  resetState,
} = schoolSlice.actions;

// Selectors
export const selectAllSchools = (state) => state.schools.data;
export const selectFilteredSchools = (state) => state.schools.filteredData;
export const selectSelectedSchool = (state) => state.schools.selectedSchool;
export const selectSchoolsStatus = (state) => state.schools.status;
export const selectSchoolsError = (state) => state.schools.error;
export const selectFilters = (state) => state.schools.filters;
export const selectSearchTerm = (state) => state.schools.searchTerm;
export const selectSearchResults = (state) => state.schools.searchResults;

export default schoolSlice.reducer;