# 项目更新日志

## 2026-08-14 设备凭证自动签发、轮换与量产安全收口

> 当前状态：本地代码已完成并通过回归测试，连接 8123 的小程序联调构建已生成；
> 正式构建会在未配置真实 HTTPS 域名时主动失败。8123
> 服务器尚未自动部署，也未对正式 `baby_bed_sql` 执行本轮四表迁移。上线需按
> `DEVICE_CREDENTIALS_DEPLOYMENT_BAOTA.md` 先备份、迁移、灰度，再关闭旧凭证回退。

### 需求与结果

- 解决硬件只能依赖管理员手工生成 Token、后续批量设备无法自行领取凭证的问题。
- 每台设备出厂拥有独立 `device_sn`、硬件激活码和家长认领码；数据库只保存
  绑定设备和用途的 HMAC-SHA256 摘要。
- 新增首次激活、确认、状态、轮换、恢复、家长认领、恢复码、状态查询和吊销接口。
- 新 Token 先进入 `pending`，设备安全落盘后才确认生效；网络重试使用稳定
  `client_request_id`，同一次请求可以重新得到相同 Token，服务端无需保存明文。
- 正常轮换确认后旧 Token 进入默认 300 秒宽限；恢复确认后旧 Token 立即撤销。
- 激活、认领和恢复增加失败计数、临时锁定、Redis 原子限流、`Retry-After`
  以及不包含秘密原文的审计日志。
- 新增显式 `DEVICE_CREDENTIAL_MIGRATION_MODE`，支持旧设备分批升级；严格上线
  检查会阻止迁移模式、匿名注册或旧 Token 回退被误带入最终生产配置。
- 心跳、工作模式、音色、传感器、旧状态、系统上报、视频上传/分析和互动播放
  已接入同一设备鉴权；已认证设备不能给其他宝宝写数据。
- 视频列表、详情、修改和删除改为家长 JWT + 家庭设备权限；视频和封面使用绑定
  类型、文件名及过期时间的短期签名 URL，阻止越权访问、路径穿越和链接长期泄露。
- 视频上传增加 100 MiB 可配置上限、分块写入、MIME 安全扩展名和文件/数据库
  一致性清理；分析接口只能处理当前设备已登记的视频，不再接受任意文件地址。
- 修正家长端视频列表类型与后端 `list + total` 响应的契约漂移，并删除无人使用且
  不符合新鉴权边界的旧 JSON 上传/无签名视频流封装。
- 新增 `build:mp-weixin:test` 与 `.env.test`，当前联调包明确连接 8123；正式构建在
  Vite 配置阶段强制要求真实 HTTPS API/音色域名，避免构建成功后误连占位地址。

### 家长端更新

- 设备列表把“只输入 SN 绑定”升级为“SN + 独立认领码”，不再允许新设备绕过
  出厂所有权验证。
- 设备详情新增安全状态卡片，可查看未初始化、待确认、旧版、正常或已撤销状态。
- 家庭管理员可生成只显示一次的恢复码，并可撤销单台设备访问；敏感值关闭弹窗后
  立即从页面状态清除。
- 统一前端 `ApiError` 读取后端稳定 `error_code`，为认领冲突、凭证锁定和
  服务暂不可用提供可理解的中文提示。
- 主要操作保留图标和文字，点击区域不少于 88rpx，沿用现有家长端视觉系统。

### 后端新增文件

| 文件 | 内容 |
|---|---|
| `app/models/device_credential.py` | 出厂凭证、版本化 Token、恢复码和审计模型 |
| `app/schemas/device_credential.py` | 激活、确认、轮换、恢复、认领和吊销请求校验 |
| `app/services/device_credential_service.py` | 完整凭证状态机、事务、幂等、轮换与恢复 |
| `app/api/v1/device_credentials.py` | 硬件和家长端凭证 API |
| `app/api/hardware_auth.py` | 灰度感知的统一硬件鉴权与宝宝绑定隔离 |
| `migrations/add_device_credentials.sql` | 四张凭证表、唯一索引和设备外键 |
| `scripts/provision_device_factory_credentials.py` | 单台/批量出厂凭证签发与 0600 CSV |
| `tests/test_device_credentials.py` | 凭证生命周期、锁定、启动落盘和硬件隔离测试 |

### 后端修改文件

| 文件组 | 内容 |
|---|---|
| `config.py`、`.env.example` | 凭证、灰度、CORS、文档和生产启动安全校验 |
| `main.py`、`app/core/exceptions.py` | 稳定错误码、校验错误脱敏和 500 信息隐藏 |
| `app/core/device_auth.py`、`rate_limit.py` | 用途绑定 HMAC、版本 Token 和 Redis 原子限流 |
| `app/api/v1/router.py`、`device.py` | 注册凭证路由、关闭匿名注册、认领码绑定 |
| `hardware.py`、`sensor.py`、`status.py`、`system.py`、`video.py` | 统一硬件鉴权与设备/宝宝一致性 |
| `app/services/interaction_service.py` | 新旧 Token 灰度认证和新版 Token 播放初始化判断 |
| `scripts/check_interaction_readiness.py` | 只读检查表、字段、索引、摘要、重复 Token 和安全开关 |
| `.gitignore` | 禁止凭证 CSV、模拟器 Token 和本地安全状态进入 Git |

### 小程序修改文件

| 文件 | 内容 |
|---|---|
| `src/api/config.ts` | 新增认领、凭证状态、恢复码和吊销路径 |
| `src/api/device.ts` | 新增设备凭证类型和家长操作函数 |
| `src/api/request.ts` | 保留后端 `data.error_code` 与附加数据 |
| `src/api/request.test.ts` | 覆盖稳定错误码和网络错误分类 |
| `src/api/video.ts`、`src/pages/video/index.vue` | 对齐签名媒体地址与 `list + total` 响应，移除旧硬件封装 |
| `src/pages/device/list.vue` | 新设备使用认领码绑定及错误引导 |
| `src/pages/device/detail.vue` | 安全状态、一次性恢复码和撤销访问 |
| `vite.config.ts`、`.env.test`、`package.json` | 8123 联调构建与正式 HTTPS 构建门禁 |

### 硬件与部署交付

- `scripts/simulate_interaction_hardware.py` 支持首次自动激活、确认、以
  `0600` 权限原子保存 Token、重启复用、轮询、下载校验和播放状态回报。
- `HARDWARE_API_HANDOFF.md` 已更新为实际接口、请求字段、状态机、错误处理和
  所有硬件私有接口的 `X-Device-Token` 规则。
- `DEVICE_CREDENTIALS_IMPLEMENTATION_AND_PROJECT_FLOW.md` 已从方案稿更新为
  实际代码结构和完整项目运行流程。
- 新增 `DEVICE_CREDENTIALS_DEPLOYMENT_BAOTA.md`，包含宝塔、原数据库迁移、
  HTTPS/Redis、灰度切换、严格检查、联调、正式收口和回滚。

### 验证结果

| 检查项 | 结果 |
|---|---|
| 后端完整测试 | 49 passed、1 skipped，另有 3 个子测试通过；skipped 为需独立 `_test` MySQL 的并发测试 |
| 后端语法检查 | `python -m compileall -q app scripts tests` 通过 |
| 设备凭证专项测试 | 6 passed |
| 视频隐私安全专项 | 未登录访问、签名绑定、路径穿越、扩展名和 OpenAPI 参数测试通过 |
| 前端单元测试 | 2 个测试文件、6 项通过 |
| TypeScript 类型检查 | 通过 |
| 前端顶层依赖树 | `npm ls --depth=0` 通过，无缺失依赖 |
| 微信小程序 8123 联调构建 | `npm run build:mp-weixin:test` 通过，产物为 `dist/build/mp-weixin` |
| 正式构建安全门禁 | 缺少真实 HTTPS API/音色域名时按设计失败，防止发布占位配置 |
| 已知警告 | 1 条 Starlette/httpx 测试依赖弃用警告；现有 uView/Sass 弃用警告 |

### 上线边界

- 本轮没有自动修改远端数据库、宝塔项目环境变量或真实硬件。
- 不能把当前 `http://223.247.96.246:8123` 用于量产凭证传输；正式环境必须 HTTPS。
- `DEVICE_CREDENTIAL_PEPPER` 只能生成一次并安全备份，运行中不可随意更换。
- 正式收口前必须运行
  `check_interaction_readiness.py --strict --require-device-credentials` 并处理所有错误。
- 本机 npm 镜像不提供漏洞审计 API，npm 官方源在当前网络超时；正式发布流水线必须
  在可访问官方安全公告的网络中补跑 `npm audit --omit=dev --audit-level=high`。
- 上线检查会验证宝宝唯一设备和凭证幂等索引的 UNIQUE 属性，避免同名普通索引
  掩盖并发认领/签发风险。

## 2026-08-11 温馨时刻真机下载与分享交付包合并

> 当前状态：已审查并按推荐策略合并外部“温馨时刻真机下载显示”交付包。温馨时刻的真实数据、图片缓存、保存相册和公开分享能力已接入；当前小程序 AppID、8123 接口地址、互动播放和 EgoLife 配置均保留，未被交付包共享配置覆盖。

### 合并策略与兼容性

- 后端 moment 模块与当天完成的互动内容播放模块互不覆盖，可以同时部署。
- 完整合并温馨时刻专用的 API、服务、页面、媒体工具和测试文件。
- src/api/config.ts 只增量加入公开分享接口，保留现有互动播放、EgoLife 和其他 API 常量。
- src/pages.json 只增量注册温馨时刻分享页，不替换已有页面配置。
- 保留当前 src/manifest.json 中的小程序 AppID wxe769b11ab4f64858，不采用交付包中的其他 AppID。
- 不合并交付包的 .env.production，继续由构建环境显式提供后端地址，避免把 HTTP 测试地址固化到正式配置。

### 功能更新

- 温馨时刻时间线改为读取数据库中的真实成长里程碑快照，不再返回模拟图片。
- 后端增加家庭成员权限校验、真实媒体下载地址和有效期 7 天的签名分享令牌。
- 增加无需登录的公开分享接口；公开响应仅返回分享展示所需字段，不暴露宝宝 ID 等内部标识。
- 小程序增加真机 HTTP 测试环境图片缓存，将远程图片下载到本地临时文件后用于预览和保存相册。
- 完善相册权限申请、拒绝后的设置引导、下载失败提示和保存成功反馈。
- 温馨时刻页面接入微信原生分享，新增公开分享落地页，接收方可通过分享令牌查看内容。

