import { NavLink, type NavLinkRenderProps } from 'react-router'
import { Logo } from '../../shared/ui'
import { logoutThunk } from '../../entities/auth'
import { useAppDispatch, useAppSelector } from '../../shared/store'

const navLinkClass = ({ isActive }: NavLinkRenderProps) =>
	isActive
		? 'text-link underline underline-offset-4'
		: 'text-ink-muted hover:text-ink'

export const Header = () => {
	const dispatch = useAppDispatch()
	const user = useAppSelector((state) => state.auth.user)
	const logout = useAppSelector((state) => state.auth.requests.logout)
	return (
		<header className='flex items-center justify-between gap-4 border-b border-line px-6 py-4'>
			<Logo />
			<nav aria-label='Основная навигация' className='flex items-center gap-4'>
				{user ? <button type='button' disabled={logout.status === 'pending'} onClick={() => { void dispatch(logoutThunk()) }}>Выйти</button> : <><NavLink to='/login' className={navLinkClass}>
					Вход
				</NavLink>
				<NavLink to='/register' className={navLinkClass}>
					Регистрация
				</NavLink></>}
			</nav>
			{logout.error && <p role='alert'>Не удалось выйти. Попробуйте ещё раз.</p>}
		</header>
	)
}
