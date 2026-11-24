// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Provider } from 'react-redux'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAppStore } from '../src/app/store'
import { createServiceThunk, loadProfileThunk, resetProfile } from '../src/entities/profile'
import { serviceSchema } from '../src/entities/services'
import { ProfilePage } from '../src/pages/profile/ProfilePage'

const profile = { id: 'profile-1', displayName: 'Анна', specialization: 'Стилист', about: null, confirmedFacts: [], services: [] }

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.unstubAllEnvs() })

function setup(response: Response) {
	vi.stubEnv('VITE_API_URL', 'http://localhost:3000')
	const fetchMock = vi.fn().mockResolvedValueOnce(Response.json(profile)).mockResolvedValueOnce(response)
	vi.stubGlobal('fetch', fetchMock)
	const store = createAppStore({ restoreSession: false })
	render(<Provider store={store}><ProfilePage /></Provider>)
	return { fetchMock, store }
}

describe('Создание услуги', () => {
	it('проверяет границы длины по правилам backend', () => {
		expect(serviceSchema.safeParse({ title: 'ab' }).success).toBe(false)
		expect(serviceSchema.safeParse({ title: 'a'.repeat(51) }).success).toBe(false)
		expect(serviceSchema.safeParse({ title: 'abc', description: 'a'.repeat(251) }).success).toBe(false)
		expect(serviceSchema.safeParse({ title: 'a'.repeat(50), description: 'a'.repeat(250) }).success).toBe(true)
		expect(serviceSchema.safeParse({ title: 'abc', description: null }).success).toBe(true)
	})

	it('добавляет услугу без описания в список и очищает форму', async () => {
		const { fetchMock } = setup(Response.json({ id: 's1', title: 'Стрижка', description: null }, { status: 201 }))
		const title = await screen.findByLabelText('Название услуги')
		fireEvent.change(title, { target: { value: 'Стрижка' } })
		fireEvent.click(screen.getByRole('button', { name: 'Добавить услугу' }))
		const list = await screen.findByRole('list')
		expect(within(list).getByText('Стрижка')).toBeTruthy()
		expect((title as HTMLInputElement).value).toBe('')
		expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ title: 'Стрижка', description: null })
	})

	it('показывает локальную ошибку рядом с полем без запроса', async () => {
		const { fetchMock } = setup(Response.json({}))
		await screen.findByLabelText('Название услуги')
		fireEvent.click(screen.getByRole('button', { name: 'Добавить услугу' }))
		expect(await screen.findByText('Название услуги не должно быть меньше 3 символов!')).toBeTruthy()
		expect(screen.getByLabelText('Название услуги').getAttribute('aria-invalid')).toBe('true')
		expect(fetchMock).toHaveBeenCalledTimes(1)
	})

	it('показывает серверные ошибки полей и неизвестные сообщения', async () => {
		setup(Response.json({ message: ['Описание услуги не должно превышать 250 символов!', 'Другая ошибка'] }, { status: 400 }))
		fireEvent.change(await screen.findByLabelText('Название услуги'), { target: { value: 'Стрижка' } })
		fireEvent.click(screen.getByRole('button', { name: 'Добавить услугу' }))
		expect(await screen.findByText('Описание услуги не должно превышать 250 символов!')).toBeTruthy()
		expect(screen.getByRole('alert').textContent).toBe('Другая ошибка')
	})

	it('сохраняет введённые данные и список при ошибке 404', async () => {
		setup(Response.json({ message: 'Профиль не найден!' }, { status: 404 }))
		const title = await screen.findByLabelText('Название услуги') as HTMLInputElement
		fireEvent.change(title, { target: { value: 'Стрижка' } })
		fireEvent.click(screen.getByRole('button', { name: 'Добавить услугу' }))
		expect((await screen.findByRole('alert')).textContent).toBe('Профиль не найден!')
		expect(title.value).toBe('Стрижка')
		expect(screen.getByText(/Здесь появятся ваши услуги/)).toBeTruthy()
	})

	it('игнорирует запоздалый ответ после сброса профиля', async () => {
		vi.stubEnv('VITE_API_URL', 'http://localhost:3000')
		let resolve!: (response: Response) => void
		vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json(profile)).mockImplementationOnce(() => new Promise<Response>(r => { resolve = r })))
		const store = createAppStore({ restoreSession: false })
		await store.dispatch(loadProfileThunk())
		const request = store.dispatch(createServiceThunk({ profileId: profile.id, values: { title: 'Стрижка' } }))
		await waitFor(() => expect(resolve).toBeDefined())
		store.dispatch(resetProfile())
		resolve(Response.json({ id: 's1', title: 'Стрижка', description: null }))
		await request
		expect(store.getState().profile.profile).toBeNull()
	})
})
