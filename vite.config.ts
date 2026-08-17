import { defineConfig, loadEnv } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiBaseUrl = (env.VITE_API_BASE_URL || '').trim()
  const speechBaseUrl = (env.VITE_SPEECH_BASE_URL || '').trim()

  if (mode === 'production') {
    if (!apiBaseUrl.startsWith('https://') || apiBaseUrl.includes('example.com')) {
      throw new Error('正式构建必须配置真实 HTTPS VITE_API_BASE_URL')
    }
    if (!speechBaseUrl.startsWith('https://') || speechBaseUrl.includes('example.com')) {
      throw new Error('正式构建必须配置真实 HTTPS VITE_SPEECH_BASE_URL')
    }
  }
  if (mode === 'test' && !/^https?:\/\//.test(apiBaseUrl)) {
    throw new Error('测试构建缺少有效 VITE_API_BASE_URL')
  }

  return {
    plugins: [uni()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `
            @import "uview-plus/theme.scss";
            @import "uview-plus/libs/css/mixin.scss";
          `
        }
      }
    }
  }
})
