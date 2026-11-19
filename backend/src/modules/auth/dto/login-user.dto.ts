import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginUserDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString({ message: 'Email должен быть строкой!' })
  @IsEmail({}, { message: 'Email должен быть валидным email адресом!' })
  @MaxLength(64, { message: 'Email не может быть больше 64 символов!' })
  email: string;

  @MinLength(8, { message: 'Минимальная длина пароля - 8 символов!' })
  @MaxLength(32, { message: 'Максимальная длина пароля - 32 символа!' })
  @IsString({ message: 'Пароль должен быть строкой!' })
  password: string;
}
