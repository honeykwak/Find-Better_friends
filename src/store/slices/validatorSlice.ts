import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ValidatorData } from '../../types';

interface ValidatorState {
  selectedValidator: ValidatorData | null;
  validatorData: Record<string, any>;
}

const initialState: ValidatorState = {
  selectedValidator: null,
  validatorData: {}
};

export const validatorSlice = createSlice({
  name: 'validator',
  initialState,
  reducers: {
    setSelectedValidator: (state, action: PayloadAction<ValidatorData | null>) => {
      state.selectedValidator = action.payload;
    },
    setValidatorData: (state, action: PayloadAction<Record<string, any>>) => {
      state.validatorData = action.payload;
    }
  }
});

export const { setSelectedValidator, setValidatorData } = validatorSlice.actions;
export default validatorSlice.reducer; 