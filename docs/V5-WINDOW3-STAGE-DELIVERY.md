# 《透镜 THE LENS》V5.0 窗口三阶段交付单

记录时间：2026-10-17（Asia/Shanghai）  
窗口：美术、视听、交互体验与品质验证  
共享基线：`main`，本轮复核起点为 `1206c89`（包含六条真实 CG 草稿和 S08 静态候选）；窗口三交付单最初提交链为 `033e59b`、`902461d`、`3a149ca`、`f901f78`、`68992f1`。当前工作树存在其他窗口未提交的客户端、媒体预览和构建产物改动，本单不包含、不覆盖这些改动。

本单只报告共享工作区中能由文件、命令或已有测试记录证明的事实。2026-10-17 窗口三已完成 S01、S10、S02、S05、S09 和片尾六条草稿的逐秒美术确认，六条均为 `rejected`：S10 复用同一安睡舱人物、片头未从黑场进入，且三角符号、熄灯强度和红色指示灯越过边界；S01、S02、S05、S09 和片尾的逐条缺陷见审核记录。当前没有视频获得 `approved`，不称为正式接入。S03、S04、S06、S07 和 S08 视频仍是 `pending_generation`，不创建占位文件；S08 静态候选单独记录，仍不进入运行时映射。逐条证据见 [`docs/cg-review/CG-ART-REVIEW-20261017.md`](cg-review/CG-ART-REVIEW-20261017.md)。

## 1. 当前已完成的实际功能

### 资源和映射

- 已完成 47 个输入文件的资源审计和运行时转换记录：43 张图片、3 段原创程序合成 WAV，以及资源尺寸、格式、alpha 范围、SHA-256、转换尺寸和用途。机器可读结果在 [`docs/asset-map.json`](asset-map.json)、[`docs/asset-map.csv`](asset-map.csv) 和 [`docs/asset-runtime.json`](asset-runtime.json)；摘要见 [`docs/ASSET-AUDIT.md`](ASSET-AUDIT.md)。
- 当前运行时有 10 个场景、16 个背景引用，`npm run check` 报告缺失 0。场景文件遵循 `assets/scenes/scene_Sxx_<state>_1280_v1.jpg`，运行时只引用映射中的相对路径。
- 角色三宫格、透镜四状态、电视机和木棒均按档案/参考图使用；没有把概念拼图冒充独立动画精灵。4 张透镜图虽有 RGBA 通道但保留灰底，不能当透明素材。当前没有独立透明角色动作帧。
- 当前可使用的声音只有原创占位资源：`ambient_wind_8s_v1.wav`、`lens_switch_v1.wav`、`puzzle_success_v1.wav`。它们不来自原作，不含配音或音乐授权声明；微信真机听感尚未验收。

### 视觉、交互和品质

- 现实/影像通过场景状态图、`containFrame` 和低干扰角色位置标记区分；影像层不参与实体碰撞，也没有宣称完成局部像素配准投影。
- 现有浏览器回归记录覆盖 1280x720 横屏和 390x844 竖屏，HUD 和横屏动作按钮没有重叠；触控移动、靠近后观察、现实/影像观察门槛、暂停和安全区布局已有自动化或浏览器证据。
- 视觉质量规则、全量剧本镜头提示词、版本命名和审核清单已集中在 [`docs/CG-SHOTLIST.md`](CG-SHOTLIST.md)。镜头表是制作工作单，不等于生成完成。

### CG 和媒体状态

- `server/media/` 当前有六条可读取 MP4：S01、S10、S02、S05、S09 和片尾。它们均为 1280×720、24fps、H.264/AAC，manifest 的 bytes/SHA 与文件一致；六条均为 `rejected`、`canonical:false`。完整记录见 [`server/media/manifest.json`](../server/media/manifest.json)、[`docs/CG-GENERATION.md`](CG-GENERATION.md) 和逐条审核单。
- 被退回的视频仍保留在本地目录供重做对照，但服务端过滤 `rejected`，草稿也不进入客户端生产 `clips`。`data/media.js` 的生产 `baseUrl`/`clips` 仍为空；其他窗口的 browser-only `previewClips` 不视为生产接入。
- `assets/scenes/scene_S08_memory_1280_v1.jpg` 是已核对尺寸、解码和 SHA 的暖色构图候选，但来源为处理/转码产物，缺少正式图生图回传证据；`data/chapter.js` 的 `S08.memory` 和 `docs/asset-runtime.json` 保持未接入。
- 阿里云服务、Range/健康检查和部署说明属于媒体后端窗口；窗口三只做资源状态和体验验收，不把服务端已有文件视作本窗口已重新部署或已通过真机验证。

