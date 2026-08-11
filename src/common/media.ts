import { BASE_URL } from '@/api/config'

export const DEFAULT_AVATAR_URL = '/static/tabbar/my.png'

const localImageTasks = new Map<string, Promise<string>>()

function getAssetHost(): string {
  return BASE_URL.split('/api/v1')[0]
}

export function isHttpMediaAllowedForTesting(): boolean {
  if (import.meta.env.DEV) return true

  // #ifdef MP-WEIXIN
  try {
    return uni.getAccountInfoSync().miniProgram.envVersion === 'develop'
  } catch (error) {
    console.warn('[media] getAccountInfoSync', error)
  }
  // #endif
  return false
}

function getMediaExtension(url: string): string {
  const matched = url.split(/[?#]/)[0].match(/\.(png|jpe?g|webp)$/i)
  return matched?.[1]?.toLowerCase() || 'jpg'
}

function hashMediaUrl(url: string): string {
  let hash = 2166136261
  for (let index = 0; index < url.length; index++) {
    hash ^= url.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16)
}

/**
 * 微信真机对 HTTP 图片标签限制更严格。开发态先按二进制请求图片并写入
 * USER_DATA_PATH，展示和保存相册共同使用同一份本地文件。
 */
export function cacheRemoteImageToLocalFile(url: string): Promise<string> {
  // #ifdef MP-WEIXIN
  const existingTask = localImageTasks.get(url)
  if (existingTask) return existingTask

  const task = new Promise<string>((resolve, reject) => {
    const userDataPath = (uni as any).env?.USER_DATA_PATH
    if (!userDataPath) {
      reject(new Error('无法获取小程序本地文件目录'))
      return
    }

    const filePath = `${userDataPath}/moment_${hashMediaUrl(url)}.${getMediaExtension(url)}`
    const fileSystemManager = uni.getFileSystemManager()

    const requestAndWrite = () => {
      uni.request({
        url,
        method: 'GET',
        responseType: 'arraybuffer',
        success: (res) => {
          const responseData = res.data as ArrayBuffer
          if (
            res.statusCode < 200
            || res.statusCode >= 300
            || !responseData
            || typeof responseData.byteLength !== 'number'
          ) {
            reject(new Error(`照片下载失败(${res.statusCode})`))
            return
          }

          fileSystemManager.writeFile({
            filePath,
            data: responseData,
            success: () => resolve(filePath),
            fail: reject,
          })
        },
        fail: reject,
      })
    }

    fileSystemManager.access({
      path: filePath,
      success: () => resolve(filePath),
      fail: requestAndWrite,
    })
  })

  localImageTasks.set(url, task)
  task.catch(() => localImageTasks.delete(url))
  return task
  // #endif

  // #ifndef MP-WEIXIN
  return Promise.resolve(url)
  // #endif
}

/**
 * 将后端返回的相对媒体地址补全为可请求地址。
 * 与展示图片的 resolveMediaUrl 不同，这里不使用静态占位图掩盖下载错误。
 */
export function resolveRemoteMediaUrl(
  url: string | null | undefined,
): string {
  if (!url) return ''

  if (
    url.startsWith('https://') ||
    url.startsWith('http://') ||
    url.startsWith('wxfile://')
  ) {
    return url
  }

  const host = getAssetHost()
  return host + (url.startsWith('/') ? url : `/${url}`)
}

export function resolveMediaUrl(
  url: string | null | undefined,
  fallback = DEFAULT_AVATAR_URL,
): string {
  if (!url) return fallback

  const host = getAssetHost()

  if (
    !isHttpMediaAllowedForTesting()
    && (url.startsWith('http://') || host.startsWith('http://'))
  ) {
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
