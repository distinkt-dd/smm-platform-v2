import { describe, expect, it } from "vitest";
import { createAppStore } from "../src/app/store";
import { expireSession, logoutThunk } from "../src/entities/auth";
import {
    rememberProfileDraft,
    saveProfileThunk,
} from "../src/entities/profile";

const values = {
    displayName: "Анна",
    specialization: "Бьюти-мастер",
    about: "Делаю аккуратный макияж",
};

const profile = { id: "profile-1", ...values, confirmedFacts: [], services: [] };

describe("черновик профиля", () => {
    it("переживает истечение сессии и очищается после сохранения", () => {
        const store = createAppStore({ restoreSession: false });
        store.dispatch(rememberProfileDraft({ ownerId: "user-1", values }));
        store.dispatch(expireSession());

        // `resetProfile` на истечении сессии не должен стирать черновик:
        // иначе после повторного входа значения формы пропадут.
        expect(store.getState().auth.sessionExpired).toBe(true);
        expect(store.getState().profile.draft).toEqual({ ownerId: "user-1", values });

        store.dispatch(saveProfileThunk.pending("save-1", values));
        store.dispatch(saveProfileThunk.fulfilled(profile, "save-1", values));

        expect(store.getState().profile.draft).toBeNull();
        expect(store.getState().profile.profile).toEqual(profile);
    });

    it("очищается при выходе из аккаунта", () => {
        const store = createAppStore({ restoreSession: false });
        store.dispatch(rememberProfileDraft({ ownerId: "user-1", values }));
        store.dispatch(logoutThunk.fulfilled(undefined, "logout-1", undefined));

        expect(store.getState().profile.draft).toBeNull();
    });

    it("не остаётся после ошибки проверки данных", () => {
        const store = createAppStore({ restoreSession: false });
        store.dispatch(rememberProfileDraft({ ownerId: "user-1", values }));
        store.dispatch(saveProfileThunk.pending("save-2", values));
        store.dispatch(
            saveProfileThunk.rejected(null, "save-2", values, {
                kind: "validation",
                message: "Ошибка проверки данных",
                fields: { displayName: "Имя пользователя не должно быть меньше 3 символов" },
            }),
        );

        expect(store.getState().profile.draft).toBeNull();
        expect(store.getState().profile.requests.save.status).toBe("rejected");
    });
});
