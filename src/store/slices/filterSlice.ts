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
    toggleFilter: (state, action: PayloadAction<{ type: 'cluster' | 'chains'; value: number | string }>) => {
      const { type, value } = action.payload;
      if (state.activeFilters[type] === value) {
        // 같은 필터를 다시 클릭하면 해제
        delete state.activeFilters[type];
      } else {
        // 새로운 필터 설정
        state.activeFilters[type] = value;
      }
    },
    clearFilters: (state) => {
      state.activeFilters = {};
    }
  }
});

export const { toggleFilter, clearFilters } = filterSlice.actions;
export default filterSlice.reducer; 