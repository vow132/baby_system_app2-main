/**
 * API配置文件 - 统一管理后端接口地址
 * 基于 Apifox baby-bed 项目 OpenAPI 3.0 规范（119个接口）
 * 接口类型：硬件接口、小程序接口、共用接口
 * 小程序端只需调用"小程序接口"和"共用接口"
 * 修改 BASE_URL 即可切换后端环境
 *
 * 模块分布（16个Tag）：
 *   认证(5) 家庭(7) 宝宝(5) 自主对话(18) 智能监测(10) 被动响应(5)
 *   作息管理(12) 成长记录(10) 设备管理(9) 硬件交互(11) 用户管理(2)
 *   温馨瞬间(4) 学习进度(2) 状态日志(11) 健康检查(1) 视频识别(7)
 */

// ========== 后端地址配置 ==========
// 开发环境（小程序连真实后端）
const DEV_BASE_URL = 'http://223.247.96.246:34223/api/v1'
// 生产环境
const PROD_BASE_URL = 'https://your-domain.com/api/v1'

// 外部音色服务地址（新 TTS/音色服务端口）
const DEV_SPEECH_BASE_URL = 'http://223.247.96.246:40028/v1'
const PROD_SPEECH_BASE_URL = 'https://your-speech-domain.com/v1'

// 当前使用的后端地址
// 开发阶段直接用 DEV_BASE_URL，上线前改为 PROD_BASE_URL
export const BASE_URL = DEV_BASE_URL
// export const BASE_URL = PROD_BASE_URL  // 上线时取消这行注释，注释上面那行

// 当前使用的外部音色服务地址
export const SPEECH_BASE_URL = DEV_SPEECH_BASE_URL
// export const SPEECH_BASE_URL = PROD_SPEECH_BASE_URL  // 上线时取消这行注释

// ========== 请求超时配置 ==========
export const TIMEOUT = 30000

// ========== Token存储Key ==========
export const TOKEN_KEY = 'baby_bed_token'
export const USER_INFO_KEY = 'baby_bed_user_info'

