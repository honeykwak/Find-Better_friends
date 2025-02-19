import { configureStore } from '@reduxjs/toolkit';
import chainReducer from './slices/chainSlice';
import validatorReducer from './slices/validatorSlice';
import proposalReducer from './slices/proposalSlice';
import filterReducer from './slices/filterSlice';

export const store = configureStore({
  reducer: {
    chain: chainReducer,
    validator: validatorReducer,
    proposal: proposalReducer,
    filter: filterReducer
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;