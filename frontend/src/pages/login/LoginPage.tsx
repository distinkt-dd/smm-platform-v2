import { FormContainer } from '../../shared/ui'
import { LoginForm } from './LoginForm'

export const LoginPage = () => {
	return (
		<FormContainer>
			<div className='flex flex-col gap-3'>
				<h1>С возвращением</h1>
				<p className='text-ink-muted'>
					Продолжим создавать ваш контент.
				</p>
			</div>
			<LoginForm />
		</FormContainer>
	)
}
