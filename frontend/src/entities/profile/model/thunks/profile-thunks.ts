import { createAsyncThunk } from "@reduxjs/toolkit";
import { ApiHttpError, ApiNetworkError } from "../../../../shared/api/api";
import { ValidationError } from "../../../../shared/lib/validate";
import { getProfile, saveProfile } from "../../api/profile-api";
import { createService, type CreateServiceRequest } from "../../../services";
import type { Service } from "../../api/types";
import type {
    GetProfileResponse,
    ProfileRequest,
    SaveProfileResponse,
} from "../../api/types";

export type ProfileRequestError =
    | { kind: "validation"; message: string; fields: Record<string, string> }
    | { kind: "http"; message: string; status: number; messages: string[] }
    | { kind: "network"; message: string }
    | { kind: "unknown"; message: string };

function toRequestError(error: unknown): ProfileRequestError {
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

const createProfileThunk = createAsyncThunk.withTypes<{
    rejectValue: ProfileRequestError;
}>();

export const loadProfileThunk = createProfileThunk<
    GetProfileResponse | null,
    void
>("profile/load", async (_, { rejectWithValue }) => {
    try {
        return await getProfile();
    } catch (error) {
        // `404` — профиль ещё не создан: это штатное состояние формы,
        // а не ошибка загрузки.
        if (error instanceof ApiHttpError && error.status === 404) return null;
        return rejectWithValue(toRequestError(error));
    }
});

export const saveProfileThunk = createProfileThunk<
    SaveProfileResponse,
    ProfileRequest
>("profile/save", async (data, { rejectWithValue }) => {
    try {
        return await saveProfile(data);
    } catch (error) {
        return rejectWithValue(toRequestError(error));
    }
});

export const createServiceThunk = createProfileThunk<
    Service,
    { profileId: string; values: CreateServiceRequest }
>("profile/createService", async ({ values }, { rejectWithValue }) => {
    try {
        return await createService(values);
    } catch (error) {
        return rejectWithValue(toRequestError(error));
    }
});
