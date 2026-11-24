import isLength from 'validator/lib/isLength'
import { z } from 'zod'

// Повторяет ограничения ProfileDto: сообщения совпадают с backend,
// чтобы форма показывала одинаковый текст при локальной и серверной проверке.
export const profileSchema = z.object({
	displayName: z
		.string()
		.trim()
		.refine(
			value => isLength(value, { min: 3 }),
			'Имя пользователя не должно быть меньше 3 символов',
		)
		.refine(
			value => isLength(value, { max: 50 }),
			'Имя пользователя не должно превышать 50 символов',
		),
	specialization: z
		.string()
		.trim()
		.refine(
			value => isLength(value, { min: 3 }),
			'Специализация не должно быть меньше 3 символов',
		)
		.refine(
			value => isLength(value, { max: 50 }),
			'Специализация не должна превышать 50 символов',
		),
	about: z
		.string()
		.trim()
		.refine(
			value => value === '' || isLength(value, { min: 10 }),
			'О себе не должно быть меньше 10 символов',
		)
		.refine(
			value => isLength(value, { max: 250 }),
			'О себе не должно превышать 250 символов',
		)
		.optional(),
})
