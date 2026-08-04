# Baby Bed AI System Delivery Report

> 时间范围：2026 年 6 月到 2026 年 8 月  
> 项目范围：智能婴儿床小程序前端、server2 后端、硬件端接口、ASR、TTS、LLM、视觉理解模型与部署链路  
> 当前状态：核心链路已跑通，进入演示、联调和稳定性验证阶段。

---

## 1. 总览

这两个月的工作核心，是把原本分散、假实现较多、模型接口不统一的婴儿床系统，逐步整理成一条可以联调的工程链路：

```text
小程序前端 / 硬件端
  -> server2 主后端 34223
  -> ASR 语音识别 40021
  -> LLM 对话与语义理解 11435
  -> TTS 语音合成 40028
  -> Qwen2.5-VL 视频/图像理解 30006
```

主要成果包括：

- 梳理并改造 `baby_bed_server2` 后端接口。
- 统一小程序前端请求后端的地址和语音接口。
- 将 ASR 从原有服务切换到 faster-whisper + distil-large-v3-ct2。
- 将 LLM 接到本地 Ollama Gemma4，并关闭 reasoning/thinking 输出。
- 部署 TTS 服务用于 demo 链路。
- 部署 Qwen2.5-VL-7B-Instruct 视觉模型，并接入后端视频分析接口。
- 将主后端、视觉服务等关键服务改为 systemd 常驻方式。
- 增加视频上传首帧封面、`img_url` 字段和 `video_content_text` 回写逻辑。
- 梳理公网端口、服务健康检查、常见错误和恢复命令。

---

## 2. 当前服务拓扑

### 2.1 主服务

| 服务 | 端口 | 当前用途 | 当前状态 |
|---|---:|---|---|
| server2 主后端 | 34223 | 小程序和硬件端统一 API 入口 | 已跑通 |
| ASR | 40021 | faster-whisper 语音转文字 | 已跑通 |
| TTS | 40028 | 语音合成服务 | demo 可用 |
| LLM | 11435 | Ollama / Gemma4 对话与语义能力 | 已跑通 |
| Vision | 30006 | Qwen2.5-VL 图片/视频帧理解 | 已跑通 |
| LTM | 8122 | 长记忆/外部辅助服务 | 保留兼容 |

### 2.2 推荐访问策略

对外建议只开放：

```text
34223 server2 主后端
```

不建议长期裸露公网：

```text
11435 Ollama
30006 Qwen2.5-VL
40021 ASR
40028 TTS
```

这些模型端口如果必须给同事临时测试，至少应该通过宝塔防火墙、系统防火墙或 Nginx 做 IP 白名单和鉴权。否则容易被扫到并消耗 GPU/CPU 算力。

---

## 3. 后端 server2 工作

### 3.1 目录与仓库

本地目录：

```text
/Users/a1/Desktop/baby_bed_server2
```

服务器目录：

```text
/www/wwwroot/baby_bed_server2
```

GitHub 仓库：

```text
https://github.com/050717/baby_bed_server2
```

当前主要分支：

```text
Simon
```

### 3.2 主要改造内容

后端完成了以下整理：

- 梳理 FastAPI 主入口和 `/api/v1` 路由。
- 统一硬件端、前端端调用 server2 的入口。
- 修复部署时 `gunicorn_conf.py` 路径、pid、日志权限导致的启动失败问题。
- 增加 `systemd` 常驻部署思路，避免长期依赖 `nohup`。
- 增加 `.env` 配置项，统一 ASR、TTS、LLM、Vision 服务地址。
- 将 Gemma4 调用中的 thinking/reasoning 模式通过请求体显式关闭。
- 更新 README，加入当前真实服务架构和排查命令。

### 3.3 关键配置

`config.py` 当前核心配置包括：

```text
LLM_API_URL=http://127.0.0.1:11435/v1/chat/completions
LLM_MODEL=gemma4:latest
ASR_API_URL=http://127.0.0.1:40021/speech-to-text
TTS_API_URL=http://127.0.0.1:40028/tts
VISION_API_URL=http://127.0.0.1:30006/image/analyze
```

生产或测试环境可以通过 `.env` 覆盖。

### 3.4 常驻服务

server2 推荐 systemd 管理：

```bash
systemctl status baby-bed-server2 --no-pager
systemctl restart baby-bed-server2
journalctl -u baby-bed-server2 -n 100 --no-pager
```

健康检查：

```bash
curl http://127.0.0.1:34223/api/v1/health
```