### 本轮合并文件

#### 后端

| 文件 | 更新内容 |
|------|----------|
| app/api/v1/moment.py | 增加公开分享接口，保留登录用户的时间线、下载和分享接口 |
| app/services/moment_service.py | 接入真实成长里程碑数据、家庭权限、下载地址和 7 天签名分享令牌 |
| tests/test_moment_service.py | 增加分享令牌、公开响应、权限和时间线服务测试 |

#### 微信小程序

| 文件 | 更新内容 |
|------|----------|
| src/api/moment.ts | 增加公开分享请求、分享路径和真实下载响应类型 |
| src/api/config.ts | 增量增加 MOMENT.PUBLIC，保留当天其他接口配置 |
| src/common/media.ts | 增加媒体 URL 处理、开发环境 HTTP 图片缓存及本地文件复用 |
| src/pages/moment/index.vue | 接入真实图片、预览、保存相册、权限引导和微信原生分享 |
| src/pages/moment/share.vue | 新增无需登录的温馨时刻公开分享页 |
| src/pages.json | 增量注册 pages/moment/share 页面及分享能力 |

### 验证结果

| 检查项 | 结果 |
|--------|------|
| 后端完整测试 | 37 passed，3 个子测试通过；仅 1 条既有 Starlette/httpx 弃用警告 |
| 前端播放逻辑测试 | 4 passed |
| TypeScript 类型检查 | 通过 |
| 微信小程序生产构建 | 通过 |
| 构建产物 | dist/build/mp-weixin，已包含温馨时刻分享页和当天互动播放修复 |
| 数据库迁移 | 本次温馨时刻合并不需要新增迁移 |

### 部署说明

- 后端上传 app/api/v1/moment.py 和 app/services/moment_service.py 后重启 8123 服务；生产环境无需上传测试文件。
- 前端使用当前项目重新构建并导入 dist/build/mp-weixin，不要单独覆盖交付包的 manifest.json 或 .env.production。
- 当前公网地址为 HTTP，仅微信开发版可用于真机联调；体验版和正式版应配置 HTTPS 合法域名后再测试媒体下载与公开分享。

## 2026-08-11 互动内容库驱动硬件播放与家长端可靠性优化

> 当前状态：原先“点击后只在小程序显示正在播放”的互动内容页，已升级为“家长端下发期望状态 → 后端持久化 → 硬件每 2 秒轮询 → 下载并校验音频 → 回报真实状态与进度”的完整链路。代码、协议、模拟客户端和自动化测试已完成；正式数据库迁移、设备令牌发放及真实扬声器验收需在部署环境执行。

### 2026-08-11 联调缺陷修复

- 修复 uView 不支持的 `stop-circle` 图标名称被直接显示为英文的问题，改用小程序原生样式绘制停止图标。
- 修复离线设备收到停止期望状态后，播放器一直显示“正在停止”且按钮无法继续操作的问题；家长端在停止指令成功保存后即可关闭播放器或重新播放，设备恢复连接后仍会保持停止。
- 后端播放控制返回前显式刷新 MySQL 会话默认字段，修复首次创建播放会话时的 SQLAlchemy `MissingGreenlet` 500 错误。
- 将设备未配置播放凭证的提示调整为“设备播放功能尚未初始化，请完成设备配网或联系设备管理员”。
- 远端 8123 检查发现尚未注册 `/api/v1/egolife/*` 网关路由；前端请求路径正确，需要补部署 EgoLife 路由、服务及路由注册文件。
- 前端播放工具测试更新为 4 项并全部通过，TypeScript 类型检查和微信小程序生产构建通过。

### 完成的播放链路

- 小程序通过宝宝 ID 获取服务器内容库，不再接受前端提交任意音频 URL。
- 家长点击播放、暂停、继续或停止后，后端创建带版本号的播放会话和命令，并保存期望状态。
- 硬件使用 X-Device-Token 鉴权，每 2 秒轮询当前期望状态；音频下载链接绑定设备、会话和版本。
- 硬件下载后按 SHA-256 校验并缓存音频，播放期间回报下载、播放、暂停、完成、失败和真实进度。
- 小程序根据设备实际回报显示等待设备、下载中、正在播放、已暂停、完成或失败；停止指令保存后家长端立即结束控制，设备上线后仍保持停止。
- 已停止、完成或失败的终态会话不再向设备返回旧播放动作；设备或服务器重启后不会重复播放已完成歌曲。
- 活跃会话返回最近进度，设备恢复后可从最近上报位置继续；快速连续切歌只保留最后一首。

### 后端可靠性与家长功能

- 新增互动内容、播放会话、播放命令和宝宝收藏数据模型，移除内存互动历史，播放状态在服务重启后仍可恢复。
- 设备增加独立播放令牌哈希；现有注册和心跳接口保持兼容，新播放接口与音频下载强制设备鉴权。
- 同一设备播放控制按设备行加锁，幂等 ID 会校验宝宝、动作、内容和会话；不同请求复用同一 ID 返回 409。
- 播放进度严格限制在 0 到歌曲时长之间；旧会话或旧版本回报不会覆盖当前歌曲。
- 硬件轮询和状态回报成功后刷新设备在线时间，避免“实际播放中但页面显示离线”。
- 音频下载除令牌外，还校验当前设备、当前会话、版本和内容文件名，并保留 Range 下载及 SHA-256 响应头。
- 宝宝与设备调整为一对一绑定；业务接口和数据库唯一索引同时保护。迁移发现重复绑定时会先输出宝宝及设备清单并主动终止，不会自动解绑。
- 内容库返回收藏状态、播放次数和最近播放时间；收藏按宝宝保存，同一家庭成员共享。
- 播放会话增加 15、30、60 分钟定时停止。设备离线期间服务器时间继续计算，到期后设备下一次轮询会收到停止版本。
- 新增 HARDWARE_PUBLIC_BASE_URL，支持反向代理或 HTTPS 部署时向硬件返回可访问的公网音频地址。

### 家长端体验优化

- 页面顶部新增当前宝宝和目标设备卡片，显示宝宝名称、设备名称及在线状态；多宝宝家庭可直接切换。
- 分别处理无宝宝、未绑定设备、设备未配置播放令牌、设备离线、内容为空和接口失败，不再把错误显示成“暂无记录”。
- 增加全部、收藏、最近播放和常播内容快捷筛选；年龄范围转换为家长易读文字。
- 收藏按钮与播放按钮分离；切换歌曲时直接下发并轻提示“已发送到宝宝的设备”。
- 底部播放器增加真实进度、暂停/继续、停止、15/30/60 分钟定时、取消定时、失败重播和终态关闭。
- 主要操作同时使用文字与图标，点击区域不小于 44px；控制请求提交期间禁止重复点击和冲突操作。
- 状态轮询由 setInterval 改为请求完成后的单次 setTimeout：禁止请求重叠，失败按 2/4/8/15 秒退避并自动恢复。
- 切换宝宝或离开页面后通过页面代次保护丢弃旧响应，避免旧宝宝状态覆盖当前页面。
- 新增统一 ApiError，区分网络错误、登录失效和 409 设备配置错误，提供对应重试或处理引导。

### 硬件与部署交付

- 提供完整硬件协议，包含状态机、鉴权、字段、请求响应示例、错误处理、缓存校验和接入流程。
- 提供模拟硬件脚本，可完成轮询、下载、SHA-256 校验、播放计时、暂停、继续、停止和状态回报。
- 提供测试音频种子脚本和三段可区分的短测试 MP3。
- 提供一次性设备播放令牌生成脚本，原始令牌只展示一次。
- 提供只读部署检查脚本，检查迁移状态、重复绑定、音频文件、大小、SHA-256 和设备令牌。

### 本轮全部改动文件

#### 后端、数据库与硬件

| 文件 | 更新内容 |
|------|----------|
| .gitignore | 允许提交 uploads/audio 下的测试 MP3，同时继续忽略其他上传音频 |
| app/core/device_auth.py | 新增设备播放令牌生成、哈希和恒定时间校验 |
| app/models/interaction.py | 新增互动内容、播放会话、播放命令、宝宝收藏模型及定时停止字段 |
| app/models/__init__.py | 注册并导出互动播放相关 ORM 模型 |
| app/models/device.py | 新增 playback_token_hash，并增加宝宝唯一设备约束 |
| app/schemas/interaction.py | 新增播放控制、定时停止和硬件状态回报 Schema；按动作校验 content_id/session_id |
| app/services/interaction_service.py | 实现内容库、收藏、播放控制、幂等、切歌、状态机、进度、定时停止、硬件轮询/回报和音频授权 |
| app/services/device_service.py | 设备绑定增加宝宝行锁和“一名宝宝一台设备”冲突检查 |
| app/api/v1/interaction.py | 新增内容库、收藏、播放控制、定时、状态、分页历史和受保护音频下载接口；旧入口转入新服务 |
| app/api/v1/hardware.py | 新增硬件播放状态轮询和状态回报接口 |
| config.py | 新增 HARDWARE_PUBLIC_BASE_URL 配置 |
| migrations/add_interaction_playback.sql | 创建互动内容、播放会话、播放命令表并增加设备令牌字段 |
| migrations/optimize_interaction_playback.sql | 增加收藏、stop_at、唯一绑定索引；重复绑定时输出清单并停止迁移 |
| scripts/provision_device_playback_token.py | 新增一次性设备播放令牌生成脚本 |
| scripts/seed_interaction_audio.py | 新增测试音频元数据种子脚本 |
| scripts/simulate_interaction_hardware.py | 新增模拟硬件客户端，支持缓存校验、断点恢复和完整状态回报 |
| scripts/check_interaction_readiness.py | 新增只读部署检查，并修复从 scripts 目录直接运行时的项目根导入 |
| tests/test_interaction_playback.py | 新增令牌、参数校验、状态机、进度限制、终态和路径安全测试 |
| uploads/audio/test_lullaby.mp3 | 新增短测试摇篮曲音频 |
| uploads/audio/test_rabbit.mp3 | 新增短测试儿歌音频 |
| uploads/audio/test_story.mp3 | 新增短测试故事音频 |
| HARDWARE_INTERACTION_PLAYBACK_API.md | 新增硬件播放协议、鉴权、状态机、示例、错误码和部署流程 |

