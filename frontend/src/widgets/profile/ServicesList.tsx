import { useState } from "react";
import {
    deleteServiceThunk,
    type Service,
    type ProfileRequestError,
} from "../../entities/profile";
import { useAppDispatch, useAppSelector } from "../../shared/store";
import { ConfirmationDialog } from "../../shared/ui";
import { EditServiceForm } from "./EditServiceForm";
import { ServiceForm } from "./ServiceForm";
import { readServiceDrafts, writeServiceDraft } from "./service-drafts";

export const ServicesList = ({
    services,
    profileId,
}: {
    services: Service[];
    profileId?: string;
}) => {
    const dispatch = useAppDispatch();
    const ownerId = useAppSelector((state) => state.auth.user?.id);
    const requests = useAppSelector((state) => state.profile.requests);
    const blocked =
        requests.save.status === "pending" ||
        requests.createService.status === "pending" ||
        requests.changeService.status === "pending";
    const [editingId, setEditingId] = useState<string | null>(() => profileId ? readServiceDrafts(ownerId, profileId).activeEdit ?? null : null);
    const [deleting, setDeleting] = useState<Service | null>(null);
    const [error, setError] = useState<ProfileRequestError | null>(null);

    const remove = async () => {
        if (!deleting || !profileId || blocked) return;
        setError(null);
        const result = await dispatch(
            deleteServiceThunk({ id: deleting.id, profileId }),
        );
        if (deleteServiceThunk.fulfilled.match(result)) {
            writeServiceDraft(ownerId, profileId, deleting.id, null);
            setDeleting(null);
        }
        else
            setError(
                result.payload ?? {
                    kind: "unknown",
                    message: result.error.message ?? "Неизвестная ошибка",
                },
            );
    };

    return (
        <section
            aria-labelledby="services-heading"
            className="flex w-full max-w-preview min-w-0 flex-col gap-4"
        >
            <h2 id="services-heading">Услуги</h2>
            {services.length === 0 ? (
                <p className="text-ink-muted">
                    Здесь появятся ваши услуги. Они помогут учитывать вашу
                    практику при создании контента.
                </p>
            ) : (
                <ul className="divide-y divide-line border-y border-line phone:max-h-[50vh] phone:overflow-y-auto phone:px-2">
                    {services.map((service) => (
                        <li key={service.id} className="py-4">
                            {editingId === service.id && profileId ? (
                                <EditServiceForm
                                    service={service}
                                    profileId={profileId}
                                    onClose={() => setEditingId(null)}
                                />
                            ) : (
                                <div className="flex items-start gap-2">
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-semibold break-words">
                                            {service.title}
                                        </h3>
                                        {service.description && (
                                            <p className="text-ink-muted whitespace-pre-line break-words">
                                                {service.description}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        disabled={blocked}
                                        aria-label={`Редактировать услугу ${service.title}`}
                                        onClick={() => setEditingId(service.id)}
                                        className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-control text-ink-muted opacity-75 hover:opacity-100 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus disabled:opacity-40"
                                    >
                                        <svg
                                            aria-hidden="true"
                                            width="20"
                                            height="20"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.7"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
                                        </svg>
                                    </button>
                                    <button
                                        type="button"
                                        disabled={blocked}
                                        aria-label={`Удалить услугу ${service.title}`}
                                        onClick={() => {
                                            setError(null);
                                            setDeleting(service);
                                        }}
                                        className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-control text-ink-muted opacity-75 hover:opacity-100 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus disabled:opacity-40"
                                    >
                                        <svg
                                            aria-hidden="true"
                                            width="20"
                                            height="20"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.7"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 10v6M14 10v6" />
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
            {profileId ? (
                <ServiceForm key={profileId} profileId={profileId} />
            ) : (
                <p className="text-caption text-ink-muted">
                    Чтобы добавить услугу, сначала сохраните профиль.
                </p>
            )}
            {deleting && (
                <ConfirmationDialog
                    title="Удалить услугу?"
                    description={`Услуга «${deleting.title}» будет удалена. Это действие нельзя отменить.`}
                    confirmLabel="Удалить"
                    pending={requests.changeService.status === "pending"}
                    error={error?.message}
                    onConfirm={() => void remove()}
                    onCancel={() => setDeleting(null)}
                />
            )}
        </section>
    );
};
