# Baby Bed AI System Technical Specification

> 版本：2026-08 技术说明版  
> 适用范围：智能婴儿床小程序前端、server2 后端、硬件端、ASR、TTS、LLM、Qwen2.5-VL 视觉服务  
> 目标读者：后端、前端、硬件端、模型部署、测试与项目交接人员

---

## 1. 文档目的

本文档用于说明当前智能婴儿床 AI 系统的工程架构、服务边界、接口约定、模型部署方式、运维命令和后续优化方向。

它不是需求文档，也不是项目复盘，而是一份偏工程落地的技术说明。读者应该能通过本文档快速理解：

- 当前系统由哪些服务组成。
- 每个服务运行在哪个端口。
- 前端、后端、硬件端如何交互。
- ASR、LLM、TTS、视觉模型如何被 server2 调用。
- 当前部署方式和排障命令是什么。
- 哪些地方仍是技术债或需要后续优化。

---

## 2. 系统边界

当前系统由以下部分组成：

```text
baby_system_app        小程序前端
baby_bed_server2       FastAPI 主后端
baby_system_hardware   硬件端/树莓派端/采集端
ASR Service            语音识别服务
TTS Service            语音合成服务
Ollama Gemma4          文本对话与语义理解服务
Qwen2.5-VL Service     图像/视频帧视觉理解服务
MySQL                  业务数据库
Redis                  预留缓存/状态服务
```

当前推荐的调用边界是：

```text
前端/硬件端只直接调用 server2
server2 再调用 ASR / TTS / LLM / Vision
```

不推荐小程序或硬件端绕过 server2 直接调用模型服务。原因：

- 模型服务通常没有业务鉴权。
- 模型服务裸露公网容易被扫描和消耗算力。
- 统一走 server2 更方便记录日志、做权限控制和做多模态融合。

---

## 3. 当前端口规划

| 服务 | 端口 | 协议 | 对外建议 | 说明 |
|---|---:|---|---|---|
| server2 | 34223 | HTTP | 可对外测试开放 | 小程序/硬件统一入口 |
| ASR | 40021 | HTTP | 不建议长期公网裸露 | faster-whisper 语音识别 |
| TTS | 40028 | HTTP | 不建议长期公网裸露 | 语音合成服务 |
| LLM | 11435 | HTTP | 不建议长期公网裸露 | Ollama OpenAI-compatible API |
| Vision | 30006 | HTTP | 不建议长期公网裸露 | Qwen2.5-VL 图像分析 |
| LTM | 8122 | HTTP | 内部服务 | 长记忆/外部辅助服务 |
| MySQL | 3306 | TCP | 严禁公网裸露 | 业务数据库 |

测试命令：

```bash
ss -lntp | egrep ':(34223|40021|40028|11435|30006|8122|3306)'
```

健康检查：

```bash
curl http://127.0.0.1:34223/api/v1/health
curl http://127.0.0.1:40021/health
curl http://127.0.0.1:40028/health
curl http://127.0.0.1:11435/api/version
curl http://127.0.0.1:30006/health
```

---

## 4. 主后端 server2

### 4.1 代码位置

本地开发目录：

```text
/Users/a1/Desktop/baby_bed_server2
```

服务器部署目录：

```text
/www/wwwroot/baby_bed_server2
```

GitHub 仓库：

```text
https://github.com/050717/baby_bed_server2
```

主要分支：

```text
Simon
```

### 4.2 技术栈

```text
FastAPI
SQLAlchemy AsyncSession
Pydantic / pydantic-settings
Gunicorn + UvicornWorker
MySQL
Redis 预留
httpx
ffmpeg / ffprobe
```

### 4.3 关键目录

```text
app/api/v1/      API 路由
app/models/      SQLAlchemy ORM 模型
app/schemas/     Pydantic 请求/响应模型
app/services/    业务逻辑和外部服务调用
app/core/        响应、异常、安全相关
config.py        环境配置
main.py          FastAPI 应用入口
gunicorn_conf.py 生产启动配置
```

