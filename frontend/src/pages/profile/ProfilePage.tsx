import { useEffect, useRef, useState } from 'react'
import { clearAuthFeedback, logoutThunk } from '../../entities/auth'
import { loadProfileThunk } from '../../entities/profile'
import { useAppDispatch, useAppSelector } from '../../shared/store'
import { Button, FormContainer } from '../../shared/ui'
import { ConfirmationDialog } from '../../shared/ui/confirmation-dialog'
import { ProfileForm, ServicesList, FactsList } from '../../widgets/profile'

export const ProfilePage = () => {
	const dispatch = useAppDispatch()
	const profile = useAppSelector(state => state.profile.profile)
	const load = useAppSelector(state => state.profile.requests.load)
	const started = useRef(false)
	const [confirmLogout, setConfirmLogout] = useState(false)
	const logout = useAppSelector(state => state.auth.requests.logout)

	useEffect(() => {
		// StrictMode запускает эффект дважды: повторный запрос не нужен.
		if (started.current) return
		started.current = true
		void dispatch(loadProfileThunk())
	}, [dispatch])

	const loading = load.status === 'pending' && !profile
	const loadError = load.status === 'rejected' ? load.error : null

	return (
		<div className='grid w-full grid-cols-1 items-start gap-12 phone:grid-cols-2 xl:grid-cols-3'>
			<FormContainer>
				<div className='flex flex-col gap-3'>
					<h1>Профиль мастера</h1>
					<p className='text-ink-muted'>
						Коротко о вас и вашей практике — это увидят клиенты.
					</p>
				</div>
				{loading && (
					<p role='status' className='text-caption text-ink-muted'>
						Загружаем профиль…
					</p>
				)}
				{loadError && (
					<div role='alert' className='flex flex-col gap-3'>
						<p>{loadError.message}</p>
						<Button
							onClick={() => {
								void dispatch(loadProfileThunk())
							}}
						>
							Повторить
						</Button>
					</div>
				)}
				{!loading && <ProfileForm key={profile?.id ?? 'new'} profile={profile} />}
				<button type='button' className='min-h-12 self-start rounded-control border border-line px-5 font-semibold' onClick={() => {
					dispatch(clearAuthFeedback({ operation: 'logout' }))
					setConfirmLogout(true)
				}}>Выйти</button>
			</FormContainer>
			{confirmLogout && <ConfirmationDialog title='Выйти из аккаунта?' description='Для продолжения работы потребуется снова войти.' confirmLabel='Выйти' pending={logout.status === 'pending'} error={logout.error ? 'Не удалось выйти. Попробуйте ещё раз.' : undefined} onCancel={() => setConfirmLogout(false)} onConfirm={() => { void dispatch(logoutThunk()) }} />}
			{(profile || load.status === 'fulfilled') && (
				<>
					<ServicesList services={profile?.services ?? []} profileId={profile?.id} />
					<FactsList key={profile?.id ?? "new"} facts={profile?.confirmedFacts ?? []} profileId={profile?.id} />
				</>
			)}
		</div>
	)
}
