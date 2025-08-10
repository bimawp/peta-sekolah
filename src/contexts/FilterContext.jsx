import React, { createContext, useContext, useReducer } from 'react';

// Initial filter state
const initialState = {
  global: {
    region: 'all',
    district: 'all',
    schoolType: 'all',
    year: new Date().getFullYear().toString(),
    status: 'all'
  },
  schools: {
    search: '',
    type: 'all',
    status: 'all',
    region: 'all',
    district: 'all',
    sortBy: 'name',
    sortOrder: 'asc',
    page: 1,
    limit: 20
  },
  budget: {
    year: new Date().getFullYear().toString(),
    category: 'all',
    status: 'all',
    region: 'all',
    district: 'all'
  },
  facilities: {
    type: 'all',
    condition: 'all',
    region: 'all',
    district: 'all'
  },
  map: {
    view: 'all',
    layer: 'schools',
    zoom: 10,
    center: [-7.3886, 109.2295] // Purbalingga coordinates
  }
};

// Filter actions
const filterActions = {
  SET_GLOBAL_FILTER: 'SET_GLOBAL_FILTER',
  SET_SCHOOLS_FILTER: 'SET_SCHOOLS_FILTER',
  SET_BUDGET_FILTER: 'SET_BUDGET_FILTER',
  SET_FACILITIES_FILTER: 'SET_FACILITIES_FILTER',
  SET_MAP_FILTER: 'SET_MAP_FILTER',
  RESET_FILTERS: 'RESET_FILTERS',
  RESET_SECTION_FILTERS: 'RESET_SECTION_FILTERS'
};

// Filter reducer
const filterReducer = (state, action) => {
  switch (action.type) {
    case filterActions.SET_GLOBAL_FILTER:
      return {
        ...state,
        global: {
          ...state.global,
          ...action.payload
        }
      };
    
    case filterActions.SET_SCHOOLS_FILTER:
      return {
        ...state,
        schools: {
          ...state.schools,
          ...action.payload
        }
      };
    
    case filterActions.SET_BUDGET_FILTER:
      return {
        ...state,
        budget: {
          ...state.budget,
          ...action.payload
        }
      };
    
    case filterActions.SET_FACILITIES_FILTER:
      return {
        ...state,
        facilities: {
          ...state.facilities,
          ...action.payload
        }
      };
    
    case filterActions.SET_MAP_FILTER:
      return {
        ...state,
        map: {
          ...state.map,
          ...action.payload
        }
      };
    
    case filterActions.RESET_SECTION_FILTERS:
      return {
        ...state,
        [action.payload]: initialState[action.payload]
      };
    
    case filterActions.RESET_FILTERS:
      return initialState;
    
    default:
      return state;
  }
};

// Create Filter Context
const FilterContext = createContext();

// Filter Provider Component
export const FilterProvider = ({ children }) => {
  const [filters, dispatch] = useReducer(filterReducer, initialState);

  // Set global filters (affects all sections)
  const setGlobalFilter = (filterUpdates) => {
    dispatch({
      type: filterActions.SET_GLOBAL_FILTER,
      payload: filterUpdates
    });
  };

  // Set schools filters
  const setSchoolsFilter = (filterUpdates) => {
    dispatch({
      type: filterActions.SET_SCHOOLS_FILTER,
      payload: filterUpdates
    });
  };

  // Set budget filters
  const setBudgetFilter = (filterUpdates) => {
    dispatch({
      type: filterActions.SET_BUDGET_FILTER,
      payload: filterUpdates
    });
  };

  // Set facilities filters
  const setFacilitiesFilter = (filterUpdates) => {
    dispatch({
      type: filterActions.SET_FACILITIES_FILTER,
      payload: filterUpdates
    });
  };

  // Set map filters
  const setMapFilter = (filterUpdates) => {
    dispatch({
      type: filterActions.SET_MAP_FILTER,
      payload: filterUpdates
    });
  };

  // Reset all filters
  const resetAllFilters = () => {
    dispatch({ type: filterActions.RESET_FILTERS });
  };

  // Reset specific section filters
  const resetSectionFilters = (section) => {
    dispatch({
      type: filterActions.RESET_SECTION_FILTERS,
      payload: section
    });
  };

  // Get combined filters for a section (global + section specific)
  const getCombinedFilters = (section) => {
    return {
      ...filters.global,
      ...filters[section]
    };
  };

  // Check if any filters are active
  const hasActiveFilters = (section) => {
    const sectionFilters = filters[section];
    const defaultFilters = initialState[section];
    
    return Object.keys(sectionFilters).some(key => {
      if (key === 'page') return false; // Don't consider pagination as active filter
      return sectionFilters[key] !== defaultFilters[key];
    });
  };

  // Get filter summary for display
  const getFilterSummary = (section) => {
    const activeFilters = [];
    const sectionFilters = getCombinedFilters(section);
    
    if (sectionFilters.region !== 'all') {
      activeFilters.push(`Region: ${sectionFilters.region}`);
    }
    if (sectionFilters.district !== 'all') {
      activeFilters.push(`District: ${sectionFilters.district}`);
    }
    if (sectionFilters.schoolType !== 'all' && sectionFilters.type !== 'all') {
      activeFilters.push(`Type: ${sectionFilters.schoolType || sectionFilters.type}`);
    }
    if (sectionFilters.status !== 'all') {
      activeFilters.push(`Status: ${sectionFilters.status}`);
    }
    if (sectionFilters.year !== new Date().getFullYear().toString()) {
      activeFilters.push(`Year: ${sectionFilters.year}`);
    }
    
    return activeFilters;
  };

  const value = {
    filters,
    setGlobalFilter,
    setSchoolsFilter,
    setBudgetFilter,
    setFacilitiesFilter,
    setMapFilter,
    resetAllFilters,
    resetSectionFilters,
    getCombinedFilters,
    hasActiveFilters,
    getFilterSummary
  };

  return (
    <FilterContext.Provider value={value}>
      {children}
    </FilterContext.Provider>
  );
};

// Custom hook to use filter context
export const useFilter = () => {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilter must be used within a FilterProvider');
  }
  return context;
};