### 4.4 关键配置项

`config.py` 中核心配置：

```text
LLM_API_URL=http://127.0.0.1:11435/v1/chat/completions
LLM_MODEL=gemma4:latest
ASR_API_URL=http://127.0.0.1:40021/speech-to-text
TTS_API_URL=http://127.0.0.1:40028/tts
VISION_API_URL=http://127.0.0.1:30006/image/analyze
VOICE_CLONE_API_URL=http://127.0.0.1:30028/v1/audio
LTM_API_URL=http://127.0.0.1:8122
```

这些配置可以被 `.env` 覆盖。

### 4.5 常驻方式

主后端建议使用 systemd：

```bash
systemctl status baby-bed-server2 --no-pager
systemctl restart baby-bed-server2
journalctl -u baby-bed-server2 -n 100 --no-pager
```

不要长期依赖：

```bash
nohup gunicorn ... &
```

原因：

- 手动后台进程容易被误杀。
- 服务器重启后不会自动恢复。
- pid/log 权限问题不好排查。
- 多个进程容易抢端口。

---

## 5. 前端小程序

### 5.1 代码位置

本地目录：

```text
/Users/a1/Desktop/baby_system_app
```

GitHub 仓库：

```text
https://github.com/050717/baby_system_app2
```

主要分支：

```text
main
```

### 5.2 技术栈

```text
uni-app
Vue
微信小程序构建目标 mp-weixin
```

### 5.3 接口访问策略

前端应只访问 server2 主后端，例如：

```text
http://223.247.96.246:34223
```

不建议前端直接访问：

```text
http://223.247.96.246:11435
http://223.247.96.246:30006
http://223.247.96.246:40021
http://223.247.96.246:40028
```

原因：

- 小程序合法域名配置复杂。
- 模型服务没有业务鉴权。
- 暴露模型服务存在算力盗用风险。
- 统一从 server2 转发更容易记录日志和排查问题。

### 5.4 微信体验版域名问题

如果体验版提示：

```text
url not in domain list
```

需要去微信公众平台配置合法域名：

```text
request 合法域名
uploadFile 合法域名
downloadFile 合法域名
socket 合法域名，如有使用
```

测试阶段如果没有备案域名，开发者工具可以临时勾选“不校验合法域名”，但体验版/正式版不能依赖这个选项。

---

## 6. ASR 服务

### 6.1 当前方案

```text
faster-whisper
CTranslate2 模型格式
distil-large-v3-ct2
```

服务端口：

```text
40021
```

模型目录：

```text
/home/simon/voice_models/distil-large-v3-ct2
```

服务目录：

```text
/home/simon/voice_services/asr_fast
```

### 6.2 API

健康检查：

```text
GET /health
```

语音识别：

```text
POST /speech-to-text
```

支持：

- `multipart/form-data` 上传音频文件。
- JSON `audio_data` base64 音频。

server2 通过：

```text
ASR_API_URL=http://127.0.0.1:40021/speech-to-text
```

调用 ASR。

### 6.3 推荐配置

```bash
ASR_DEVICE=cuda
ASR_COMPUTE_TYPE=float16
ASR_TASK=transcribe
ASR_LANGUAGE=
ASR_INITIAL_PROMPT=这是中英混合语音，请原样转写，保留中文和英文，不要翻译。
```

### 6.4 已知问题

ASR 曾出现“中文语音识别成英文”的问题。优先检查：

- 是否误用了 `translate` 而不是 `transcribe`。
- 是否写死了英文 language。
- `initial_prompt` 是否明确要求原样转写。
- 输入音频是否过短、噪声过强或采样率异常。

后续如果中文仍不稳定，建议用 Whisper large-v3 或 large-v3-turbo 做对照实验。

---

## 7. LLM 服务

