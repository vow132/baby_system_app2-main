# 智能婴儿床监护小程序端

基于 UniApp、Vue 3、TypeScript、Pinia 和 uView Plus 开发的智能婴儿床监护系统小程序端。当前项目主要负责小程序页面、交互入口、状态展示、基础 API 调用和联调展示位。

## 当前状态

小程序端页面框架和主要业务入口已基本完成，并按《婴儿床业务逻辑版-总表》的一级模块梳理页面结构。

已完成或基本完成：

- 登录：手机号密码登录、验证码登录、找回密码、微信授权登录占位。
- 首页：宝宝状态、今日作息、作息建议、今日事件、最近瞬间、设备概览。
- 看护：实时视频展示位、心率/呼吸/哭声/姿态状态卡片、今日事件、事件分类、视频回放入口。
- 看护阈值：心率、呼吸、哭声、姿态小卡片可直接进入对应阈值设置页。
- 家长对话/AI 陪伴：语音克隆、音色库、对话历史入口。
- 作息管理：月龄模板、EASY 日程、作息建议、作息冲突与优化。
- 成长模块：长记忆库、成长素材、温馨瞬间、AI 成长报告、学习进度；当前不展示“数据记录/历史传感器数据”卡片。
- 设备管理：设备列表、设备详情、模式切换、模式策略说明、切换历史、固件升级入口、设备诊断、远程重启、改名、解绑、删除。
- 我的：宝宝、家庭、设备、固件、语音、系统验收等入口。
- 通用 WebView：用于 AI 学习推荐内容跳转。

仍需后端、硬件或算法链路联调：

- 真实视频流播放。
- WebSocket 实时推送。
- 硬件灯光、屏幕动画、模式切换的真实执行和回传。
- 固件版本查询与 OTA 升级闭环。
- ASR、TTS、语音克隆、对话上下文完整闭环。
- 关键事件视频截取、GIF/视频素材生成闭环。
- 系统验收真实运行状态、接口、存储和推送指标。

## 技术栈

- UniApp
- Vue 3
- TypeScript
- Pinia
- uView Plus
- SCSS
- 微信小程序

## 项目结构

