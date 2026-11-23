import { apiRequest, requireResponse } from "../../../shared/api/api";
import { validate, ValidationError } from "../../../shared/lib/validate";
import { credentialsSchema } from "./credentials-schema";
import {
    AUTH_LOGIN,
    AUTH_ME,
    AUTH_REGISTER,
} from "../../../shared/api/endpoints";
import type {
    LoginRequest,
    LoginResponse,
    MeResponse,
    RegisterRequest,
    RegisterResponse,
} from "./types";

export async function register(data: RegisterRequest): Promise<RegisterResponse> {
    const result = validate(credentialsSchema, data);
    if (!result.success) throw new ValidationError(result.errors);
    return requireResponse(
        apiRequest<RegisterResponse>(AUTH_REGISTER, {
            method: "POST",
            body: result.data,
        }),
    );
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
    const result = validate(credentialsSchema, data);
    if (!result.success) throw new ValidationError(result.errors);
    return requireResponse(
        apiRequest<LoginResponse>(AUTH_LOGIN, {
            method: "POST",
            body: result.data,
        }),
    );
}

export function me(token: string): Promise<MeResponse> {
    return requireResponse(
        apiRequest<MeResponse>(AUTH_ME, {
            method: "GET",
            token,
        }),
    );
}
