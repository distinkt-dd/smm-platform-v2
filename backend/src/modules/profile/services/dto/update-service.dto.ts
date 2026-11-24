import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateServiceDto {
  @IsOptional()
  @MaxLength(50, { message: 'Название услуги не должно превышать 50 символов!' })
  @MinLength(3, { message: 'Название услуги не должно быть меньше 3 символов!' })
  @IsString({ message: 'Название услуги должно быть строкой!' })
  title?: string;

  @IsOptional()
  @IsString({ message: 'Описание услуги должно быть строкой!' })
  @MaxLength(250, {
    message: 'Описание услуги не должно превышать 250 символов!',
  })
  description?: string;
}
