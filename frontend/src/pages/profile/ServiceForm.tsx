import { useState, type SubmitEvent } from "react";
import {
    createServiceThunk,
    type ProfileRequestError,
} from "../../entities/profile";
import { useAppDispatch, useAppSelector } from "../../shared/store";
import { Button, Input, Textarea } from "../../shared/ui";

export const ServiceForm = ({ profileId }: { profileId: string }) => {
    const dispatch = useAppDispatch();
    const create = useAppSelector(
        (state) => state.profile.requests.createService,
    );
    const savingProfile = useAppSelector(
        (state) => state.profile.requests.save.status === "pending",
    );
    const [values, setValues] = useState({ title: "", description: "" });
    const [error, setError] = useState<ProfileRequestError | null>(null);
    const [created, setCreated] = useState(false);
    const pending = create.status === "pending";
    const fields = error?.kind === "validation" ? error.fields : {};
    const formError =
        error?.kind === "validation" ? fields[""] : error?.message;

    const update = (field: "title" | "description", value: string) => {
        setValues((previous) => ({ ...previous, [field]: value }));
        setCreated(false);
        setError((previous) => {
            if (previous?.kind !== "validation") return null;
            const next = { ...previous.fields };
            delete next[field];
            delete next[""];
            return Object.keys(next).length
                ? { ...previous, fields: next }
                : null;
        });
    };

    const submit = async (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (pending || savingProfile) return;
        setError(null);
        setCreated(false);
        const result = await dispatch(
            createServiceThunk({ profileId, values }),
        );
        if (createServiceThunk.fulfilled.match(result)) {
            setValues({ title: "", description: "" });
            setCreated(true);
        } else
            setError(
                result.payload ?? {
                    kind: "unknown",
                    message: result.error.message ?? "Неизвестная ошибка",
                },
            );
    };

    return (
        <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
            <h3>Добавить услугу</h3>
            <Input
                label="Название услуги"
                name="title"
                required
                disabled={pending}
                value={values.title}
                onChange={(event) => update("title", event.target.value)}
                error={fields.title}
            />
            <Textarea
                label="Описание услуги"
                name="description"
                disabled={pending}
                value={values.description}
                onChange={(event) => update("description", event.target.value)}
                error={fields.description}
            />
            <Button type="submit" disabled={pending || savingProfile}>
                {pending ? "Добавляем…" : "Добавить услугу"}
            </Button>
            {created && (
                <p role="status" className="text-caption text-ink-muted">
                    Услуга добавлена.
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
