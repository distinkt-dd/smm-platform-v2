import {
	apiRequest,
	ApiHttpError,
	requireResponse,
	type JsonValue,
} from '../../../shared/api/api'
import { PROFILE } from '../../../shared/api/endpoints'
import { validate, ValidationError } from '../../../shared/lib/validate'
import { toProfileFieldErrors } from './profile-messages'
import { profileSchema } from './profile-schema'
import type {
	GetProfileResponse,
	ProfileRequest,
	SaveProfileResponse,
} from './types'

/**
 * `GET /me/profile`. Ответ `404` означает, что профиль ещё не создан:
 * backend сообщает об этом ошибкой `ApiHttpError` со статусом 404.
 */
export function getProfile(): Promise<GetProfileResponse> {
	return requireResponse(
		apiRequest<GetProfileResponse>(PROFILE, {
			method: 'GET',
		}),
	)
}

/**
 * `PUT /me/profile`. Backend сохраняет через `upsert`, поэтому первый вызов
 * создаёт профиль. `about` отправляем всегда: пустая строка очищает описание,
 * а отсутствие поля backend оставил бы без изменений.
 */
export async function saveProfile(
	data: ProfileRequest,
): Promise<SaveProfileResponse> {
	const result = validate(profileSchema, data)
	if (!result.success) throw new ValidationError(result.errors)
	const body: JsonValue = {
		displayName: result.data.displayName,
		specialization: result.data.specialization,
		about: result.data.about ?? '',
	}
	try {
		return await requireResponse(
			apiRequest<SaveProfileResponse>(PROFILE, {
				method: 'PUT',
				body,
			}),
		)
	} catch (error) {
		// `ValidationPipe` перечисляет сообщения без имён полей. Известные тексты
		// раскладываем по полям, чтобы ошибка `400` была рядом с ними; иначе
		// оставляем HTTP-ошибку с общим сообщением.
		if (error instanceof ApiHttpError && error.status === 400) {
			const fields = toProfileFieldErrors(error.messages)
			if (fields) throw new ValidationError(fields)
		}
		throw error
	}
}