### 资源映射表

| 资源类别 | 运行时范围 | 当前状态 | 使用规则 |
|---|---|---|---|
| 场景底图 | `assets/scenes/scene_S01...S10...`；10 场景、16 引用 | 已存在，缺失 0 | 只按 `asset-runtime.json` 引用；现实/影像不是像素配准时不得做局部投影承诺 |
| 角色档案 | `assets/archive/character_C01...C05...` | 已存在，概念缩略图 | 三宫格仅作资料/参考，不能当独立动画精灵 |
| 透镜与道具 | `assets/archive/prop_P01_*`、`prop_P02_*`、`prop_P03_*` | 已存在，透镜四态仍带灰底 | 不宣称透明去背；五刻点稳定性需由新独立素材补齐 |
| 岩画 | `assets/archive/art_A01_prometheus_960_v1.jpg` | 已存在，档案细节图 | 不作为可交互角色或新增剧情画面 |
| UI/补充参考 | `assets/ui/**`、`assets/reference/**` | 已压缩，主要是参考 | 不覆盖 Canvas 公共 UI，不把参考背景当原作镜头 |
| 音频 | `assets/audio/ambient_wind_8s_v1.wav`、`lens_switch_v1.wav`、`puzzle_success_v1.wav` | 原创占位音，真机听感待验 | 不添加未授权音乐、配音或原作音频 |

### 视觉与音频优化现状

| 项目 | 已有表现 | 仍然受限的部分 | 负责人 |
|---|---|---|---|
| 现实/影像差异 | 冷灰现实、选择性恢复色彩、状态图和边框区分 | 当前是整幅场景切换/淡入，不是局部像素配准 | 窗口一实现，窗口三验收 |
| 透镜启动/切换 | `lens_switch` cue、模式状态和亮度/电量 HUD 已有 | 低电量、断电专用视觉和音效仍需设备验收 | 窗口一实现，窗口三验收 |
| 场景反馈 | `puzzle_success` 和环境音增益覆盖现实/影像/洞穴/片尾 | 事故、鸟鸣、洞穴和影像专用层缺失 | 窗口三提供需求，音频实现由窗口一协调 |
| 角色表现 | 使用低干扰位置标记，避免误用三宫格 | 独立透明动作/表情帧尚未提供 | 窗口三资源，窗口一接入 |

## 2. 正在开发或待验收的功能

- S01：逐帧美术构图、人物/空间一致性、音频听感和审批结论。结论只能是 `approved`、`rejected` 或继续 `draft_needs_art_review`；在 `approved + hash + 元数据 + 审核人` 齐全前不得进入生产 manifest。
- S10 旧时代蒙太奇：已完成确认并写入 `rejected`，需要修正安睡舱人物、片头黑场和旧设备标识/熄灯边界后重做。
- S02 食品区、S05 断桥、S09 炭画与片尾晨光：已完成确认并写入 `rejected`，需要新版本后重新审核。
- S03、S04、S06、S07 和 S08 视频：只有镜头表和提示词，保持 `pending_generation`。
- S08 囚禁洞口历史影像底图：存在一个经处理的构图候选，但不是正式图生图回传；`asset-runtime.json` 仍只有 S08 reality，memory 必须保持 `null`，不得用其他场景或占位图替代。
- 独立角色透明动作帧、独立透镜五刻点图标、洞内实体道具图标和专用事故/鸟鸣/洞穴/影像声：目前是资源需求，不以概念图或合成占位音冒充完成。
- 现实与影像的局部同构、低电量/断电视听反馈和关键镜头动画：当前由现有 Canvas 状态和占位音支撑，仍需窗口一配合小范围实现、窗口三验收。
- 绘画、五点观星、撬石、片尾晨光的浏览器完整人工流程，以及微信开发者工具和至少一台真机的触屏、音画同步、横竖屏和失败回退验证仍未完成。
- `lens.xscxm.asia` 的 DNS A、HTTPS/TLS、微信请求/下载合法域名、正式 AppID 绑定和真机远程 CG 播放仍待部署窗口提供证据。

### 交互体验问题清单

