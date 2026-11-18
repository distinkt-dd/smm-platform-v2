import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegistrationUserDto } from './registration-user.dto.js';

/**
 * Что здесь проверяем.
 *
 * Правила из декораторов `class-validator` можно проверить без Nest, без HTTP
 * и без базы. Делаем три шага:
 *   1. `plainToInstance` превращает обычный объект в экземпляр RegistrationUserDto;
 *   2. `validate` прогоняет его по декораторам и возвращает массив ошибок;
 *   3. проверяем, по какому полю и какие ошибки нашлись.
 *
 * `whitelist` и отсечение лишних полей — работа ValidationPipe, а не декораторов,
 * поэтому она проверяется в e2e-тесте.
 */

/** Превращает обычный объект в экземпляр DTO (срабатывают `@Transform`). */
function toDto(payload: Record<string, unknown>): RegistrationUserDto {
  return plainToInstance(RegistrationUserDto, payload);
}

/** Прогоняет объект по правилам DTO и возвращает список ошибок. */
async function validatePayload(payload: Record<string, unknown>) {
  return validate(toDto(payload));
}

describe('RegistrationUserDto', () => {
  const VALID = {
    email: 'dmitry@example.com',
    password: 'password123',
  };

  it('принимает корректные email и пароль', async () => {
    await expect(validatePayload(VALID)).resolves.toHaveLength(0);
  });

  it('нормализует email: убирает пробелы по краям и приводит к нижнему регистру', async () => {
    const dto = toDto({ ...VALID, email: '  Dmitry@Example.COM ' });

    expect(dto.email).toBe('dmitry@example.com');
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('отклоняет email без символа @', async () => {
    const errors = await validatePayload({ ...VALID, email: 'dmitry.example.com' });

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('email');
    // Сообщения берутся из декоратора в DTO — их тоже фиксируем,
    // чтобы текст для пользователя не менялся молча.
    expect(errors[0].constraints).toMatchObject({
      isEmail: 'Email должен быть валидным email адресом!',
    });
  });

  it('отклоняет пароль короче 8 символов', async () => {
    const errors = await validatePayload({ ...VALID, password: '1234567' });

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('password');
    expect(errors[0].constraints).toMatchObject({
      minLength: 'Минимальная длина пароля - 8 символов!',
    });
  });

  it('отклоняет пароль длиннее 32 символов', async () => {
    const errors = await validatePayload({
      ...VALID,
      password: 'a'.repeat(33),
    });

    expect(errors[0].property).toBe('password');
    expect(errors[0].constraints).toMatchObject({
      maxLength: 'Максимальная длина пароля - 32 символа!',
    });
  });

  it('отклоняет пароль не-строку', async () => {
    const errors = await validatePayload({ ...VALID, password: 12345678 });

    expect(errors[0].property).toBe('password');
    expect(errors[0].constraints).toHaveProperty('isString');
  });

  it('отклоняет пустое тело: оба поля обязательны', async () => {
    const errors = await validatePayload({});

    expect(errors.map((error) => error.property).sort()).toEqual([
      'email',
      'password',
    ]);
  });
});
