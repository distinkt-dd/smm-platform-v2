import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { validate } from '../src/shared/lib/validate'

describe('validate', () => {
    it('returns transformed data for a valid value', () => {
        expect(validate(z.object({ name: z.string().trim() }), { name: ' test ' }))
            .toEqual({ success: true, data: { name: 'test' } })
    })

    it('returns the first error for each path, including nested paths', () => {
        const schema = z.object({
            name: z.string().min(2, 'too short').min(3, 'still too short'),
            nested: z.object({ value: z.string().min(1, 'required') }),
        })
        expect(validate(schema, { name: '', nested: { value: '' } })).toEqual({
            success: false,
            errors: { name: 'too short', 'nested.value': 'required' },
        })
    })

    it('preserves errors without a field path', () => {
        expect(validate(z.string().min(1, 'required'), '')).toEqual({
            success: false,
            errors: { '': 'required' },
        })
    })
})
