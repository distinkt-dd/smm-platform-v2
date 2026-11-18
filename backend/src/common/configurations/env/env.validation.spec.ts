import { envSchema } from './env.validation.js';

const validEnv = {
  DATABASE_URL:
    'postgresql://postgres:password@localhost:5433/db_name?schema=public',
  JWT_SECRET: 'test-jwt-secret-value',
};

const requiredMessage =
  'is required (copy backend/.env.example to backend/.env and fill in the values)';
const jwtSecretMessage =
  'is required and must be at least 16 characters (see backend/.env.example)';

describe('envSchema', () => {
  it('принимает переменные из backend/.env.example и приводит PORT к числу', () => {
    const result = envSchema.safeParse({ ...validEnv, PORT: '3000' });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ ...validEnv, PORT: 3000 });
  });

  it('подставляет PORT по умолчанию, если переменная не задана', () => {
    const result = envSchema.safeParse(validEnv);

    expect(result.success).toBe(true);
    expect(result.data?.PORT).toBe(3000);
  });

  it('сообщает обо всех отсутствующих переменных сразу', () => {
    const result = envSchema.safeParse({});

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path.join('.'))).toEqual([
      'DATABASE_URL',
      'JWT_SECRET',
    ]);
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      requiredMessage,
      jwtSecretMessage,
    ]);
  });

  it.each(['', '   '])('считает пустое значение %j отсутствующим', (value) => {
    const result = envSchema.safeParse({
      ...validEnv,
      DATABASE_URL: value,
      JWT_SECRET: value,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      requiredMessage,
      jwtSecretMessage,
    ]);
  });

  it('обрезает пробелы вокруг значений', () => {
    const result = envSchema.safeParse({
      DATABASE_URL: `  ${validEnv.DATABASE_URL}  `,
      JWT_SECRET: `  ${validEnv.JWT_SECRET}  `,
    });

    expect(result.success).toBe(true);
    expect(result.data?.DATABASE_URL).toBe(validEnv.DATABASE_URL);
    expect(result.data?.JWT_SECRET).toBe(validEnv.JWT_SECRET);
  });

  it('отклоняет DATABASE_URL не для postgresql', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      DATABASE_URL: 'mysql://localhost/db_name',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain('postgresql://');
  });

  it('требует JWT_SECRET не короче 16 символов', () => {
    const result = envSchema.safeParse({ ...validEnv, JWT_SECRET: 'short' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(jwtSecretMessage);
  });

  it.each(['abc', '0', '70000'])('отклоняет некорректный PORT %j', (value) => {
    const result = envSchema.safeParse({ ...validEnv, PORT: value });

    expect(result.success).toBe(false);
  });
});
