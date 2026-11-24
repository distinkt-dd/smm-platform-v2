import type { ComponentPropsWithoutRef } from 'react'
import { useId } from 'react'

type TextareaProps = ComponentPropsWithoutRef<'textarea'> & {
	label: string
	error?: string
}

export const Textarea = ({
	label,
	id,
	className = '',
	error,
	rows = 4,
	...props
}: TextareaProps) => {
	const generatedId = useId()
	const textareaId = id ?? generatedId

	return (
		<div className='flex flex-col gap-2'>
			<label htmlFor={textareaId} className='text-caption font-medium'>
				{label}
			</label>
			<textarea
				{...props}
				id={textareaId}
				rows={rows}
				aria-invalid={error ? true : undefined}
				aria-describedby={
					[props['aria-describedby'], error && `${textareaId}-error`]
						.filter(Boolean)
						.join(' ') || undefined
				}
				className={`min-h-28 w-full resize-y rounded-control border ${error ? 'border-focus' : 'border-line'} bg-surface px-4 py-3 text-ink placeholder:text-ink-muted motion-safe:transition-colors motion-safe:duration-150 hover:border-ink-muted focus:border-focus focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus ${className}`}
			/>
			{error && (
				<p id={`${textareaId}-error`} className='text-caption text-link'>
					{error}
				</p>
			)}
		</div>
	)
}
