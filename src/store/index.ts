import { configureStore } from '@reduxjs/toolkit';
import chainReducer from './slices/chainSlice';
import validatorReducer from './slices/validatorSlice';

export const store = configureStore({
  reducer: {
    chain: chainReducer,
    validator: validatorReducer
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;