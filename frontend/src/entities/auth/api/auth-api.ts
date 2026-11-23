import { apiRequest, requireResponse } from "../../../shared/api/api";
import { validate } from "../../../shared/lib/validate";
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
    return requireResponse(
        apiRequest<RegisterResponse>(AUTH_REGISTER, {
            method: "POST",
            body: validate(credentialsSchema, data),
        }),
    );
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
    return requireResponse(
        apiRequest<LoginResponse>(AUTH_LOGIN, {
            method: "POST",
            body: validate(credentialsSchema, data),
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
