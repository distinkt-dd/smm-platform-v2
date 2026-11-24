import type { SubmitEvent } from "react";
import { useState } from "react";
import {
    clearProfileFeedback,
    rememberProfileDraft,
    saveProfileThunk,
    type Profile,
    type ProfileRequest,
} from "../../entities/profile";
import { useAppDispatch, useAppSelector } from "../../shared/store";
import { Button, Input, Textarea } from "../../shared/ui";

type Field = "displayName" | "specialization" | "about";
type ProfileValues = Record<Field, string>;

const emptyValues: ProfileValues = {
    displayName: "",
    specialization: "",
    about: "",
};

const toValues = (source: Profile | ProfileRequest | null): ProfileValues =>
    source
        ? {
              displayName: source.displayName,
              specialization: source.specialization,
              about: source.about ?? "",
          }
        : emptyValues;

export const ProfileForm = ({ profile }: { profile: Profile | null }) => {
    const dispatch = useAppDispatch();
    const notCreated = useAppSelector((state) => state.profile.notCreated);
    const save = useAppSelector((state) => state.profile.requests.save);
    const creatingService = useAppSelector(
        (state) =>
            state.profile.requests.createService.status === "pending" ||
            state.profile.requests.changeService.status === "pending",
    );
    const draft = useAppSelector((state) => state.profile.draft);
    const ownerId = useAppSelector((state) => state.auth.user?.id);
    // Черновик подставляем только его владельцу: после входа под другим
    // аккаунтом чужие значения в форме не появятся.
    const restored = draft && draft.ownerId === ownerId ? draft.values : null;
    // Форма получает значения профиля при монтировании: страница передаёт
    // `key` по идентификатору профиля, поэтому новый профиль с сервера
    // создаёт форму заново, а свои правки после сохранения остаются на месте.
    const [values, setValues] = useState<ProfileValues>(() =>
        toValues(restored ?? profile),
    );

    const pending = save.status === "pending";
    const errors = save.error?.kind === "validation" ? save.error.fields : {};
    const formError =
        save.error?.kind === "validation"
            ? errors[""] || ""
            : save.error?.kind === "http"
              ? save.error.messages.length > 0
                  ? save.error.messages.join("\n")
                  : save.error.message
              : save.error?.message || "";
    const notice = save.status === "fulfilled" ? "Профиль сохранён." : "";

    const updateField = (field: Field, value: string) => {
        setValues((previous) => ({ ...previous, [field]: value }));
        dispatch(clearProfileFeedback({ field }));
    };

    const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (pending || creatingService) return;
        const request: ProfileRequest = {
            displayName: values.displayName,
            specialization: values.specialization,
            about: values.about,
        };
        // Черновик запоминаем до запроса: если сессия истекла, значения
        // переживут переход на страницу входа и повторный вход.
        if (ownerId)
            dispatch(rememberProfileDraft({ ownerId, values: request }));
        void dispatch(saveProfileThunk(request));
    };

    return (
        <form
            className="flex flex-col gap-6"
            onSubmit={handleSubmit}
            noValidate
        >
            {notCreated && (
                <p role="status" className="text-caption text-ink-muted">
                    Профиль ещё не создан. Заполните поля и сохраните — профиль
                    появится.
                </p>
            )}
            {restored && (
                <p role="status" className="text-caption text-ink-muted">
                    Восстановлены несохранённые изменения — проверьте поля и
                    сохраните.
                </p>
            )}
            <Input
                label="Имя"
                name="displayName"
                autoComplete="name"
                placeholder="Анна Петрова"
                required
                disabled={pending}
                value={values.displayName}
                onChange={(event) =>
                    updateField("displayName", event.target.value)
                }
                error={errors.displayName}
            />
            <Input
                label="Специализация"
                name="specialization"
                autoComplete="organization-title"
                placeholder="Бьюти-мастер"
                required
                disabled={pending}
                value={values.specialization}
                onChange={(event) =>
                    updateField("specialization", event.target.value)
                }
                error={errors.specialization}
            />
            <Textarea
                label="О себе"
                name="about"
                placeholder="Чем вы помогаете клиентам и чем отличаетесь: 10–250 символов"
                disabled={pending}
                value={values.about}
                onChange={(event) => updateField("about", event.target.value)}
                error={errors.about}
            />
            <Button
                type="submit"
                className="w-full"
                disabled={pending || creatingService}
            >
                {pending ? "Сохраняем…" : "Сохранить"}
            </Button>
            {notice && (
                <p role="status" className="text-caption text-ink-muted">
                    {notice}
                </p>
            )}
            {formError && (
                <p
                    role="alert"
                    className="text-caption text-link whitespace-pre-line"
                >
                    {formError}
                </p>
            )}
        </form>
    );
};