| 编号 | 问题/风险 | 证据 | 等级 | 处理人和状态 |
|---|---|---|---|---|
| UX-01 | S01 草稿构图与 canonical 场景不一致，不能作为正式演出 | 接触表和 manifest 状态 | P0 | 美术/媒体窗口；待审核 |
| UX-02 | S05 断桥/完好桥图不是同构图，热区必须按状态核对 | `ASSET-AUDIT.md` 场景映射 | P1 | 窗口一实现，窗口三回归 |
| UX-03 | 缺少独立角色和动作帧，角色只能用位置标记 | 资源映射缺口 | P1 | 窗口三补资源，待生成 |
| UX-04 | 绘画、五点观星、撬石、片尾的完整人工流程尚未走完 | `TEST-REPORT.md` 和浏览器记录 | P0 | 窗口一/二先完成流程，窗口三验收 |
| UX-05 | 浏览器 HUD 通过，但微信安全区、原生视频层和音频尚无真机证据 | 浏览器/CLI 仅为预检 | P0 | 发布窗口；待设备 |
| UX-06 | 事故、鸟鸣、洞穴和影像声缺少专用资源 | `asset-map.json` 音频列表 | P1 | 窗口三提出需求，待授权素材 |

窗口三不通过新增对白、角色、结局或模型接口来规避上述问题。

### 关键场景品质检查记录

| 场景 | 必查画面/动作 | 音频检查 | 当前结论 |
|---|---|---|---|
| S10 安睡舱 | 旧时代档案、机械手放镜、无新增角色和可读广告字；现有片头未从黑场进入、人物复用、三角符号、熄灯强度和红灯均不合格 | 环境声不冒充剧情对白；目标设备听感未验收 | CG `rejected` |
| S01 商场外景 | 现实/影像空间关系、建筑立柱和地面边界；现有视频不是同构商场 | 风声无语音/音乐侵权 | CG `rejected` |
| S02 食品区 | 影像食物不可拿取，关镜后真实罐头行动成立；角色和标签不合格 | 切换 cue 与成功 cue 不抢对白 | CG `rejected` |
| S05 断桥 | 影像桥不承重，小花受伤、阿迟抓住、族长救援固定；现有现代高架不合格 | 落石/救援专用声尚缺 | CG `rejected` |
| S08 囚禁洞口 | 现实洞口、木栅、地平线位置必须保留；候选 memory 未接入 | 洞穴/失真/断电专用声尚缺 | 仅 reality 可用；memory `null`，视频/底图待审 |
| S09 洞穴 | 断电后画迹、五点、裂隙和木枝均为实体，不产生魔法光；现有视频三个发光点不合格 | 洞穴/风尘专用声尚缺 | CG `rejected` |
| 片尾晨光 | 小花端饭、看新画和裂隙，不显示阿迟去向或奇迹彩色；现有视频四个发光点不合格 | 风声淡出、片名黑场顺序 | CG `rejected` |

### 设备适配与回归记录

| 环境 | 已执行内容 | 真实结果 | 结论边界 |
|---|---|---|---|
| 浏览器 1280x720 | 横屏 HUD、操作栏、安全区和场景框截图 | 已确认无按钮重叠 | 仅浏览器预检，不等于微信真机 |
| 浏览器 390x844 | 窄屏 HUD、场景图下方操作区截图 | 已确认无按钮重叠 | 仅浏览器预检，不等于微信真机 |
| 微信开发者工具临时副本 | 合法 AppID 副本 `open`/`preview` | 退出码 0，包约 3.73 MB | 源工程仍为 `touristappid`，不能称正式绑定 |
| 微信真机/低性能机 | 横屏、安全区、音频、原生视频层、断网回退 | 未执行或无证据 | 发布阻塞 |
| ECS 外网 | `--resolve` 的健康检查、manifest、MP4 `206 Range` | 已有一次验证 | DNS A、TLS 和微信域名仍未确认 |

## 3. 新增和修改的文件路径

### 本次窗口三提交

- `README.md`（同步六条草稿审核结论和媒体发布边界）。
- `server/media/manifest.json`（六条真实 MP4 的审核状态、退回原因和 `canonical:false`）。
- `docs/CG-PLAN.md`、`docs/CG-GENERATION.md`、`docs/CG-SHOTLIST.md`（镜头计划、生成记录和镜头表状态）。
- `docs/cg-review/CG-ART-REVIEW-20261017.md`（新增；六条逐秒美术确认记录）。
- `docs/V5-WINDOW3-STAGE-DELIVERY.md`（本交付单）。

