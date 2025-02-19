import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface FilterState {
  activeFilters: {
    cluster?: number;
    chains?: string;
  };
}

const initialState: FilterState = {
  activeFilters: {}
};

const filterSlice = createSlice({
  name: 'filter',
  initialState,
  reducers: {
    toggleFilter: (state, action: PayloadAction<{ type: 'cluster' | 'chains', value: number | string }>) => {
      const { type, value } = action.payload;
      if (state.activeFilters[type] === value) {
        // 현재 값과 같으면 필터 제거
        const { [type]: _, ...rest } = state.activeFilters;
        state.activeFilters = rest;
      } else {
        // 다르면 필터 설정
        state.activeFilters = {
          ...state.activeFilters,
          [type]: value
        };
      }
    },
    clearFilters: (state) => {
      state.activeFilters = {};
    }
  }
});

export const { toggleFilter, clearFilters } = filterSlice.actions;
export default filterSlice.reducer; 