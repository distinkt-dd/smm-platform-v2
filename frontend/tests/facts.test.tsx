// @vitest-environment jsdom
import {
    cleanup,
    fireEvent,
    render,
    screen,
    within,
    waitFor,
} from "@testing-library/react";
import { Provider } from "react-redux";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createAppStore } from "../src/app/store";
import { ProfilePage } from "../src/pages/profile/ProfilePage";
import { updateFact, createFact } from "../src/entities/profile";
const profile = {
    id: "p1",
    displayName: "Анна",
    specialization: "Стилист",
    about: null,
    confirmedFacts: [],
    services: [],
};
beforeEach(() => {
    vi.stubEnv("VITE_API_URL", "http://localhost:3000");
    HTMLDialogElement.prototype.showModal = function () {
        this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function () {
        this.removeAttribute("open");
    };
});
afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
});
it("создаёт, изменяет и удаляет факт с подтверждением", async () => {
    const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(Response.json(profile))
        .mockResolvedValueOnce(Response.json({ id: "f1", text: "Опыт 5 лет" }))
        .mockResolvedValueOnce(Response.json({ id: "f1", text: "Опыт 6 лет" }))
        .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    render(
        <Provider store={createAppStore({ restoreSession: false })}>
            <ProfilePage />
        </Provider>,
    );
    await screen.findByText(/проверенное утверждение/);
    fireEvent.change(screen.getByLabelText("Текст факта"), {
        target: { value: "Опыт 5 лет" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Добавить факт" }));
    await screen.findByText("Опыт 5 лет");
    fireEvent.click(
        screen.getByRole("button", { name: "Редактировать факт Опыт 5 лет" }),
    );
    fireEvent.change(screen.getByLabelText("Текст факта"), {
        target: { value: "Опыт 6 лет" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить факт" }));
    await screen.findByText("Опыт 6 лет");
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({
        text: "Опыт 6 лет",
    });
    fireEvent.click(
        screen.getByRole("button", { name: "Удалить факт Опыт 6 лет" }),
    );
    fireEvent.click(
        within(screen.getByRole("dialog")).getByRole("button", {
            name: "Отмена",
        }),
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
    fireEvent.click(
        screen.getByRole("button", { name: "Удалить факт Опыт 6 лет" }),
    );
    fireEvent.click(
        within(screen.getByRole("dialog")).getByRole("button", {
            name: "Удалить",
        }),
    );
    await screen.findByText(/проверенное утверждение/);
    expect(fetchMock.mock.calls[3][1].method).toBe("DELETE");
});
it("проверяет длину и передаёт пустой PATCH с сообщением сервера", async () => {
    const fetchMock = vi
        .fn()
        .mockResolvedValue(
            Response.json(
                { message: "Нужно передать хотя бы одно поле для изменения!" },
                { status: 400 },
            ),
        );
    vi.stubGlobal("fetch", fetchMock);
    await expect(createFact({ text: "аб" })).rejects.toMatchObject({
        name: "ValidationError",
        errors: { text: expect.any(String) },
    });
    await expect(createFact({ text: "а".repeat(251) })).rejects.toMatchObject({
        name: "ValidationError",
    });
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(updateFact("f1", {})).rejects.toMatchObject({
        status: 400,
        message: "Нужно передать хотя бы одно поле для изменения!",
    });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({});
});
it("показывает 404 и сохраняет список", async () => {
    vi.stubGlobal(
        "fetch",
        vi
            .fn()
            .mockResolvedValueOnce(
                Response.json({
                    ...profile,
                    confirmedFacts: [{ id: "f1", text: "Опыт 5 лет" }],
                }),
            )
            .mockResolvedValueOnce(
                Response.json({ message: "Факт не найден!" }, { status: 404 }),
            ),
    );
    render(
        <Provider store={createAppStore({ restoreSession: false })}>
            <ProfilePage />
        </Provider>,
    );
    fireEvent.click(
        await screen.findByRole("button", { name: "Удалить факт Опыт 5 лет" }),
    );
    fireEvent.click(
        within(screen.getByRole("dialog")).getByRole("button", {
            name: "Удалить",
        }),
    );
    expect(
        await within(screen.getByRole("dialog")).findByText("Факт не найден!"),
    ).toBeTruthy();
    expect(screen.getByText("Опыт 5 лет")).toBeTruthy();
});

it("при 401 завершает сессию и очищает профиль", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json({ ...profile, confirmedFacts: [{ id: "f1", text: "Опыт 5 лет" }] })).mockResolvedValueOnce(Response.json({ message: "Unauthorized" }, { status: 401 })));
    const store = createAppStore({ restoreSession: false });
    render(<Provider store={store}><ProfilePage /></Provider>);
    fireEvent.click(await screen.findByRole("button", { name: "Редактировать факт Опыт 5 лет" }));
    fireEvent.change(screen.getByLabelText("Текст факта"), { target: { value: "Опыт 6 лет" } });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить факт" }));
    await waitFor(() => expect(store.getState().auth.sessionExpired).toBe(true));
    expect(store.getState().profile.profile).toBeNull();
});
