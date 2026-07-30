export interface ModuleAction {
  label: string
  path: string
}

export interface BusinessSubmodule {
  code: string
  title: string
  desc: string
  components: string
  status: string
  actions: ModuleAction[]
}

export interface BusinessModule {
  id: string
  title: string
  subtitle: string
  icon: string
  color: string
  bgColor: string
  summary: string
  submodules: BusinessSubmodule[]
}

export const businessModules: BusinessModule[] = [
  {
    id: 'voice',
    title: '1. 音色管理',
    subtitle: '爸妈端',
    icon: 'mic',
    color: '#667eea',
    bgColor: '#eef2ff',
    summary: '语音克隆、音色库管理、默认音色切换。',
    submodules: [
      {
        code: '1.1',
        title: '语音克隆系统',
        desc: '语料采样、多角色音色库、默认音色切换。',
        components: '语料录制页；音色管理页；角色切换组件',
        status: '前端已展示，训练结果依赖后端',
        actions: [
          { label: '音色管理', path: '/pages/ai/index' },
          { label: '语料录入', path: '/pages/onboarding/index' },
        ],
      },
    ],
  },
  {
    id: 'care',
    title: '2. 看护看护',
    subtitle: '婴儿看护',
    icon: 'eye',
    color: '#19be6b',
    bgColor: '#ecfdf5',
    summary: '多模态监测、场景响应、婴儿互动、作息引导。',
    submodules: [
      {
        code: '2.1',
        title: '多模态融合监测',
        desc: '视频、毫米波雷达、音频哭声融合，实时展示状态。',
        components: '实时监测页；多模态状态卡片；数据图表',
        status: '已接入监测数据和事件',
        actions: [
          { label: '实时监测', path: '/pages/monitor/index' },
          { label: '事件记录', path: '/pages/monitor/events' },
        ],
      },
      {
        code: '2.2',
        title: '场景分级响应',
        desc: '按熟睡、哭闹、玩耍、危险等场景展示和配置响应。',
        components: '场景状态展示；几类场景配置页；推送通知',
        status: '智能场景页承接',
        actions: [{ label: '智能场景', path: '/pages/scene/index' }],
      },
      {
        code: '2.3',
        title: '婴儿互动(教育/娱乐)',
        desc: '安抚、哄睡、早教、娱乐内容推荐和播放记录。',
        components: '互动内容库页；教育/娱乐分类；互动记录',
        status: '内容库已接入接口入口',
        actions: [{ label: '互动内容库', path: '/pages/content/index' }],
      },
      {
        code: '2.4',
        title: '主动式作息引导',
        desc: 'EASY作息、月龄模板、今日提醒。',
        components: '作息日程展示；引导提醒UI；月龄模板选择页',
        status: '作息管理页承接',
        actions: [{ label: '作息管理', path: '/pages/routine/index' }],
      },
      {
        code: '2.5',
        title: '作息冲突与优化',
        desc: '近7天冲突检测、优化建议对比、自动修复。',
        components: '冲突提示展示；优化建议对比视图',
        status: 'EASY优化页承接',
        actions: [{ label: 'EASY优化', path: '/pages/routine/optimize' }],
      },
    ],
  },
  {
    id: 'growth',
    title: '3. 成长学习',
    subtitle: '智能陪伴',
    icon: 'star-fill',
    color: '#ff9900',
    bgColor: '#fff7ed',
    summary: '长记忆、成长素材、温馨瞬间、AI报告、学习进度。',
    submodules: [
      {
        code: '3.1',
        title: '长记忆(LTM)数据库',
        desc: '事件、对话、传感记录统一时间轴和画像标签。',
        components: '时间轴浏览页；事件筛选与搜索；7天日程预览页；用户画像标签管理',
        status: '长记忆库承接',
        actions: [{ label: '长记忆库', path: '/pages/memory/index' }],
      },
      {
        code: '3.2',
        title: '关键事件自动固化',
        desc: '关键动作识别后生成视频片段或GIF素材。',
        components: '成长相册展示；GIF/视频预览与分享',
        status: '成长素材页承接，GIF生成待后端',
        actions: [{ label: '成长素材', path: '/pages/milestone/assets' }],
      },
      {
        code: '3.3',
        title: '温馨瞬间历史册',
        desc: '按天/月整理照片视频，支持分享下载。',
        components: '温馨瞬间主页；按天/月时间线；相册详情页；分享/下载功能',
        status: '温馨瞬间页承接',
        actions: [{ label: '温馨瞬间', path: '/pages/moment/index' }],
      },
      {
        code: '3.4',
        title: 'AI成长报告',
        desc: '日报卡片、周报展示和历史报告列表。',
        components: '日报卡片；周报展示页；历史报告列表',
        status: 'AI周报页承接',
        actions: [{ label: 'AI成长报告', path: '/pages/milestone/report' }],
      },
      {
        code: '3.5',
        title: '可持续学习架构',
        desc: 'AI学习进度、个性化推荐和偏好画像。',
        components: '学习进度展示；个性化推荐',
        status: 'AI学习进度页承接',
        actions: [{ label: '学习进度', path: '/pages/learning/index' }],
      },
    ],
  },
  {
    id: 'hardware',
    title: '4. 硬件端接口',
    subtitle: '自研端',
    icon: 'setting-fill',
    color: '#64748b',
    bgColor: '#f1f5f9',
    summary: '视频OSD、硬件模式、视频上传管理。',
    submodules: [
      {
        code: '4.1',
        title: '视频与OSD叠加',
        desc: '视频画面与心率、呼吸等OSD信息叠加。',
        components: '视频播放器集成；OSD参数展示',
        status: '监测页展示数据，视频流待硬件',
        actions: [
          { label: '实时监测', path: '/pages/monitor/index' },
          { label: '视频记录', path: '/pages/video/index' },
        ],
      },
      {
        code: '4.3',
        title: '硬件模式切换',
        desc: '睡眠、游戏、拼床等模式切换和历史。',
        components: '模式切换按钮与状态展示',
        status: '设备详情模式切换和设备历史承接',
        actions: [
          { label: '设备管理', path: '/pages/device/list' },
          { label: '切换历史', path: '/pages/device/history' },
        ],
      },
      {
        code: '4.4',
        title: '视频上传与管理',
        desc: '上传历史、播放、删除和按设备筛选。',
        components: '小程序视频列表页；上传历史/播放/删除',
        status: '视频记录页承接',
        actions: [{ label: '视频记录', path: '/pages/video/index' }],
      },
    ],
  },
  {
    id: 'startup',
    title: '5. App首次开机',
    subtitle: '设备',
    icon: 'home-fill',
    color: '#9b59b6',
    bgColor: '#f3e8ff',
    summary: '开箱初始化、主题风格、低内存监控体验。',
    submodules: [
      {
        code: '5.1',
        title: '开箱初始化流程',
        desc: '欢迎、WiFi配置、设备绑定、语音录入。',
        components: '开箱引导页；WiFi配置页；语音录入引导；设备绑定扫码',
        status: '开箱引导页承接',
        actions: [{ label: '开箱引导', path: '/pages/onboarding/index' }],
      },
      {
        code: '5.2',
        title: '温暖育儿风格UI',
        desc: '主题、组件、引导向导和账号设置。',
        components: '全局UI组件库；主题配置；引导向导组件',
        status: '设置和全局页面风格承接',
        actions: [{ label: '设置', path: '/pages/my/settings' }],
      },
      {
        code: '5.3',
        title: '实时监控(低内存)',
        desc: '低内存监控主页、异常高亮、全屏/小窗切换。',
        components: '实时监控主页；异常高亮卡片；视频全屏/小窗切换',
        status: '监测页承接，视频小窗待硬件流',
        actions: [{ label: '实时监测', path: '/pages/monitor/index' }],
      },
    ],
  },
  {
    id: 'system',
    title: '6. 数据库/系统',
    subtitle: '工程要求',
    icon: 'file-text-fill',
    color: '#0f766e',
    bgColor: '#ecfeff',
    summary: '数据库状态、同步进度、性能监控和测试报告。',
    submodules: [
      {
        code: '6.1',
        title: '数据库架构设计',
        desc: '存储容量、同步队列、种子数据版本。',
        components: '存储状态展示；数据同步进度',
        status: '待开发',
        actions: [],
      },
      {
        code: '6.2',
        title: '性能与工程验收',
        desc: '接口延迟、内存占用、健康状态、测试报告。',
        components: '性能监控仪表盘；测试报告页',
        status: '待开发',
        actions: [],
      },
    ],
  },
]

export function getBusinessModule(id?: string) {
  return businessModules.find(item => item.id === id) || businessModules[0]
}
