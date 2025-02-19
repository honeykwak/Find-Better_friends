import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ClusterType, ValidatorData, CoordinateData } from '../../types';

interface ValidatorSelectionPayload {
  validator: ValidatorData | null;
  validatorChains: string[];
}

interface ChainState {
  selectedChain: string | null;
  selectedClusters: ClusterType[];
  selectedValidator: ValidatorData | null;
  validatorChains: string[];
  coordinateData: CoordinateData | null;
}

const initialState: ChainState = {
  selectedChain: null,
  selectedClusters: [],
  selectedValidator: null,
  validatorChains: [],
  coordinateData: null
};

export const chainSlice = createSlice({
  name: 'chain',
  initialState,
  reducers: {
    selectChain: (state, action: PayloadAction<string | null>) => {
      state.selectedChain = action.payload;
    },
    toggleCluster: (state, action: PayloadAction<ClusterType>) => {
      const cluster = action.payload;
      const index = state.selectedClusters.indexOf(cluster);
      if (index === -1) {
        state.selectedClusters.push(cluster);
      } else {
        state.selectedClusters.splice(index, 1);
      }
    },
    updateValidatorSelection: (state, action: PayloadAction<ValidatorSelectionPayload>) => {
      state.selectedValidator = action.payload.validator;
      state.validatorChains = action.payload.validatorChains;
    },
    setCoordinateData: (state, action: PayloadAction<CoordinateData>) => {
      state.coordinateData = action.payload;
    },
    setSelectedClusters: (state, action: PayloadAction<ClusterType[]>) => {
      state.selectedClusters = action.payload;
    }
  }
});

export const { selectChain, toggleCluster, updateValidatorSelection, setCoordinateData, setSelectedClusters } = chainSlice.actions;
export default chainSlice.reducer;