import type { ValidationErrors } from "../../../shared/lib/validate";

export type ProfileField = "displayName" | "specialization" | "about";

/**
 * Тексты повторяют сообщения `ProfileDto` на backend: форма проверяет данные
 * локально теми же словами, а разбор ответа `400` ищет поля по этим же
 * строкам. Если текст в DTO изменится, здесь нужно изменить и его.
 */
export const profileMessages = {
	displayNameMin: "Имя пользователя не должно быть меньше 3 символов",
	displayNameMax: "Имя пользователя не должно превышать 50 символов",
	displayNameType: "Имя пользователя должно быть строкой",
	specializationMin: "Специализация не должно быть меньше 3 символов",
	specializationMax: "Специализация не должна превышать 50 символов",
	specializationType: "Специализация должна быть строкой",
	aboutMin: "О себе не должно быть меньше 10 символов",
	aboutMax: "О себе не должно превышать 250 символов",
	aboutType: "О себе должно быть строкой",
} as const;

const fieldByMessage: Record<string, ProfileField> = {
	[profileMessages.displayNameMin]: "displayName",
	[profileMessages.displayNameMax]: "displayName",
	[profileMessages.displayNameType]: "displayName",
	[profileMessages.specializationMin]: "specialization",
	[profileMessages.specializationMax]: "specialization",
	[profileMessages.specializationType]: "specialization",
	[profileMessages.aboutMin]: "about",
	[profileMessages.aboutMax]: "about",
	[profileMessages.aboutType]: "about",
};

/**
 * `ValidationPipe` на backend отдаёт `message` без имён полей и с суффиксом
 * `!` у части сообщений, поэтому сначала пробуем точное совпадение, а затем
 * сравнение без завершающих знаков. Распознанные сообщения раскладываем по
 * полям формы, нераспознанные складываем в ключ `""` — форма покажет их как
 * общее сообщение. `null` означает, что ни одно сообщение не распознано:
 * тогда исходная HTTP-ошибка остаётся как есть.
 */
const normalize = (message: string) => message.trim().replace(/[!.\s]+$/u, "");

const fieldByNormalizedMessage = new Map<string, ProfileField>(
	Object.entries(fieldByMessage).map(([message, field]) => [
		normalize(message),
		field,
	]),
);

export function toProfileFieldErrors(
	messages: string[],
): ValidationErrors | null {
	const fields: ValidationErrors = {};
	let matched = false;

	for (const message of messages) {
		const field = fieldByMessage[message] ?? fieldByNormalizedMessage.get(normalize(message));
		if (field === undefined) {
			fields[""] = fields[""] ? `${fields[""]}\n${message}` : message;
			continue;
		}
		fields[field] = message;
		matched = true;
	}

	return matched ? fields : null;
}
