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
import type { Service } from "../../profile/api/types";
import { serviceMessages, serviceSchema } from "./service-schema";

export type CreateServiceRequest = {
    title: string;
    description?: string | null;
};

const fieldsByMessage: Record<string, string> = {
    [serviceMessages.titleMin]: "title",
    [serviceMessages.titleMax]: "title",
    [serviceMessages.titleType]: "title",
    [serviceMessages.descriptionMax]: "description",
    [serviceMessages.descriptionType]: "description",
};

export async function createService(
    data: CreateServiceRequest,
): Promise<Service> {
    const result = validate(serviceSchema, data);
    if (!result.success) throw new ValidationError(result.errors);
    try {
        return await requireResponse(
            apiRequest<Service>(`${PROFILE}/services`, {
                method: "POST",
                body: {
                    title: result.data.title,
                    description: result.data.description || null,
                },
            }),
        );
    } catch (error) {
        if (error instanceof ApiHttpError && error.status === 400) {
            const fields: ValidationErrors = {};
            let matched = false;
            for (const message of error.messages) {
                const field = fieldsByMessage[message];
                if (field) {
                    fields[field] ??= message;
                    matched = true;
                } else
                    fields[""] = fields[""]
                        ? `${fields[""]}\n${message}`
                        : message;
            }
            if (matched) throw new ValidationError(fields);
        }
        throw error;
    }
}
