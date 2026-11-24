import isLength from "validator/lib/isLength";
import { z } from "zod";
export const factMessages = {
    min: "Факт не должен быть меньше 3 символов!",
    max: "Факт не должен превышать 250 символов!",
    type: "Факт должен быть строкой!",
} as const;
export const factSchema = z.object({
    text: z
        .string()
        .refine((value) => isLength(value, { min: 3 }), factMessages.min)
        .refine((value) => isLength(value, { max: 250 }), factMessages.max),
});
