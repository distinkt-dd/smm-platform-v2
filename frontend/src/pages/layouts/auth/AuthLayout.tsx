import { Outlet } from 'react-router'

export const AuthLayout = () => {
	return (
		<div className='flex flex-1'>
			<div aria-hidden='true' className='pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-surface-muted max-phone:hidden' />
			<aside className='relative flex flex-1 flex-col pl-8 pr-6 max-phone:hidden'>
				<div className='flex flex-1 flex-col justify-center'>
					<div className='max-w-110'>
						<h2 className='text-5xl leading-[1.04] font-semibold tracking-tight'>
							Ваше дело. <br /> Ваш голос. <br /> Ваш контент.
						</h2>
						<p className='mt-6 max-w-85 text-base text-ink-muted'>
							От идеи до готовой сторис —<br /> в одном спокойном диалоге.
						</p>
						<div className='mt-10 flex items-center gap-4'>
							<div className='flex shrink-0 items-start' aria-hidden='true'>
								<div className='flex h-36 w-24 flex-col justify-between rounded-state border-b-22 border-[#b5bba9] bg-[#e4e1d7] p-3 text-lg leading-tight'>
									<span>Бережно<br />к себе.</span>
									<span className='text-[8px]'>Уход за кожей</span>
								</div>
								<div className='-ml-8 mt-5 flex h-36 w-24 rotate-6 flex-col justify-between rounded-state border-b-22 border-[#c99497] bg-[#f0e0de] p-3 text-lg leading-tight'>
									<span>Время<br />для себя.</span>
									<span className='text-[8px]'>Запись открыта</span>
								</div>
							</div>
							<p className='max-w-34 text-label text-ink-muted'>
								Оформление под ваш стиль, а не наоборот.
							</p>
						</div>
					</div>
				</div>
				<p className='mt-8 text-label text-ink-muted'>
					Создано для самостоятельных бьюти-мастеров
				</p>
			</aside>
			<div className='relative flex min-w-0 flex-1 items-center justify-center'>
				<Outlet />
			</div>
		</div>
	)
}
