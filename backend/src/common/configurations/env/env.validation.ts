import { z } from 'zod';

/**
 * Схема окружения backend. Проверяется один раз в `ConfigModule.forRoot`,
 * поэтому отдельные проверки переменных в точке входа не нужны.
 * Значения из `.env` и `process.env` передаются в схему уже объединёнными,
 * а `@nestjs/config` сам добавляет имя переменной к сообщению об ошибке.
 */
const requiredMessage =
  'is required (copy backend/.env.example to backend/.env and fill in the values)';

const requiredString = () =>
  z.string({ error: requiredMessage }).trim().min(1, requiredMessage);

const jwtSecretMessage =
  'is required and must be at least 16 characters (see backend/.env.example)';

export const envSchema = z.object({
  DATABASE_URL: requiredString().pipe(
    z.url({
      protocol: /^postgres(ql)?$/,
      error:
        'must be a valid postgresql:// URL; encode special characters in the password',
    }),
  ),
  JWT_SECRET: z
    .string({ error: jwtSecretMessage })
    .trim()
    .min(16, jwtSecretMessage),
  PORT: z.coerce
    .number({ error: 'must be a number' })
    .int('must be an integer')
    .min(1, 'must be between 1 and 65535')
    .max(65535, 'must be between 1 and 65535')
    .default(3000),
});

export type Env = z.infer<typeof envSchema>;
