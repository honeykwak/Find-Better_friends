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
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // 큰 객체나 Map 등을 사용하는 액션은 여기서 무시
        ignoredActions: ['chain/setCoordinateData'],
        // 특정 경로의 상태는 직렬화 검사에서 제외
        ignoredPaths: ['chain.coordinateData']
      }
    })
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;