#### 微信小程序

| 文件 | 更新内容 |
|------|----------|
| src/api/request.ts | 新增可识别 HTTP 状态、业务错误和重试属性的 ApiError |
| src/api/config.ts | 新增播放状态、控制、定时和收藏接口路径 |
| src/api/interaction.ts | 新增内容库统计、收藏、播放控制、状态、历史和定时停止类型及请求封装 |
| src/pages/content/index.vue | 重构家长端内容页、宝宝/设备卡片、快捷筛选、播放器、错误状态和可靠轮询 |
| src/pages/content/playback-utils.ts | 抽离退避时间、终态判断、进度归一化和旧响应判断 |
| src/pages/content/playback-utils.test.ts | 新增轮询退避、终态和进度逻辑单元测试 |
| package.json | 新增 typecheck、Vitest 测试命令和测试依赖 |
| package-lock.json | 更新前端测试依赖锁定版本 |
| vitest.config.ts | 新增独立 Vitest 配置，避免加载 UniApp 构建插件 |
| 更新日志wgh.md | 记录互动播放完整实现、文件清单、验证结果和部署要求 |
| ../../实习.md | 补充互动内容库、硬件状态机、家长端可靠性与测试实践 |

### 验证结果

| 检查项 | 结果 |
|--------|------|
| 后端完整测试 | 30 passed，1 条既有 Starlette/httpx 弃用警告 |
| 前端播放逻辑测试 | 3 passed |
| TypeScript 类型检查 | 通过 |
| 微信小程序生产构建 | 通过 |
| FastAPI OpenAPI | 收藏、定时、硬件状态和回报路由已注册 |
| 测试音频 | 3 个 MP3 均存在，大小各 60858 字节 |
| H5 本地可访问性 | HTTP 200 |
| 构建警告 | 仅现有 uView/Sass @import 和 legacy API 弃用警告 |

浏览器截图级视觉检查因本机 Windows 自动化沙箱启动异常未完成，但 H5 服务、小程序构建、类型检查和逻辑测试均已通过。

### 上线顺序与剩余验收

1. 备份数据库，并运行部署检查脚本查看重复绑定；重复宝宝必须人工确认和解绑。
2. 依次执行 migrations/add_interaction_playback.sql 和 migrations/optimize_interaction_playback.sql。
3. 运行测试音频种子脚本，为所有已绑定设备生成并安全交付一次性播放令牌。
4. 配置硬件可访问的 HARDWARE_PUBLIC_BASE_URL，并部署后端。
5. 运行 python scripts/check_interaction_readiness.py --strict，所有检查通过后再发布小程序和设备固件。
6. 在名称以 _test 结尾的一次性测试库完成迁移、重启持久化、快速切歌和定时停止验收。
7. 使用真实设备验证播放、暂停、继续、切歌、停止、自然完成、断网恢复及设备/服务器重启不重播。

本轮没有直接迁移当前数据库，也没有向真实硬件下发播放指令，避免影响正式数据和设备。

## 2026-08-05 小程序控制台兼容与 8123 状态轮询修复

> 本轮只修改小程序前端和项目文档，没有修改 8122、8123 后端代码或数据库。修复范围包括静态资源 500、重复 `wx:key`、微信 API 弃用警告，以及 8123 宝宝状态轮询的超时和 422 未授权请求。

### 问题与修复

- 修复 `/static/logo.png` 返回 500：将现有 Logo 复制到 UniApp 实际参与打包的 `src/static/logo.png`，生产包和开发包均能生成 `static/logo.png`。
- 修复成长页重复 `wx:key="成长洞察"`：周摘要和记忆预览均改为“内容 + 索引”的稳定唯一键。
- 将项目源码中的 7 处 `uni.getSystemInfoSync()` 替换为 `uni.getWindowInfo()`，覆盖首页、成长、传感器历史、监控、我的、引导页和视频播放页。
- 修复应用每 10 秒调用 8123 `GET /api/v1/sensor/status/baby` 时，超时异常没有捕获而产生裸 `Error: timeout` 的问题。
- 状态轮询增加请求互斥：上一轮未完成时跳过下一轮，避免弱网下请求堆积。
- Token 不存在或过期时立即停止状态轮询，避免继续发送缺少 `Authorization` 的请求并反复得到 HTTP 422。
- 应用启动时刷新用户信息增加异常捕获；刷新失败保留本地会话，不再产生未处理 Promise。

### 接口核对结果

- 报错接口属于 8123：`GET /api/v1/sensor/status/baby?device_sn=...`，不属于 8122 Growth 服务。
- 远程 8123 OpenAPI 确认该接口要求 `device_sn` 查询参数及 `Authorization: Bearer <token>` 请求头。
- 对远程接口执行无 Token 的只读请求，HTTP 422 响应明确为 `header.authorization Field required`；因此 `device_sn=12312576163` 本身不是错误原因。
- 8122 测试后台、`/schedule/age-groups` 和 `/growth/reminders` 同期只读检查均返回 HTTP 200，本次问题与 8122 无关。

### 本轮全部改动文件

| 文件 | 更新内容 |
|------|----------|
| `src/App.vue` | 捕获8123状态轮询异常、阻止并发轮询、Token缺失时停止轮询、捕获用户信息刷新异常 |
| `src/static/logo.png` | 新增到UniApp源码静态资源目录，修复编译后Logo缺失 |
| `src/pages/growth/index.vue` | 修复两个列表的重复key，并替换弃用的系统信息API |
| `src/pages/growth/sensor-history.vue` | 替换弃用的系统信息API |
| `src/pages/index/index.vue` | 替换弃用的系统信息API |
| `src/pages/monitor/index.vue` | 替换弃用的系统信息API |
| `src/pages/my/index.vue` | 替换弃用的系统信息API |
| `src/pages/onboarding/index.vue` | 替换弃用的系统信息API |
| `src/pages/video/player.vue` | 替换弃用的系统信息API |
| `更新日志.md` | 记录本轮问题、接口核对、修改文件和验证结果 |
| `实习.md` | 补充本轮排查与修复工作记录 |

### 验证结果

- 项目 `src` 目录已无自有代码调用 `getSystemInfoSync`；若 `vendor.js` 仍出现同名警告，来源是 UniApp/uView 的兼容回退代码。
- `npm run build:mp-weixin` 通过，产物位于 `dist/build/mp-weixin`。
- `npm run dev:mp-weixin` 已生成最新 `dist/dev/mp-weixin`；该命令为持续监听模式，外部停止监听不代表首轮编译失败。
- 开发产物已确认包含 Logo、唯一列表 key、`getWindowInfo`、状态轮询异常捕获和 Token 检查。
- 构建仅保留项目依赖原有的 uView/Sass `@import` 弃用警告，不影响小程序产物。

## 2026-08-05 喂养打卡接口接入与智能作息承接

> 当前状态：基础喂养打卡已由旧的 `/feeding-records` CRUD 契约切换到 8122 新增的 `/mp/checkin` 事件流接口；智能作息中的喂养计划可以直接进入打卡并回写“已打卡”状态。正式发布仍需部署更新后的 8123 认证网关。

### 新喂养打卡接口

- 根据《Baby-EgoLife Growth API（增量：相对长记忆18接口）》接入 `GET /mp/checkin/types`、`POST /mp/checkin` 和 `POST /mp/checkin/undo`。
- 前端不再调用返回 404 的 `/feeding-records`；喂养历史统一从 `GET /events` 中读取 `eat/feed/feeding` 实际事件。
- 保留母乳、配方奶、混合喂养、辅食、奶量、喂养时长、哺乳侧、拍嗝和备注表单，并按新接口契约转换为 `type/date/time/note`。
- 打卡成功后支持通过事件流查看记录；仅对 `mp-` 开头的小程序打卡事件显示“撤销打卡”，避免误撤销传感器事件。
- 8123 本地认证网关增加 `/api/v1/egolife/mp/checkin/types`、`/mp/checkin` 和 `/mp/checkin/undo` 三条转发路由，继续由网关注入可信宝宝身份。

### 与智能作息表的承接关系

- 智能作息表的每条“喂养”日程新增“去打卡/HH:mm 已打卡”状态。
- 从日程进入喂养页时自动携带计划 ID、活动名称、当天日期和计划开始时间，喂养页显示“承接智能作息”提示。
- 提交事件的 `note` 中记录计划 ID 和计划名称；返回作息页后重新读取 `/events`，优先按计划 ID、其次按计划名称和两小时内最近时间匹配实际喂养事件。
- 打卡成功后自动返回智能作息页；该 `eat` 事件继续作为 EASY、Habit 和成长报告的实际行为数据来源。

### 接口限制与验证

- 新增接口没有记录修改能力，因此当前支持新增、补记、查看和撤销，不提供直接编辑。
- OpenAPI 请求 Schema 只明确了 `type/date/time/note`，尚无结构化 `schedule_id` 字段；当前将计划 ID 写入 `note` 实现关联，后端后续应补充正式字段。
- `GET /mp/checkin/types` 已在 8122 实测 HTTP 200；为避免污染共享服务器，没有自动执行有效的 `POST /mp/checkin` 或撤销写操作，最终写入和回显需在小程序中人工确认。
- `npx tsc --noEmit`、`npm run build:mp-weixin` 均通过，`dist/dev/mp-weixin` 已更新；构建仅有既有 uView/Sass 弃用警告。

## 2026-08-04 Baby-EgoLife 8122 接入、迁移审计与安全修复

> 本节记录 2026-08-04 的迁移状态；喂养能力已在 2026-08-05 改接 `/mp/checkin`，最新状态以上一节为准。

### 本轮补充：作息日程表单与时间选择

- 补齐全年龄段“新增日程”入口；公共月龄模板使用“复制并编辑”，个人日程支持编辑和删除，避免直接修改公共模板。
- 修复新增个人日程后其他公共节点被隐藏的问题，页面会合并显示公共模板与当前宝宝的个人日程。
- 时间范围改为左右两列“开始：HH:mm / 结束：HH:mm”，点击后使用项目已有的 `u-datetime-picker` 滚轮选择，解决原生 `picker` 在底部弹层内无法选中的问题。
- 前端将选择结果转换为 8122 需要的 `time_range`，结束时间早于开始时间时按次日处理。
- 日程保存失败会区分 404、服务器错误和网络错误，直接提示可能的后端接口问题，不再只显示笼统的“保存失败”。
- `npx tsc --noEmit`、`npm run build:mp-weixin` 和 `npm run dev:mp-weixin` 均已通过；最新开发产物位于 `dist/dev/mp-weixin`。
- 为避免污染共享测试服务器，本轮未自动提交新增、修改或删除数据；`POST/PUT/DELETE /schedule` 的最终写入结果仍需在小程序中人工操作确认。



