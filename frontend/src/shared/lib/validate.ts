import type { z } from "zod";

export type ValidationErrors = Record<string, string>;

export class ValidationError extends Error {
    readonly errors: ValidationErrors;

    constructor(errors: ValidationErrors) {
        super("Ошибка проверки данных");
        this.name = "ValidationError";
        this.errors = errors;
    }
}

export function validate<T extends z.ZodType>(
    schema: T,
    data: unknown,
):
    | { success: true; data: z.output<T> }
    | { success: false; errors: ValidationErrors } {
    const result = schema.safeParse(data);
    if (result.success) return { success: true, data: result.data };

    const errors: ValidationErrors = {};
    for (const issue of result.error.issues) {
        const path = issue.path.map(String).join(".");
        if (!(path in errors)) errors[path] = issue.message;
    }
    return { success: false, errors };
}
