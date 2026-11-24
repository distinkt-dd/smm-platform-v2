import { configureStore, type Middleware } from "@reduxjs/toolkit";
import { authReducer, expireSession, loginThunk, logoutThunk, meThunk } from "../../entities/auth";
import { clearProfileDraft, profileReducer, resetProfile } from "../../entities/profile";
import { advanceSessionVersion, setSessionExpiredHandler } from "../../shared/api/api";

const sessionMiddleware: Middleware = (api) => (next) => (action) => {
    const result = next(action);
    if (loginThunk.fulfilled.match(action) || logoutThunk.fulfilled.match(action))
        advanceSessionVersion();
    // Данные профиля не должны переживать выход или истечение сессии. Черновик
    // формы при истечении сессии остаётся: иначе после повторного входа
    // пользователь потеряет введённые значения.
    if (logoutThunk.fulfilled.match(action)) {
        api.dispatch(resetProfile());
        api.dispatch(clearProfileDraft());
    } else if (expireSession.match(action)) api.dispatch(resetProfile());
    return result;
};

export function createAppStore({ restoreSession = true }: { restoreSession?: boolean } = {}) {
    // Remove the old JavaScript-readable token when upgrading to cookie sessions.
    try { globalThis.localStorage?.removeItem("auth.accessToken"); } catch { /* Storage may be blocked. */ }
    const store = configureStore({
        reducer: { auth: authReducer, profile: profileReducer },
        // Auth thunk arguments contain credentials.
        devTools: false,
        middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(sessionMiddleware),
    });
    setSessionExpiredHandler(() => store.dispatch(expireSession()));
    if (restoreSession) void store.dispatch(meThunk());
    return store;
}

export const store = createAppStore();

declare global {
    type RootState = ReturnType<typeof store.getState>;
    type AppDispatch = typeof store.dispatch;
}
