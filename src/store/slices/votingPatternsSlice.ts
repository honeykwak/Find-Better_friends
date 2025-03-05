import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface VotingPatternsState {
  patternsByChain: Record<string, any>;
}

const initialState: VotingPatternsState = {
  patternsByChain: {}
};

const votingPatternsSlice = createSlice({
  name: 'votingPatterns',
  initialState,
  reducers: {
    setVotingPatterns: (state, action: PayloadAction<Record<string, any>>) => {
      state.patternsByChain = action.payload;
    }
  }
});

export const { setVotingPatterns } = votingPatternsSlice.actions;
export default votingPatternsSlice.reducer; 