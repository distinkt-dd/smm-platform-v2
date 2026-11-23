/** Дата создания передаётся сервером в JSON как строка. */
export type AuthUser = {
    id: string;
    email: string;
    createdAt: string;
};

export type AuthCredentials = {
    email: string;
    password: string;
};

export type RegisterRequest = AuthCredentials;
export type RegisterResponse = AuthUser;
export type LoginRequest = AuthCredentials;
export type LoginResponse = {
    user: AuthUser;
};
export type MeResponse = AuthUser;
