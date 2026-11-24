import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateFactDto {
  @MaxLength(250, { message: 'Факт не должен превышать 250 символов!' })
  @MinLength(3, { message: 'Факт не должен быть меньше 3 символов!' })
  @IsString({ message: 'Факт должен быть строкой!' })
  text: string;
}
