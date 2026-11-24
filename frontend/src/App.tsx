import { useEffect, useRef } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router'
import { meThunk } from './entities/auth'
import {
	AuthLayout,
	HomePage,
	LoginPage,
	MainLayout,
	NotFoundPage,
	ProfilePage,
	RegisterPage,
} from './pages'
import { useAppDispatch, useAppSelector } from './shared/store'
import { ProtectedRoute } from './shared/ui/protected-route/ProtectedRoute'

function App() {
	const dispatch = useAppDispatch()
	const { user, requests, sessionExpired } = useAppSelector(state => state.auth)
	const navigate = useNavigate()
	const { pathname } = useLocation()
	const handledExpiration = useRef(false)
	useEffect(() => {
		if (
			sessionExpired &&
			!handledExpiration.current &&
			pathname !== '/register' &&
			pathname !== '/login'
		)
			navigate('/login', { replace: true })
		handledExpiration.current = sessionExpired
	}, [sessionExpired, navigate, pathname])
	const sessionError = requests.me.error
	return (
		<Routes>
			<Route element={<MainLayout />}>
				<Route
					element={
						<ProtectedRoute
							authenticated={Boolean(user)}
							loading={requests.me.status === 'pending' && !user}
							unavailable={
								!user &&
								sessionError !== null &&
								!(sessionError.kind === 'http' && sessionError.status === 401)
							}
							retry={() => {
								void dispatch(meThunk())
							}}
						/>
					}
				>
					<Route index element={<HomePage />} />
					<Route path='/profile' element={<ProfilePage />} />
				</Route>
				<Route element={<AuthLayout />}>
					<Route
						path='/login'
						element={user ? <Navigate to='/' replace /> : <LoginPage />}
					/>
					<Route path='/register' element={<RegisterPage />} />
				</Route>
				<Route path='*' element={<NotFoundPage />} />
			</Route>
		</Routes>
	)
}

export default App