### 服务边界

| 服务 | 职责 |
|------|------|
| 8123 | 登录、家庭、宝宝基础档案、设备、媒体、里程碑、普通语音，以及 8122 的登录态认证代理 |
| 8122 | 日程、提醒、EASY、习惯优化、行为事件、长期记忆、成长报告和宝宝数据问答 |
| 小程序 | 开发环境直连 8122；生产环境自动走 8123 的 `/api/v1/egolife` HTTPS 网关 |

旧 `/api/v1/routine/*` 定义暂时保留作代码级回退，但首页、作息、优化、记忆、成长和通知等运行页面已经没有旧作息接口调用，也没有新旧日程双写。

### 小程序更新

- 新增 `src/api/egolife.ts`，兼容 8122 的 `{ status: "ok", data }` 和 8123 的 `{ code: 0, data }` 响应。
- 首页“今日作息”和育儿建议分别接入 `/growth/reminders`、`/growth/coach`。
- 作息页接入月龄、日程、提醒和日程增删改，并新增独立“新增日程”表单。
- 日程时间改为左右排列的“开始/结束”弹出式选择器，修复原生选择器在日程弹层内无法选中的问题；自动生成后端需要的 `time_range`，并支持跨天时间。
- 公共月龄模板支持“复制并编辑”，复制后成为当前宝宝的个人日程，公共模板本身不会被修改。
- 个人日程仅替换活动与类型相同的公共节点；新增一条个人日程不会再隐藏其他月龄模板。
- 保存个人计划支持失败后断点补存，按活动和类型计数，避免重试重复创建。
- 过滤时间或活动无效的上游日程，避免服务器脏数据直接进入页面或个人计划。
- 日程更新只提交允许修改的业务字段，不再回传 `id/family_id/device_sn/baby_id`。
- EASY 优化页按真实对象结构解析 `deviations.by_type/significant_samples`，并使用 `coach_lines`。
- Habit Apply 先调用 `dry_run=true` 展示预览，家长确认后才正式应用。
- 记忆页区分计划日程、实际事件、每日摘要和长期记忆，并补读 `raw_text/sentence` 正文字段。
- 成长页和报告页接入周报/月报；日报继续使用 8123 原报告，因为 8122 不支持 `period=day`。
- AI 页面增加“宝宝数据问答”，与普通语音助手使用独立历史。
- 消息中心将 Growth 作息提醒与 8123 设备告警、系统通知分组展示。
- 喂养页面已在 2026-08-05 改接 `/mp/checkin` 事件流，旧 `/feeding-records` CRUD 契约不再由运行页面调用。
- 开发环境使用测试 8122；生产构建强制走 8123 网关，并通过 `VITE_API_BASE_URL` 配置 HTTPS 域名。
- 新增 `.env.example` 和 Vite 类型声明；修复 `voice.ts` 原有 `BASE_URL` 缺失导入。

### 8123 认证代理更新

新增 `/api/v1/egolife` 代理，覆盖：

- 日程月龄、查询、新增、更新和删除。
- Growth Meta、宝宝 Growth Profile、提醒、EASY、Coach、Habit 和 Habit Apply。
- 行为事件查询、新增及 `PUT /events/{event_id}`。
- 长期记忆、每日摘要、成长报告、宝宝问答和问答历史。
- 保留旧 `/feeding-records` 转发契约，同时新增并实际使用 `/mp/checkin/types`、`/mp/checkin`、`/mp/checkin/undo`。

安全与可靠性修复：

- 根据“目标宝宝所属家庭 + 当前用户有效成员关系 + can_view=1”精确校验权限，不再取用户第一条家庭关系。
- 从 8123 的家庭、宝宝和设备关系生成可信 `family_id/device_sn/baby_id`。
- 查询参数和写请求正文中的身份字段均由服务端强制覆盖，客户端无法伪造其他家庭或宝宝身份。
- 接受上游所有 2xx，并统一转换上游超时、连接失败、无效 JSON 和业务错误。
- 增加显式 ID 映射配置 `EGOLIFE_CONTEXT_MAP_JSON`，用于 8123 与 8122 ID 不一致的部署环境。
- 新增代理权限、映射、身份覆盖及动态写路由测试。

### 8122 实测结果

测试上下文：`family01 / BB20240003 / baby_id=111`。本次只执行 GET 和 `dry_run=true`，没有新增、修改或删除服务器业务数据。

| 接口或能力 | 结果 |
|------------|------|
| `/schedule/age-groups`、`/schedule` | HTTP 200 |
| `/growth/meta`、`/growth/baby-profile` | HTTP 200 |
| `/growth/reminders`、`/growth/easy`、`/growth/coach`、`/growth/habit` | HTTP 200 |
| `/events`、`/memory`、`/summaries/day` | HTTP 200 |
| `/reports/summary?period=week` | HTTP 200 |
| `/reports/summary?period=month` | HTTP 200 |
| `/qa/history` | HTTP 200 |
| `POST /growth/habit/apply` + `dry_run=true` | HTTP 200，未写数据 |
| `/reports/summary?period=day` | HTTP 400，上游不支持 |
| `/reports/summary?period=weekly` | HTTP 400，必须使用 `week` |
| `/feeding-records` | HTTP 404，上游尚未实现 |

### 已发现但需要 8122 后端处理的问题

1. **结构化喂养 CRUD 仍缺失**：`/feeding-records` 仍为 404；基础打卡已改用 `/mp/checkin`，但记录编辑、独立分页和结构化字段仍需后端扩展。
2. **日程脏数据**：测试库 `schedule id=118、119` 的 `time_range/activity/appTip/app_push` 为“1”。前端已过滤，后端仍应删除或修正，并增加写入校验。
3. **报告周期契约不统一**：当前仅支持 `week/month`；如要提供行为日报，需要实现 `period=day`。Apifox 示例不能使用 `weekly/monthly`。
4. **Apifox 文档需更新**：将写死事件路径改为 `PUT /events/{event_id}`，将错误的 `GET /schedule/82` 改为 `PUT /schedule/{id}`，并补齐 Growth、月龄和 `/mp/checkin*` 接口的完整 Schema。
5. **正式身份与权限**：8122 自身仍应对所有写接口做家庭权限和幂等校验，不能只依赖 8123 代理。
6. **正式发布域名**：微信小程序不能以 HTTP IP 发布，必须部署 8123 HTTPS 网关并配置微信 request 合法域名。

### 验证结果

| 检查项 | 结果 |
|--------|------|
| TypeScript `tsc --noEmit` | 通过 |
| 微信小程序生产构建 | 通过，产物位于 `dist/build/mp-weixin` |
| Python 编译检查 | 通过 |
| 后端完整测试 | `22 passed` |
| FastAPI 动态写路由 OpenAPI 断言 | 通过 |
| 旧 `API.ROUTINE` 运行时调用 | 未发现 |
| Habit Apply 实测 | dry-run 通过，未执行正式写入 |
| 构建警告 | 仅现有 uView/Sass `@import` 弃用警告 |

### 部署与联调顺序

1. 先人工验证 `/mp/checkin` 新增、`/events` 回显和 `/mp/checkin/undo` 撤销；如需要直接编辑喂养记录，再由 8122 后端补充结构化 CRUD 或 `schedule_id` 字段。
2. 发布 8123 新代理代码，配置 `LTM_API_URL` 和必要的 `EGOLIFE_CONTEXT_MAP_JSON`。
3. 使用真实登录账号验证 `GET /api/v1/egolife/context?baby_id=...` 的三项身份映射。
4. 在测试环境依次验证日程只读、个人计划写入、Habit dry-run/确认应用和宝宝切换。
5. 配置 `VITE_API_BASE_URL=https://正式域名/api/v1` 后重新构建小程序。
6. 完成微信开发者工具真机回归后再上传体验版；不要把本地 `.env`、Token 或测试数据提交到仓库。

修改内容：
前端/.env.example
前端/src/api/config.ts
前端/src/api/egolife.ts
前端/src/api/index.ts
前端/src/api/voice.ts
前端/src/pages.json
前端/src/pages/ai/index.vue
前端/src/pages/feeding/index.vue
前端/src/pages/growth/index.vue
前端/src/pages/index/index.vue
前端/src/pages/memory/index.vue
前端/src/pages/milestone/report.vue
前端/src/pages/notification/index.vue
前端/src/pages/routine/index.vue
前端/src/pages/routine/optimize.vue
前端/src/vite-env.d.ts
前端/更新日志.md

后端/.env.example
后端/app/api/v1/egolife.py
后端/app/api/v1/router.py
后端/app/services/egolife_service.py
后端/config.py
后端/tests/test_egolife_service.py

实习.md

## 2026-08-03 清缓存误删宝宝信息最终修复

### 根因

- 设置页调用 `uni.clearStorageSync()`，全量删除了登录 Token、用户、家庭、宝宝和订阅数据。
- Token 被删除后，后续 `/api/v1/baby/list` 请求会因未授权而失败。
- 宝宝 Store 在列表接口返回非成功状态时继续调用 `clearBabyCache()`，把内存和本地宝宝信息再次清空。

### 修复内容

| 文件 | 更新内容 |
|------|----------|
| `src/pages/my/settings.vue` | 删除全量清缓存及备份恢复逻辑，改为按白名单选择性删除可丢弃缓存 |
| `src/stores/baby.ts` | 接口失败或响应异常时保留现有宝宝 Store 和本地缓存，不再误调用 `clearBabyCache()` |

设置页现在只清理：

- `interaction_history`：内容浏览、播放历史
- `interaction_counts`：内容交互计数

登录 Token、用户信息、家庭信息、宝宝列表、当前宝宝、头像和微信订阅状态均会保留。

本次修复没有新增或修改后端 API；此前 `/api/v1/baby/list` 和 `/api/v1/baby/{baby_id}` 的 `avatar_url` 响应契约继续保留。

### 验证结果