---

## 4. 前端小程序工作

### 4.1 目录与仓库

本地目录：

```text
/Users/a1/Desktop/baby_system_app
```

GitHub 仓库：

```text
https://github.com/050717/baby_system_app2
```

当前分支：

```text
main
```

### 4.2 主要改造内容

前端主要做了以下事情：

- 统一接口请求地址，指向新的 server2 服务。
- 调整 AI 调试页，用于直接测试 Gemma4 的文本回复。
- 调整语音相关 API，接入后端统一的 ASR/TTS/音色接口。
- 修复小程序体验版构建时 `uni` 命令缺失、`app.json` 找不到等问题。
- 梳理微信小程序体验版 `url not in domain list` 问题，明确需要配置微信后台 request 合法域名。
- 保留前端统一入口，避免小程序直接调用过多模型端口。

### 4.3 小程序体验版注意事项

体验版如果出现：

```text
url not in domain list
```

通常不是代码逻辑错误，而是微信小程序后台没有配置合法域名。需要在微信公众平台配置：

```text
request 合法域名
uploadFile 合法域名
downloadFile 合法域名
socket 合法域名，如有需要
```

测试阶段建议让小程序只访问 server2：

```text
http://223.247.96.246:34223
```

不要让小程序直接访问：

```text
11435 / 30006 / 40021 / 40028
```

---

## 5. ASR 语音识别链路

### 5.1 当前方案

ASR 当前部署为：

```text
faster-whisper + distil-large-v3-ct2
```

服务端口：

```text
40021
```

模型目录：

```text
/home/simon/voice_models/distil-large-v3-ct2
```

服务代码目录：

```text
/home/simon/voice_services/asr_fast
```

健康检查：

```bash
curl http://127.0.0.1:40021/health
```

### 5.2 关键问题与处理

曾经遇到的问题：

- 服务器网络慢，Hugging Face 下载不稳定。
- Mac 下载原始模型后，转换成 CTranslate2 格式再上传服务器。
- 原始模型约 12GB，转换后 `ct2` 模型约 1.4GB，这是正常的格式和精度变化。
- ASR 一度倾向输出英文，需要明确使用 `transcribe`，不要使用 `translate`。

建议环境变量：

```bash
ASR_DEVICE=cuda
ASR_COMPUTE_TYPE=float16
ASR_TASK=transcribe
ASR_LANGUAGE=
ASR_INITIAL_PROMPT=这是中英混合语音，请原样转写，保留中文和英文，不要翻译。
```

### 5.3 后续优化

如果后续 ASR 中文仍不稳，可以考虑：

- 改用 Whisper large-v3 或 large-v3-turbo。
- 对婴儿床场景做音频样本评测集。
- 针对婴儿哭声检测另建独立音频分类模型，不强行交给 ASR。

---

## 6. LLM 对话与语义链路

### 6.1 当前方案

当前 LLM 使用：

```text
Ollama + gemma4:latest
```

主要端口：

```text
11435
```

后端调用地址：

```text
http://127.0.0.1:11435/v1/chat/completions
```

### 6.2 已完成优化

Gemma4 的 reasoning/thinking 输出已在后端调用层关闭：

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

语音聊天还做了 instant 回复优化：

```text
temperature=0.3
max_tokens=256
```

### 6.3 Ollama 实例经验

这段时间出现过多个 Ollama 实例：

```text
11434
11435
11438
```

经验结论：

- 不要长期混用多个实例。
- 每个实例的 `OLLAMA_MODELS` 可能不同，导致 `ollama list` 看到的模型不同。
- 对外测试时可以短暂暴露 `11435`，但测试后应该关闭公网或加鉴权。
- 后端推荐固定使用一个服务端口，避免模型不可用。

### 6.4 vLLM 迁移说明

vLLM 是后续可选方向，但注意：

- vLLM 通常使用 HuggingFace 格式权重。
- Ollama 的 GGUF/Q4 模型不能直接搬到 vLLM。
- 如果要迁移 Gemma，需要重新准备 HF 权重。
- 当前阶段先保持 Ollama 可用，避免 demo 前大动基础设施。

---

## 7. TTS 语音合成链路

### 7.1 当前状态

TTS 服务端口：

```text
40028
```

当前 demo 阶段以服务器实际服务为准，曾经验证过：

- CozyVoice
- F5-TTS
- MeloTTS

### 7.2 选型经验

这段时间对 TTS 的判断：

