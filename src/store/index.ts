import { configureStore } from '@reduxjs/toolkit';
import chainReducer from './slices/chainSlice';
import validatorReducer from './slices/validatorSlice';
import proposalReducer from './slices/proposalSlice';

export const store = configureStore({
  reducer: {
    chain: chainReducer,
    validator: validatorReducer,
    proposal: proposalReducer
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;