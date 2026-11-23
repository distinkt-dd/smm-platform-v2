import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { Button, Input } from '../../shared/ui'

export const LoginForm = () => {
	const [notice, setNotice] = useState(false)

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setNotice(true)
	}

	return (
		<form className='flex flex-col gap-6' onSubmit={handleSubmit}>
			<Input label='Электронная почта' name='email' type='email' autoComplete='email' placeholder='anna@example.ru' required />
			<Input label='Пароль' name='password' type='password' autoComplete='current-password' placeholder='Введите пароль' required />
			<Button type='submit' className='w-full'>Войти</Button>
			{notice && <p role='status' className='text-caption text-ink-muted'>Вход пока не подключён. Попробуйте позже.</p>}
			<p className='text-center text-caption text-ink-muted'>
				Впервые здесь?{' '}
				<Link className='font-semibold text-link hover:underline' to='/register'>Зарегистрироваться</Link>
			</p>
		</form>
	)
}
