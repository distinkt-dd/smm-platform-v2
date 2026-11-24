import {
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateFactDto {
  // Не `@IsOptional()`: оно пропускает и `null`, а `text` — обязательная
  // колонка. Пропускаем только `undefined` (поле не пришло в теле), тогда
  // `null` получает обычную ошибку валидации `400`, а не ошибку базы `500`.
  @ValidateIf((_, value) => value !== undefined)
  @MaxLength(250, { message: 'Факт не должен превышать 250 символов!' })
  @MinLength(3, { message: 'Факт не должен быть меньше 3 символов!' })
  @IsString({ message: 'Факт должен быть строкой!' })
  text?: string;
}