// ========== API路径常量 ==========
export const API = {
  // ========== 认证模块（5个，全部小程序接口） ==========
  AUTH: {
    REGISTER: '/auth/register',           // POST 用户手机号注册账号
    LOGIN: '/auth/login',                 // POST 手机号密码登录获取token
    SMS_CODE: '/auth/sms-code',           // POST 发送短信验证码
    CODE_LOGIN: '/auth/code-login',       // POST 手机号验证码登录
    RESET_PASSWORD: '/auth/reset-password', // POST 忘记密码重置
    CHANGE_PASSWORD: '/auth/change-password', // POST 登录态修改密码
    BIND_PHONE: '/auth/bind-phone',       // POST 绑定/更换手机号
    CANCEL_ACCOUNT: '/auth/cancel-account', // POST 注销账号
    WECHAT_LOGIN: '/auth/wechat-login',   // POST 微信授权快捷登录
    INFO: '/auth/info',                   // GET 查询当前用户基本信息
    UPDATE_INFO: '/auth/info',            // PUT 修改用户昵称头像等信息
  },

  // ========== 家庭模块（7个，全部小程序接口） ==========
  FAMILY: {
    CREATE: '/family/create',             // POST 新建家庭成为管理员
    JOIN: '/family/join',                 // POST 通过邀请码加入家庭
    INFO: '/family/info',                 // GET 查询当前所在家庭详细信息
    UPDATE: '/family/info',               // PUT 修改家庭名称等成员信息
    MEMBERS: '/family/members',           // GET 查看家庭所有成员成员列表
    MEMBER_ROLE: (member_id: number) => `/family/members/${member_id}/role`,
    MEMBER_REMOVE: (member_id: number) => `/family/members/${member_id}`,
    INVITE_CODE: '/family/invite-code',   // GET 生成家庭邀请码供他人加入
    INVITE_REGENERATE: '/family/invite-code/regenerate',
    TRANSFER_ADMIN: '/family/admin/transfer',
    DISSOLVE: '/family/dissolve',
    LEAVE: '/family/leave',               // POST 离开当前所在的家庭
  },

  // ========== 宝宝模块（5个，全部小程序接口） ==========
  BABY: {
    ADD: '/baby/add',                             // POST 为家庭添加一个宝宝信息
    LIST: '/baby/list',                           // GET 查询家庭所有宝宝列表
    DETAIL: (baby_id: number) => `/baby/${baby_id}`,        // GET 查看某个宝宝的详细信息
    UPDATE: (baby_id: number) => `/baby/${baby_id}`,        // PUT 修改宝宝信息，头像等可编辑
    DELETE: (baby_id: number) => `/baby/${baby_id}`,        // DELETE 移除某个宝宝信息
    EXPORT: (baby_id: number) => `/baby/${baby_id}/export`, // GET 导出宝宝成长数据
  },

  // ========== 设备模块（9个：2小程序+3硬件+4共用） ==========
  DEVICE: {
    LIST: '/device/list',                                          // GET 查询已注册设备列表（小程序）
    STATUS: (device_sn: string) => `/device/status/${device_sn}`,  // GET 查看设备当前运行状态（小程序）
    OTA_UPGRADE: '/device/ota/upgrade',                            // POST 设备固件在线升级
    FIRMWARE_VERSION: '/device/firmware/version',                  // GET 查询设备当前固件版本
    REBOOT: (device_sn: string) => `/device/${device_sn}/reboot`,  // POST 远程重启设备
    DIAGNOSE: (device_sn: string) => `/device/${device_sn}/diagnose`, // POST 触发设备自我诊断
    BATTERY: '/device/battery',                                    // GET 查询设备电池状态
    REGISTER: '/device/register',                                  // POST 注册新设备到系统（硬件）
    WIFI_CONFIG: '/device/wifi-config',                            // POST 为设备配置WiFi网络连接（硬件）
    WIFI_STATUS: (device_sn: string) => `/device/wifi-status/${device_sn}`, // GET 查询设备WiFi连接状态（硬件）
    BIND: '/device/bind',                                          // POST 将设备绑定到指定宝宝（共用）
    UNBIND: '/device/unbind',                                      // POST 解除设备与宝宝的绑定（共用）
    DELETE: (device_sn: string) => `/device/${device_sn}`,         // DELETE 注销设备并删除数据库记录（小程序）
    UPDATE_NAME: '/device/name',  // PUT 修改设备名称（小程序）
    MODE_SWITCH: '/device/mode/switch',                            // POST 切换睡床/游戏床/拼床模式（共用）
    MODE_HISTORY: '/device/mode/history',                          // GET 查看设备模式切换历史记录（共用）
  },

  // ========== 传感器模块（10个：3硬件+1小程序+4共用+2小程序） ==========
  SENSOR: {
    UPLOAD: '/sensor/upload',                           // POST 设备上报心跳和体温等数据（硬件）
    UPLOAD_FILE: '/sensor/upload-file',                 // POST 批量上传传感器历史数据文件（硬件）
    DETECT: '/sensor/detect',                           // POST 手动触发一次事件检测（硬件）
    DATA: '/sensor/data',                               // GET 分页查询历史传感器数据（共用）
    EVENTS: '/sensor/events',                           // GET 分页查询历史事件列表（共用）
    EVENT_DETAIL: (event_id: number) => `/sensor/events/${event_id}`, // GET 查看单个事件详细信息（共用）
    EVENT_CONFIRM: '/sensor/events/confirm',            // POST 事件确认家长已处理标记（共用）
    FUSION: '/sensor/fusion',                           // POST 多模态数据融合分析（小程序）
    SCENE_CLASSIFY: '/sensor/scene/classify',           // GET 场景分类识别（小程序）
    SCENE_RESPONSE: '/sensor/scene/response',           // POST 执行场景响应脚本（小程序）
    STATUS_BABY: '/sensor/status/baby',                // GET 查询婴儿状态及风险等级（小程序）
  },

  // ========== 被动响应模块（5个：4小程序+1共用） ==========
  RESPONSE: {
    EVENT_TYPES: '/response/event-types',                                       // GET 查询所有可用的事件类型（小程序）
    EVENT_TYPE_DETAIL: (event_type_id: number) => `/response/event-types/${event_type_id}`, // GET 查看某类事件类型详情（小程序）
    EVENT_TYPE_UPDATE: (event_type_id: number) => `/response/event-types/${event_type_id}`, // PUT 修改事件类型响应参数（小程序）
    TRIGGER: '/response/trigger',                                               // POST 手动执行某种响应动作（共用）
    HISTORY: '/response/history',                                               // GET 查询历史被动响应记录（小程序）
  },

  // ========== 作息模块（12个，全部小程序接口） ==========
  ROUTINE: {
    CREATE: '/routine/create',                                     // POST 为宝宝创建新的作息计划
    LIST: '/routine/list',                                         // GET 分页查询作息信息列表
    DETAIL: (routine_id: number) => `/routine/${routine_id}`,      // GET 查看某条作息详情
    UPDATE: (routine_id: number) => `/routine/${routine_id}`,      // PUT 修改作息时间参数等
    DELETE: (routine_id: number) => `/routine/${routine_id}`,      // DELETE 移除某条作息计划
    CONFLICTS: (baby_id: number) => `/routine/conflicts/${baby_id}`,     // GET 检测当前作息是否存在冲突
    OPTIMIZE: (baby_id: number) => `/routine/optimize/${baby_id}`,       // GET AI分析获取作息优化建议
    TODAY: (baby_id: number) => `/routine/today/${baby_id}`,             // GET 查询今日作息安排
    EASY_TEMPLATE: '/routine/easy/template',                       // GET 获取EASY模式作息模板
    EASY_OPTIMIZE: '/routine/easy/optimize',                       // POST AI优化作息计划
    CONFLICT_CHECK: '/routine/conflict/check',                     // POST 检测作息冲突并生成建议
    CONFLICT_FIX: '/routine/conflict/fix',                         // POST 自动修复作息冲突
  },

  // ========== 里程碑模块（10个，全部小程序接口） ==========
  MILESTONE: {
    CREATE: '/milestone/create',                                   // POST 手动记录生成里程碑
    LIST: '/milestone/list',                                       // GET 分页查询里程碑列表
    DETAIL: (milestone_id: number) => `/milestone/${milestone_id}`,  // GET 查看某个里程碑详情
    DELETE: (milestone_id: number) => `/milestone/${milestone_id}`,  // DELETE 移除某个里程碑记录
    REPORT_GENERATE: '/milestone/report/generate',                 // POST AI自动生成本周成长周报
    REPORT_LIST: '/milestone/report/list',                         // GET 分页查询历史周报列表
    REPORT_DETAIL: (report_id: number) => `/milestone/report/${report_id}`, // GET 查看某个周报具体内容
    CAPTURE: '/milestone/capture',                                 // POST 截取事件前后视频片段
    GIF_GENERATE: '/milestone/gif/generate',                       // POST 视频片段转GIF动图
    WEEKLY_REPORT_GENERATE: '/milestone/weekly-report/generate',   // POST AI生成每日展板形式周报
  },

  // ========== 语音模块（全部小程序接口） ==========
  VOICE: {
    // 内部接口
    CLONE: '/voice/clone',                     // POST 上传音频训练克隆专属音色
    CLIPS: '/voice/clips',                     // GET 查询已克隆音色列表
    SWITCH: '/voice/switch',                   // POST 切换当前使用AI音色
    ASR: '/voice/asr',                         // POST 语音转换文字识别
    TTS: '/voice/tts',                         // POST 文字转换语音输出
    CHAT: '/voice/chat',                       // POST 和AI进行自然语言对话
    HISTORY: '/voice/history',                 // GET 分页查询历史对话记录
    DELETE_CLIP: (clip_id: number) => `/voice/clip/${clip_id}`,   // DELETE 删除某个克隆音色（旧）
    WAKE: '/voice/wake',                       // POST 语音唤醒词检测
    INTENT: '/voice/intent',                   // POST 语音指令意图识别
    COMMAND: '/voice/command',                 // POST 执行语音指令控制
    LTM_QUERY: '/voice/ltm/query',            // POST 查询长记忆数据库
    LTM_STORE: '/voice/ltm/store',            // POST 存储对话到长记忆库
    SESSION_CREATE: '/voice/session',          // POST 创建新的对话会话
    SESSION_CLOSE: (session_id: string) => `/voice/session/${session_id}/close`,  // POST 关闭指定对话会话
    CLONE_TRAIN: '/voice/clone/train',         // POST 训练语音克隆模型
    CLONE_VOICES: '/voice/clone/voices',       // GET 获取音色库列表（旧）
    CLONE_VOICE_DEFAULT: (voice_id: string) => `/voice/clone/voices/${voice_id}/default`, // PUT 设置默认音色
    // 新增音色库接口（后端统一管理）
    LIBRARY_UPLOAD: '/voice/library/upload',   // POST 克隆音色（文件上传方式）
    LIBRARY: '/voice/library',                 // GET 获取音色库列表
    LIBRARY_DELETE: (voice_name: string) => `/voice/library/by-name/${voice_name}`, // DELETE 根据音色名称删除
    // 外部音色接口
    EXT_GET_VOICES: '/audio/get_voices',                // GET 获取音色列表
    EXT_DELETE_VOICE: '/audio/delete_voice',            // DELETE 删除音色（参数：voice_uri）
    EXT_CLONE_VOICE: '/audio/clone_voice',              // POST 克隆音色
  },

  // ========== 温馨瞬间模块（4个，全部小程序接口） ==========
  MOMENT: {
    TIMELINE: '/moment/timeline',                                // GET 时间线查看温馨瞬间
    MONTH: (month: string) => `/moment/month/${month}`,          // GET 按月筛选温馨瞬间列表
    SHARE: '/moment/share',                                      // POST 生成分享链接供他人访问
    DOWNLOAD: (moment_id: number) => `/moment/download/${moment_id}`, // GET 获取照片视频下载链接
  },

  // ========== 状态日志模块（11个：3硬件+8小程序） ==========
  STATUS: {
    LOG: '/status/log',                                                  // POST 硬件端上报宝宝状态变化（硬件）
    LOG_END: (log_id: number) => `/status/log/${log_id}/end`,            // PUT 结束状态日志（硬件）
    CRY: '/status/cry',                                                  // POST 硬件端上报哭闹事件（硬件）
    DANGER: '/status/danger',                                            // POST 硬件端上报危险事件（硬件）
    HISTORY: '/status/history',                                          // GET 查询宝宝状态历史记录（小程序）
    CRY_HANDLE: (event_id: number) => `/status/cry/${event_id}/handle`,  // POST 父母处理哭闹事件（小程序）
    CRY_LIST: '/status/cry/list',                                        // GET 获取哭闹事件列表（小程序）
    DANGER_HANDLE: (event_id: number) => `/status/danger/${event_id}/handle`, // POST 父母处理危险事件（小程序）
    DANGER_LIST: '/status/danger/list',                                  // GET 获取危险事件列表（小程序）
    SLEEP_REPORT: '/status/sleep-report',                                // GET 获取每日睡眠报告（小程序）
    SLEEP_REPORT_GENERATE: '/status/sleep-report/generate',              // POST 生成每日睡眠报告（小程序）
  },

  // ========== 硬件模块（11个：8硬件+1小程序+1共用+1硬件） ==========
  HARDWARE: {
    LIGHT_SET: '/hardware/light/set',              // POST 设置设备RGB灯光颜色模式（硬件）
    LIGHT_CONFIGS: '/hardware/light/configs',      // GET 查询所有灯光预设配置（硬件）
    LIGHT_CONFIG_APPLY: '/hardware/light/config/apply', // POST 灯光预设配置应用到设备（硬件）
    ANIMATION_LIST: '/hardware/animation/list',    // GET 查询设备支持的屏幕动画（硬件）
    ANIMATION_PLAY: '/hardware/animation/play',    // POST 设备屏幕上播放动画（硬件）
    ANIMATION_STOP: '/hardware/animation/stop',    // POST 停止当前播放的屏幕动画（硬件）
    LIGHT_CONTROL: '/hardware/light/control',      // POST 控制氛围灯RGB和动画（硬件）
    SCREEN_ANIMATION: '/hardware/screen/animation', // POST 控制5寸屏幕动画加载（硬件）
    MODE_SWITCH: '/hardware/mode/switch',          // POST 切换婴儿床工作模式（共用）
    MODE_CURRENT: '/hardware/mode/current',        // GET 获取当前工作模式及配置（硬件）
    LIGHT_CONFIG_SAVE: '/hardware/light/config/save', // POST 保存自定义灯光预设配置（小程序）
    ANIMATION_CREATE: '/hardware/animation/create',    // POST 创建动画（小程序）
    ANIMATION_DETAIL: (animation_id: number) => `/hardware/animation/detail/${animation_id}`, // GET 动画详情（小程序）
    ANIMATION_UPDATE: (animation_id: number) => `/hardware/animation/update/${animation_id}`, // PUT 更新动画（小程序）
    ANIMATION_DELETE: (animation_id: number) => `/hardware/animation/delete/${animation_id}`, // DELETE 删除动画（小程序）
  },

  PUSH: {
    HISTORY: '/push/history',
    SETTINGS: '/push/settings',
  },

  ALARM: {
    RULES: '/alarm/rules',
    RULE_UPDATE: (rule_id: number) => `/alarm/rules/${rule_id}`,
  },

  // ========== 用户模块（2个，全部小程序接口） ==========
  USER: {
    THEME: '/user/theme',                 // GET 获取用户主题配置
    UPDATE_THEME: '/user/theme',          // PUT 更新用户主题配置
  },

  // ========== 学习模块（2个，全部小程序接口） ==========
  LEARNING: {
    PROGRESS: '/learning/progress',      // GET 查看AI学习进度情况
    RECOMMENDATIONS: '/learning/recommendations', // GET 获取AI个性化推荐内容
  },

  INTERACTION: {
    CONTENT: '/interaction/content',
    LIBRARY: '/interaction/library',
    HISTORY: '/interaction/history',
  },

  SYSTEM: {
    STORAGE_STATUS: '/system/storage-status',
    SYNC: '/system/sync',
    SEED_VERSION: '/system/seed-version',
    PERFORMANCE: '/system/performance',
    HEALTH: '/system/health',
  },

  // ========== 健康检查模块（1个） ==========
  HEALTH: {
    CHECK: '/',  // GET 健康检查根端点
  },

  // ========== 视频识别模块（7个：1小程序+6硬件） ==========
  VIDEO: {
    STREAM: (filename: string) => `/video/stream/${filename}`,       // GET 获取视频流（小程序）
    UPLOAD: '/video/upload',                                          // POST 上传视频文件（硬件）
    DETAIL: (video_id: number) => `/video/get/${video_id}`,          // GET 视频信息根据id查询（硬件）
    UPDATE: (video_id: number) => `/video/update/${video_id}`,       // PUT 更新视频信息（硬件）
    DELETE: (video_id: number) => `/video/delete/${video_id}`,       // DELETE 删除视频信息（硬件）
    BY_DEVICE: (device_sn: string) => `/video/by-device/${device_sn}`, // GET 根据设备sn查询（硬件）
    LIST: '/video/list',                                              // GET 分页查询视频列表（硬件）
  },
}
