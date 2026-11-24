// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAppStore } from "../src/app/store";
import { expireSession, loginThunk } from "../src/entities/auth";
import { ProfilePage } from "../src/pages/profile/ProfilePage";

const user = { id: "u1", email: "user@example.com", createdAt: "2026-01-01" };
const service = { id: "s1", title: "Стрижка", description: "Описание" };
const profile = { id: "p1", displayName: "Анна", specialization: "Стилист", about: null, confirmedFacts: [], services: [service] };

function login(store: ReturnType<typeof createAppStore>, id = "u1") {
    const credentials = { email: user.email, password: "password123" };
    store.dispatch(loginThunk.pending("login", credentials));
    store.dispatch(loginThunk.fulfilled({ user: { ...user, id } }, "login", credentials));
}
async function showPage(id = "u1") {
    const store = createAppStore({ restoreSession: false });
    login(store, id);
    render(<Provider store={store}><ProfilePage /></Provider>);
    await screen.findByRole("button", { name: "Добавить услугу" });
    return store;
}
function editForm() {
    return screen.getByRole("button", { name: "Сохранить услугу" }).closest("form")!;
}
beforeEach(() => {
    localStorage.clear();
    vi.stubEnv("VITE_API_URL", "http://localhost:3000");
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(Response.json(profile))));
});
afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("Черновики услуг", () => {
    it("восстанавливает создание и редактирование после перезагрузки и не показывает их другому пользователю", async () => {
        await showPage();
        fireEvent.change(screen.getByLabelText("Название услуги"), { target: { value: "Новая услуга" } });
        fireEvent.click(screen.getByRole("button", { name: "Редактировать услугу Стрижка" }));
        fireEvent.change(within(editForm()).getByLabelText("Описание услуги"), { target: { value: "Новое описание" } });
        cleanup();
        await showPage("u2");
        expect((screen.getByLabelText("Название услуги") as HTMLInputElement).value).toBe("");
        expect(screen.queryByRole("button", { name: "Сохранить услугу" })).toBeNull();
        cleanup();
        await showPage();
        expect((within(editForm()).getByLabelText("Описание услуги") as HTMLTextAreaElement).value).toBe("Новое описание");
        const createForm = screen.getByRole("button", { name: "Добавить услугу" }).closest("form")!;
        expect((within(createForm).getByLabelText("Название услуги") as HTMLInputElement).value).toBe("Новая услуга");
    });
    it("восстанавливает черновик после истечения сессии и удаляет его при отмене", async () => {
        const store = await showPage();
        fireEvent.click(screen.getByRole("button", { name: "Редактировать услугу Стрижка" }));
        fireEvent.change(within(editForm()).getByLabelText("Название услуги"), { target: { value: "Укладка" } });
        act(() => { store.dispatch(expireSession()); });
        cleanup();
        await showPage();
        expect((within(editForm()).getByLabelText("Название услуги") as HTMLInputElement).value).toBe("Укладка");
        fireEvent.click(within(editForm()).getByRole("button", { name: "Отмена" }));
        cleanup();
        await showPage();
        expect(screen.queryByRole("button", { name: "Сохранить услугу" })).toBeNull();
    });
    it("очищает черновик после успешного создания", async () => {
        const fetchMock = vi.mocked(fetch);
        fetchMock.mockResolvedValueOnce(Response.json(profile)).mockResolvedValueOnce(Response.json({ id: "s2", title: "Укладка", description: null }));
        await showPage();
        fireEvent.change(screen.getByLabelText("Название услуги"), { target: { value: "Укладка" } });
        fireEvent.click(screen.getByRole("button", { name: "Добавить услугу" }));
        await waitFor(() => expect(screen.getByText("Услуга добавлена.")).toBeTruthy());
        cleanup();
        await showPage();
        expect((screen.getByLabelText("Название услуги") as HTMLInputElement).value).toBe("");
    });
    it("сохраняет введённое при ответе 401 и восстанавливает после повторного входа", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(Response.json(profile)).mockResolvedValueOnce(Response.json({ message: "Unauthorized" }, { status: 401 }));
        const store = await showPage();
        fireEvent.change(screen.getByLabelText("Название услуги"), { target: { value: "Укладка" } });
        fireEvent.click(screen.getByRole("button", { name: "Добавить услугу" }));
        await waitFor(() => expect(store.getState().auth.sessionExpired).toBe(true));
        cleanup();
        await showPage();
        expect((screen.getByLabelText("Название услуги") as HTMLInputElement).value).toBe("Укладка");
    });
    it("очищает черновик после успешного редактирования", async () => {
        vi.mocked(fetch).mockResolvedValueOnce(Response.json(profile)).mockResolvedValueOnce(Response.json({ ...service, title: "Укладка" }));
        await showPage();
        fireEvent.click(screen.getByRole("button", { name: "Редактировать услугу Стрижка" }));
        fireEvent.change(within(editForm()).getByLabelText("Название услуги"), { target: { value: "Укладка" } });
        fireEvent.click(within(editForm()).getByRole("button", { name: "Сохранить услугу" }));
        await screen.findByRole("button", { name: "Редактировать услугу Укладка" });
        cleanup();
        await showPage();
        expect(screen.queryByRole("button", { name: "Сохранить услугу" })).toBeNull();
    });
});
