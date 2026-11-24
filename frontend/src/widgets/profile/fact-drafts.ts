export type FactValues = { text: string };
type Drafts = {
    create?: FactValues;
    edits: Record<string, FactValues>;
    activeEdit?: string;
};

const key = (ownerId: string, profileId: string) =>
    `fact-drafts:${encodeURIComponent(ownerId)}:${encodeURIComponent(profileId)}`;
const validValues = (value: unknown): value is FactValues =>
    !!value &&
    typeof value === "object" &&
    typeof (value as FactValues).text === "string";

export function readFactDrafts(
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

export function writeFactDraft(
    ownerId: string | undefined,
    profileId: string,
    factId: string | null,
    values: FactValues | null,
) {
    if (!ownerId) return;
    const drafts = readFactDrafts(ownerId, profileId);
    if (factId === null) {
        if (values) drafts.create = values;
        else delete drafts.create;
    } else if (values) {
        drafts.edits[factId] = values;
        drafts.activeEdit = factId;
    } else {
        delete drafts.edits[factId];
        if (drafts.activeEdit === factId) delete drafts.activeEdit;
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