- F5-TTS 效果较好，但商业使用需要做风险披露和协议确认。
- MeloTTS 更轻量，但语音克隆和自然度有限。
- 树莓派端不适合跑重 TTS，几十块钱级别的硬件基本只能做采集、播放和简单控制。
- 正式产品应让 TTS 在服务器侧完成，硬件端只负责播放。

---

## 8. 视频与视觉识别链路

### 8.1 视频上传

接口：

```text
POST /api/v1/video/upload
```

功能：

- 上传视频文件。
- 保存到本地 `uploads/videos`。
- 使用 ffmpeg 截取首帧封面。
- 返回 `video_url` 和 `img_url`。
- 写入 `videos` 表。

数据库字段：

```text
video_url
img_url
video_content_text
```

### 8.2 视频分析

接口：

```text
POST /api/v1/video/analyze
```

请求示例：

```bash
curl -X POST http://127.0.0.1:34223/api/v1/video/analyze \
  -H "Content-Type: application/json" \
  -d '{"video_id":1827,"sample_fps":0.2,"max_frames":3}'
```

内部流程：

```text
server2 收到 video_id 或 video_url
-> 定位本地视频
-> ffmpeg 抽帧
-> 把视频帧转为 data:image/jpeg;base64
-> 调用 Qwen2.5-VL 服务 30006/image/analyze
-> 汇总多帧结果
-> 回写 videos.video_content_text
```

### 8.3 Qwen2.5-VL 服务

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

常驻服务：

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

### 8.4 部署中遇到的问题

曾经遇到：

- PyTorch CUDA 版本不匹配。
- 服务器驱动是 CUDA 12.4，但误装过 CUDA 13 wheel。
- 缺 `libnvrtc.so.12`。
- 缺 `torchvision`、`torchaudio`、`sympy==1.13.1`。
- 服务器网络不稳，改为 Mac 下载 Linux wheel 后上传。

最终跑通环境：

```text
torch 2.6.0+cu124
torchvision 0.21.0+cu124
torchaudio 2.6.0+cu124
transformers 5.14.1
accelerate 1.14.0
qwen-vl-utils 0.0.14
CUDA build 12.4
```

---

## 9. 多模态融合理解

会议中提到的“多模态融合”，在当前系统里可以理解为：

```text
视频画面 + 麦克风声音 + 传感器数据 + LLM 语义推理 + TTS 播报
```

当前已经具备的基础能力：

- 视频：Qwen2.5-VL 分析画面和视频帧。
- 语音：faster-whisper 识别家长/环境语音。
- 对话：Gemma4 进行照护语义回复。
- 播报：TTS 输出语音提醒。
- 传感器：后端保留温湿度、风险状态、雷达/传感器数据接口。

后续真正的多模态融合应该由后端汇总：

```text
视频识别结果
+ ASR 文本
+ 哭声分类结果
+ 温湿度/雷达/姿态传感器
+ 历史状态
=> 统一事件判断
=> LLM 生成解释和建议
=> TTS 播报
```

---

## 10. 哭声检测模型方向

当前 ASR 不应该承担哭声识别任务。哭声检测更适合独立音频分类模型。

建议方向：

- 独立训练或微调 baby cry detection 模型。
- 输入是音频片段，不是文字。
- 输出包括：是否哭声、哭声强度、置信度、持续时间。
- 再把结果交给 server2 做多模态融合。

推荐接口形态：

```text
POST /api/v1/audio/cry-detect
```

返回示例：

```json
{
  "is_crying": true,
  "confidence": 0.91,
  "cry_level": "moderate",
  "duration_sec": 4.2
}
```

---

## 11. 部署与运维经验

### 11.1 不要长期依赖 nohup

这两个月反复出现服务掉线问题，核心原因之一是手动 `nohup` 服务不可控。

建议所有关键服务都 systemd 化：

```text
baby-bed-server2.service
qwen2vl.service
asr-fast.service
tts.service
ollama.service
```

### 11.2 常用检查命令

```bash
ss -lntp | egrep ':(34223|40021|40028|30006|11435)'

curl http://127.0.0.1:34223/api/v1/health
curl http://127.0.0.1:40021/health
curl http://127.0.0.1:40028/health
curl http://127.0.0.1:30006/health
curl http://127.0.0.1:11435/api/version
```

### 11.3 日志查看

```bash
journalctl -u baby-bed-server2 -n 100 --no-pager
journalctl -u qwen2vl -n 100 --no-pager
journalctl -u ollama -n 100 --no-pager
```

