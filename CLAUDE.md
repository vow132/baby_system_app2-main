CLAUDE.md# CLAUDE.md

This file provides guidance when working with code in this repository.

## 协作规则

- 默认使用中文回复；代码、文件名、API、终端命令和报错原文保持原样。
- 优先做小范围分析、小范围修改、最少上下文读取。
- 不主动深度扫描整个项目；先用 `rg` 定位，再读取必要文件。
- 修改代码前说明要改哪些文件、目的、是否影响接口、是否影响页面逻辑。
- 未经确认不要批量重构、删除无关文件或新增复杂依赖。
- 每次修改 `main/src` 源码后，需要同步生成 `main/dist/build` 和 `main/dist/dev` 的小程序代码。

## 项目概览

智能婴儿床监护系统小程序端，基于 UniApp、Vue 3、TypeScript、Pinia 和 uView Plus。

## 常用命令

```bash
npm run dev:mp-weixin    # 微信小程序开发构建
npm run build:mp-weixin  # 微信小程序生产构建
npm run dev:h5           # H5 开发
npm run build:h5         # H5 构建
```

执行 `npm run dev:mp-weixin` 后，用微信开发者工具打开：

```text
dist/dev/mp-weixin
```

## Source Layout

```text
src/
├── api/                 # API layer
│   ├── config.ts        # BASE_URL, TOKEN_KEY, endpoint constants
│   ├── request.ts       # uni.request wrapper with auth token and error handling
│   ├── auth.ts          # Login, register, user info
│   ├── baby.ts          # Baby CRUD
│   ├── family.ts        # Family management and invitations
│   ├── device.ts        # Device management, mode switch, firmware placeholders
│   ├── monitor.ts       # Sensor data and events
│   ├── routine.ts       # EASY schedule and optimization
│   ├── voice.ts         # ASR, TTS, voice clone, chat
│   ├── hardware.ts      # Hardware-related API wrappers only; no standalone hardware page
│   ├── video.ts         # Video stream and management
│   ├── milestone.ts     # Growth milestones, reports, GIFs
│   ├── moment.ts        # Precious moments timeline
│   ├── learning.ts      # AI learning progress
│   ├── system.ts        # System health and storage
│   ├── alarm.ts         # Alarm rules
│   ├── push.ts          # Push history/settings
│   ├── status.ts        # Baby status history
│   ├── interaction.ts   # Content library
│   └── index.ts         # Re-exports
├── common/
│   └── businessModules.ts
├── pages/
│   ├── index/           # Home
│   ├── login/           # Login/register
│   ├── onboarding/      # First-time setup wizard
│   ├── monitor/         # Live monitoring, events, alarm threshold settings
│   ├── ai/              # AI companion / parent chat
│   ├── routine/         # EASY schedule and optimization suggestions
│   ├── growth/          # Growth hub; sensor-history route is not exposed as a card
│   ├── memory/          # Long-term memory timeline
│   ├── milestone/       # Milestones, assets, AI reports
│   ├── moment/          # Precious moments timeline
│   ├── learning/        # AI learning progress
│   ├── device/          # Device list, detail, binding history, mode switch
│   ├── scene/           # Scene linkage
│   ├── video/           # Video playback and records
│   ├── content/         # Interactive content library
│   ├── system/          # System acceptance/health dashboard
│   ├── notification/    # Push notification history
│   ├── my/              # Profile, settings, baby/family/device management
│   ├── baby/            # Baby list and detail
│   ├── module/          # Business module index
│   └── webview/         # WebView for AI recommended content
├── services/
├── stores/
├── static/
├── App.vue
└── main.ts
```

## 当前产品约定

- “硬件联动”不再作为独立页面入口；硬件模式切换和模式策略统一放在 `pages/device/detail.vue` 的“模式切换”区域。
- `pages/my/index.vue` 不展示独立“硬件联动”入口。
- “设备详情”操作列表不展示“切换宝宝”，该功能与全局宝宝选择重复。
- 看护页不再展示单独的”预警规则”卡片；心率、呼吸、哭声、姿态四个小卡片分别进入 `pages/monitor/alarm?metric=...` 设置阈值。
- 看护页和场景联动页的婴儿状态和风险等级由后端 `GET /sensor/status/baby?device_sn=xxx` 接口驱动展示，前端不做本地阈值判断。
- `App.vue` 内置全局危险轮询：每 10 秒调用 `getBabyStatus`，当 `status_level === 3`（危险）时自动弹窗提醒，点击”查看详情”跳转看护页。
- 场景联动页精简为被动展示：不再有模拟触发、自动分类、响应动作面板；场景类型由后端 `status_type` + `status_level` 映射。
- 成长页不展示”数据记录/历史传感器数据”卡片；`pages/growth/sensor-history` 的入口从看护页（`pages/monitor/index.vue`）设备状态卡片的”查看历史”进入，不在成长页作为独立卡片。
- 宝宝年龄统一使用”xx月xx天”精确格式显示（`src/utils/age.ts`），不使用纯月数。
- 设备列表和设备详情的大字标题优先显示 `device_name`（设备自身名称），不使用宝宝名；绑定宝宝信息在”已绑定”蓝色小字中单独展示。
- 所有名称输入框统一限制字符数：用户昵称 20、宝宝昵称 12、家庭名称 16、设备名称 20、音色名称 16。
- 事件记录页事件类型用 `event_type` 字符串匹配 `event_code`（后端 `GET /sensor/events` 返回 `event_type` 字段，无 `event_type_id`）。

## API Layer Pattern

1. `config.ts` 定义 `BASE_URL`、`TOKEN_KEY`、`USER_INFO_KEY` 和 `API` endpoint 常量。
2. `request.ts` 封装 `uni.request`，自动附加 `Authorization: Bearer <token>`，处理 401 跳转和错误提示。
3. Domain API files 调用 request helpers，并定义请求/响应 TypeScript 类型。

Data flow:

```text
Page -> API function in src/api -> request.ts -> uni.request -> backend BASE_URL
```

## 当前联调缺口

- 固件升级：前端在 `src/api/config.ts`、`src/api/device.ts` 和 `pages/device/detail.vue` 中已定义/调用：
  - `GET /device/firmware/version`
  - `POST /device/ota/upgrade`
- 当前后端 `baby_bed_server/app/api/v1/device.py` 尚未实现上述两个路由，所以“固件升级”只能作为前端入口和联调占位。需要后端补充固件版本查询、OTA 任务创建/触发、设备执行状态回传后才能跑通完整闭环。
- 真实视频流、WebSocket 推送、硬件执行回传、语音链路和素材生成仍依赖服务端、硬件端或算法端真实返回。

## 联调分析规则

当用户要求“检查联调”时，优先检查：

1. 是否真实调用后端 API。
2. 是否存在 mock/fallback 数据。
3. 是否存在 try/catch。
4. 是否存在 loading 状态。
5. 是否存在接口成功但页面不刷新的情况。
6. 是否存在只有 UI、没有业务调用的情况。
7. 是否存在操作后未重新请求 API 的情况。

除非用户明确提出，不主动分析 UI 美化、代码风格、架构优化或性能优化。

## Key Config

- Backend URL: `src/api/config.ts`
- Page routing: `src/pages.json`
- Manifest: `src/manifest.json`
- Tab bar icons: `src/static/tabbar/`

## Build Output

- Dev: `dist/dev/mp-weixin`
- Production: `dist/build/mp-weixin`
