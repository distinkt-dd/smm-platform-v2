import isLength from "validator/lib/isLength";
import { z } from "zod";

export const serviceMessages = {
    titleMin: "Название услуги не должно быть меньше 3 символов!",
    titleMax: "Название услуги не должно превышать 50 символов!",
    titleType: "Название услуги должно быть строкой!",
    descriptionMax: "Описание услуги не должно превышать 250 символов!",
    descriptionType: "Описание услуги должно быть строкой!",
} as const;

// DTO услуг не обрезает пробелы: сохраняем те же правила и значения.
export const serviceSchema = z.object({
    title: z
        .string()
        .refine(
            (value) => isLength(value, { min: 3 }),
            serviceMessages.titleMin,
        )
        .refine(
            (value) => isLength(value, { max: 50 }),
            serviceMessages.titleMax,
        ),
    description: z
        .string()
        .refine(
            (value) => isLength(value, { max: 250 }),
            serviceMessages.descriptionMax,
        )
        .nullable()
        .optional(),
});
