import { NavLink, type NavLinkRenderProps } from 'react-router'
import { Logo } from '../../shared/ui'

const navLinkClass = ({ isActive }: NavLinkRenderProps) =>
	isActive
		? 'text-link underline underline-offset-4'
		: 'text-ink-muted hover:text-ink'

export const Header = () => {
	return (
		<header className='flex items-center justify-between gap-4 border-b border-line px-6 py-4'>
			<Logo />
			<nav aria-label='Основная навигация' className='flex items-center gap-4'>
				<NavLink to='/login' className={navLinkClass}>
					Вход
				</NavLink>
				<NavLink to='/register' className={navLinkClass}>
					Регистрация
				</NavLink>
			</nav>
		</header>
	)
}
