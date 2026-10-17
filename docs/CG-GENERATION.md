# S01 显影CG执行记录

状态：首条图生任务`failed`；经明确授权的纯文本恢复重试`completed`，已下载并通过本机媒体校验。该片为待美术审阅的环境CG草稿。

已按用户指定参考聊天方法切换到`https://draw.openai-next.com`。用户完成登录后，于已登录令牌页指定`lens-test-20261016`行的请求示例临时取得Bearer令牌，只保存在浏览器任务内存，不输出、不写入源码或交付物。

本次只提交1次`POST /v1/video/generations`，HTTP 200；任务ID为`task_BMlK5mm9JVqqrjn94rw0QoXTq01W6oWP`，初始状态`queued`。参数为模型`doubao-seedance-2-5-260628`、8秒、720p、16:9、`generate_audio:false`。平台提交响应返回`billing_detail.price=4`、`cost_quota=2000000`；货币单位和最终结算/退款状态未确认，不称为人民币。

随后`GET /v1/tasks/{task_id}`返回HTTP 200、`action: image_to_video`、`task_type: image_to_video`、`status: failed`、`progress: 100%`，无`result_url`、无`result`或视频输出。API响应与其`properties`字段没有提供`error/message/fail_reason`。可以确认平台识别了图生视频任务，无法据现有证据确定上游失败原因。

平台令牌页实际请求示例明确通用字段`model/prompt/duration/image/images/size/input_reference`与Seedance的`metadata.resolution/ratio/content`。本次使用文档明确的顶层`image`字段，引用原S01现实图的已上传公共JPEG；没有套用Weave的`image_url/end_image_url`字段。首尾帧配对格式未确认，本次仅用单幅现实参考。

待提交提示词方向：固定广角商场外景，无人物、无文字、无新增实体；从低饱和黑白废墟缓慢显现克制的旧文明色彩记忆，建筑没有实际修复或变化，最后回到静默现实。尊重输入素材的实际建筑比例、空间关系与末世质感；禁止蓝色科技遮罩、泛光、粒子或广告UI。

预期交付路径为`server/media/cg_s01_reveal_720p_v1.mp4`，当前没有创建任何占位MP4冒充生成结果。

首条图生任务失败后，获得一次有实质变化的恢复重试授权：移除`image`字段，使用参考聊天已验证的纯文本请求格式。第二任务ID为`task_5ZmtlE4uw1pl4zv8oehX6gzdUlnZ68p9`，HTTP 200、初始`queued`，模型、时长、画质和比例相同，`generate_audio:true`，提示词仅要求环境风、无语音或音乐。第二提交响应同样为`price=4`、`cost_quota=2000000`。两次提交价格字段合计8个平台单位，单位以及首失败退款仍未确认，不能声称首任务未扣费。

只轮询第二任务，没有继续重投。视频已保存到`server/media/cg_s01_reveal_720p_v1.mp4`，并通过ffprobe和ffmpeg全量解码；首帧、中帧、尾帧已生成人工审阅接触表。尚未进行微信真机播放、音频听感审阅或逐帧美术批准。该视频的纯文本生成构图与原S01图片不同，manifest标注为草稿预览，不能替换canonical场景图。

## 2026-10-17 Seedance 2.5 批次

按参考聊天中的同源调用方式，在已登录平台页面内提交了五条纯文本任务。模型为`doubao-seedance-2-5-260628`，横屏16:9、720p、生成环境音；Bearer 令牌只在浏览器页面内存中使用，未写入仓库。任务均返回HTTP 200并完成，结果下载后通过`ffprobe`与`ffmpeg`完整解码。

