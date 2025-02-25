import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ValidatorData } from '../../types';

interface ValidatorState {
  selectedValidator: ValidatorData | null;
  additionalValidator: ValidatorData | null;
  validatorData: Record<string, any>;
}

const initialState: ValidatorState = {
  selectedValidator: null,
  additionalValidator: null,
  validatorData: {}
};

export const validatorSlice = createSlice({
  name: 'validator',
  initialState,
  reducers: {
    setSelectedValidator: (state, action: PayloadAction<ValidatorData | null>) => {
      state.selectedValidator = action.payload;
      if (action.payload === null) {
        state.additionalValidator = null;
      }
    },
    setAdditionalValidator: (state, action: PayloadAction<ValidatorData | null>) => {
      state.additionalValidator = action.payload;
    },
    setValidatorData: (state, action: PayloadAction<Record<string, any>>) => {
      state.validatorData = action.payload;
    }
  }
});

export const { setSelectedValidator, setAdditionalValidator } = validatorSlice.actions;
export default validatorSlice.reducer; 