- `npm run build:mp-weixin` 生产构建通过。
- 编译产物的设置页不再包含 `clearStorageSync`，只调用 `removeStorageSync` 清理两项白名单缓存。
- `git diff --check` 通过。

## 2026-08-03 宝宝头像响应契约修复

### 问题与处理结果

设置页清理缓存后，前端需要重新依赖宝宝接口恢复头像数据。本次检查确认 `BabyService` 和 `BabyInfo` 已包含 `avatar_url`，进一步将列表、详情接口绑定到同一宝宝响应模型，避免通用响应使用 `Any` 时接口文档和客户端契约不明确。

本次没有新增 API 路由，仅升级以下两个已有接口：

| 方法 | 路径 | 更新后的响应契约 | 说明 |
|------|------|------------------|------|
| `GET` | `/api/v1/baby/list` | `ApiResponse[list[BabyInfo]]` | `data` 中每个宝宝均返回 `avatar_url: string \| null` |
| `GET` | `/api/v1/baby/{baby_id}` | `ApiResponse[BabyInfo]` | 宝宝详情返回 `avatar_url: string \| null` |

### 文件变更

| 文件 | 更新内容 |
|------|----------|
| `app/api/v1/baby.py` | 为宝宝列表和详情路由声明明确的泛型响应模型，共用 `BabyInfo` |
| `app/schemas/base.py` | 将 `ApiResponse.data` 从 `Any` 调整为 `T \| None`，使泛型响应模型真正生效 |
| `tests/test_baby_response.py` | 新增列表、详情响应保留 `avatar_url` 的两项契约测试 |

`app/services/baby_service.py` 原有列表和详情数据组装均已包含 `avatar_url`，本次未修改该文件。

### 验证结果

| 检查项 | 结果 |
|--------|------|
| 后端完整测试 | `10 passed` |
| OpenAPI `/api/v1/baby/list` | 引用 `ApiResponse_list_BabyInfo__` |
| OpenAPI `/api/v1/baby/{baby_id}` | 引用 `ApiResponse_BabyInfo_` |
| `BabyInfo.avatar_url` | `string \| null` |

部署时需要重新发布后端源代码；如果服务器使用 `app.zip` 部署，需要重新生成部署包。

## 2026-07-30 最终交付汇总

> 更新范围：微信小程序前端、FastAPI 后端、数据库及微信订阅消息投递链路。
> 当前状态：功能开发、本地数据库初始化、后端测试和小程序构建均已完成；服务器域名、HTTPS 和远程数据库迁移仍需在部署时配置。

### 功能结果

本次更新已形成完整链路：

```text
用户登录系统账号
  → 用户主动点击开启消息通知
  → 微信返回模板订阅结果
  → 后端绑定当前账号与微信 OpenID
  → 后端保存订阅状态和可发送次数
  → 设备上报婴儿哭声事件
  → 后端生成通知和逐用户投递任务
  → 后台任务调用微信订阅消息接口
  → 用户微信收到“检测报告通知”
  → 点击消息进入哭声事件详情页
```

微信订阅消息不能根据用户填写的普通“微信号”直接发送。本项目使用系统内部 `user_id` 查找用户绑定的 OpenID，并要求用户先在小程序内主动同意订阅。

### 前端更新汇总

| 文件 | 更新内容 |
|------|----------|
| `src/api/config.ts` | 新增微信绑定、模板、订阅确认、订阅查询、测试发送和推送历史接口路径 |
| `src/api/auth.ts` | 新增 `bindWechat()`，将当前系统账号绑定到本次微信登录身份 |
| `src/api/push.ts` | 新增推送设置、模板、订阅状态、订阅确认、测试消息和历史记录的类型及请求函数 |
| `src/utils/subscribe.ts` | 封装 `uni.requestSubscribeMessage`，返回各模板真实授权状态；新增微信身份绑定流程 |
| `src/pages/my/settings.vue` | 增加消息通知、哭声报警、免打扰设置、订阅状态和剩余次数展示 |
| `src/pages/onboarding/index.vue` | 增加用户主动开启通知的引导流程，并从后端获取真实模板 ID |
| `src/pages/notification/index.vue` | 对齐后端通知级别，展示逐用户投递历史，并支持进入真实哭声事件详情 |
| `src/manifest.json` | 微信小程序 AppID 与实际项目配置保持一致 |

前端授权行为调整：

- 废止进入页面时自动弹出订阅授权框的旧逻辑。
- 只有用户主动点击“开启通知”或打开“消息通知”开关时才请求微信订阅。
- 授权后依次完成微信身份绑定、订阅结果确认和推送偏好保存。
- 支持识别 `accept`、`reject`、`ban`、`filter` 四种微信结果。
- 支持显示一次性订阅剩余次数、额度耗尽和永久拒绝状态。
- 消息筛选值与后端统一为 `warning`、`alert`、`emergency`。
- 存在真实事件 ID 时，点击消息进入 `pages/monitor/detail?id={event_id}`。

### 后端更新汇总

| 文件或模块 | 更新内容 |
|------------|----------|
| `app/clients/wechat_client.py` | 获取和缓存微信 access_token，发送订阅消息，token 失效时刷新并重试 |
| `app/models/push_preference.py` | 保存用户微信通知、哭声报警、短信及免打扰设置 |
| `app/models/wechat_subscription.py` | 保存模板授权状态、订阅类型、剩余次数和幂等请求 ID |
| `app/models/push_delivery.py` | 保存逐用户投递任务、状态、重试次数、跳过原因和微信错误码 |
| `app/models/push_notification.py` | 增加事件类型、去重键和严重级别 |
| `app/services/push_service.py` | 实现设置、订阅、排队、过滤、发送、重试和历史查询完整业务 |
| `app/services/sensor_service.py` | 传感器哭声检测成功后创建推送任务 |
| `app/services/status_service.py` | 硬件哭声上报及状态切换接入推送，并避免连续哭闹重复建事件 |
| `app/services/auth_service.py` | 复用 code-to-OpenID 逻辑，增加安全绑定和绑定冲突保护 |
| `app/api/v1/push.py` | 新增及升级微信推送接口 |
| `app/api/v1/auth.py` | 新增登录态微信绑定接口 |
| `app/schemas/push.py` | 增加设置、订阅确认和测试发送请求校验模型 |
| `config.py` | 增加微信、模板、测试白名单、冷却和后台任务配置 |
| `main.py` | 增加微信投递后台任务、超时任务恢复和安全关闭逻辑 |
| `migrations/add_wechat_push_support.sql` | 增加推送字段及三张微信推送数据表 |
| `scripts/init_local_database.py` | 为全新空数据库初始化当前 ORM 表 |
| `tests/test_push_unit.py` | 增加免打扰、模板字段和 token 缓存单元测试 |
| `WECHAT_PUSH_DEPLOYMENT.md` | 增加配置、迁移、启动和测试发送说明 |

后端可靠性规则：

- 每次一次性订阅成功增加一次可发送额度，成功发送后扣减一次。
- 同一个哭声事件使用 `dedupe_key` 防止重复创建通知。
- 每位家庭成员建立独立投递记录，单个用户失败不影响其他用户。
- 只向有效家庭成员且 `can_receive_push=1` 的用户创建任务。
- 检查 OpenID、推送开关、哭声开关、订阅状态、剩余额度和免打扰时段。
- 同一宝宝和用户在五分钟内不重复发送相同或更低级别报警。
- 严重程度升高时允许立即发送；三级报警不受免打扰限制。
- 失败任务按 `10 秒 → 60 秒 → 300 秒` 重试。
- `processing` 状态超过五分钟会被重新认领，避免任务丢失。
- AppSecret、access_token 和 OpenID 不返回前端，也不写入普通业务日志。

### 新增及升级接口

所有路径均使用 `/api/v1` 前缀，并要求登录后的 Bearer Token。

| 方法 | 路径 | 请求或查询字段 | 用途 |
|------|------|----------------|------|
| `GET` | `/api/v1/push/templates` | 无 | 获取后端实际启用的模板 ID、订阅类型和启用状态 |
| `GET` | `/api/v1/push/settings` | 无 | 获取 `channel_app`、`channel_sms`、`cry_alert_enabled`、`quiet_hours` |
| `PUT` | `/api/v1/push/settings` | `channel_app?`、`channel_sms?`、`cry_alert_enabled?`、`quiet_hours?` | 更新推送偏好；免打扰格式为 `HH:mm-HH:mm`，传 `null` 可清空 |
| `POST` | `/api/v1/auth/wechat-bind` | `{ "code": "uni.login 返回的临时 code" }` | 将当前登录账号绑定到当前小程序 OpenID |
| `POST` | `/api/v1/push/subscriptions/confirm` | `client_request_id`、`results[]` | 保存 `accept/reject/ban/filter` 状态并幂等累计订阅额度 |
| `GET` | `/api/v1/push/subscriptions` | 无 | 查询模板状态、订阅类型、剩余次数和是否需要重新订阅 |
| `POST` | `/api/v1/push/test` | `target_user_id`、`baby_id`、`message`、`level?`、`occurred_at?` | 向同一家庭的指定系统用户发送测试消息 |
| `GET` | `/api/v1/push/history` | `page?`、`page_size?`、`push_type?` | 查询逐用户投递状态、跳过原因、微信错误码和事件跳转信息 |

接口重要限制：

- `target_user_id` 是系统用户 ID，不是微信号。
- 测试消息 `message` 长度为 1～20 个字符，`level` 为 1～3。
- `/push/test` 只有在 `PUSH_TEST_ENABLED=true` 且调用者位于 `PUSH_TEST_ALLOWED_USER_IDS` 中时可用。
- 测试调用者、目标用户和宝宝必须属于同一家庭。
- `client_request_id` 用于防止同一次微信授权结果重复增加可发送额度。
- 推送历史状态包括 `pending`、`processing`、`sent`、`failed`、`skipped`。

### 数据库更新汇总

`push_notifications` 新增：

- `event_type`：关联事件类型。
- `dedupe_key`：通知去重键，带唯一索引。
- `severity`：报警严重程度。

新增数据表：

| 表名 | 作用 |
|------|------|
| `push_preferences` | 用户推送偏好和免打扰设置 |
| `wechat_subscriptions` | 微信模板授权状态和剩余次数 |
| `push_deliveries` | 每位用户的微信投递记录 |

### 微信模板 8557

