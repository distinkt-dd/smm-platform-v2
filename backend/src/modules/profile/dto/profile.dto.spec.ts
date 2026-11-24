import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ProfileDto } from './profile.dto.js';

/**
 * Проверяем правила `ProfileDto` без Nest, HTTP и базы: `plainToInstance`
 * применяет `@Transform`, `validate` — декораторы `class-validator`.
 *
 * Отдельное внимание — `about`: пустая строка и `null` должны проходить,
 * потому что это явная очистка описания, а не ошибка данных.
 */

const VALID = {
  displayName: 'Анна Петрова',
  specialization: 'Бьюти-мастер',
  about: 'Делаю аккуратный макияж',
};

function toDto(payload: Record<string, unknown>): ProfileDto {
  return plainToInstance(ProfileDto, payload);
}

async function validatePayload(payload: Record<string, unknown>) {
  return validate(toDto(payload));
}

describe('ProfileDto', () => {
  it('принимает корректные поля', async () => {
    await expect(validatePayload(VALID)).resolves.toHaveLength(0);
  });

  it('обрезает пробелы вокруг описания', async () => {
    const dto = toDto({ ...VALID, about: '  Делаю аккуратный макияж  ' });

    expect(dto.about).toBe('Делаю аккуратный макияж');
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('принимает пустое описание как очистку', async () => {
    await expect(validatePayload({ ...VALID, about: '' })).resolves.toHaveLength(0);
    await expect(validatePayload({ ...VALID, about: '   ' })).resolves.toHaveLength(0);
    await expect(validatePayload({ ...VALID, about: null })).resolves.toHaveLength(0);
  });

  it('принимает профиль без описания', async () => {
    const { about, ...withoutAbout } = VALID;

    expect(about).toBeDefined();
    await expect(validatePayload(withoutAbout)).resolves.toHaveLength(0);
  });

  it('отклоняет слишком короткое описание', async () => {
    const errors = await validatePayload({ ...VALID, about: 'коротко' });

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('about');
    expect(errors[0].constraints).toMatchObject({
      minLength: 'О себе не должно быть меньше 10 символов',
    });
  });

  it('отклоняет слишком длинное описание', async () => {
    const errors = await validatePayload({ ...VALID, about: 'я'.repeat(251) });

    expect(errors[0].property).toBe('about');
    expect(errors[0].constraints).toMatchObject({
      maxLength: 'О себе не должно превышать 250 символов',
    });
  });

  it('отклоняет описание не-строку', async () => {
    const errors = await validatePayload({ ...VALID, about: 123 });

    expect(errors[0].property).toBe('about');
    expect(errors[0].constraints).toHaveProperty('isString');
  });

  it('отклоняет пустое тело: имя и специализация обязательны', async () => {
    const errors = await validatePayload({});

    expect(errors.map((error) => error.property).sort()).toEqual([
      'displayName',
      'specialization',
    ]);
  });
});
