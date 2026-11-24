import {
    apiRequest,
    ApiHttpError,
    requireResponse,
} from "../../../shared/api/api";
import { PROFILE } from "../../../shared/api/endpoints";
import {
    validate,
    ValidationError,
    type ValidationErrors,
} from "../../../shared/lib/validate";
import { factMessages, factSchema } from "./fact-schema";
import type { ConfirmedFact } from "./types";
export type CreateFactRequest = { text: string };
export type UpdateFactRequest = { text?: string };
function throwFactError(error: unknown): never {
    if (error instanceof ApiHttpError && error.status === 400) {
        const fields: ValidationErrors = {};
        let matched = false;
        for (const message of error.messages) {
            if (
                Object.values(factMessages).some((value) => value === message)
            ) {
                fields.text ??= message;
                matched = true;
            } else
                fields[""] = fields[""] ? fields[""] + "\n" + message : message;
        }
        if (matched) throw new ValidationError(fields);
    }
    throw error;
}
export async function createFact(
    data: CreateFactRequest,
): Promise<ConfirmedFact> {
    const result = validate(factSchema, data);
    if (!result.success) throw new ValidationError(result.errors);
    try {
        return await requireResponse(
            apiRequest<ConfirmedFact>(PROFILE + "/facts", {
                method: "POST",
                body: result.data,
            }),
        );
    } catch (error) {
        throwFactError(error);
    }
}
export async function updateFact(
    id: string,
    data: UpdateFactRequest,
): Promise<ConfirmedFact> {
    const result = validate(factSchema.partial(), data);
    if (!result.success) throw new ValidationError(result.errors);
    try {
        return await requireResponse(
            apiRequest<ConfirmedFact>(
                PROFILE + "/facts/" + encodeURIComponent(id),
                {
                    method: "PATCH",
                    body: result.data,
                },
            ),
        );
    } catch (error) {
        throwFactError(error);
    }
}
export async function deleteFact(id: string): Promise<void> {
    await apiRequest(PROFILE + "/facts/" + encodeURIComponent(id), {
        method: "DELETE",
    });
}
