import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";


export class ProfileDto {

    @MaxLength(50, {message: "Имя пользователя не должно превышать 50 символов"})
    @MinLength(3, {message: "Имя пользователя не должно быть меньше 3 символов"})
    @IsString({message: "Имя пользователя должно быть строкой"})
    displayName: string;

    @MaxLength(50, {message: "Специализация не должна превышать 50 символов"})
    @MinLength(3, {message: "Специализация не должно быть меньше 3 символов"})
    @IsString({message: "Специализация должна быть строкой"})
    specialization: string;


    @IsString({message: "О себе должно быть строкой"})
    @MaxLength(250, {message: "О себе не должно превышать 250 символов"})
    @MinLength(10, {message: "О себе не должно быть меньше 10 символов"})
    @IsOptional()
    about: string;
}
