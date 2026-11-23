import isEmail from "validator/lib/isEmail";
import isLength from "validator/lib/isLength";
import { z } from "zod";

// class-validator использует validator.js для email и подсчёта длины строк.
export const credentialsSchema = z.object({
    email: z.string().trim().toLowerCase()
        .refine((value) => isEmail(value), "Email должен быть валидным email адресом!")
        .refine((value) => isLength(value, { max: 64 }), "Email не может быть больше 64 символов!"),
    password: z.string()
        .refine((value) => isLength(value, { min: 8 }), "Минимальная длина пароля - 8 символов!")
        .refine((value) => isLength(value, { max: 32 }), "Максимальная длина пароля - 32 символа!"),
});
