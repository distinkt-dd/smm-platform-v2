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
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAppStore } from "../src/app/store";
import { ProfilePage } from "../src/pages/profile/ProfilePage";

const service = { id: "s1", title: "Стрижка", description: "Описание" };
const profile = {
    id: "p1",
    displayName: "Анна",
    specialization: "Стилист",
    about: null,
    confirmedFacts: [],
    services: [service],
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

async function setup(response: Response) {
    const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(Response.json(profile))
        .mockResolvedValueOnce(response);
    vi.stubGlobal("fetch", fetchMock);
    const store = createAppStore({ restoreSession: false });
    render(
        <Provider store={store}>
            <ProfilePage />
        </Provider>,
    );
    await screen.findByRole("button", { name: "Редактировать услугу Стрижка" });
    return { fetchMock, store };
}

describe("Редактирование и удаление услуг", () => {
    it("отправляет только изменённое название и обновляет список", async () => {
        const { fetchMock } = await setup(
            Response.json({ ...service, title: "Укладка" }),
        );
        fireEvent.click(
            screen.getByRole("button", {
                name: "Редактировать услугу Стрижка",
            }),
        );
        const form = screen
            .getByRole("button", { name: "Сохранить услугу" })
            .closest("form")!;
        fireEvent.change(within(form).getByLabelText("Название услуги"), {
            target: { value: "Укладка" },
        });
        fireEvent.click(
            within(form).getByRole("button", { name: "Сохранить услугу" }),
        );
        expect(await screen.findByText("Укладка")).toBeTruthy();
        expect(fetchMock.mock.calls[1][1].method).toBe("PATCH");
        expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
            title: "Укладка",
        });
    });
    it("передаёт null при очистке описания и не отправляет пустой PATCH", async () => {
        const { fetchMock } = await setup(
            Response.json({ ...service, description: null }),
        );
        fireEvent.click(
            screen.getByRole("button", {
                name: "Редактировать услугу Стрижка",
            }),
        );
        let form = screen
            .getByRole("button", { name: "Сохранить услугу" })
            .closest("form")!;
        fireEvent.click(
            within(form).getByRole("button", { name: "Сохранить услугу" }),
        );
        expect(fetchMock).toHaveBeenCalledTimes(1);
        fireEvent.click(
            screen.getByRole("button", {
                name: "Редактировать услугу Стрижка",
            }),
        );
        form = screen
            .getByRole("button", { name: "Сохранить услугу" })
            .closest("form")!;
        fireEvent.change(within(form).getByLabelText("Описание услуги"), {
            target: { value: "" },
        });
        fireEvent.click(
            within(form).getByRole("button", { name: "Сохранить услугу" }),
        );
        await waitFor(() => expect(screen.queryByText("Описание")).toBeNull());
        expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
            description: null,
        });
    });
    it("не удаляет при отмене, после подтверждения удаляет без перезагрузки", async () => {
        const { fetchMock } = await setup(new Response(null, { status: 204 }));
        const trigger = screen.getByRole("button", {
            name: "Удалить услугу Стрижка",
        });
        trigger.focus();
        fireEvent.click(trigger);
        fireEvent.click(
            within(screen.getByRole("dialog")).getByRole("button", {
                name: "Отмена",
            }),
        );
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(document.activeElement).toBe(trigger);
        fireEvent.click(trigger);
        fireEvent.click(
            within(screen.getByRole("dialog")).getByRole("button", {
                name: "Удалить",
            }),
        );
        expect(
            await screen.findByText(/Здесь появятся ваши услуги/),
        ).toBeTruthy();
        expect(fetchMock.mock.calls[1][1].method).toBe("DELETE");
    });
    it("при 404 сохраняет список и показывает ошибку в диалоге", async () => {
        await setup(
            Response.json({ message: "Услуга не найдена!" }, { status: 404 }),
        );
        fireEvent.click(
            screen.getByRole("button", { name: "Удалить услугу Стрижка" }),
        );
        fireEvent.click(
            within(screen.getByRole("dialog")).getByRole("button", {
                name: "Удалить",
            }),
        );
        expect((await screen.findByRole("alert")).textContent).toBe(
            "Услуга не найдена!",
        );
        expect(screen.getByRole("heading", { name: "Стрижка" })).toBeTruthy();
    });
    it("выводит ошибку проверки возле поля и не отправляет запрос", async () => {
        const { fetchMock } = await setup(Response.json({}));
        fireEvent.click(
            screen.getByRole("button", {
                name: "Редактировать услугу Стрижка",
            }),
        );
        const form = screen
            .getByRole("button", { name: "Сохранить услугу" })
            .closest("form")!;
        fireEvent.change(within(form).getByLabelText("Название услуги"), {
            target: { value: "а" },
        });
        fireEvent.click(
            within(form).getByRole("button", { name: "Сохранить услугу" }),
        );
        expect(
            await within(form).findByText(
                "Название услуги не должно быть меньше 3 символов!",
            ),
        ).toBeTruthy();
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    it("показывает ошибку валидации от сервера возле поля", async () => {
        await setup(
            Response.json(
                {
                    message: [
                        "Название услуги не должно превышать 50 символов!",
                    ],
                },
                { status: 400 },
            ),
        );
        fireEvent.click(
            screen.getByRole("button", {
                name: "Редактировать услугу Стрижка",
            }),
        );
        const form = screen
            .getByRole("button", { name: "Сохранить услугу" })
            .closest("form")!;
        fireEvent.change(within(form).getByLabelText("Название услуги"), {
            target: { value: "Укладка" },
        });
        fireEvent.click(
            within(form).getByRole("button", { name: "Сохранить услугу" }),
        );
        expect(
            await within(form).findByText(
                "Название услуги не должно превышать 50 символов!",
            ),
        ).toBeTruthy();
        expect(
            within(form)
                .getByLabelText("Название услуги")
                .getAttribute("aria-invalid"),
        ).toBe("true");
    });
    it("при 401 сбрасывает профиль и сообщает об истёкшей сессии", async () => {
        const { store } = await setup(
            Response.json({ message: "Unauthorized" }, { status: 401 }),
        );
        fireEvent.click(
            screen.getByRole("button", {
                name: "Редактировать услугу Стрижка",
            }),
        );
        const form = screen
            .getByRole("button", { name: "Сохранить услугу" })
            .closest("form")!;
        fireEvent.change(within(form).getByLabelText("Название услуги"), {
            target: { value: "Укладка" },
        });
        fireEvent.click(
            within(form).getByRole("button", { name: "Сохранить услугу" }),
        );
        await waitFor(() =>
            expect(store.getState().profile.profile).toBeNull(),
        );
        expect(store.getState().auth.sessionExpired).toBe(true);
    });
});
