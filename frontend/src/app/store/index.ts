import { configureStore } from "@reduxjs/toolkit";
import { authReducer, meThunk } from "../../entities/auth";

export function createAppStore({ restoreSession = true }: { restoreSession?: boolean } = {}) {
    // Remove the old JavaScript-readable token when upgrading to cookie sessions.
    try { globalThis.localStorage?.removeItem("auth.accessToken"); } catch { /* Storage may be blocked. */ }
    const store = configureStore({
        reducer: { auth: authReducer },
        // Auth thunk arguments contain credentials.
        devTools: false,
    });
    if (restoreSession) void store.dispatch(meThunk());
    return store;
}

export const store = createAppStore();

declare global {
    type RootState = ReturnType<typeof store.getState>;
    type AppDispatch = typeof store.dispatch;
}