### 窗口三负责维护的现有文件范围

- `assets/**`：运行时图片、音频和经审核的新资源；新增文件必须先有来源、命名、尺寸/格式、SHA-256 和用途记录。
- `docs/asset-map.json`、`docs/asset-map.csv`、`docs/asset-runtime.json`、`docs/ASSET-AUDIT.md`：资源映射、审计和缺口记录。
- `docs/CG-PLAN.md`、`docs/CG-METHOD-REFERENCE.md`、`docs/CG-GENERATION.md`、`docs/CG-SHOTLIST.md`、`docs/IMAGE-PROMPTS.md`：CG 生成、提示词、版本和审核记录。
- `docs/V5-WINDOW3-STAGE-DELIVERY.md`：窗口三阶段交付单。

### 共享工作树中观察到、但本窗口没有修改的文件

窗口三没有修改公共客户端、剧情、媒体后端代码或构建产物；仅维护了媒体审核 manifest 的数据状态。当前共享工作树仍存在其他窗口未提交的 `data/media.js`、`ui/game.js`、`dist/**`、测试和工具改动，本单不覆盖、不代替这些成果；`dist/**` 仍由窗口一负责最终构建集成。

## 4. 使用或新增的公共接口

本窗口没有新增公共接口，也没有改变 `ui/game.js`、`systems/*`、`data/*` 或 `server/*` 的接口。

窗口三只消费以下已有契约并负责体验验收：

- 资源：`Assets.load(path)`、`Assets.retain(paths)`、`Assets.get(path)`；路径必须来自章节数据或资源映射。
- 音频：`AudioSystem.apply(settings)`、`environment(mode)`、`cue(name)`、`pause()`；现有状态为 `reality`、`memory`、`cave`、`ending`。
- 媒体：`data/media.js` 的 `baseUrl`、`clips`、`sceneClips`、`manifestPath`。未批准素材不进入远程 `clips`；远程失败必须回退包内静帧。
- 服务端只读 HTTP：`GET/HEAD /health`、`GET/HEAD /api/media-manifest`、`GET/HEAD /media/<filename>`。接口修改权和部署验收属于媒体后端窗口。

## 5. 责任和最终验收矩阵

| 模块 | 唯一修改负责人 | 窗口三参与方式 | 验收/最终集成 |
|---|---|---|---|
| `assets/**`、资源映射、CG/音频文档 | 窗口三 | 直接维护、审计、视觉/听觉验收 | 窗口三品质签字；窗口一确认运行时兼容 |
| `ui/**`、`systems/**`、`platform/**` | 窗口一 | 提交视觉/听觉问题和复现步骤，不直接扩展公共接口 | 窗口一最终集成；窗口三做体验回归 |
| `data/chapter.js`、玩法测试 | 窗口二 | 验证镜头动作不改变剧情和固定因果 | 窗口二玩法验收，窗口一集成 |
| `data/media.js`、CG production manifest | 媒体后端窗口 | 核对素材状态、审批和资源存在性 | 媒体窗口负责清单；窗口一确认客户端引用，窗口三确认资源状态 |
| `server/**`、Nginx/systemd、ECS | 媒体后端窗口 | 验证媒体可读性和客户端回退体验 | 媒体窗口服务测试；窗口一最终集成 |
| `dist/**` | 窗口一构建生成 | 只检查产物是否包含已批准资源 | 窗口一发布验收 |

## 6. 依赖其他窗口的内容

- 需要窗口一确认公共客户端未提交变更的集成边界；任何视觉补丁必须先登记文件、目的、兼容方案和回归命令。
- 需要窗口二确认镜头动作、角色状态、S05 固定救援、S09 断电推进和片尾红线与最终剧本一致。
- 需要媒体后端窗口提供 S01 审核后的真实文件、hash、ffprobe 元数据、manifest 状态和 HTTPS/Range 证据；没有这些证据不改 `data/media.js`。
- 需要部署/发布窗口提供 DNS A、TLS、Nginx/systemd 外网验证、微信合法域名、正式 AppID 和真机限制记录。
- 六条均需按审核单重做后再审；S10 需特别修正安睡舱人物差异、片头黑场和旧设备标识/熄灯边界。生成平台任务完成不等于艺术批准。

## 7. 已执行的测试及真实结果

本轮在共享工作树执行，命令均返回退出码 0：

