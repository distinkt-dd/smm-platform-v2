import { Link } from 'react-router'

export const Logo = () => {
	return (
		<>
			<Link to={'/'} className='flex items-center max-w-max gap-1'>
				<img className='w-12' src='/logo.svg' alt='Логотип' />
				<h2 className='text-lg'>SMM в кармане</h2>
			</Link>
		</>
	)
}
