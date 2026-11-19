import { Route, Routes } from 'react-router'
import {
	AuthLayout,
	HomePage,
	LoginPage,
	MainLayout,
	NotFoundPage,
	RegisterPage,
} from './pages'

function App() {
	return (
		<Routes>
			<Route element={<MainLayout />}>
				<Route index element={<HomePage />} />
				<Route element={<AuthLayout />}>
					<Route path='/login' element={<LoginPage />} />
					<Route path='/register' element={<RegisterPage />} />
				</Route>
				<Route path='*' element={<NotFoundPage />} />
			</Route>
		</Routes>
	)
}

export default App
