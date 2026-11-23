import { useId } from 'react'
import type { ComponentPropsWithoutRef } from 'react'

type InputProps = ComponentPropsWithoutRef<'input'> & {
	label: string
	error?: string
}

export const Input = ({ label, id, className = '', error, ...props }: InputProps) => {
	const generatedId = useId()
	const inputId = id ?? generatedId

	return (
		<div className='flex flex-col gap-2'>
			<label htmlFor={inputId} className='text-caption font-medium'>
				{label}
			</label>
			<input
				{...props}
				id={inputId}
				aria-invalid={error ? true : undefined}
				aria-describedby={[props['aria-describedby'], error && `${inputId}-error`].filter(Boolean).join(' ') || undefined}
				className={`min-h-12 w-full rounded-control border ${error ? 'border-focus' : 'border-line'} bg-surface px-4 text-ink placeholder:text-ink-muted motion-safe:transition-colors motion-safe:duration-150 hover:border-ink-muted focus:border-focus focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus ${className}`}
			/>
			{error && <p id={`${inputId}-error`} className='text-caption text-link'>{error}</p>}
		</div>
	)
}
