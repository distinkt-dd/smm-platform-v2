import { configureStore } from "@reduxjs/toolkit";

// Замените reducer объектом редьюсеров при подключении первого slice.
export const store = configureStore({
    reducer: (state: Record<string, never> = {}) => state,
});

declare global {
    type RootState = ReturnType<typeof store.getState>;
    type AppDispatch = typeof store.dispatch;
}
