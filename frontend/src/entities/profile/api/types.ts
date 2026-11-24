/** Подтверждённый факт о мастере из ответа backend. */
export type ConfirmedFact = {
	id: string
	text: string
}

/** Услуга мастера из ответа backend. */
export type Service = {
	id: string
	title: string
	description: string | null
}

export type Profile = {
	id: string
	displayName: string
	specialization: string
	about: string | null
	confirmedFacts: ConfirmedFact[]
	services: Service[]
}

/** Тело `PUT /me/profile`: `about` необязателен. */
export type ProfileRequest = {
	displayName: string
	specialization: string
	about?: string
}

export type GetProfileResponse = Profile
export type SaveProfileResponse = Profile