### 7.1 当前方案

```text
Ollama
gemma4:latest
OpenAI-compatible /v1/chat/completions
```

端口：

```text
11435
```

server2 调用地址：

```text
http://127.0.0.1:11435/v1/chat/completions
```

### 7.2 关闭 reasoning/thinking

Gemma4 支持 thinking/reasoning 能力，但当前业务需要低延迟 instant 回复，所以后端调用中已经显式加入：

```json
{
  "think": false,
  "stream": false
}
```

涉及文件：

```text
app/api/v1/voice.py
app/services/voice_service.py
app/services/llm_service.py
```

语音聊天参数：

```text
temperature=0.3
max_tokens=256
```

### 7.3 Ollama 实例注意事项

历史上出现过多个端口：

```text
11434
11435
11438
```

注意：

- 不同实例可能对应不同 `OLLAMA_MODELS`。
- `ollama list` 要指定 `OLLAMA_HOST` 才能看准。
- 推荐固定一个端口供后端调用。

示例：

```bash
OLLAMA_HOST=127.0.0.1:11435 ollama list
curl http://127.0.0.1:11435/api/version
```

### 7.4 vLLM 迁移说明

vLLM 后续可以作为低延迟推理服务方案，但迁移前要注意：

- vLLM 通常使用 HuggingFace 格式模型。
- Ollama 的 GGUF/Q4 模型不能直接被 vLLM 加载。
- 如果迁移 Gemma，需要重新准备 HF 权重和部署脚本。
- Demo 前不建议大规模迁移，以免破坏已跑通链路。

---

## 8. TTS 服务

### 8.1 当前状态

端口：

```text
40028
```

当前 demo 阶段以服务器实际服务为准，历史上验证过：

```text
CozyVoice
F5-TTS
MeloTTS
```

### 8.2 业务建议

- TTS 不建议跑在低端树莓派上。
- 树莓派端应主要负责采集、播放和设备控制。
- TTS 推荐服务器侧生成音频，硬件端下载/播放。
- 正式商用前需要确认 TTS 模型协议与授权风险。

### 8.3 server2 调用

server2 通过：

```text
TTS_API_URL=http://127.0.0.1:40028/tts
```

调用 TTS 服务。

---

## 9. Qwen2.5-VL 视觉服务

### 9.1 当前方案

模型：

```text
Qwen2.5-VL-7B-Instruct
```

模型路径：

```text
/home/czh/model/Qwen/Qwen2___5-VL-7B-Instruct
```

服务端口：

```text
30006
```

服务接口：

```text
GET  /health
POST /image/analyze
```

### 9.2 运行环境

最终跑通环境：

```text
torch==2.6.0+cu124
torchvision==0.21.0+cu124
torchaudio==2.6.0+cu124
transformers==5.14.1
accelerate==1.14.0
qwen-vl-utils==0.0.14
CUDA build 12.4
```

### 9.3 常驻服务

```bash
systemctl status qwen2vl --no-pager
systemctl restart qwen2vl
journalctl -u qwen2vl -n 100 --no-pager
```

健康检查：

```bash
curl -s http://127.0.0.1:30006/health; echo
```

单图测试：

```bash
curl -X POST http://127.0.0.1:30006/image/analyze \
  -F "file=@/www/wwwroot/chatbox/chatbox/doc/statics/demo.png" \
  -F "prompt=请用中文描述这张图片。"
```

### 9.4 部署过程中的关键坑

曾经遇到：

- 服务器网络慢，依赖下载困难。
- Mac 下载 Linux wheel 后上传服务器。
- PyTorch CUDA 版本和服务器驱动不匹配。
- 误装 CUDA 13 相关包，导致驱动过旧报错。
- 缺 `libnvrtc.so.12`。
- 缺 `torchvision` 和 `torchaudio`。
- 缺 `sympy==1.13.1`。

最终结论：