### 11.4 端口公网风险

曾经观察到模型端口暴露公网后有大量陌生 IP 连接。

结论：

- 模型服务不应该长期裸露公网。
- 外部访问应该统一通过 server2。
- 测试必须开放时，应设置 IP 白名单或 token 鉴权。

---

## 12. 服务器与算力评估

### 12.1 当前服务器

当前测试服务器有多张 96GB Ampere GPU，被识别为定制 A100 类设备。

实际经验：

- Gemma4:31B Q4 可运行，但资源占用明显。
- gpt-oss:120b 也能塞入，但落地部署成本和延迟都偏高。
- Qwen2.5-VL-7B 更适合当前视频理解任务。
- 生产环境不建议长期依赖单位测试服务器。

### 12.2 云服务器 ROI

对于婴儿床陪伴项目，长期租高端 GPU 云服务器 ROI 压力非常大：

- A100/高端 GPU 月租成本高。
- 多模型常驻需要持续付费。
- 用户规模扩大后推理成本会继续放大。

因此讨论过自组服务器方案：

```text
RTX Pro 6000
AMD EPYC 64C/128T
DDR5 ECC 256GB
企业级 SSD 4TB
SAS HDD 4TB
服务器机箱
```

结论：

- Demo 阶段继续使用现有服务器。
- 产品化前再评估自组服务器或托管机房。
- 不建议一开始就重度依赖昂贵 GPU 云租赁。

---

## 13. 当前已知风险

| 风险 | 说明 | 建议 |
|---|---|---|
| 模型端口裸露 | 可能被扫描和偷算力 | 统一走 server2，加白名单/鉴权 |
| TTS 商用协议 | F5-TTS / CozyVoice / MeloTTS 均需确认协议 | 正式商用前做协议审查 |
| ASR 中文稳定性 | distil 模型中文/中英混合可能不稳 | 建立测试集，必要时换 large-v3 |
| 视频分析延迟 | 当前逐帧调用 Qwen2.5-VL | 后续改成一次请求多帧 |
| 服务常驻 | 部分服务历史上靠 nohup | 全部 systemd 化 |
| 多模态融合 | 当前是链路跑通，还不是完整融合决策 | 后续增加统一事件融合层 |

---

## 14. 后续建议

优先级从高到低：

1. 保持当前 demo 链路稳定，不在演示前大改基础设施。
2. 给 34223 主后端配置正式域名和 HTTPS。
3. 关闭或限制 11435、30006、40021、40028 公网访问。
4. 将 ASR/TTS/Qwen2.5-VL 全部补齐 systemd 服务文件。
5. 将 Qwen2.5-VL 改为一次请求多帧，降低视频分析延迟。
6. 引入独立哭声检测模型。
7. 建立小型评测集：ASR 中文、LLM 中文回复、TTS 可懂度、视频风险识别。
8. 在 server2 增加统一多模态融合事件接口。
9. 正式商用前评估 TTS 和模型协议。
10. 重新评估自组服务器硬件采购和保修方案。

---

## 15. 交接速查

### 启动/检查 server2

```bash
systemctl status baby-bed-server2 --no-pager
systemctl restart baby-bed-server2
curl http://127.0.0.1:34223/api/v1/health
```

### 检查 ASR

```bash
curl http://127.0.0.1:40021/health
```

### 检查 TTS

```bash
curl http://127.0.0.1:40028/health
```

### 检查 LLM

```bash
curl http://127.0.0.1:11435/api/version
OLLAMA_HOST=127.0.0.1:11435 ollama list
```

### 检查 Qwen2.5-VL

```bash
systemctl status qwen2vl --no-pager
curl http://127.0.0.1:30006/health
```

### 测试视频分析

```bash
curl -X POST http://127.0.0.1:34223/api/v1/video/analyze \
  -H "Content-Type: application/json" \
  -d '{"video_id":1827,"sample_fps":0.2,"max_frames":3}'
```

---

## 16. 当前结论

当前系统已经从“接口分散、假实现多、模型链路不统一”的状态，推进到了：

```text
小程序/硬件端 -> server2 -> ASR / LLM / TTS / Qwen2.5-VL
```

这条链路已具备 demo 和进一步联调的基础。下一阶段的重点不应该是继续堆模型，而是：

- 稳定服务常驻。
- 控制公网访问风险。
- 做小规模真实场景测试。
- 把视频、声音、传感器结果融合成统一事件判断。