| 镜头 | 任务ID | 文件 | 时长 | 字节数 | SHA-256 | 当前状态 |
|---|---|---|---:|---:|---|---|
| S10 旧时代蒙太奇 | `task_KXo6cYiMJOQCf7YmvCOH1BlTnmJSgSS4` | `cg_s10_montage_t01_v01_720p.mp4` | 10.08s | 9,251,079 | `28759b61936385b7b2ff698c64931685074d49be42ef3635d2f8dd77b99de3a1` | `draft_needs_art_review` |
| S02 食品区显影 | `task_dtwKEljejrXPLBDefjDvwZTt8hNMOcAI` | `cg_s02_lens_reveal_t01_v01_720p.mp4` | 6.08s | 4,254,604 | `4eeae12196f1d8b809ae6c37574cd659714feaddfff31034116eddff0b04ccdb` | `draft_needs_art_review` |
| S05 断桥救援 | `task_z0ib7X6b3JV5cNmtucTgCt6xCcHdopZp` | `cg_s05_missed_bridge_t01_v01_720p.mp4` | 8.064s | 8,041,506 | `c8661b57c1320ae8d87a6a5a72ba19b2a82913b9ae451e9232c432aa0ef06463` | `draft_needs_art_review` |
| S09 炭画与五点 | `task_GN6PQBCgkh77XUPvFLztLO946to4Zdbj` | `cg_s09_drawing_stars_t01_v01_720p.mp4` | 8.064s | 5,900,957 | `675d1f442c2413e20445a3eca24de8e43b7559bb3c07b2c2ee5627e70a7d45f9` | `draft_needs_art_review` |
| 片尾晨光 | `task_YrbvcShLb0LLqZHZLIVwIKLljOgp8DF5` | `cg_end_morning_t01_v01_720p.mp4` | 8.064s | 10,253,518 | `2e59575977733564659b88714762c32f0eeebbb2cec5ff61956d309f85254946` | `draft_needs_art_review` |

本批次尚未进入`canonical`或微信端远程播放清单。抽帧检查发现模型对人物外观、空间细节和构图有自由发挥，下一步需按`CG-SHOTLIST.md`逐镜头确认；不合格镜头保留任务记录并重新生成新版本，不覆盖当前文件。

## 资源核验补充（2026-10-17）

当前 `server/media/` 的可验证视频清单如下。六条文件均已通过 `ffprobe` 轨道读取和 `ffmpeg -f null` 完整解码，manifest 的字节数与 SHA-256 均匹配；它们仍是草稿预览，不是正式接入：

| 镜头 | 文件 | 容器时长 | bytes | SHA-256 前缀 | 状态 |
|---|---|---:|---:|---|---|
| S01 | `cg_s01_reveal_720p_v1.mp4` | 8.064s | 3,993,189 | `1eae4cc2…a871f` | `draft_needs_art_review` |
| S10 | `cg_s10_montage_t01_v01_720p.mp4` | 10.080s | 9,251,079 | `28759b61…de3a1` | `draft_needs_art_review` |
| S02 | `cg_s02_lens_reveal_t01_v01_720p.mp4` | 6.080s | 4,254,604 | `4eeae121…4ccdb` | `draft_needs_art_review` |
| S05 | `cg_s05_missed_bridge_t01_v01_720p.mp4` | 8.064s | 8,041,506 | `c8661b57…06463` | `draft_needs_art_review` |
| S09 | `cg_s09_drawing_stars_t01_v01_720p.mp4` | 8.064s | 5,900,957 | `675d1f44…7d45f9` | `draft_needs_art_review` |
| 片尾 | `cg_end_morning_t01_v01_720p.mp4` | 8.064s | 10,253,518 | `2e595759…54946` | `draft_needs_art_review` |

共同媒体规格为 1280×720、24fps、H.264/AAC；S01 的 manifest 时长 `8042ms` 对应视频轨约 8.0417s，而容器报告 8.064s，后续审核和转码时须保留该口径差异，不能据此宣称已通过微信播放。

## S08 记忆底图候选

`assets/scenes/scene_S08_memory_1280_v1.jpg` 已存在，1280×720、RGB/sRGB、288,072 bytes，SHA-256 为 `d3f07651508a673a31ae0325f592d3b3c4416d68d3cf9d53c9ecd21d11d7afef`，可正常解码。它与现实底图保持同一洞口、木栅和地平线构图，但 JPEG 注释为 `Lavc62.28.102`，属于处理/转码产物；当前没有模型、日期、原始提示词、参考图回传和授权范围证据。该文件只能作为 `draft_needs_art_review` 候选，不能写入 `docs/asset-runtime.json` 或 `data/chapter.js`，也不能进入视频 manifest。正式图生图回传并完成美术签字前，S08 `memory` 继续为 `null`。

S03、S04、S06、S07 和 S08 视频没有可验证输出，保持 `pending_generation`；不创建占位视频，不把静态候选冒充成视频成片。