| 模板内容 | 微信字段 | 后端字段 | 实际值 |
|----------|----------|----------|--------|
| 检测设备 | `thing1` | `device` | 设备名称；无名称时使用设备 SN |
| 生成时间 | `time12` | `occurred_at` | `YYYY-MM-DD HH:mm` |
| 温馨提示 | `thing11` | `message` | 哭声报警文案，最多 20 个字符 |

模板 ID：`SxTRB612hERgov6bY8l7v_Pv1T2xd6TNQgf5nvWjht4`。

### 验证结果

| 检查项 | 结果 |
|--------|------|
| Python 语法编译 | 通过 |
| 后端单元测试 | `8 passed` |
| MySQL 8.2.0 | 连接和读写正常 |
| `FOR UPDATE SKIP LOCKED` | 实际执行通过 |
| 本地数据库初始化 | 成功创建 28 张 ORM 表 |
| `/`、`/api/v1/health`、`/openapi.json` | HTTP 200 |
| 微信 access_token 获取 | 成功，token 内容未输出 |
| 手动测试通知入库 | 通过 |
| 自动哭声事件、通知及投递记录创建 | 通过 |
| 小程序生产构建 | 通过，产物位于 `dist/build/mp-weixin` |

本地测试账号尚未在真机绑定 OpenID，因此模拟投递结果为 `skipped / wechat_not_bound`，属于预期行为。真实送达测试需要在真机小程序中登录并主动接受订阅。

### 服务器部署前待完成

1. 将 `src/api/config.ts` 的 `PROD_BASE_URL` 从 `https://127.0.0.1:8080/api/v1` 改为真实 HTTPS API 域名。
2. 在服务器单独创建 `.env`，不要上传本地 `.env`。
3. 使用独立 MySQL 账号，不使用本地测试的 `root` 账号。
4. 备份远程数据库，并执行一次 `migrations/add_wechat_push_support.sql`。
5. 配置 Nginx、HTTPS 证书和微信公众平台 `request` 合法域名。
6. 体验版使用 `WECHAT_MINIPROGRAM_STATE=trial`，正式版使用 `formal`。
7. 正式环境设置 `PUSH_TEST_ENABLED=false` 并清空测试白名单。
8. 重新执行 `npm run build:mp-weixin`，通过微信开发者工具上传 `dist/build/mp-weixin`。

---

## 历史记录

> **日期：** 2026-07-27
> **更新简介：** 新增微信小程序订阅消息推送功能，支持用户订阅模板消息、开关推送、并在引导页和设置页管理推送偏好。

---

## 一、新增文件

### 1. `src/utils/subscribe.ts` — 微信订阅消息工具

**作用：** 封装微信订阅消息的订阅请求和状态管理，供引导页和设置页调用。

| 导出 | 说明 |
|------|------|
| `SUBSCRIBE_TEMPLATES` | 模板 ID 配置对象（当前 ALERT 已填，REMINDER/REPORT 待补） |
| `SUBSCRIBED_KEY` | 本地存储 key，用于记录用户是否曾完成过订阅 |
| `hasRequestedSubscribe()` | 读取本地存储，判断用户是否曾订阅过 |
| `markSubscribeDone()` | 写入本地存储，标记已订阅 |
| `requestSubscribe(tmplIds)` | 调 `uni.requestSubscribeMessage` 弹出微信授权框，至少一个模板 accept 即算成功 |

---

## 二、修改文件

### 2. `src/api/push.ts` — 推送 API 层

**新增函数：**

```typescript
export function getPushSettings()
// 作用：封装 GET /push/settings，拉取后端用户的 channel_app、channel_sms、quiet_hours
// 接口：GET /api/v1/push/settings
```

已有函数未改：
```typescript
export function getPushHistory(params?)   // 获取推送历史列表
export function updatePushSettings(data)   // 保存推送偏好设置
```

---

### 3. `src/pages/onboarding/index.vue` — 引导页

#### 新增导入

```diff
+ import { updatePushSettings } from '@/api/push'
+ import { SUBSCRIBE_TEMPLATES, requestSubscribe, hasRequestedSubscribe } from '@/utils/subscribe'
```

#### 新增变量

```typescript
const subscribeDone = ref(hasRequestedSubscribe())   // 控制卡片显隐
const subscribeLoading = ref(false)                   // 按钮加载状态
```

#### 新增 UI — 完成页（currentStep === 3）订阅卡片

显示条件：`v-if="!subscribeDone"`（未订阅过才显示）

卡片内容包括：
- 标题「开启消息通知」
- 三个权益项：宝宝哭了即时提醒、每周/每月成长小结、小事动态通知
- 「开启通知」按钮，加载状态绑定 `subscribeLoading`

#### 新增函数

```typescript
async function handleSubscribe() {
  // 1. 过滤掉空模板 ID（REMINDER/REPORT 暂为空）
  // 2. 调 requestSubscribe() → 弹出微信订阅框
  // 3. 用户接受 → subscribeDone = true，调 updatePushSettings({ channel_app: true }) 同步后端
  // 4. 用户拒绝 → 卡片保留，提示「可在设置中开启」
}
```

---

### 4. `src/pages/my/settings.vue` — 设置页

#### 新增导入

```diff
+ import { onShow } from '@dcloudio/uni-app'
+ import { getPushSettings, updatePushSettings } from '@/api/push'
+ import { hasRequestedSubscribe, requestSubscribe, SUBSCRIBE_TEMPLATES, SUBSCRIBED_KEY } from '@/utils/subscribe'
```

#### 修改点

| # | 项目 | 改前 | 改后 |
|---|------|------|------|
| ① | `notification` 默认值 | `true`（写死） | `hasRequestedSubscribe()`（读本地订阅状态） |
| ② | 页面加载时同步后端 | 无 | `onShow` 调 `getPushSettings()` → 用后端 `channel_app` 覆盖开关状态 |
| ③ | 自动弹订阅授权 | 无 | 后端 `channel_app=true` 且本地未订阅 → 自动弹框 → 拒绝则 `updatePushSettings({ channel_app: false })` |
| ④ | 手动开开关弹授权条件 | `!hasRequestedSubscribe()` 只弹一次 | 每次开开关都重新弹授权（一次性订阅用完后再弹） |
| ⑤ | `quiet_hours` 传值 | `settings.quietHours`（空串 `''`）→ 后端校验 422 | `settings.quietHours \|\| undefined`（空时不传） |
| ⑥ | 清缓存 | `uni.clearStorageSync()` 清掉 `baby_bed_subscribe_done` | 先备份 `SUBSCRIBED_KEY` → 清完恢复 |

#### 最终行为

```
进入设置页
  → GET /push/settings → 同步开关状态
  → 如果后端 channel_app=true 且本地未订阅 → 自动弹微信授权框
     → 接受：标记已订阅
     → 拒绝：存 channel_app=false 到后端

用户手动开关「消息通知」
  → 打开：每次弹授权 → 接受则保存 → 拒绝则回 OFF
  → 关闭：直接保存 channel_app=false

清缓存 → 订阅标记保留
退出登录 → 订阅标记保留
```

---

## 三、涉及的后端接口

| 接口 | 方法 | 前端调用方 | 请求/响应 |
|------|------|-----------|-----------|
| `/push/settings` | `GET` | 设置页 `getPushSettings()` | 响应：`{ channel_app: bool, channel_sms: bool, quiet_hours: string\|null }` |
| `/push/settings` | `PUT` | 引导页、设置页 `updatePushSettings()` | 请求：`{ channel_app, channel_sms, quiet_hours }` |
| `/push/history` | `GET` | 消息中心 `getPushHistory()` | 已有功能，未改动 |

---

# 微信哭声推送完整链路 — 2026-07-30

> 本节是对 2026-07-27 前端原型的完整升级，并以本节描述为准。旧日志中的“进入设置页自动弹出订阅授权”已经废止。
>
> 当前状态：代码、迁移、测试和小程序构建均已完成；本地环境已验证微信 access_token 获取，尚未部署远程服务器及完成真机订阅送达测试。

## 一、实现结果

完整流程如下：

```text
用户主动点击开启通知
  → 微信返回模板授权结果
  → 当前系统账号绑定小程序 OpenID
  → 后端保存订阅状态及可发送次数
  → 检测到新的哭声事件
  → 为允许接收通知的家庭成员创建投递任务
  → 后台任务调用微信订阅消息接口
  → 用户微信收到消息并可打开对应事件详情
```

微信不支持根据用户输入的普通“微信号”发送订阅消息。本项目使用系统内部 `user_id` 定位用户，服务端再读取该用户绑定的 OpenID；OpenID 不返回前端，也不会写入普通业务日志。

## 二、后端更新

### 新增文件

| 文件 | 作用 |
|------|------|
| `app/clients/wechat_client.py` | 获取、缓存及刷新微信 access_token，发送订阅消息，封装微信错误 |
| `app/models/push_preference.py` | 持久化用户推送开关、哭声报警开关、短信开关和免打扰时段 |
| `app/models/wechat_subscription.py` | 保存模板授权状态、一次性订阅可用次数和客户端请求幂等 ID |
| `app/models/push_delivery.py` | 保存每位用户的 pending/sent/failed/skipped 投递结果及微信错误码 |
| `migrations/add_wechat_push_support.sql` | 保留旧通知数据并新增推送字段及三张数据表 |
| `requirements-dev.txt` | 后端测试依赖入口 |
| `tests/test_push_unit.py` | 免打扰、模板字段转换和 access_token 缓存单元测试 |
| `WECHAT_PUSH_DEPLOYMENT.md` | 完整部署、迁移和测试发送说明 |

### 修改内容

- `config.py`
  - 新增微信模板、字段映射、页面、环境、推送开关、冷却和后台任务间隔配置。
  - 兼容系统环境中的 `DEBUG=release/production/development`，避免应用导入失败。
- `app/services/push_service.py`
  - 推送设置改为数据库持久化。
  - 支持订阅结果确认、一次性额度累加和发送成功后扣减。
  - 支持家庭成员权限、OpenID 校验、免打扰、五分钟冷却和严重度提升放行。
  - 支持三级严重报警绕过免打扰。
  - 支持逐用户投递、失败重试、过期任务重新认领和历史查询。
  - 微信消息携带真实哭声事件 ID，可打开 `pages/monitor/detail`。
- `app/services/sensor_service.py`、`app/services/status_service.py`
  - 三条现有哭声事件入口统一接入推送排队。
  - 连续上报 crying 状态时只在首次进入哭闹状态创建事件，避免消息风暴。
