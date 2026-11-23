import { FormContainer } from '../../shared/ui'
import { RegisterForm } from './RegisterForm'

export const RegisterPage = () => {
	return (
		<FormContainer>
			<div className="flex flex-col gap-3">
				<h1 className="font-semibold">Давай знакомиться</h1>
				<p className='text-ink-muted'>
					Создай аккаунт для своей практики.
				</p>
			</div>
			<RegisterForm />
		</FormContainer>
	)
}
