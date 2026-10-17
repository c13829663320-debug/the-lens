# CG 制作与接入计划（豆包 Seedance）

后续镜头的可执行镜头表、逐镜头提示词、版本命名和审核清单见 [CG-SHOTLIST.md](CG-SHOTLIST.md)。该表同时区分 `pending_generation`、`draft_needs_art_review` 和 `approved`；计划条目不等于已生成或已接入。

镜头范围覆盖剧本全序列：`S10 → S01 → S02 → S06 → S03 → S04 → S05 → S07 → S08 → S09 → 片尾`。现有六条 MP4（S10、S01、S02、S05、S09、片尾）已经存在并通过本机媒体校验，但仍是 `draft_needs_art_review`；S03、S04、S06、S07 的视频和 S08 的正式历史影像层仍是 `pending_generation`。S08 的现有暖色静态候选只作为审核参考，不进入 `asset-runtime`、`data/chapter.js` 或视频 manifest。

CG 由用户明确指定使用豆包 Seedance 2.5 生成。本次已查询到连接平台中的 `bytedance/seedance-2.5/image-to-video`（模型 ID `cbe8b347-8c85-4e1a-b379-f96f48932f43`），并提交了 S01 灰废墟→彩文明的 6 秒、720p、16:9 首尾帧报价请求。平台返回“Video models are only available on paid plans”，因此没有报价、没有生成任务，也没有扣费。完整输入与返回状态见 `CG-QUOTE.json`。目录显示的约 280 credits 是参考值，不是此次报价；不得冒充已授权的确切成本。

以上为先前 Weave 路线的独立失败记录。随后已根据用户指定参考聊天找到另一套成功调用方法：`draw.openai-next.com` 的 `doubao-seedance-2-5-260628`，提交 `POST /v1/video/generations`，轮询 `GET /v1/tasks/{task_id}`。S01 纯文本恢复任务已完成并下载为 `server/media/cg_s01_reveal_720p_v1.mp4`，通过 ffprobe/ffmpeg 基础校验，但接触表显示建筑构图与 canonical S01 不同，当前 `draft_needs_art_review`；详见 CG-METHOD-REFERENCE.md、CG-GENERATION.md 与 CG-RESPONSE.json。该平台与 Weave 的套餐限制互相独立，不能把 Weave 的拒绝当作新路线状态。草稿尚未加入 approved manifest，也不等于微信播放或真机通过。

## 全量镜头批次

| ID | 用途 | 画幅/时长 | 生成边界 | 接入 |
|---|---|---|---|---|
| cg_s10_montage | 开场旧时代→熄灭→透镜 | 16:9，8–12s | 无文字依赖，后期叠 AI 广告字幕；机械手最后放镜 | S10 可选演出，失败回静帧 |
| cg_s01_reveal | 商场现实→文明影像 | 16:9，6–8s | 保留 canonical 场景的建筑边界；当前文件构图不同，待美术确认 | 仅草稿预览，不能替换 S01 静帧 |
| cg_s02_lens_reveal | 同构商城显影 | 16:9，5–7s | 保留现实断墙/地面缺口，影像覆盖但不改实体 | S02 投影切换 |
| cg_s06_landmark | 废墟地标→画廊路径 | 16:9，5–7s | 旧外墙只作影像，不成为可穿越实体 | `pending_generation`，失败回静帧 |
| cg_s03_painter_process | 画师试探、覆盖、重画 | 16:9，6–8s | 不新增观众，不让透镜替代创作 | `pending_generation`，失败回静帧 |
| cg_s04_five_stars | 五颗星与五刻点 | 16:9，5–7s | 保持相对位置，不生成可读文字或发光星座 | `pending_generation`，失败回静帧 |
| cg_s05_missed_bridge | 踩空救援 | 16:9，5–8s | 不展示死亡，小花抓住，族长随后入画；固定结果 | S05 演出 |
| cg_s07_fire_conflict | 焚画、伤口与碎镜 | 16:9，5–7s | 不扩写对白，不新增族人，不复原被烧毁的画 | `pending_generation`，失败回静帧 |
| cg_s08_cave_gate | 木栅、低电与失真 | 16:9，5–7s | 木栅和洞口严格同构；视频不替代待审 S08 memory 静态层 | `pending_generation`，失败回静帧 |
| cg_s09_drawing_stars | 炭画与五点星 | 16:9，6–8s | 实体炭灰、真实星光、无 UI/无文字、透镜断电 | S09 作为动作衔接 |
| cg_end_morning | 小花送饭看晨光 | 16:9，6–8s | 不显示阿迟去向；无彩色奇迹和额外字幕 | 片尾演出前 |

## 通用视频提示词模板

```
《透镜 THE LENS》，科幻寓言末世短片，严格参考已提供的素材包构图与材质；横屏16:9，电影感写实，冷灰低饱和现实，历史影像只选择性恢复自然色彩；同一物理空间保持建筑立柱、断墙、地面缺口和人物比例对应；镜头运动克制、慢速、真实重量、空气尘埃和风；无 UI、无品牌、无现代字幕、无额外角色、无超自然能力。时间线：[此镜头动作]。结尾动作：[此镜头收束]。请生成干净画面，后期叠加中文字幕与音效。
```

负面提示词：`廉价科技蓝界面、全屏蓝滤镜、发光轮廓、泛滥粒子、魔法桥梁承重、影像改变现实物体、凭空生成食物、随机新人物、现代汽车、额外对白、英文乱码、水印、logo、片尾解释字幕、过度快速剪辑、恐怖血腥、肢体变形、手指错误、镜头穿模、人物服装跳变、建筑空间跳变`。

## 人工验收

每条视频检查：现实与影像是否同构；虚拟物是否无碰撞；阿迟/小花/族长外观是否符合用户剧本和包内参考；镜片五点是否稳定且不被模型增删；是否有可裁切的首尾安全帧；是否产生文字、水印、品牌或新增剧情。合格后转码为微信可接受格式，记录源文件、提示词、生成日期、模型版本、人工审核人和 hash。低质量或与原作冲突的成片删除，不用“AI 生成”作为质量借口。

## 媒体 manifest 约定

复制审核后的文件到 `server/media/`，按 `cg_<scene>_<shot>_t<两位take>_v<两位版本>_<resolution>.mp4` 命名；在 `manifest.json` 中记录实际文件的 `status`、`canonical`、字节数、SHA-256 和媒体元数据，例如 `{ "id": "cg_s02_lens_reveal", "file": "cg_s02_lens_reveal_t01_v01_720p.mp4", "status": "draft_needs_art_review", "canonical": false, "bytes": 4254604, "sha256": "..." }`。`approved` 之前不得加入生产远程 `clips`；服务只返回实际存在且扩展名受限的媒体。微信端继续使用包内静帧，远程视频失败时不阻塞剧情。
