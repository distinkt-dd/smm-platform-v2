// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import App from "../src/App";
import { createAppStore } from "../src/app/store";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it("restores a session, enters the home page and exits to login", async () => {
    vi.stubEnv("VITE_API_URL", "http://localhost:3000");
    const user = { id: "1", email: "user@example.com", createdAt: "2026-11-23T00:00:00.000Z" };
    const fetchMock = vi.fn().mockResolvedValueOnce(Response.json(user)).mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<Provider store={createAppStore()}><MemoryRouter initialEntries={["/"]}><App /></MemoryRouter></Provider>);
    expect(screen.getByRole("status").textContent).toContain("Проверяем");
    expect(await screen.findByRole("heading", { name: "Главная" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Выйти" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Войти" })).toBeTruthy());
    expect(fetchMock.mock.calls[1][0]).toBe("http://localhost:3000/auth/logout");
});
