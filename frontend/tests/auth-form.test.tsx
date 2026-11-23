// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { Provider } from 'react-redux'
import { createAppStore } from '../src/app/store'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LoginForm } from '../src/pages/login/LoginForm'
import { RegisterForm } from '../src/pages/register/RegisterForm'

afterEach(() => {
    cleanup()
    localStorage.clear()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
})

describe.each([
    ['login', LoginForm, 'Войти', '/auth/login'],
    ['register', RegisterForm, 'Создать аккаунт', '/auth/register'],
] as const)('%s form', (_mode, Form, button, path) => {
    it('shows field errors without a request and clears the edited field', async () => {
        const fetchMock = vi.fn()
        vi.stubGlobal('fetch', fetchMock)
        render(<Provider store={createAppStore({ restoreSession: false })}><MemoryRouter><Form /></MemoryRouter></Provider>)
        fireEvent.click(screen.getByRole('button', { name: button }))
        const email = screen.getByLabelText('Электронная почта')
        const password = screen.getByLabelText('Пароль')
        await waitFor(() => expect(email.getAttribute('aria-invalid')).toBe('true'))
        expect(password.getAttribute('aria-invalid')).toBe('true')
        expect(email.getAttribute('aria-describedby')).toBeTruthy()
        expect(fetchMock).not.toHaveBeenCalled()
        fireEvent.change(email, { target: { value: 'test@example.com' } })
        expect(email.hasAttribute('aria-invalid')).toBe(false)
        expect(password.getAttribute('aria-invalid')).toBe('true')
    })

    it('shows server errors for the form and allows a successful retry', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:3000')
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(Response.json({ message: 'Ошибка сервера' }, { status: 409 }))
            .mockResolvedValueOnce(Response.json(_mode === 'login' ? { user: { id: '1' } } : { id: '1' }))
        vi.stubGlobal('fetch', fetchMock)
        render(<Provider store={createAppStore({ restoreSession: false })}><MemoryRouter><Form /></MemoryRouter></Provider>)
        fireEvent.change(screen.getByLabelText('Электронная почта'), { target: { value: 'test@example.com' } })
        fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: 'password123' } })
        fireEvent.click(screen.getByRole('button', { name: button }))
        expect((await screen.findByRole('alert')).textContent).toBe('Ошибка сервера')
        expect(screen.getByRole('alert').closest('form')?.getAttribute('aria-invalid')).toBe('true')
        expect(screen.getByLabelText('Электронная почта').hasAttribute('aria-invalid')).toBe(false)
        fireEvent.click(screen.getByRole('button', { name: button }))
        await screen.findByRole('status')
        expect(screen.queryByRole('alert')).toBeNull()
        expect(fetchMock).toHaveBeenCalledTimes(2)
        expect(fetchMock.mock.calls[0][0]).toBe(`http://localhost:3000${path}`)
    })
})