```text
main/
├── src/
│   ├── api/                 # 后端接口封装
│   ├── common/              # 公共业务配置
│   ├── pages/               # 小程序页面
│   │   ├── ai/              # AI 陪伴
│   │   ├── baby/            # 宝宝详情/管理
│   │   ├── content/         # 互动内容库
│   │   ├── device/          # 设备管理、设备详情、模式切换
│   │   ├── growth/          # 成长首页
│   │   ├── index/           # 首页
│   │   ├── learning/        # AI 学习进度
│   │   ├── login/           # 登录/注册
│   │   ├── memory/          # 长记忆库
│   │   ├── milestone/       # 成长记录/素材/报告
│   │   ├── moment/          # 温馨瞬间
│   │   ├── monitor/         # 看护/事件/阈值设置
│   │   ├── my/              # 我的
│   │   ├── onboarding/      # 首次使用向导
│   │   ├── routine/         # 作息管理/作息建议
│   │   ├── scene/           # 场景联动
│   │   ├── system/          # 系统验收
│   │   ├── video/           # 视频回放
│   │   └── webview/         # 推荐内容 WebView
│   ├── services/            # 业务服务封装
│   ├── static/              # 小程序静态资源
│   ├── stores/              # Pinia 状态管理
│   ├── App.vue
│   ├── main.ts
│   ├── manifest.json
│   └── pages.json
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 运行方式

安装依赖：

```bash
npm install
```

微信小程序开发：

```bash
npm run dev:mp-weixin
```

然后用微信开发者工具打开：

```text
dist/dev/mp-weixin
```

连接当前 8123 服务的联调构建：

```bash
npm run build:mp-weixin:test
```

正式微信小程序构建：

```bash
# 先将 .env.example 复制为 .env.production，并填写已备案、已加入微信合法域名的 HTTPS 地址
npm run build:mp-weixin
```

正式构建缺少真实 HTTPS API 或音色服务域名时会主动失败，防止发布占位配置。
正式发布流水线还应执行：

```bash
npm run typecheck
npm test -- --run
npm audit --registry=https://registry.npmjs.org --omit=dev --audit-level=high
```

构建产物路径：

```text
dist/build/mp-weixin
```

H5 开发：

```bash
npm run dev:h5
```

H5 构建：

```bash
npm run build:h5
```

## 后端地址

后端接口地址配置在：

```text
src/api/config.ts
```

当前开发环境地址：

```ts
const DEV_BASE_URL = 'http://223.247.96.246:8123/api/v1'
```

8123 HTTP 地址仅用于开发者工具/联调。上线前在 `.env.production` 配置正式 HTTPS
域名，并在微信小程序后台配置 request、downloadFile、uploadFile 等合法域名；无需
直接修改 `src/api/config.ts`。

## 主要页面模块

| 模块 | 页面/入口 | 当前说明 |
| --- | --- | --- |
| 首页 | `pages/index/index` | 汇总宝宝状态、快捷入口、今日作息、作息建议、事件、瞬间和设备 |
| 看护 | `pages/monitor/index`、`pages/monitor/alarm` | 实时数据、视频展示、告警、事件、视频回放；心率/呼吸/哭声/姿态卡片可进入阈值设置 |
| 家长对话 | `pages/ai/index` | AI 陪伴、音色展示 |
| 作息 | `pages/routine/index`、`pages/routine/optimize` | 月龄模板、EASY 日程、作息冲突与优化建议 |
| 成长学习 | `pages/growth/index`、`pages/memory/index`、`pages/milestone/*`、`pages/moment/index`、`pages/learning/index` | 长记忆、成长素材、温馨瞬间、AI 报告、学习进度；不展示历史传感器数据入口 |
| 设备管理 | `pages/device/*` | 设备列表、设备详情、模式切换、模式策略、切换历史、固件升级、诊断、重启、解绑、删除 |
| 场景联动 | `pages/scene/index` | 场景状态、响应策略和联动配置 |
| 初始化 | `pages/onboarding/index` | 欢迎、WiFi、设备绑定、宝宝信息、家人声音录入 |
| 系统 | `pages/system/index` | 数据同步、存储状态、运行健康、验收报告展示 |
| 推荐内容 | `pages/webview/index` | AI 学习推荐内容 WebView 承载页 |

## 接口与联调说明

小程序端已提供主要页面和交互展示位。以下能力需要其他端提供真实接口、硬件执行结果或推送服务后才能形成完整业务闭环：

| 联调项 | 依赖方 | 小程序展示位置 | 当前说明 |
| --- | --- | --- | --- |
| 真实视频流 | 服务端/API 端、硬件端 | 看护页、视频回放 | 当前以前端展示和接口占位为主 |
| WebSocket 推送 | 服务端/API 端 | 首页、看护页、事件记录 | 需要后端推送实时状态和告警 |
| 硬件执行回传 | 硬件端、服务端/API 端 | 设备详情模式切换、场景联动 | 模式切换入口已集中到“设备管理 -> 设备详情 -> 模式切换” |
| 固件版本与 OTA 升级 | 服务端/API 端、硬件端 | 设备详情 -> 固件升级 | 前端已定义 `GET /device/firmware/version` 和 `POST /device/ota/upgrade` 调用；当前后端尚未实现对应路由，需要后端补接口后才能真正联调 |
| ASR/TTS/语音克隆 | 语音交互模块 | AI 陪伴、开箱引导 | 需要语音链路返回真实结果 |
| GIF/视频素材生成 | 服务端/API 端、硬件/算法 | 成长素材、温馨瞬间、视频回放 | 需要事件截取、素材生成和保存链路 |
| 系统真实验收指标 | 服务端/API 端、数据库设计 | 系统验收 | 需要真实接口、存储和运行状态数据 |

## Git 提交流程

本仓库建议只提交源码，不提交依赖和编译产物。`.gitignore` 已忽略：

```text
node_modules/
dist/
unpackage/
.hbuilderx/
.idea/
*.log
.DS_Store
```

日常提交：

```bash
git status
git add .
git commit -m "说明本次修改"
git push
```

## 注意事项

1. 微信小程序运行前需要在 `src/manifest.json` 中配置正确的小程序 AppID。
2. 小程序真机调试需要配置合法请求域名；开发阶段可按微信开发者工具要求开启调试配置。
3. `dist/`、`node_modules/` 不提交到 GitHub，其他成员拉取代码后执行 `npm install` 和构建命令即可。
4. 当前页面中部分“待接入”提示是联调占位，不代表页面缺失，而是等待后端、硬件、语音或算法链路返回真实状态。
