import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateServiceDto {
  // Не `@IsOptional()`: оно пропускает и `null`, а `title` — обязательная
  // колонка. Пропускаем только `undefined` (поле не пришло в теле), тогда
  // `null` получает обычную ошибку валидации `400`, а не ошибку базы `500`.
  @ValidateIf((_, value) => value !== undefined)
  @MaxLength(50, { message: 'Название услуги не должно превышать 50 символов!' })
  @MinLength(3, { message: 'Название услуги не должно быть меньше 3 символов!' })
  @IsString({ message: 'Название услуги должно быть строкой!' })
  title?: string;

  // `null` здесь осмыслен: так клиент очищает необязательное описание.
  @IsOptional()
  @IsString({ message: 'Описание услуги должно быть строкой!' })
  @MaxLength(250, {
    message: 'Описание услуги не должно превышать 250 символов!',
  })
  description?: string | null;
}