- `app/services/auth_service.py`、`app/api/v1/auth.py`
  - 复用安全的 code-to-OpenID 交换逻辑。
  - 新增登录态 `/auth/wechat-bind`，用于把手机号账号绑定到当前微信身份。
  - 已被其他账号绑定的 OpenID 不允许重复绑定，避免发错用户。
- `main.py`
  - 新增微信消息后台投递任务和安全关闭逻辑。
  - 补齐根路径健康检查。
- `app/models/push_notification.py`、`app/schemas/push.py`、`app/api/v1/push.py`
  - 新增事件类型、去重键、严重级别和完整推送请求/响应接口。

### 新增或升级的 API

| 方法 | 路径 | 用途 |
|------|------|------|
| GET | `/api/v1/push/templates` | 获取后端实际启用的微信模板 ID |
| GET | `/api/v1/push/settings` | 获取当前用户推送设置 |
| PUT | `/api/v1/push/settings` | 更新推送、哭声报警、短信及免打扰设置 |
| POST | `/api/v1/push/subscriptions/confirm` | 保存微信返回的 accept/reject/ban/filter 状态 |
| GET | `/api/v1/push/subscriptions` | 查询订阅状态、类型和剩余次数 |
| POST | `/api/v1/push/test` | 给同一家庭中的指定系统用户发送测试消息 |
| GET | `/api/v1/push/history` | 查询逐用户投递结果、跳过原因和微信错误码 |
| POST | `/api/v1/auth/wechat-bind` | 将当前登录账号绑定到当前小程序 OpenID |

## 三、小程序更新

- `src/utils/subscribe.ts`
  - `requestSubscribe()` 现在返回每个模板的真实授权结果，不再只返回布尔值。
  - 新增当前账号与微信 OpenID 的绑定流程。
- `src/api/push.ts`、`src/api/auth.ts`、`src/api/config.ts`
  - 对接模板、订阅确认、订阅查询、测试发送和微信绑定接口。
  - 修复 PUT 设置接口重复拼接 query 参数的问题。
- `src/pages/my/settings.vue`
  - 删除进入页面时自动弹出微信授权的旧行为。
  - 只有用户主动打开“消息通知”时才申请订阅。
  - 显示未订阅、永久拒绝、额度耗尽和可发送次数。
  - 新增独立“哭声报警”开关，并支持真正清空免打扰时段。
- `src/pages/onboarding/index.vue`
  - 从后端读取实际模板 ID。
  - 用户点击“开启通知”后依次完成订阅、OpenID 绑定、结果确认和设置保存。
- `src/pages/notification/index.vue`
  - 筛选值与后端的 warning/alert/emergency 对齐。
  - 历史消息可点击进入真实哭声事件详情。
- `src/manifest.json`
  - 与 `project.config.json` 使用同一个微信小程序 AppID。

## 四、可靠性和安全规则

- 一次性订阅每接受一次增加一次额度，发送成功后扣减一次。
- 同一个哭声事件通过 `dedupe_key` 防止重复建通知。
- 同一宝宝、同一用户五分钟内相同或更低级别的已发送报警不重复发送。
- 严重程度升高时允许立即发送；三级报警不受免打扰限制。
- 只向同一家庭内 `is_active=1` 且 `can_receive_push=1` 的用户建立任务。
- AppSecret 只从后端环境变量读取，不进入小程序代码。
- 测试接口默认关闭；启用后仍受登录、白名单和同家庭校验保护。

## 五、验证结果

- Python 全项目语法编译：通过。
- OpenAPI 新增路由注册检查：通过。
- 后端测试：`8 passed`。
- 微信小程序生产构建：通过，产物位于 `dist/build/mp-weixin`。
- 构建日志仍有项目依赖 uView/Sass 的 `@import` 弃用警告，不影响本次构建产物。

## 六、上线前必须完成

1. 在微信公众平台选用真实的哭声报警订阅模板，记录模板 ID 和字段关键词。
2. 在服务器单独创建 `.env`，填写 AppID、AppSecret、模板 ID 和字段映射，不上传本地 `.env`。
3. 备份数据库，先在测试库执行 `migrations/add_wechat_push_support.sql`。
4. 使用 HTTPS 后端地址，并在微信公众平台配置 request 合法域名。
5. 测试环境先只开启 `PUSH_TEST_ENABLED=true`，手动测试成功后再开启 `WECHAT_PUSH_ENABLED=true`。

详细命令和请求示例见后端 `WECHAT_PUSH_DEPLOYMENT.md`。

## 七、模板 8557 适配（2026-07-30）

已按微信公众平台模板“检测报告通知”完成字段适配：

| 模板内容 | 微信字段 | 后端逻辑字段 | 实际值来源 |
|----------|----------|--------------|------------|
| 检测设备 | `thing1` | `device` | 设备名称；没有名称时使用设备 SN；测试数据无设备时使用“宝宝名+婴儿床” |
| 生成时间 | `time12` | `occurred_at` | 哭声事件开始时间，格式 `YYYY-MM-DD HH:mm` |
| 温馨提示 | `thing11` | `message` | 报警内容，例如“检测到小宝持续哭闹”，最多 20 个字符 |

对应配置：

```dotenv
WECHAT_ALERT_TEMPLATE_ID=SxTRB612hERgov6bY8l7v_Pv1T2xd6TNQgf5nvWjht4
WECHAT_ALERT_FIELD_MAP_JSON={"device":"thing1","occurred_at":"time12","message":"thing11"}
```

同时更新了 `push_service.py`、环境配置说明、部署说明和模板字段单元测试；最终后端测试仍为 `8 passed`。

## 八、本地实跑检查（2026-07-30）

### 发现并修复

- `.env` 使用 `//` 行内注释，导致 `PUSH_TEST_ENABLED` 无法解析为布尔值；已改为独立 `#` 注释。
- `WECHAT_MINIPROGRAM_STATE` 原值混入注释，可能把非法状态传给微信；本地开发测试已修正为纯 `developer`。
- 本地数据库配置将用户名和数据库名填反；已修正为本地 `root` 用户连接 `baby_bed` 数据库，未改动密码和 AppSecret。
- 本机没有 `baby_bed` 数据库；已新建并通过 `scripts/init_local_database.py` 初始化 28 张 ORM 表。
- 增加 `scripts/init_local_database.py`，用于全新本地空库初始化；旧库仍使用增量迁移 SQL。

### 实跑结果

- MySQL 版本：8.2.0。
- `FOR UPDATE SKIP LOCKED`：实际执行通过。
- 后端测试：`8 passed`。
- 小程序生产构建：通过。
- `/`、`/api/v1/health`、`/openapi.json`：HTTP 200。
- 模板、设置、订阅、测试推送、历史接口：通过。
- 自动哭声事件：成功创建 `cry_event`、通知和逐用户投递记录。
- AppID/AppSecret：成功换取微信 access_token，token 内容未输出。
- UTF-8：数据库为 `utf8mb4`，自动生成的中文报警内容无问号替换。

### 本地测试数据

- 用户 ID：1，手机号：`13900000001`，仅用于本地测试库。
- 宝宝 ID：1，名称：测试宝宝。
- 已创建手动测试通知和两条自动哭声测试事件。
- 因测试用户尚未在真机绑定 OpenID，投递结果按预期为 `skipped / wechat_not_bound`。

真实送达测试还需在真机中登录该系统账号并主动接受订阅授权，然后再次调用 `/api/v1/push/test`。

---

# 家庭多管理员与创始人权限修复 — 2026-08-03

> 当前状态：后端、数据库迁移、小程序页面和自动化测试已在本地完成；尚未提交或推送 GitHub，尚未对正式数据库执行迁移，等待本地和测试环境人工验收。

## 一、问题原因

家庭管理页面原有“设为管理员/解除管理员”入口，但前端把 `is_admin` 参数传给了 `/family/members/{member_id}/role`。该后端接口的 Schema 和 Service 只处理 `member_role`，额外参数不会更新数据库，因此页面可能提示成功，刷新后管理员状态仍然不变。

本次改为独立的管理员字段、接口和权限校验，不再把管理员状态混入成员角色接口。

## 二、最终权限规则

| 操作 | 创始人 | 管理员 | 普通成员 |
|------|--------|--------|----------|
| 修改家庭名称、查看或刷新邀请码 | 可以 | 可以 | 不可以 |
| 修改或移除普通成员 | 可以 | 可以 | 不可以 |
| 设置或解除管理员 | 可以 | 不可以 | 不可以 |
| 管理其他管理员 | 可以 | 不可以 | 不可以 |
| 转让创始人、解散家庭 | 可以 | 不可以 | 不可以 |
| 离开家庭 | 必须先转让或解散 | 可以直接离开 | 可以直接离开 |

创始人转让成功后，新成员变为创始人兼管理员，原创始人的 `is_founder` 和 `is_admin` 都变为 `0`，成为普通成员。

## 三、本次新增和修改的文件

### 后端

| 文件 | 类型 | 更新内容 |
|------|------|----------|
| `app/models/family_member.py` | 修改 | 新增 `is_founder`、`is_admin` ORM 字段 |
| `app/schemas/family.py` | 修改 | 新增管理员更新请求，并在家庭和成员响应中加入权限字段 |
| `app/api/v1/family.py` | 修改 | 新增设置管理员 PUT 接口，将原转让接口文案调整为转让创始人 |
| `app/services/family_service.py` | 修改 | 实现三级权限、管理员设置、创始人转让、退出/移除权限清理和后端越权校验 |
| `migrations/add_family_admin_roles.sql` | 新增 | 给旧 MySQL 数据库增加字段、索引并回填旧创始人数据 |
| `tests/test_family_admin_permissions.py` | 新增 | 覆盖设置管理员、越权、转让、离开和重新加入 |

### 微信小程序

| 文件 | 类型 | 更新内容 |
|------|------|----------|
| `src/api/config.ts` | 修改 | 新增 `MEMBER_ADMIN` 接口路径常量 |
| `src/api/family.ts` | 修改 | 家庭类型增加 `is_founder`，角色接口不再携带管理员参数，新增管理员更新请求 |
| `src/stores/family.ts` | 修改 | 新增 `isFounder` 和 `updateMemberAdminAction()`，成功后刷新成员列表 |
| `src/pages/my/family.vue` | 修改 | 创始人黄色、管理员绿色；按权限显示设置管理员、转让、移除和解散入口 |

