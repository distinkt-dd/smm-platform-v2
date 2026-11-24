// @vitest-environment jsdom
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from "@testing-library/react";
import { Provider } from "react-redux";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createAppStore } from "../src/app/store";
import { loginThunk } from "../src/entities/auth";
import { ProfilePage } from "../src/pages/profile/ProfilePage";
const user = { id: "u1", email: "user@example.com", createdAt: "2026-01-01" };
const fact = { id: "f1", text: "Опыт 5 лет" };
const profile = {
    id: "p1",
    displayName: "Анна",
    specialization: "Стилист",
    about: null,
    confirmedFacts: [fact],
    services: [],
};
async function showPage(id = "u1", data = profile) {
    const store = createAppStore({ restoreSession: false });
    const creds = { email: user.email, password: "password123" };
    store.dispatch(loginThunk.pending("login", creds));
    store.dispatch(
        loginThunk.fulfilled({ user: { ...user, id } }, "login", creds),
    );
    vi.mocked(fetch).mockResolvedValueOnce(Response.json(data));
    render(
        <Provider store={store}>
            <ProfilePage />
        </Provider>,
    );
    await screen.findByLabelText("Текст факта");
    return store;
}
const field = () => screen.getByLabelText("Текст факта") as HTMLTextAreaElement;
const edit = () =>
    fireEvent.click(
        screen.getByRole("button", { name: "Редактировать факт Опыт 5 лет" }),
    );
beforeEach(() => {
    localStorage.clear();
    vi.stubEnv("VITE_API_URL", "http://localhost:3000");
    vi.stubGlobal("fetch", vi.fn());
    HTMLDialogElement.prototype.showModal = function () {
        this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function () {
        this.removeAttribute("open");
    };
});
afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
});
it("восстанавливает черновики создания и редактирования только владельцу и его профилю", async () => {
    await showPage();
    fireEvent.change(field(), { target: { value: "Новый факт" } });
    edit();
    fireEvent.change(field(), { target: { value: "Опыт 6 лет" } });
    cleanup();
    await showPage("u2");
    expect(field().value).toBe("");
    cleanup();
    await showPage("u1", { ...profile, id: "p2" });
    expect(field().value).toBe("");
    cleanup();
    await showPage();
    expect(field().value).toBe("Опыт 6 лет");
    fireEvent.click(screen.getByRole("button", { name: "Отмена" }));
    expect(field().value).toBe("Новый факт");
    cleanup();
    await showPage();
    expect(field().value).toBe("Новый факт");
    edit();
    expect(field().value).toBe("Опыт 5 лет");
});
it("восстанавливает черновик после 401 и очищает после создания", async () => {
    const store = await showPage();
    vi.mocked(fetch).mockResolvedValueOnce(
        Response.json({ message: "Unauthorized" }, { status: 401 }),
    );
    fireEvent.change(field(), { target: { value: "Новый факт" } });
    fireEvent.click(screen.getByRole("button", { name: "Добавить факт" }));
    await waitFor(() =>
        expect(store.getState().auth.sessionExpired).toBe(true),
    );
    cleanup();
    await showPage();
    expect(field().value).toBe("Новый факт");
    vi.mocked(fetch).mockResolvedValueOnce(
        Response.json({ id: "f2", text: "Новый факт" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Добавить факт" }));
    await screen.findByText("Новый факт");
    cleanup();
    await showPage();
    expect(field().value).toBe("");
});
it("очищает черновик после сохранения и удаления факта", async () => {
    await showPage();
    edit();
    fireEvent.change(field(), { target: { value: "Опыт 6 лет" } });
    vi.mocked(fetch).mockResolvedValueOnce(
        Response.json({ id: "f1", text: "Опыт 6 лет" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Сохранить факт" }));
    await screen.findByText("Опыт 6 лет");
    cleanup();
    await showPage();
    expect(field().value).toBe("");
    edit();
    fireEvent.change(field(), { target: { value: "Другой текст" } });
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));
    fireEvent.click(
        screen.getByRole("button", { name: "Удалить факт Опыт 5 лет" }),
    );
    fireEvent.click(
        within(screen.getByRole("dialog")).getByRole("button", {
            name: "Удалить",
        }),
    );
    await screen.findByText(/проверенное утверждение/);
    cleanup();
    await showPage();
    edit();
    expect(field().value).toBe("Опыт 5 лет");
});
it("работает при недоступном localStorage", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("denied");
    });
    await showPage();
    fireEvent.change(field(), { target: { value: "Новый факт" } });
    expect(field().value).toBe("Новый факт");
    vi.restoreAllMocks();
});
