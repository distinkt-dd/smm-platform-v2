import type { ComponentPropsWithoutRef } from 'react'

type ButtonProps = ComponentPropsWithoutRef<'button'>

export const Button = ({ className = '', type = 'button', ...props }: ButtonProps) => {
	return (
		<button
			{...props}
			type={type}
			className={`inline-flex min-h-12 items-center justify-center rounded-control bg-ink px-5 font-semibold text-surface motion-safe:transition-opacity motion-safe:duration-150 hover:opacity-90 active:opacity-80 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
		/>
	)
}
