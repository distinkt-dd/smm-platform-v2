import { createAsyncThunk } from "@reduxjs/toolkit";
import { ApiHttpError, ApiNetworkError } from "../../../../shared/api/api";
import { ValidationError } from "../../../../shared/lib/validate";
import { login, logout, me, register } from "../../api/auth-api";
import type {
    LoginRequest,
    LoginResponse,
    MeResponse,
    RegisterRequest,
    RegisterResponse,
} from "../../api/types";

export type AuthRequestError =
    | { kind: "validation"; message: string; fields: Record<string, string> }
    | { kind: "http"; message: string; status: number; messages: string[] }
    | { kind: "network"; message: string }
    | { kind: "unknown"; message: string };

function toRequestError(error: unknown): AuthRequestError {
    if (error instanceof ValidationError)
        return {
            kind: "validation",
            message: error.message,
            fields: error.errors,
        };
    if (error instanceof ApiHttpError)
        return {
            kind: "http",
            message: error.message,
            status: error.status,
            messages: error.messages,
        };
    if (error instanceof ApiNetworkError)
        return { kind: "network", message: error.message };
    return {
        kind: "unknown",
        message: error instanceof Error ? error.message : "Неизвестная ошибка",
    };
}

const createAuthThunk = createAsyncThunk.withTypes<{
    rejectValue: AuthRequestError;
}>();

export const registerThunk = createAuthThunk<RegisterResponse, RegisterRequest>(
    "auth/register",
    async (credentials, { rejectWithValue }) => {
        try {
            return await register(credentials);
        } catch (error) {
            return rejectWithValue(toRequestError(error));
        }
    },
);

export const loginThunk = createAuthThunk<LoginResponse, LoginRequest>(
    "auth/login",
    async (credentials, { rejectWithValue }) => {
        try {
            return await login(credentials);
        } catch (error) {
            return rejectWithValue(toRequestError(error));
        }
    },
);

export const meThunk = createAuthThunk<MeResponse, void>(
    "auth/me",
    async (_, { rejectWithValue }) => {
        try {
            return await me();
        } catch (error) {
            return rejectWithValue(toRequestError(error));
        }
    },
);

export const logoutThunk = createAuthThunk<void, void>(
    "auth/logout",
    async (_, { rejectWithValue }) => {
        try {
            await logout();
        } catch (error) {
            return rejectWithValue(toRequestError(error));
        }
    },
);
