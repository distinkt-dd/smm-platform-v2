// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import { Provider } from 'react-redux'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAppStore } from '../src/app/store'
import { ProfilePage } from '../src/pages/profile/ProfilePage'

afterEach(() => {
	cleanup()
	vi.unstubAllGlobals()
	vi.unstubAllEnvs()
})

function renderProfile(response: Response) {
	vi.stubEnv('VITE_API_URL', 'http://localhost:3000')
	vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))
	render(
		<Provider store={createAppStore({ restoreSession: false })}>
			<ProfilePage />
		</Provider>,
	)
}

describe('Список услуг в профиле', () => {
	it('показывает услуги из ответа профиля с необязательным описанием', async () => {
		renderProfile(Response.json({
			id: 'profile-1',
			displayName: 'Анна',
			specialization: 'Стилист',
			about: null,
			confirmedFacts: [],
			services: [
				{ id: '1', title: 'Стрижка', description: 'Подбор формы' },
				{ id: '2', title: 'Укладка', description: null },
			],
		}))

		const list = await screen.findByRole('list')
		const items = within(list).getAllByRole('listitem')
		expect(items).toHaveLength(2)
		expect(within(items[0]).getByText('Стрижка')).toBeTruthy()
		expect(within(items[0]).getByText('Подбор формы')).toBeTruthy()
		expect(within(items[1]).getByText('Укладка')).toBeTruthy()
		expect(within(items[1]).queryByText('null')).toBeNull()
	})

	it('при 404 показывает подсказку о создании профиля и пустой список', async () => {
		renderProfile(Response.json({ message: 'Профиль не найден!' }, { status: 404 }))

		expect(await screen.findByText(/Профиль ещё не создан/)).toBeTruthy()
		expect(screen.getByText(/Здесь появятся ваши услуги/)).toBeTruthy()
	})

	it('при ошибке загрузки не выдаёт её за пустой список', async () => {
		renderProfile(Response.json({ message: 'Ошибка сервера' }, { status: 500 }))

		expect(await screen.findByRole('alert')).toBeTruthy()
		expect(screen.queryByText(/Здесь появятся ваши услуги/)).toBeNull()
	})
})
