import { useEffect, useRef } from 'react'
import { loadProfileThunk } from '../../entities/profile'
import { useAppDispatch, useAppSelector } from '../../shared/store'
import { Button, FormContainer } from '../../shared/ui'
import { ProfileForm } from './ProfileForm'

export const ProfilePage = () => {
	const dispatch = useAppDispatch()
	const profile = useAppSelector(state => state.profile.profile)
	const load = useAppSelector(state => state.profile.requests.load)
	const started = useRef(false)

	useEffect(() => {
		// StrictMode запускает эффект дважды: повторный запрос не нужен.
		if (started.current) return
		started.current = true
		void dispatch(loadProfileThunk())
	}, [dispatch])

	const loading = load.status === 'pending' && !profile
	const loadError = load.status === 'rejected' ? load.error : null

	return (
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
		</FormContainer>
	)
}
