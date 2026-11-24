import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { Profile, ProfileRequest } from '../api/types'
import {
	loadProfileThunk,
	saveProfileThunk,
	type ProfileRequestError,
} from './thunks/profile-thunks'

type RequestState = {
	status: 'idle' | 'pending' | 'fulfilled' | 'rejected'
	error: ProfileRequestError | null
	requestId: string | null
}
const initialRequest = (): RequestState => ({
	status: 'idle',
	error: null,
	requestId: null,
})

/**
 * Несохранённые значения формы. Хранятся вместе с владельцем: после входа
 * под другим аккаунтом форма не подставит чужие данные.
 */
export type ProfileDraft = {
	ownerId: string
	values: ProfileRequest
}

export const createInitialProfileState = () => ({
	profile: null as Profile | null,
	/** `404` на чтение: профиль ещё не создан, форма показывает подсказку. */
	notCreated: false,
	draft: null as ProfileDraft | null,
	requests: {
		load: initialRequest(),
		save: initialRequest(),
	},
})

const profileSlice = createSlice({
	name: 'profile',
	initialState: createInitialProfileState(),
	reducers: {
		// Профиль одного пользователя не должен переживать выход из аккаунта.
		// Черновик остаётся: он нужен после истечения сессии, а при выходе его
		// очищает отдельное действие.
		resetProfile: state => ({ ...createInitialProfileState(), draft: state.draft }),
		rememberProfileDraft(state, action: PayloadAction<ProfileDraft>) {
			state.draft = action.payload
		},
		clearProfileDraft(state) {
			state.draft = null
		},
		clearProfileFeedback(state, action: PayloadAction<{ field?: string }>) {
			const request = state.requests.save
			if (request.error?.kind === 'validation' && action.payload.field) {
				delete request.error.fields[action.payload.field]
				// Общее сообщение сервера относится к прошлой отправке.
				delete request.error.fields['']
				if (Object.keys(request.error.fields).length === 0) request.error = null
			} else request.error = null
			if (request.status !== 'pending') request.status = 'idle'
		},
	},
	extraReducers: builder => {
		builder
			.addCase(loadProfileThunk.pending, (state, action) => {
				state.requests.load = {
					status: 'pending',
					error: null,
					requestId: action.meta.requestId,
				}
			})
			.addCase(loadProfileThunk.fulfilled, (state, action) => {
				if (state.requests.load.requestId !== action.meta.requestId) return
				state.profile = action.payload
				state.notCreated = action.payload === null
				state.requests.load = {
					status: 'fulfilled',
					error: null,
					requestId: null,
				}
			})
			.addCase(loadProfileThunk.rejected, (state, action) => {
				if (state.requests.load.requestId !== action.meta.requestId) return
				state.requests.load = {
					status: 'rejected',
					error: action.payload ?? {
						kind: 'unknown',
						message: action.error.message ?? 'Неизвестная ошибка',
					},
					requestId: null,
				}
			})
			.addCase(saveProfileThunk.pending, (state, action) => {
				state.requests.save = {
					status: 'pending',
					error: null,
					requestId: action.meta.requestId,
				}
			})
			.addCase(saveProfileThunk.fulfilled, (state, action) => {
				if (state.requests.save.requestId !== action.meta.requestId) return
				state.profile = action.payload
				state.notCreated = false
				state.draft = null
				state.requests.save = {
					status: 'fulfilled',
					error: null,
					requestId: null,
				}
			})
			.addCase(saveProfileThunk.rejected, (state, action) => {
				if (state.requests.save.requestId !== action.meta.requestId) return
				// Проверка данных до запроса не теряет значения формы — черновик
				// для неё не нужен и только показывал бы подсказку о восстановлении.
				if (action.payload?.kind === 'validation') state.draft = null
				state.requests.save = {
					status: 'rejected',
					error: action.payload ?? {
						kind: 'unknown',
						message: action.error.message ?? 'Неизвестная ошибка',
					},
					requestId: null,
				}
			})
	},
})

export const {
	clearProfileDraft,
	clearProfileFeedback,
	rememberProfileDraft,
	resetProfile,
} = profileSlice.actions
export const profileReducer = profileSlice.reducer
