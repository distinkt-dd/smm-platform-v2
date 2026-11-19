import { Outlet } from 'react-router'
import { Header } from '../../../widgets/header'

export const MainLayout = () => {
	return (
		<div className='flex min-h-screen flex-col'>
			<Header />
			<main className='flex-1 px-6 py-10'>
				<Outlet />
			</main>
		</div>
	)
}
