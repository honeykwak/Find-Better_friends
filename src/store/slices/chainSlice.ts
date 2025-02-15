import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ClusterType, ValidatorData } from '../../types';

interface ValidatorSelectionPayload {
  validator: ValidatorData | null;
  validatorChains: string[];
}

interface ChainState {
  selectedChain: string | null;
  selectedClusters: ClusterType[];
  selectedValidator: ValidatorData | null;
  validatorChains: Set<string>;
}

const initialState: ChainState = {
  selectedChain: null,
  selectedClusters: [],
  selectedValidator: null,
  validatorChains: new Set()
};

export const chainSlice = createSlice({
  name: 'chain',
  initialState,
  reducers: {
    selectChain: (state, action: PayloadAction<string | null>) => {
      state.selectedChain = action.payload;
    },
    toggleCluster: (state, action: PayloadAction<ClusterType>) => {
      const index = state.selectedClusters.indexOf(action.payload);
      if (index > -1) {
        state.selectedClusters.splice(index, 1);
      } else {
        state.selectedClusters.push(action.payload);
      }
    },
    updateValidatorSelection: (state, action: PayloadAction<ValidatorSelectionPayload>) => {
      state.selectedValidator = action.payload.validator;
      state.validatorChains = new Set(action.payload.validatorChains);
    }
  }
});

export const { selectChain, toggleCluster, updateValidatorSelection } = chainSlice.actions;
export default chainSlice.reducer;