```text
服务器 CUDA Driver 支持 12.4，因此 PyTorch 必须使用 cu124 wheel。
```

---

## 10. 视频上传与视频识别

### 10.1 视频上传接口

```text
POST /api/v1/video/upload
```

功能：

- 保存视频文件。
- 自动生成视频首帧封面。
- 写入 `videos` 表。
- 返回 `video_url`、`img_url`、`filename`。

关键字段：

```text
videos.video_url
videos.img_url
videos.video_content_text
```

### 10.2 视频分析接口

```text
POST /api/v1/video/analyze
```

请求示例：

```bash
curl -X POST http://127.0.0.1:34223/api/v1/video/analyze \
  -H "Content-Type: application/json" \
  -d '{"video_id":1827,"sample_fps":0.2,"max_frames":3}'
```

### 10.3 内部流程

```text
1. server2 接收 video_id 或 video_url
2. 定位本地视频文件
3. ffmpeg 按 sample_fps 抽帧
4. 转为 base64 image data URL
5. 调用 Qwen2.5-VL /image/analyze
6. 汇总多帧文本结果
7. 生成 scene_type、risk_level、summary、key_events、suggestions
8. 回写 videos.video_content_text
```

### 10.4 当前性能建议

当前实现是逐帧调用 Qwen2.5-VL，稳定但延迟偏高。demo 阶段建议：

```text
sample_fps=0.2
max_frames=3 到 6
```

不要一开始设置：

```text
max_frames=16 到 24
```

后续优化方向：

- 将 Qwen2.5-VL 服务升级为一次请求多帧。
- 减少 HTTP 往返。
- 减少模型重复 prefill。
- 对视频进行关键帧筛选，而不是等间隔抽帧。

---

## 11. 硬件端接口说明

硬件端主要应调用 server2，不应直接调用模型服务。

典型接口：

```text
POST /api/v1/device/register
POST /api/v1/hardware/heartbeat
POST /api/v1/sensor/upload
POST /api/v1/sensor/status/upload
POST /api/v1/video/upload
POST /api/v1/video/analyze
GET  /api/v1/video/stream/{filename}
GET  /api/v1/video/image/{filename}
```

硬件端注意事项：

- 设备心跳需要稳定发送。
- `online_status` 和 `last_online_at` 要正确更新。
- 视频上传成功后应保存后端返回的 `video_id`、`video_url`、`img_url`。
- 若需要识别视频内容，优先调用 server2 的 `/video/analyze`，不要直接打 Qwen2.5-VL。

---

## 12. 多模态融合设计

当前已经具备单项能力：

```text
ASR       语音转文字
LLM       文本语义理解和回复
TTS       文本转语音
Vision    图像/视频帧理解
Sensor    温湿度、风险等级、设备状态
```

下一步真正的多模态融合应由 server2 汇总：

```text
视频帧识别结果
+ ASR 语音文本
+ 哭声检测结果
+ 温湿度/雷达/姿态传感器
+ 历史状态
=> 统一事件判断
=> LLM 生成解释和建议
=> TTS 播报
```

建议新增内部服务层：

```text
app/services/fusion_service.py
```

建议新增接口：

```text
POST /api/v1/fusion/evaluate
```

---

## 13. 哭声检测设计建议

ASR 不适合承担哭声检测。哭声检测应作为独立音频分类模型。

推荐输入：

```text
短音频片段，1 到 10 秒
```

推荐输出：

```json
{
  "is_crying": true,
  "confidence": 0.91,
  "cry_level": "moderate",
  "duration_sec": 4.2
}
```

建议接口：

```text
POST /api/v1/audio/cry-detect
```

后续可以将哭声检测结果和视频风险识别结果一起送入多模态融合层。

---

## 14. 安全与鉴权

### 14.1 JWT

应用端接口大多需要 JWT。

测试登录可以通过登录接口获取 token，然后请求头带：

