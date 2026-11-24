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
    HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
    HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
    const fetchMock = vi.fn((url: string) => {
        if (url.endsWith('/auth/me')) return Promise.resolve(Response.json(user));
        if (url.endsWith('/me/profile')) return Promise.resolve(new Response(null, { status: 404 }));
        return Promise.resolve(new Response(null, { status: 204 }));
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<Provider store={createAppStore()}><MemoryRouter initialEntries={["/"]}><App /></MemoryRouter></Provider>);
    expect(screen.getByRole("status").textContent).toContain("Проверяем");
    expect(await screen.findByRole("heading", { name: "Главная" })).toBeTruthy();
    fireEvent.click(screen.getByRole("link", { name: "Профиль" }));
    await screen.findByRole("heading", { name: "Профиль мастера" });
    fireEvent.click(screen.getByRole("button", { name: "Выйти" }));
    expect(fetchMock.mock.calls.some(([url]) => url.endsWith('/auth/logout'))).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Отмена" }));
    expect(fetchMock.mock.calls.some(([url]) => url.endsWith('/auth/logout'))).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Выйти" }));
    fireEvent.click(screen.getByRole("dialog").querySelector('button:last-child')!);
    await waitFor(() => expect(screen.getByRole("button", { name: "Войти" })).toBeTruthy());
    expect(fetchMock.mock.calls.some(([url]) => url === "http://localhost:3000/auth/logout")).toBe(true);
});


it("redirects after a protected request expires and keeps login errors separate", async () => {
    vi.stubEnv("VITE_API_URL", "http://localhost:3000");
    const user = { id: "1", email: "user@example.com", createdAt: "2026-11-23T00:00:00.000Z" };
    vi.stubGlobal("fetch", vi.fn()
        .mockResolvedValueOnce(Response.json(user))
        .mockResolvedValueOnce(new Response(null, { status: 404 }))
        .mockResolvedValueOnce(Response.json({ message: "Unauthorized" }, { status: 401 }))
        .mockResolvedValueOnce(Response.json({ message: "Unauthorized" }, { status: 401 })));
    const store = createAppStore();
    render(<Provider store={store}><MemoryRouter initialEntries={["/"]}><App /></MemoryRouter></Provider>);
    await screen.findByRole("heading", { name: "Главная" });
    const { apiRequest } = await import("../src/shared/api/api");
    await expect(apiRequest("/me/profile")).rejects.toMatchObject({ status: 401 });
    expect(await screen.findByText("Сессия недействительна или истекла. Войдите снова.")).toBeTruthy();
    expect(store.getState().auth.user).toBeNull();
    fireEvent.change(screen.getByLabelText("Электронная почта"), { target: { value: user.email } });
    fireEvent.change(screen.getByLabelText("Пароль"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Войти" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Неверная почта или пароль.");
    expect(screen.queryByText("Сессия недействительна или истекла. Войдите снова.")).toBeNull();
});

it("shows a session message when restoration returns 401", async () => {
    vi.stubEnv("VITE_API_URL", "http://localhost:3000");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ message: "Unauthorized" }, { status: 401 })));
    render(<Provider store={createAppStore()}><MemoryRouter initialEntries={["/"]}><App /></MemoryRouter></Provider>);
    expect(await screen.findByText("Сессия недействительна или истекла. Войдите снова.")).toBeTruthy();
});


it.each(["/register", "/login"])("keeps a guest on registration after a delayed 401 from %s", async (initialPath) => {
    vi.stubEnv("VITE_API_URL", "http://localhost:3000");
    let finish!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise<Response>((resolve) => { finish = resolve; })));
    const store = createAppStore();
    render(<Provider store={store}><MemoryRouter initialEntries={[initialPath]}><App /></MemoryRouter></Provider>);
    if (initialPath === "/login") fireEvent.click(screen.getByRole("link", { name: "Зарегистрироваться" }));
    expect(screen.getByRole("button", { name: "Создать аккаунт" })).toBeTruthy();
    finish(Response.json({ message: "Unauthorized" }, { status: 401 }));
    await waitFor(() => expect(store.getState().auth.sessionExpired).toBe(true));
    expect(screen.getByRole("button", { name: "Создать аккаунт" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Войти" })).toBeNull();
});