### 文档

| 文件 | 更新内容 |
|------|----------|
| `实习.md` | 增加问题定位、技术实现、文件清单、验证结果和后续安排 |
| `更新日志.md` | 记录本节完整变更和操作步骤 |

## 四、数据与接口变化

### 数据库字段

```sql
is_founder TINYINT(1) NOT NULL DEFAULT 0
is_admin   TINYINT(1) NOT NULL DEFAULT 0
```

旧数据迁移会把有效且 `relation='creator'` 的成员回填为 `is_founder=1、is_admin=1`。代码仍保留对旧 `relation='creator'` 的兼容识别。

### 新增接口

| 方法 | 路径 | 请求体 | 权限 |
|------|------|--------|------|
| PUT | `/api/v1/family/members/{member_id}/admin` | `{ "is_admin": 0或1 }` | 仅创始人 |

保留 `POST /api/v1/family/admin/transfer` 路径以兼容现有客户端，但该接口现在表示“转让创始人”。

## 五、关键业务行为

- 创建家庭时，创建者写入 `is_founder=1、is_admin=1`。
- 只有创始人可以设置或解除其他成员的管理员身份。
- 普通管理员可以修改和移除普通成员，但不能操作创始人或其他管理员。
- 只有创始人可以转让创始人身份和解散家庭。
- 创始人不能直接离开；管理员和普通成员可以直接离开。
- 成员离开、被移除或重新加入时会清除旧管理员和创始人状态。
- 家庭改名、邀请码、成员修改、成员移除和解散操作均由后端再次校验权限，不能只靠前端隐藏按钮。
- 管理员接口失败时前端显示后端错误，不再出现未保存却提示成功。

## 六、界面变化

- 创始人徽章：黄色文字 `#d48806`，浅黄色背景 `#fff7e6`，显示“创始人”。
- 管理员徽章：保留绿色文字和浅绿色背景，显示“管理员”。
- 普通管理员不会看到设置/解除管理员、转让创始人和解散家庭入口。
- 创始人管理普通成员时可选择设置管理员、转让创始人或移除成员。
- 创始人管理管理员时可选择解除管理员、转让创始人或移除成员。

## 七、自动验证结果

- `python -m compileall -q app`：通过。
- `python -m pytest tests/test_family_admin_permissions.py -q`：`7 passed`。
- `python -m pytest tests/ -q`：`17 passed`，只有现有 Starlette/httpx 兼容性弃用警告。
- FastAPI 管理员 PUT 路由注册检查：通过。
- FamilyInfo、FamilyMemberInfo 权限字段检查：通过。
- `npm run build:mp-weixin`：通过。
- 小程序构建只有项目依赖原有的 Sass `@import` 弃用警告，不影响产物。

## 八、接下来怎么做

### 1. 先处理测试数据库

1. 备份当前测试数据库。
2. 使用 Navicat、MySQL Workbench 或宝塔数据库管理打开后端文件 `migrations/add_family_admin_roles.sql`。
3. 在测试数据库中执行一次该 SQL，不能重复执行 `ALTER TABLE`。
4. 查看脚本最后的验证查询：正常情况下不应返回任何 `founder_count <> 1` 的家庭。
5. 如果验证查询返回数据，先不要继续部署，应为这些家庭确认正确创始人并修复数据。

### 2. 启动本地后端

数据库迁移完成后再启动新版 FastAPI。若未迁移就启动或请求家庭接口，MySQL 会报告缺少 `is_founder` 或 `is_admin` 字段。

### 3. 打开小程序产物

运行 `npm run build:mp-weixin`，然后在微信开发者工具中导入 `dist/build/mp-weixin`。当前本地已经生成过一次可用构建产物。

### 4. 使用三个账号人工测试

1. 创始人账号：确认显示黄色“创始人”，可以设置/解除管理员。
2. 管理员账号：确认显示绿色“管理员”，可以管理普通成员，但看不到设置管理员、转让创始人和解散家庭。
3. 普通成员账号：确认只能查看成员及编辑自己允许修改的信息。
4. 设置管理员后退出页面再重新进入，确认绿色管理员状态仍然存在。
5. 解除管理员后刷新，确认管理入口消失。
6. 转让创始人后，确认新创始人显示黄色，原创始人不再显示管理徽章。
7. 分别验证管理员离开、创始人必须先转让、移除成员和接口失败提示。

### 5. 测试完成后

- 先检查两个本地仓库的差异，只选择本次家庭功能文件提交。
- 不要把数据库密码、`.env`、`app.zip`、构建缓存或无关日志加入提交。
- 测试环境发布顺序：数据库迁移 → 后端代码 → 小程序测试版。
- 正式环境再次备份数据库，按同样顺序发布。
- 当前不要推送；等人工测试通过并确认数据库数据正常后，再单独提交和推送前后端改动。

## 九、前端管理员点击无响应二次修复（2026-08-03）

### 1. 联调结论

通过 Apifox 使用创始人 Token 完成以下验证：

- `GET /api/v1/family/members` 正常返回创始人和普通成员的 `is_founder`、`is_admin`。
- `PUT /api/v1/family/members/{member_id}/admin` 可以正常设置和解除管理员。
- 数据库字段、Token、创始人权限、目标成员 ID 和后端接口均正常，问题最终定位为小程序前端交互。

### 2. 问题原因

成员页面原流程为：

```text
点击“管理” → uni.showActionSheet → 点击“设为管理员” → uni.showModal
```

微信原生操作菜单关闭期间再次打开原生确认框，在部分开发者工具或基础库中会被忽略；之前增加 `setTimeout` 延迟仍不能保证稳定显示，因此出现点击“设为管理员”后没有弹窗、没有提示、也没有发出请求的现象。

### 3. 修复内容

修改文件：`src/pages/my/family.vue`。

- 管理员确认改为页面内 `u-popup`，不再连续打开两个微信原生弹窗。
- 新增选中成员、目标管理员状态、确认框显示状态和提交状态。
- 确认提交时显示“正在保存”，并用遮罩防止重复操作。
- 调用 `updateMemberAdminAction(member.id, 0或1)`，最终请求独立接口 `/family/members/{member_id}/admin`。
- 成功后立即更新本地成员状态并重新加载家庭数据和成员列表。
- 失败时展示真实错误信息，方便继续排查 Token、权限或网络问题。

### 4. 验证结果

- `npm run build:mp-weixin`：通过。
- 最新 `dist/build/mp-weixin/pages/my/family.js` 已确认包含“确认设置”“正在保存”和管理员更新调用。
- 微信开发者工具清除编译缓存并加载最新产物后，管理员设置流程人工验证通过。
- 构建过程中只有现有 Sass `@import` 弃用警告，不影响运行。

### 5. 当前状态

- 后端接口与数据库联调：通过。
- 小程序管理员设置前端流程：通过。
- 本次修改和文档只保存在本地，尚未提交或推送 GitHub。

## 十、2026-08-14 前端可靠性与家长端体验收口

### 1. 互动内容页

- `src/pages/content/index.vue`：接入服务器内容库、真实播放会话、设备在线状态和进度；加入多宝宝切换、目标设备、收藏、最近/常播、暂停、继续、停止和 15/30/60 分钟定时停止。
- 将轮询改为请求完成后的单次 `setTimeout`，禁止重叠请求，网络失败按 2/4/8/15 秒退避，切宝宝或离开页面后旧响应不能覆盖当前页面。
- 修复暂停按钮显示英文图标名、停止后卡死、请求失败显示“暂无记录”和双击重复请求。
- 播放器与内容卡使用明确中文状态；设备离线时显示“等待连接”，不假装硬件已经播放。
- 收藏、分类、定时、停止、关闭等主要操作扩大到约 44px 触控热区。
- 进度动画由 `width` 改为 `transform`，场景提醒去除弹跳动效，减少低端设备布局抖动。

### 2. 监控、事件和全局轮询

- `src/App.vue`：全局危险状态检查覆盖家庭全部已绑定设备，改为无重叠递归轮询，并防止页面隐藏后的旧请求弹出提醒。
- `src/pages/index/index.vue`、`src/pages/monitor/index.vue`：按当前宝宝选择设备，防止固定取第一台设备；请求完成后再安排下一次刷新。
- `src/api/monitor.ts`、`src/pages/monitor/events.vue`、`src/pages/monitor/detail.vue`：事件详情和确认携带 `source_table`，用 `source_ref` 区分不同数据库表中的相同数字 ID；纯状态日志不显示错误的确认入口。
- `src/pages/scene/index.vue`：停止自动生成随机检测结果；“模拟/高危”明确标注为界面联调，不代表设备检测或硬件控制。

### 3. 登录、错误和构建安全

- `src/api/request.ts`、`src/api/request.test.ts`：统一 HTTP 错误类型，保留状态码与后端 `error_code`，区分可重试网络错误、409 配置错误和 501 未实现能力。
- `src/pages/login/login.vue`、`forgot-password.vue`、`src/pages/my/account-security.vue`：统一密码最小长度、验证码错误、修改密码后退出登录和真实失败提示。
- `src/api/config.ts`、`vite.config.ts`、`.env.example`、`.env.test`：测试包连接 8123；正式构建必须显式配置真实 HTTPS API/语音域名，避免误发布测试 IP。
- `src/pages/milestone/report.vue`：报告提交失败时不再显示成功。

### 4. 验证结果

- `npm run typecheck`：通过。
- `npm test -- --run`：2 个测试文件、6 项测试全部通过。
- `npm run build:mp-weixin:test`：通过，产物为 `dist/build/mp-weixin`。
- 构建产物确认包含 `http://223.247.96.246:8123/api/v1`，且播放器不再包含 `stop-circle` 英文显示文本。
- 界面审计发现的布局动画和弹跳动效已修复；现有 Sass/uView `@import` 弃用警告不影响本次构建。

### 5. 已知依赖风险

- npm 官方审计报告 33 个传递依赖问题：13 高、9 中、11 低，主要由 UniApp/DCloud 编译链中的 Babel、PostCSS、esbuild、ws、Jimp 等引入。
- 官方完整自动修复会把 DCloud 包改成不兼容版本，本轮没有执行 `npm audit fix --force`。
- 后续应建立独立升级分支，统一升级 UniApp/DCloud 工具链，再重新执行类型检查、单测、微信构建和真机回归。
