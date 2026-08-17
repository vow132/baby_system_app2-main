/**
 * 网络请求封装
 */
import { BASE_URL, TIMEOUT, TOKEN_KEY } from './config'

interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

export class ApiError extends Error {
  statusCode: number
  code: number | string
  retryable: boolean
  data: any

  constructor(message: string, statusCode = 0, code: number | string = -1, data: any = null) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.code = code
    this.data = data
    this.retryable = statusCode === 0 || statusCode === 408 || statusCode === 429 || (statusCode >= 500 && statusCode !== 501)
  }
}

export function isRetryableApiError(error: unknown): boolean {
  return error instanceof ApiError ? error.retryable : true
}

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  header?: Record<string, string>
  showLoading?: boolean
  showError?: boolean
  /** 登录接口自身返回 401 时不跳转登录页 */
  ignore401?: boolean
}

/**
 * 拼接 query 参数。部分 POST/PUT 接口要求 query 入参时可复用。
 */
export function withQuery(url: string, params?: Record<string, any>): string {
  const queryParams: string[] = []
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.push(`${key}=${encodeURIComponent(String(value))}`)
      }
    })
  }
  return queryParams.length ? `${url}?${queryParams.join('&')}` : url
}

function getToken(): string {
  return uni.getStorageSync(TOKEN_KEY) || ''
}

function extractServerMessage(raw: any): string {
  if (!raw) return ''
  if (typeof raw === 'string') return raw
  if (typeof raw.message === 'string' && raw.message.trim()) return raw.message.trim()
  if (typeof raw.detail === 'string' && raw.detail.trim()) return raw.detail.trim()
  if (Array.isArray(raw.detail) && raw.detail.length) {
    const first = raw.detail[0]
    if (typeof first === 'string') return first
    if (first && typeof first.msg === 'string') return first.msg
  }
  return ''
}

export function extractServerErrorCode(raw: any): number | string {
  const stableCode = raw?.data?.error_code
  if (typeof stableCode === 'string' && stableCode) return stableCode
  if (typeof raw?.code === 'number' || typeof raw?.code === 'string') return raw.code
  return -1
}

function responseInterceptor<T>(
  response: UniApp.RequestSuccessCallbackResult,
  showError: boolean,
  ignore401: boolean,
): ApiResponse<T> {
  const data = response.data as ApiResponse<T>
  const serverMessage = extractServerMessage(response.data)

  if (response.statusCode === 200) {
    if (data.code === 0 || data.code === 200) return data

    const errorText = data.message || serverMessage || '请求失败'
    if (showError) {
      uni.showToast({ title: errorText, icon: 'none' })
    }
    throw new ApiError(
      errorText,
      response.statusCode,
      extractServerErrorCode(response.data),
      data.data,
    )
  }

  if (response.statusCode === 401) {
    // 登录接口自身返回 401 时，不跳转登录页，由调用方处理错误提示
    if (!ignore401) {
      uni.removeStorageSync(TOKEN_KEY)
      uni.reLaunch({ url: '/pages/login/login' })
    }
    throw new ApiError(
      serverMessage || '登录已过期，请重新登录',
      401,
      extractServerErrorCode(response.data),
      (response.data as any)?.data,
    )
  }

  const errorText = serverMessage || `网络错误(${response.statusCode})`
  if (showError) {
    uni.showToast({ title: errorText, icon: 'none' })
  }
  throw new ApiError(
    errorText,
    response.statusCode,
    extractServerErrorCode(response.data),
    (response.data as any)?.data,
  )
}

export function request<T = any>(options: RequestOptions): Promise<ApiResponse<T>> {
  const {
    url,
    method = 'GET',
    data,
    header = {},
    showLoading = false,
    showError = true,
    ignore401 = false,
  } = options

  if (showLoading) {
    uni.showLoading({ title: '加载中...', mask: true })
  }

  const token = getToken()
  if (token) {
    header.Authorization = `Bearer ${token}`
  }
  header['Content-Type'] = 'application/json'

  return new Promise((resolve, reject) => {
    uni.request({
      url: BASE_URL + url,
      method,
      data,
      header,
      timeout: TIMEOUT,
      success: (res) => {
        try {
          resolve(responseInterceptor<T>(res, showError, ignore401))
        } catch (error) {
          reject(error)
        }
      },
      fail: (err) => {
        const errorText = (err as any)?.errMsg || '网络连接失败'
        if (showError) {
          uni.showToast({ title: errorText, icon: 'none' })
        }
        reject(new ApiError(errorText, 0, 'NETWORK_ERROR'))
      },
      complete: () => {
        if (showLoading) uni.hideLoading()
      },
    })
  })
}

export function get<T = any>(
  url: string,
  params?: any,
  options?: Partial<RequestOptions>,
): Promise<ApiResponse<T>> {
  return request<T>({ url, method: 'GET', data: params, ...options })
}

export function post<T = any>(
  url: string,
  data?: any,
  options?: Partial<RequestOptions>,
): Promise<ApiResponse<T>> {
  return request<T>({ url, method: 'POST', data, ...options })
}

export function put<T = any>(
  url: string,
  data?: any,
  options?: Partial<RequestOptions>,
): Promise<ApiResponse<T>> {
  return request<T>({ url, method: 'PUT', data, ...options })
}

export function del<T = any>(
  url: string,
  data?: any,
  options?: Partial<RequestOptions>,
): Promise<ApiResponse<T>> {
  return request<T>({ url, method: 'DELETE', data, ...options })
}

export default { request, get, post, put, del }
