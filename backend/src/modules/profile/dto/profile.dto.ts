import { Transform } from "class-transformer";
import { IsOptional, IsString, MaxLength, MinLength, ValidateIf } from "class-validator";


export class ProfileDto {

    @MaxLength(50, {message: "Имя пользователя не должно превышать 50 символов"})
    @MinLength(3, {message: "Имя пользователя не должно быть меньше 3 символов"})
    @IsString({message: "Имя пользователя должно быть строкой"})
    displayName: string;

    @MaxLength(50, {message: "Специализация не должна превышать 50 символов"})
    @MinLength(3, {message: "Специализация не должно быть меньше 3 символов"})
    @IsString({message: "Специализация должна быть строкой"})
    specialization: string;

    // Пустая строка и `null` — явная очистка описания, поэтому проверки длины
    // применяются только к непустому тексту: вместе с `@IsOptional()` они
    // пропускают `""`, `null` и отсутствующее поле.
    @IsOptional()
    @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
    @ValidateIf((_, value) => value !== "")
    @IsString({message: "О себе должно быть строкой"})
    @MaxLength(250, {message: "О себе не должно превышать 250 символов"})
    @MinLength(10, {message: "О себе не должно быть меньше 10 символов"})
    about?: string | null;
}
