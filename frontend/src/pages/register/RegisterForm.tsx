import { useState } from 'react'
import type { SubmitEvent } from 'react'
import { Link } from 'react-router'
import { Button, Input } from '../../shared/ui'

export const RegisterForm = () => {
	const [notice, setNotice] = useState(false)

	const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
		event.preventDefault()
		setNotice(true)
	}

	return (
		<form className='flex flex-col gap-6' onSubmit={handleSubmit}>
			<Input label='Как вас зовут?' name='name' type='text' autoComplete='name' placeholder='Анна Ковалёва' maxLength={264} required />
			<Input label='Электронная почта' name='email' type='email' autoComplete='email' placeholder='anna@example.ru' maxLength={64} required />
			<Input label='Пароль' name='password' type='password' autoComplete='new-password' placeholder='От 8 до 32 символов' minLength={8} maxLength={32} required />
			<Button type='submit' className='w-full'>Создать аккаунт</Button>
			{notice && <p role='status' className='text-caption text-ink-muted'>Регистрация пока не подключена. Попробуйте позже.</p>}
			<p className='text-center text-caption text-ink-muted'>
				Уже есть аккаунт?{' '}
				<Link className='font-semibold text-link hover:underline' to='/login'>Войти</Link>
			</p>
		</form>
	)
}
