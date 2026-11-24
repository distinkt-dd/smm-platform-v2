export type ServiceValues = { title: string; description: string };
type Drafts = {
    create?: ServiceValues;
    edits: Record<string, ServiceValues>;
    activeEdit?: string;
};

const key = (ownerId: string, profileId: string) =>
    `service-drafts:${encodeURIComponent(ownerId)}:${encodeURIComponent(profileId)}`;
const validValues = (value: unknown): value is ServiceValues =>
    !!value &&
    typeof value === "object" &&
    typeof (value as ServiceValues).title === "string" &&
    typeof (value as ServiceValues).description === "string";

export function readServiceDrafts(
    ownerId: string | undefined,
    profileId: string,
): Drafts {
    const empty: Drafts = { edits: {} };
    if (!ownerId) return empty;
    try {
        const data: unknown = JSON.parse(
            localStorage.getItem(key(ownerId, profileId)) ?? "null",
        );
        if (!data || typeof data !== "object") return empty;
        const raw = data as Record<string, unknown>;
        if (validValues(raw.create)) empty.create = raw.create;
        if (
            raw.edits &&
            typeof raw.edits === "object" &&
            !Array.isArray(raw.edits)
        ) {
            for (const [id, values] of Object.entries(raw.edits))
                if (validValues(values)) empty.edits[id] = values;
        }
        if (
            typeof raw.activeEdit === "string" &&
            Object.hasOwn(empty.edits, raw.activeEdit)
        )
            empty.activeEdit = raw.activeEdit;
    } catch {
        /* Хранилище может быть недоступно или содержать повреждённые данные. */
    }
    return empty;
}

export function writeServiceDraft(
    ownerId: string | undefined,
    profileId: string,
    serviceId: string | null,
    values: ServiceValues | null,
) {
    if (!ownerId) return;
    const drafts = readServiceDrafts(ownerId, profileId);
    if (serviceId === null) {
        if (values) drafts.create = values;
        else delete drafts.create;
    } else if (values) {
        drafts.edits[serviceId] = values;
        drafts.activeEdit = serviceId;
    } else {
        delete drafts.edits[serviceId];
        if (drafts.activeEdit === serviceId) delete drafts.activeEdit;
    }
    try {
        if (!drafts.create && Object.keys(drafts.edits).length === 0)
            localStorage.removeItem(key(ownerId, profileId));
        else
            localStorage.setItem(
                key(ownerId, profileId),
                JSON.stringify(drafts),
            );
    } catch {
        /* Форма остаётся доступной при запрете записи в хранилище. */
    }
}
