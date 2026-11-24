import { useState, type SubmitEvent } from "react";
import {
    createFactThunk,
    updateFactThunk,
    deleteFactThunk,
    type ConfirmedFact,
    type ProfileRequestError,
} from "../../entities/profile";
import { useAppDispatch, useAppSelector } from "../../shared/store";
import { Button, Textarea, ConfirmationDialog } from "../../shared/ui";
import { readFactDrafts, writeFactDraft } from "./fact-drafts";

export function FactsList({
    facts,
    profileId,
}: {
    facts: ConfirmedFact[];
    profileId?: string;
}) {
    const dispatch = useAppDispatch();
    const ownerId = useAppSelector((state) => state.auth.user?.id);
    const requests = useAppSelector((state) => state.profile.requests);
    const blocked = [
        requests.save,
        requests.fact,
        requests.createService,
        requests.changeService,
    ].some((request) => request.status === "pending");
    const [drafts] = useState(() =>
        profileId ? readFactDrafts(ownerId, profileId) : { edits: {} },
    );
    const [text, setText] = useState(drafts.create?.text ?? "");
    const [editing, setEditing] = useState<ConfirmedFact | null>(
        () => facts.find((fact) => fact.id === drafts.activeEdit) ?? null,
    );
    const [editText, setEditText] = useState(() =>
        drafts.activeEdit ? (drafts.edits[drafts.activeEdit]?.text ?? "") : "",
    );
    const [deleting, setDeleting] = useState<ConfirmedFact | null>(null);
    const [error, setError] = useState<ProfileRequestError | null>(null);
    const [deleteError, setDeleteError] = useState<string>();
    const fields = error?.kind === "validation" ? error.fields : {};
    const formError =
        error?.kind === "validation" ? fields[""] : error?.message;
    const submit = async (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!profileId || blocked) return;
        setError(null);
        if (editing && editText === editing.text) {
            writeFactDraft(ownerId, profileId, editing.id, null);
            setEditing(null);
            return;
        }
        const result = editing
            ? await dispatch(
                  updateFactThunk({
                      profileId,
                      id: editing.id,
                      values: { text: editText },
                  }),
              )
            : await dispatch(createFactThunk({ profileId, values: { text } }));
        if (createFactThunk.fulfilled.match(result)) {
            writeFactDraft(ownerId, profileId, null, null);
            setText("");
        } else if (updateFactThunk.fulfilled.match(result)) {
            if (editing) writeFactDraft(ownerId, profileId, editing.id, null);
            setEditing(null);
        } else
            setError(
                result.payload ?? {
                    kind: "unknown",
                    message: result.error.message ?? "Неизвестная ошибка",
                },
            );
    };
    const remove = async () => {
        if (!deleting || !profileId || blocked) return;
        setDeleteError(undefined);
        const result = await dispatch(
            deleteFactThunk({ profileId, id: deleting.id }),
        );
        if (deleteFactThunk.fulfilled.match(result)) {
            writeFactDraft(ownerId, profileId, deleting.id, null);
            if (editing?.id === deleting.id) setEditing(null);
            setDeleting(null);
        } else
            setDeleteError(
                result.payload?.message ??
                    result.error.message ??
                    "Неизвестная ошибка",
            );
    };
    return (
        <section
            aria-labelledby="facts-heading"
            className="flex w-full max-w-preview min-w-0 flex-col gap-4"
        >
            <h2 id="facts-heading">Подтверждённые факты</h2>
            {facts.length === 0 ? (
                <p className="text-ink-muted">
                    Подтверждённый факт — проверенное утверждение о мастере, на
                    которое опирается контент. Здесь появятся ваши факты.
                </p>
            ) : (
                <ul className="divide-y divide-line border-y border-line phone:max-h-[50vh] phone:overflow-y-auto phone:px-2">
                    {facts.map((fact) => (
                        <li
                            key={fact.id}
                            className="flex items-start gap-2 py-4"
                        >
                            <p className="min-w-0 flex-1 whitespace-pre-line break-words">
                                {fact.text}
                            </p>
                            <button
                                type="button"
                                disabled={blocked}
                                aria-label={`Редактировать факт ${fact.text}`}
                                onClick={() => {
                                    setEditing(fact);
                                    setEditText(
                                        profileId
                                            ? (readFactDrafts(
                                                  ownerId,
                                                  profileId,
                                              ).edits[fact.id]?.text ??
                                                  fact.text)
                                            : fact.text,
                                    );
                                    setError(null);
                                }}
                                className="min-h-12 rounded-control px-2 text-ink-muted disabled:opacity-40"
                            >
                                Изменить
                            </button>
                            <button
                                type="button"
                                disabled={blocked}
                                aria-label={`Удалить факт ${fact.text}`}
                                onClick={() => {
                                    setDeleting(fact);
                                    setDeleteError(undefined);
                                }}
                                className="min-h-12 rounded-control px-2 text-ink-muted disabled:opacity-40"
                            >
                                Удалить
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {profileId ? (
                <form
                    className="flex flex-col gap-4"
                    onSubmit={submit}
                    noValidate
                >
                    <h3>{editing ? "Изменить факт" : "Добавить факт"}</h3>
                    <Textarea
                        label="Текст факта"
                        name="text"
                        required
                        disabled={blocked}
                        value={editing ? editText : text}
                        onChange={(event) => {
                            const value = event.target.value;
                            if (editing) setEditText(value);
                            else setText(value);
                            writeFactDraft(
                                ownerId,
                                profileId,
                                editing?.id ?? null,
                                { text: value },
                            );
                            setError(null);
                        }}
                        error={fields.text}
                    />
                    <div className="flex flex-wrap gap-3">
                        <Button type="submit" disabled={blocked}>
                            {requests.fact.status === "pending"
                                ? "Сохраняем…"
                                : editing
                                  ? "Сохранить факт"
                                  : "Добавить факт"}
                        </Button>
                        {editing && (
                            <button
                                type="button"
                                disabled={blocked}
                                onClick={() => {
                                    writeFactDraft(
                                        ownerId,
                                        profileId,
                                        editing.id,
                                        null,
                                    );
                                    setEditing(null);
                                    setError(null);
                                }}
                                className="min-h-12 rounded-control border border-line px-5 font-semibold disabled:opacity-50"
                            >
                                Отмена
                            </button>
                        )}
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
            ) : (
                <p className="text-caption text-ink-muted">
                    Чтобы добавить факт, сначала сохраните профиль.
                </p>
            )}
            {deleting && (
                <ConfirmationDialog
                    title="Удалить факт?"
                    description={`Факт «${deleting.text}» будет удалён. Это действие нельзя отменить.`}
                    confirmLabel="Удалить"
                    pending={requests.fact.status === "pending"}
                    error={deleteError}
                    onConfirm={() => void remove()}
                    onCancel={() => setDeleting(null)}
                />
            )}
        </section>
    );
}
