export type JsonValue =
    | string
    | number
    | boolean
    | null
    | JsonValue[]
    | { [key: string]: JsonValue };

export type ApiRequestOptions = Omit<RequestInit, "body"> & {
    body?: JsonValue;
    token?: string;
};

export class ApiHttpError extends Error {
    readonly status: number;
    readonly messages: string[];

    constructor(status: number, messages: string[]) {
        super(messages.join("\n") || `Ошибка API: ${status}`);
        this.name = "ApiHttpError";
        this.status = status;
        this.messages = messages;
    }
}

export class ApiNetworkError extends Error {
    constructor(cause: unknown) {
        super("Не удалось связаться с сервером", { cause });
        this.name = "ApiNetworkError";
    }
}

export async function requireResponse<T>(request: Promise<T | undefined>): Promise<T> {
    const response = await request;
    if (response === undefined) throw new Error("Сервер вернул пустой ответ");
    return response;
}

function getErrorMessages(body: unknown): string[] {
    if (typeof body !== "object" || body === null || !("message" in body))
        return [];

    const message = body.message;
    if (typeof message === "string") return [message];
    if (Array.isArray(message))
        return message.filter(
            (item): item is string => typeof item === "string",
        );
    return [];
}

export async function apiRequest<T>(
    path: string,
    options: ApiRequestOptions = {},
): Promise<T | undefined> {
    const baseUrl = import.meta.env.VITE_API_URL;
    if (!baseUrl) throw new Error("Не задан VITE_API_URL");

    const { body, token, headers: inputHeaders, ...requestOptions } = options;
    const headers = new Headers(inputHeaders);
    if (body !== undefined && !headers.has("Content-Type"))
        headers.set("Content-Type", "application/json");
    if (token !== undefined) headers.set("Authorization", `Bearer ${token}`);

    let response: Response;
    try {
        response = await fetch(
            `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`,
            {
                ...requestOptions,
                headers,
                body: body === undefined ? undefined : JSON.stringify(body),
            },
        );
    } catch (error) {
        if (requestOptions.signal?.aborted) throw error;
        throw new ApiNetworkError(error);
    }

    const text = await response.text();
    if (!response.ok) {
        let errorBody: unknown;
        try {
            errorBody = JSON.parse(text);
        } catch {
            errorBody = undefined;
        }
        throw new ApiHttpError(response.status, getErrorMessages(errorBody));
    }

    return text.trim() ? (JSON.parse(text) as T) : undefined;
}
