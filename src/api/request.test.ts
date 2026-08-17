import { describe, expect, it } from 'vitest'

import { ApiError, extractServerErrorCode, isRetryableApiError } from './request'


describe('API error metadata', () => {
  it('prefers a stable backend error code over the numeric envelope code', () => {
    expect(extractServerErrorCode({
      code: 409,
      data: { error_code: 'DEVICE_CLAIM_CODE_REQUIRED' },
    })).toBe('DEVICE_CLAIM_CODE_REQUIRED')
  })

  it('marks transient transport and server errors as retryable', () => {
    expect(isRetryableApiError(new ApiError('offline', 0, 'NETWORK_ERROR'))).toBe(true)
    expect(isRetryableApiError(new ApiError('busy', 503, 'TEMPORARY'))).toBe(true)
    expect(isRetryableApiError(new ApiError('invalid code', 401, 'DEVICE_CREDENTIAL_INVALID'))).toBe(false)
  })
})
