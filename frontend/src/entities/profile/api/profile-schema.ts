import isLength from 'validator/lib/isLength'
import { z } from 'zod'
import { profileMessages } from './profile-messages'

// Повторяет ограничения ProfileDto: сообщения берутся из одного места
// с разбором серверных ошибок, чтобы форма показывала одинаковый текст
// при локальной и серверной проверке.
export const profileSchema = z.object({
	displayName: z
		.string()
		.trim()
		.refine(
			value => isLength(value, { min: 3 }),
			profileMessages.displayNameMin,
		)
		.refine(
			value => isLength(value, { max: 50 }),
			profileMessages.displayNameMax,
		),
	specialization: z
		.string()
		.trim()
		.refine(
			value => isLength(value, { min: 3 }),
			profileMessages.specializationMin,
		)
		.refine(
			value => isLength(value, { max: 50 }),
			profileMessages.specializationMax,
		),
	about: z
		.string()
		.trim()
		// Пустое описание — не ошибка: так форма очищает описание.
		.refine(
			value => value === '' || isLength(value, { min: 10 }),
			profileMessages.aboutMin,
		)
		.refine(
			value => isLength(value, { max: 250 }),
			profileMessages.aboutMax,
		)
		.optional(),
})
