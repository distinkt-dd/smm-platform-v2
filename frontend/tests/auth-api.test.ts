import { afterEach, describe, expect, it, vi } from "vitest";
import { login, me, register } from "../src/entities/auth";
import { ApiHttpError, ApiNetworkError } from "../src/shared/api/api";
import { ValidationError } from "../src/shared/lib/validate";

const user = { id: "user-id", email: "test@example.com", createdAt: "2026-11-23T00:00:00.000Z" };
const credentials = { email: user.email, password: "password123" };

afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
});

describe("auth API", () => {
    it.each([["register", register], ["login", login]] as const)(
        "%s normalizes email and accepts backend length boundaries",
        async (_name, request) => {
            vi.stubEnv("VITE_API_URL", "http://localhost:3000");
            const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(Response.json(user)));
            vi.stubGlobal("fetch", fetchMock);
            for (const password of ["😀".repeat(8), "a".repeat(32)]) {
                await request({ email: "  TEST@Example.COM  ", password });
                expect(JSON.parse(fetchMock.mock.lastCall![1].body)).toEqual({ email: "test@example.com", password });
            }
            await request({ email: `${"a".repeat(52)}@example.com`, password: "12345678" });
            expect(fetchMock).toHaveBeenCalledTimes(3);
        },
    );

    it.each([["register", register], ["login", login]] as const)(
        "%s rejects invalid credentials without sending a request",
        async (_name, request) => {
            const fetchMock = vi.fn();
            vi.stubGlobal("fetch", fetchMock);
            for (const data of [
                { ...credentials, email: "not-an-email" },
                { ...credentials, email: `${"a".repeat(53)}@example.com` },
                { ...credentials, password: "1234567" },
                { ...credentials, password: "a".repeat(33) },
                { ...credentials, password: "😀".repeat(7) },
            ]) {
                await expect(request(data)).rejects.toBeInstanceOf(ValidationError);
            }
            expect(fetchMock).not.toHaveBeenCalled();
        },
    );
    it.each([
        ["register", register, "/auth/register", user],
        ["login", login, "/auth/login", { accessToken: "token", user }],
    ] as const)("sends JSON for %s and returns its response", async (_name, request, path, result) => {
        vi.stubEnv("VITE_API_URL", "http://localhost:3000");
        const fetchMock = vi.fn().mockResolvedValue(Response.json(result));
        vi.stubGlobal("fetch", fetchMock);

        await expect(request(credentials)).resolves.toEqual(result);
        const [url, options] = fetchMock.mock.calls[0];
        expect(url).toBe(`http://localhost:3000${path}`);
        expect(options.method).toBe("POST");
        expect(options.headers.get("content-type")).toBe("application/json");
        expect(JSON.parse(options.body)).toEqual(credentials);
    });

    it("requests the current user with the Bearer token", async () => {
        vi.stubEnv("VITE_API_URL", "http://localhost:3000");
        const fetchMock = vi.fn().mockResolvedValue(Response.json(user));
        vi.stubGlobal("fetch", fetchMock);

        await expect(me("token")).resolves.toEqual(user);
        const [url, options] = fetchMock.mock.calls[0];
        expect(url).toBe("http://localhost:3000/auth/me");
        expect(options.method).toBe("GET");
        expect(options.headers.get("authorization")).toBe("Bearer token");
    });

    it("preserves HTTP and network errors", async () => {
        vi.stubEnv("VITE_API_URL", "http://localhost:3000");
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ message: "Unauthorized" }, { status: 401 })));
        await expect(me("bad-token")).rejects.toMatchObject({ status: 401, messages: ["Unauthorized"] } satisfies Partial<ApiHttpError>);

        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network")));
        await expect(login(credentials)).rejects.toBeInstanceOf(ApiNetworkError);
    });

    it.each([() => register(credentials), () => login(credentials), () => me("token")])(
        "rejects an empty successful response",
        async (request) => {
            vi.stubEnv("VITE_API_URL", "http://localhost:3000");
            vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
            await expect(request()).rejects.toThrow("Сервер вернул пустой ответ");
        },
    );
});
