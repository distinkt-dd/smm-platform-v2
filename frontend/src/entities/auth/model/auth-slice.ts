import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AuthUser } from "../api/types";
import {
    loginThunk,
    logoutThunk,
    meThunk,
    registerThunk,
    type AuthRequestError,
} from "./thunks/auth-thunks";

type Operation = "login" | "register" | "me" | "logout";
type RequestState = {
    status: "idle" | "pending" | "fulfilled" | "rejected";
    error: AuthRequestError | null;
    requestId: string | null;
};
const initialRequest = (): RequestState => ({
    status: "idle",
    error: null,
    requestId: null,
});
export const createInitialAuthState = () => ({
    user: null as AuthUser | null,
    sessionExpired: false,
    requests: {
        login: initialRequest(),
        register: initialRequest(),
        me: initialRequest(),
        logout: initialRequest(),
    },
});

const authSlice = createSlice({
    name: "auth",
    initialState: createInitialAuthState(),
    reducers: {
        expireSession(state) {
            state.user = null;
            state.sessionExpired = true;
            state.requests.me = initialRequest();
        },
        clearAuthFeedback(
            state,
            action: PayloadAction<{ operation: Operation; field?: string }>,
        ) {
            const request = state.requests[action.payload.operation];
            if (request.error?.kind === "validation" && action.payload.field) {
                delete request.error.fields[action.payload.field];
                if (Object.keys(request.error.fields).length === 0)
                    request.error = null;
            } else request.error = null;
            if (request.status !== "pending") request.status = "idle";
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(registerThunk.pending, (state, action) => {
                state.requests.register = {
                    status: "pending",
                    error: null,
                    requestId: action.meta.requestId,
                };
            })
            .addCase(registerThunk.fulfilled, (state, action) => {
                if (state.requests.register.requestId !== action.meta.requestId)
                    return;
                state.requests.register = {
                    status: "fulfilled",
                    error: null,
                    requestId: null,
                };
            })
            .addCase(registerThunk.rejected, (state, action) => {
                if (state.requests.register.requestId !== action.meta.requestId)
                    return;
                state.requests.register = {
                    status: "rejected",
                    error: action.payload ?? {
                        kind: "unknown",
                        message: action.error.message ?? "Неизвестная ошибка",
                    },
                    requestId: null,
                };
            })
            .addCase(loginThunk.pending, (state, action) => {
                state.sessionExpired = false;
                state.requests.login = {
                    status: "pending",
                    error: null,
                    requestId: action.meta.requestId,
                };
            })
            .addCase(loginThunk.fulfilled, (state, action) => {
                if (state.requests.login.requestId !== action.meta.requestId)
                    return;
                state.user = action.payload.user;
                state.sessionExpired = false;
                state.requests.login = {
                    status: "fulfilled",
                    error: null,
                    requestId: null,
                };
                state.requests.me = initialRequest();
            })
            .addCase(loginThunk.rejected, (state, action) => {
                if (state.requests.login.requestId !== action.meta.requestId)
                    return;
                state.requests.login = {
                    status: "rejected",
                    error: action.payload ?? {
                        kind: "unknown",
                        message: action.error.message ?? "Неизвестная ошибка",
                    },
                    requestId: null,
                };
            })
            .addCase(meThunk.pending, (state, action) => {
                state.requests.me = {
                    status: "pending",
                    error: null,
                    requestId: action.meta.requestId,
                };
            })
            .addCase(meThunk.fulfilled, (state, action) => {
                if (state.requests.me.requestId !== action.meta.requestId)
                    return;
                state.user = action.payload;
                state.requests.me = {
                    status: "fulfilled",
                    error: null,
                    requestId: null,
                };
            })
            .addCase(meThunk.rejected, (state, action) => {
                if (state.requests.me.requestId !== action.meta.requestId)
                    return;
                const error = action.payload ?? {
                    kind: "unknown" as const,
                    message: action.error.message ?? "Неизвестная ошибка",
                };
                state.requests.me = {
                    status: "rejected",
                    error,
                    requestId: null,
                };
                if (error.kind === "http" && error.status === 401) {
                    state.user = null;
                }
            })
            .addCase(logoutThunk.pending, (state, action) => {
                state.requests.logout = {
                    status: "pending",
                    error: null,
                    requestId: action.meta.requestId,
                };
            })
            .addCase(logoutThunk.fulfilled, (state, action) => {
                if (state.requests.logout.requestId !== action.meta.requestId)
                    return;
                state.user = null;
                state.sessionExpired = false;
                state.requests.logout = {
                    status: "fulfilled",
                    error: null,
                    requestId: null,
                };
                state.requests.me = initialRequest();
                state.requests.login = initialRequest();
            })
            .addCase(logoutThunk.rejected, (state, action) => {
                if (state.requests.logout.requestId !== action.meta.requestId)
                    return;
                state.requests.logout = {
                    status: "rejected",
                    error: action.payload ?? {
                        kind: "unknown",
                        message: action.error.message ?? "Неизвестная ошибка",
                    },
                    requestId: null,
                };
            });
    },
});
export const { clearAuthFeedback, expireSession } = authSlice.actions;
export const authReducer = authSlice.reducer;
