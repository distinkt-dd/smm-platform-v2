import {
	apiRequest,
	requireResponse,
	type JsonValue,
} from '../../../shared/api/api'
import { PROFILE } from '../../../shared/api/endpoints'
import { validate, ValidationError } from '../../../shared/lib/validate'
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
 * создаёт профиль. Пустое поле `about` не отправляем: `PUT` без него
 * и создаёт профиль без описания.
 */
export async function saveProfile(
	data: ProfileRequest,
): Promise<SaveProfileResponse> {
	const result = validate(profileSchema, data)
	if (!result.success) throw new ValidationError(result.errors)
	const body: JsonValue = {
		displayName: result.data.displayName,
		specialization: result.data.specialization,
	}
	if (result.data.about) body.about = result.data.about
	return requireResponse(
		apiRequest<SaveProfileResponse>(PROFILE, {
			method: 'PUT',
			body,
		}),
	)
}
