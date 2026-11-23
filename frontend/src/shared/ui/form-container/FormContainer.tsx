import type { ReactNode } from 'react'

type FormContainerProps = {
	children: ReactNode
}

export const FormContainer = ({ children }: FormContainerProps) => {
	return <section className='flex w-full max-w-preview flex-col gap-6'>{children}</section>
}
