// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAppStore } from "../src/app/store";
import { authReducer, createInitialAuthState, loginThunk, logoutThunk, meThunk } from "../src/entities/auth";

const credentials = { email: "user@example.com", password: "password123" };
const user = { id: "1", email: credentials.email, createdAt: "2026-11-23T00:00:00.000Z" };

afterEach(() => { localStorage.clear(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("cookie session", () => {
    it("removes the old token, restores user and logs out", async () => {
        vi.stubEnv("VITE_API_URL", "http://localhost:3000");
        localStorage.setItem("auth.accessToken", "legacy-token");
        const fetchMock = vi.fn().mockResolvedValueOnce(Response.json(user)).mockResolvedValueOnce(new Response(null, { status: 204 }));
        vi.stubGlobal("fetch", fetchMock);
        const store = createAppStore();
        expect(localStorage.getItem("auth.accessToken")).toBeNull();
        expect(store.getState().auth.requests.me.status).toBe("pending");
        await vi.waitFor(() => expect(store.getState().auth.user).toEqual(user));
        expect(store.getState().auth).not.toHaveProperty("token");
        await store.dispatch(logoutThunk());
        expect(store.getState().auth.user).toBeNull();
        expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: "POST", credentials: "include" });
        expect(fetchMock.mock.calls[1][1].headers.get("X-CSRF-Protection")).toBe("1");
    });

    it("keeps the session state on failed logout", async () => {
        vi.stubEnv("VITE_API_URL", "http://localhost:3000");
        vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json(user)).mockRejectedValueOnce(new Error("offline")));
        const store = createAppStore();
        await vi.waitFor(() => expect(store.getState().auth.user).toEqual(user));
        await store.dispatch(logoutThunk());
        expect(store.getState().auth.user).toEqual(user);
        expect(store.getState().auth.requests.logout.error?.kind).toBe("network");
    });

    it("ignores a stale restore response after login and logout", () => {
        let state = createInitialAuthState();
        state = authReducer(state, meThunk.pending("restore", undefined));
        state = authReducer(state, loginThunk.pending("login", credentials));
        state = authReducer(state, loginThunk.fulfilled({ user }, "login", credentials));
        state = authReducer(state, meThunk.rejected(null, "restore", undefined, { kind: "http", status: 401, messages: [], message: "Unauthorized" }));
        expect(state.user).toEqual(user);
        state = authReducer(state, meThunk.pending("restore2", undefined));
        state = authReducer(state, logoutThunk.pending("logout", undefined));
        state = authReducer(state, logoutThunk.fulfilled(undefined, "logout", undefined));
        state = authReducer(state, meThunk.fulfilled(user, "restore2", undefined));
        expect(state.user).toBeNull();
    });
});