- `npm test`：共享工作树当前 61/61 通过；其中包含其他窗口未提交的浏览器 draft mapping 与交互测试，窗口三未修改这些测试或客户端文件。
- `npm run check`：退出码 0，`scenes: 10`、`backgroundReferences: 16`、`missing: 0`、`requiredMemoryLayers: 1`、`missingRequiredMemoryLayers: ["S08.memory"]`；S08 缺失是当前明确待生成项，不是被占位资源掩盖的错误。
- `npm run build`：为避免覆盖其他窗口未提交的 `dist/**`，在当前工作树的临时隔离副本执行成功，输出 `runtimeBytes: 4038975`、`dependencyCount: 0`；当前工作树的 `dist/**` 未由窗口三重建。
- `npm --prefix server test`：2/2 通过，覆盖 Range、HEAD、manifest 过滤、错误码、CORS 条件和路径穿越。
- 只读资源映射核验：运行时映射 34 个唯一引用，`missingReferences: 0`；43 个映射运行时文件 `hashMismatches: 0`、`invalidMappedDimensions: 0`；记录的压缩图片为 `3363394` bytes，音频为 `293892` bytes。
- 只读媒体核验：六条 manifest 文件均存在，实际字节数与登记一致，SHA-256 匹配；六条均为 `rejected`、`canonical:false`。S08 候选另行核对为 1280×720 RGB/sRGB JPEG、288,072 bytes，未进入映射。
- 资源审计记录：`docs/ASSET-AUDIT.md` 记载 43 张图片完整解码、转换图重解码、31 条原始清单 SHA/尺寸核对和 3 个 WAV 重解码通过；本单不把这些记录扩展成微信真机听感结论。
- 浏览器视觉记录：1280x720 横屏和 390x844 竖屏 HUD 无按钮重叠；最新 390x844 全流程已覆盖 S02 真实罐头、S05 两步救援、S09 绘画/观星/撬石和片尾恢复，但不是微信真机验收。
- 微信 CLI 记录：临时项目的 `open`/`preview` 返回 0，当前 `project.config.json` 的 AppID 为 `wxf9d2785d37c216d4`；仍没有真机扫码、音频、远程 CG 或正式上传证据。
- ECS 记录：曾用 `--resolve` 验证 `/health`、manifest 和 MP4 `206 Range`；DNS A、HTTPS/TLS、微信合法域名和真机尚未确认。

## 8. 当前最需要其他窗口配合的事项

1. 六条草稿按审核单重做并重新提交，尤其是 S10 的人物差异、片头黑场和旧设备标识/熄灯边界；重做前不得进入 canonical。
2. 对 S03/S04/S06/S07/S08 视频回传真实生成文件和元数据；没有文件继续保持 `pending_generation`。新版本必须带任务、提示词、hash 和逐镜头签字，不能只凭任务完成状态放行。
3. 由媒体后端窗口补齐实际部署证据，并与窗口一确认客户端的远程媒体回退范围。
4. 由窗口一和窗口二完成绘画、观星、撬石、片尾的完整人工流程，再由窗口三做视觉误导、操作歧义和音画同步复核。
5. 提供正式 AppID、微信合法域名和至少一台真机的横屏/安全区/音频/视频原生层记录；开发者工具和浏览器只能作为预检。

## 9. 接下来准备修改的文件

在以上同步完成前，窗口三只准备修改以下文档或已有资源映射：

- `docs/V5-WINDOW3-STAGE-DELIVERY.md`：补充实际审核人、复现步骤和设备证据。
- `docs/ASSET-AUDIT.md`、`docs/asset-map.json`、`docs/asset-map.csv`、`docs/asset-runtime.json`：仅在新资源真实存在并通过尺寸、格式、alpha、hash 和引用检查后更新。
- `docs/CG-GENERATION.md`、`docs/CG-SHOTLIST.md`、`docs/IMAGE-PROMPTS.md`：只记录真实生成/审核结果，不把计划改为完成。
- `assets/**`：只接入经授权且可验证的素材，不改现有公共路径，不覆盖其他窗口新增文件。

窗口三暂不修改 `ui/game.js`、`systems/**`、`platform/**`、`data/chapter.js`、`data/media.js`、`server/**` 或 `dist/**`。若出现可复现的视觉/触控缺陷，先提交问题、责任人和最小补丁范围，再由对应负责人修改并由窗口三回归验收。

