// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { afterEach, describe, expect, it } from "vitest";
import { createAppStore } from "../src/app/store";
import { loginThunk } from "../src/entities/auth";
import { rememberProfileDraft } from "../src/entities/profile";
import { ProfileForm } from "../src/pages/profile/ProfileForm";

const user = { id: "user-1", email: "user@example.com", createdAt: "2026-11-23T00:00:00.000Z" };
const values = {
    displayName: "Анна",
    specialization: "Бьюти-мастер",
    about: "Делаю аккуратный макияж",
};

afterEach(() => {
    cleanup();
});

/** Логин без сети: форма читает владельца черновика из auth-состояния. */
function loginAs(store: ReturnType<typeof createAppStore>, id: string) {
    const credentials = { email: user.email, password: "password123" };
    store.dispatch(loginThunk.pending("login-1", credentials));
    store.dispatch(loginThunk.fulfilled({ user: { ...user, id } }, "login-1", credentials));
}

function renderForm(store: ReturnType<typeof createAppStore>) {
    render(
        <Provider store={store}>
            <ProfileForm profile={null} />
        </Provider>,
    );
}

describe("ProfileForm", () => {
    it("подставляет черновик владельца после повторного входа", () => {
        const store = createAppStore({ restoreSession: false });
        loginAs(store, "user-1");
        store.dispatch(rememberProfileDraft({ ownerId: "user-1", values }));

        renderForm(store);

        expect(screen.getByLabelText("Имя").value).toBe(values.displayName);
        expect(screen.getByLabelText("Специализация").value).toBe(values.specialization);
        expect(screen.getByLabelText("О себе").value).toBe(values.about);
        expect(screen.getByText(/Восстановлены несохранённые изменения/)).toBeTruthy();
    });

    it("не показывает черновик другого пользователя", () => {
        const store = createAppStore({ restoreSession: false });
        loginAs(store, "user-2");
        store.dispatch(rememberProfileDraft({ ownerId: "user-1", values }));

        renderForm(store);

        expect(screen.getByLabelText("Имя").value).toBe("");
        expect(screen.getByLabelText("Специализация").value).toBe("");
        expect(screen.getByLabelText("О себе").value).toBe("");
        expect(screen.queryByText(/Восстановлены несохранённые изменения/)).toBeNull();
    });
});
