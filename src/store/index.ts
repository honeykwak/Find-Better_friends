import { configureStore } from '@reduxjs/toolkit';
import chainReducer from './slices/chainSlice';

export const store = configureStore({
  reducer: {
    chain: chainReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;