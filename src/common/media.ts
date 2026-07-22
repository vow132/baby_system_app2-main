import { BASE_URL } from '@/api/config'

export const DEFAULT_AVATAR_URL = '/static/tabbar/my.png'

function getAssetHost(): string {
  return BASE_URL.split('/api/v1')[0]
}

export function resolveMediaUrl(
  url: string | null | undefined,
  fallback = DEFAULT_AVATAR_URL,
): string {
  if (!url) return fallback

  const host = getAssetHost()

  if (url.startsWith('http://') || host.startsWith('http://')) {
    return fallback
  }

  if (
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('wxfile://')
  ) {
    return url
  }

  if (url.startsWith('/static/')) {
    return url
  }

  return host + (url.startsWith('/') ? url : `/${url}`)
}
