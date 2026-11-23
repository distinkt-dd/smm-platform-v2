import { afterEach, describe, expect, it, vi } from "vitest";
import { createAppStore } from "../src/app/store";
import { loginThunk, meThunk, registerThunk } from "../src/entities/auth";

const user = { id: "1", email: "test@example.com", createdAt: "2026-11-23T00:00:00.000Z" };
const credentials = { email: user.email, password: "password123" };

afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
});

describe("auth thunks", () => {
    it("dispatches all auth requests and exposes their responses", async () => {
        const store = createAppStore({ restoreSession: false });
        vi.stubEnv("VITE_API_URL", "http://localhost:3000");
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(Response.json(user))
            .mockResolvedValueOnce(Response.json({ user }))
            .mockResolvedValueOnce(Response.json(user));
        vi.stubGlobal("fetch", fetchMock);

        await expect(store.dispatch(registerThunk(credentials)).unwrap()).resolves.toEqual(user);
        await expect(store.dispatch(loginThunk(credentials)).unwrap()).resolves.toEqual({ user });
        await expect(store.dispatch(meThunk()).unwrap()).resolves.toEqual(user);
        expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
            "http://localhost:3000/auth/register", "http://localhost:3000/auth/login", "http://localhost:3000/auth/me",
        ]);
        expect(fetchMock.mock.calls[2][1].credentials).toBe("include");
    });

    it("returns serializable validation, HTTP and network errors", async () => {
        const store = createAppStore({ restoreSession: false });
        vi.stubEnv("VITE_API_URL", "http://localhost:3000");
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);
        const validation = await store.dispatch(loginThunk({ ...credentials, email: "bad" }));
        expect(validation.payload).toMatchObject({ kind: "validation", fields: { email: expect.any(String) } });
        expect(fetchMock).not.toHaveBeenCalled();

        fetchMock.mockResolvedValueOnce(Response.json({ message: "Unauthorized" }, { status: 401 }));
        await expect(store.dispatch(loginThunk(credentials)).unwrap()).rejects.toMatchObject({
            kind: "http", status: 401, messages: ["Unauthorized"],
        });
        fetchMock.mockRejectedValueOnce(new TypeError("offline"));
        await expect(store.dispatch(registerThunk(credentials)).unwrap()).rejects.toMatchObject({ kind: "network" });
    });
});
