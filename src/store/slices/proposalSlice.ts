import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ChainProposals } from '../../types';

interface ProposalState {
  chainProposals: ChainProposals;
  selectedProposalsByChain: {
    [chainId: string]: string[];
  };
  isLoading: boolean;
  error: string | null;
}

const initialState: ProposalState = {
  chainProposals: {},
  selectedProposalsByChain: {},
  isLoading: false,
  error: null
};

const proposalSlice = createSlice({
  name: 'proposal',
  initialState,
  reducers: {
    setChainProposals: (state, action: PayloadAction<ChainProposals>) => {
      state.chainProposals = action.payload;
    },
    toggleProposal: (state, action: PayloadAction<{ chainId: string; proposalId: string }>) => {
      const { chainId, proposalId } = action.payload;
      if (!state.selectedProposalsByChain[chainId]) {
        state.selectedProposalsByChain[chainId] = [];
      }
      
      const index = state.selectedProposalsByChain[chainId].indexOf(proposalId);
      if (index === -1) {
        state.selectedProposalsByChain[chainId].push(proposalId);
      } else {
        state.selectedProposalsByChain[chainId].splice(index, 1);
      }
    },
    setSelectedProposals: (state, action: PayloadAction<{ chainId: string; proposalIds: string[] }>) => {
      const { chainId, proposalIds } = action.payload;
      state.selectedProposalsByChain[chainId] = proposalIds;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    }
  }
});

export const { 
  setChainProposals, 
  toggleProposal, 
  setSelectedProposals,
  setLoading,
  setError 
} = proposalSlice.actions;

export default proposalSlice.reducer; 