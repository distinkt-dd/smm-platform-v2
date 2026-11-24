import { useState, type SubmitEvent } from "react";
import {
    updateServiceThunk,
    type Service,
    type ProfileRequestError,
} from "../../entities/profile";
import { useAppDispatch, useAppSelector } from "../../shared/store";
import { Button, Input, Textarea } from "../../shared/ui";
import { readServiceDrafts, writeServiceDraft } from "./service-drafts";

export function EditServiceForm({
    service,
    profileId,
    onClose,
}: {
    service: Service;
    profileId: string;
    onClose: () => void;
}) {
    const dispatch = useAppDispatch();
    const ownerId = useAppSelector((state) => state.auth.user?.id);
    const requests = useAppSelector((state) => state.profile.requests);
    const pending = requests.changeService.status === "pending";
    const blocked =
        pending ||
        requests.save.status === "pending" ||
        requests.createService.status === "pending";
    const [values, setValues] = useState(
        () =>
            readServiceDrafts(ownerId, profileId).edits[service.id] ?? {
                title: service.title,
                description: service.description ?? "",
            },
    );
    const [error, setError] = useState<ProfileRequestError | null>(null);
    const fields = error?.kind === "validation" ? error.fields : {};
    const change = (field: "title" | "description", value: string) => {
        const next = { ...values, [field]: value };
        setValues(next);
        writeServiceDraft(ownerId, profileId, service.id, next);
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
        if (blocked) return;
        const updates: { title?: string; description?: string | null } = {};
        if (values.title !== service.title) updates.title = values.title;
        if (values.description !== (service.description ?? ""))
            updates.description = values.description || null;
        if (Object.keys(updates).length === 0) {
            writeServiceDraft(ownerId, profileId, service.id, null);
            onClose();
            return;
        }
        setError(null);
        const result = await dispatch(
            updateServiceThunk({ profileId, id: service.id, values: updates }),
        );
        if (updateServiceThunk.fulfilled.match(result)) {
            writeServiceDraft(ownerId, profileId, service.id, null);
            onClose();
        } else
            setError(
                result.payload ?? {
                    kind: "unknown",
                    message: result.error.message ?? "Неизвестная ошибка",
                },
            );
    };
    const formError =
        error?.kind === "validation" ? fields[""] : error?.message;
    return (
        <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
            <Input
                label="Название услуги"
                required
                value={values.title}
                disabled={pending}
                onChange={(e) => change("title", e.target.value)}
                error={fields.title}
            />
            <Textarea
                label="Описание услуги"
                value={values.description}
                disabled={pending}
                onChange={(e) => change("description", e.target.value)}
                error={fields.description}
            />
            <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={blocked}>
                    {pending ? "Сохраняем…" : "Сохранить услугу"}
                </Button>
                <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                        writeServiceDraft(ownerId, profileId, service.id, null);
                        onClose();
                    }}
                    className="min-h-12 rounded-control border border-line px-5 font-semibold disabled:opacity-50"
                >
                    Отмена
                </button>
            </div>
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
}