```text
Authorization: Bearer <token>
```

### 14.2 硬件端认证

硬件端不适合使用用户 JWT。更合理的方式是：

```text
device_sn + device_secret
```

或由 server2 发行硬件端 token。

### 14.3 模型端口安全

不建议长期公网开放：

```text
11435
30006
40021
40028
```

如果必须开放，应至少做到：

- IP 白名单。
- Nginx basic auth 或 token auth。
- 请求频率限制。
- 日志记录。
- 测试后立即关闭。

---

## 15. 常用排障命令

### 15.1 看端口

```bash
ss -lntp | egrep ':(34223|40021|40028|30006|11435)'
```

### 15.2 看主后端

```bash
systemctl status baby-bed-server2 --no-pager
journalctl -u baby-bed-server2 -n 100 --no-pager
curl http://127.0.0.1:34223/api/v1/health
```

### 15.3 看视觉服务

```bash
systemctl status qwen2vl --no-pager
journalctl -u qwen2vl -n 100 --no-pager
curl http://127.0.0.1:30006/health
```

### 15.4 看 Ollama

```bash
systemctl status ollama --no-pager
journalctl -u ollama -n 100 --no-pager
OLLAMA_HOST=127.0.0.1:11435 ollama list
curl http://127.0.0.1:11435/api/version
```

### 15.5 看 GPU

```bash
nvidia-smi
watch -n 1 nvidia-smi
```

### 15.6 检查 Python 语法

```bash
PYTHONPYCACHEPREFIX=/tmp/baby_bed_server2_pycache \
python3 -m py_compile main.py config.py app/api/v1/voice.py app/services/voice_service.py app/services/llm_service.py app/api/v1/video.py
```

---

## 16. 当前技术债

| 技术债 | 影响 | 建议 |
|---|---|---|
| 多帧视频分析逐帧请求 | 延迟较高 | 改为一次请求多帧 |
| 模型服务公网裸露风险 | 可能被扫和偷算力 | 统一走 server2，加白名单 |
| ASR 中文稳定性 | 中英混合识别可能不稳 | 建立测试集，评估 large-v3 |
| TTS 模型协议 | 商用风险不明确 | 商用前做授权审查 |
| 多个 Ollama 实例 | 模型列表混乱 | 固定一个生产实例 |
| 硬件端鉴权较弱 | 安全边界不足 | 增加 device_secret/token |
| 服务常驻不完全统一 | 运维复杂 | 全部 systemd 化 |
| 多模态融合尚未中心化 | 逻辑分散 | 增加 fusion_service |

---

## 17. 推荐下一步

短期：

1. 保持 demo 链路稳定。
2. 不在演示前大规模更换 LLM 部署框架。
3. 关闭或限制模型服务公网访问。
4. 准备固定测试样例：语音、图片、视频、传感器数据。
5. 给硬件端明确只调用 server2 的接口清单。

中期：

1. Qwen2.5-VL 改为一次请求多帧。
2. 建立哭声检测模型服务。
3. 引入统一多模态融合服务层。
4. 完善硬件端设备鉴权。
5. 把 ASR/TTS/Vision/Ollama 的 systemd 文件纳入文档或部署脚本。

长期：

1. 评估自建 GPU 服务器或托管机房。
2. 评估 vLLM/SGLang 等生产推理框架。
3. 做模型协议和商用风险审查。
4. 建立自动化测试和服务监控。

---

## 18. 最小可用链路

当前最小可用链路为：

```text
小程序或硬件端
-> server2 34223
-> ASR 40021 / LLM 11435 / TTS 40028 / Vision 30006
-> server2 汇总结果
-> 返回前端或硬件端
```

如果只保留一条原则：

```text
所有业务请求先进入 server2，模型服务只作为内部能力被 server2 调用。
```

这能最大程度降低安全风险、减少端口混乱，并为后续多模态融合留下清晰的工程边界。
