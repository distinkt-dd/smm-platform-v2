import { Outlet } from 'react-router'

export const AuthLayout = () => {
	return (
		<div className='mx-auto w-full max-w-preview'>
			<Outlet />
		</div>
	)
}
