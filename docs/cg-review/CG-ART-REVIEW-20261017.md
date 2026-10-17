# CG 美术确认记录（2026-10-17）

项目：`透镜 THE LENS`
窗口：窗口三（美术、视听、交互体验与品质验证）
审核人：窗口三 / Codex  2026-10-17（Asia/Shanghai）

## 审核范围

本次审核覆盖 `server/media/` 中已经存在、可读取的六条视频草稿：S01、S10、S02、S05、S09 和片尾。S03、S04、S06、S07、S08 视频没有文件，仍为 `pending_generation`，不在本记录中虚构结果。S08 记忆底图候选也不属于本次六条视频确认。

审核以最终剧本、`docs/CG-SHOTLIST.md`、`docs/SCENE-CONFIG.md`、`docs/STORY-BOUNDARIES.md` 和角色/场景素材映射为准。生成任务完成不等于美术通过。

## 核验方法

- 对每条文件核对 manifest 字节数和 SHA-256；`ffprobe` 读取容器、轨道、分辨率、帧率、时长；`ffmpeg -f null` 完整解码。
- 查看首帧、中帧、尾帧，并以约 1 秒间隔抽帧复查镜头动作连续性、空间关系、人物服装、道具数量和画面残影。
- 检查是否出现可读文字、logo、水印、额外角色、现代科技风格、影像改变现实、发光 UI、镜头穿模或结尾越界。
- 音频只做可重复的技术预检：轨道存在、AAC 32 kHz 双声道、`silencedetect` 无异常编码断裂、`volumedetect` 未见削波。没有把浏览器或开发者工具播放当作微信真机听感证据。

## 逐条结果

### S10 旧时代蒙太奇

- 文件：`server/media/cg_s10_montage_t01_v01_720p.mp4`
- 任务：`task_KXo6cYiMJOQCf7YmvCOH1BlTnmJSgSS4`
- 媒体核验：1280×720、24 fps、10.080 s、H.264/AAC；9,251,079 bytes；SHA-256 `28759b61936385b7b2ff698c64931685074d49be42ef3635d2f8dd77b99de3a1`。
- 画面确认：依次出现旧档案屏、自动画笔、两具安睡舱、城市灯火熄灭和机械手放下透镜停机；没有可读广告字或额外对白，镜头顺序、道具数量和收尾动作基本可辨。但片头没有从剧本要求的黑场进入，两具安睡舱复用同一人物外观，广告屏三角符号有 logo/品牌感，熄灯后残留远景灯，机械手红色指示灯也需移除或重新确认。
- 音频预检：音频轨存在，峰值约 `-9.0 dB`，未见削波或编码断裂；目标设备听感仍需单独回归。
- 缺陷：片头未从黑场进入；两具安睡舱复用同一人物外观，而剧本要求两名外表不同的男性；广告屏三角符号有 logo/品牌感；城市熄灭后仍保留少量远景灯；机械手上的红色指示灯越过旧设备边界。
- 结论：`rejected`，`canonical: false`。必须按剧本重做后再审；客户端 `data/media.js` 不应开启远程播放。

### S01 商场显影

- 文件：`server/media/cg_s01_reveal_720p_v1.mp4`
- 任务：`task_5ZmtlE4uw1pl4zv8oehX6gzdUlnZ68p9`
- 媒体核验：1280×720、24 fps、8.064 s、H.264/AAC；3,993,189 bytes；SHA-256 `1eae4cc2bb473c8214ecfb9378a0fb449318899134a3ea5f60df390c11ea871f`。
- 缺陷：视频是另一处低矮单层废墟外景，和 canonical `scene_S01_reality_1280_v1.jpg` 的多层商场、中央入口、立柱和地面关系不一致；显影只是整幅画面的暖色变化，没有证明旧终端/入口的同构关系。
- 结论：`rejected`，`canonical: false`。保留文件和 hash 作为退回证据，不得替换 S01 场景或进入生产播放。

### S02 食品区显影

- 文件：`server/media/cg_s02_lens_reveal_t01_v01_720p.mp4`
- 任务：`task_dtwKEljejrXPLBDefjDvwZTt8hNMOcAI`
- 媒体核验：1280×720、24 fps、6.080 s、H.264/AAC；4,254,604 bytes；SHA-256 `4eeae12196f1d8b809ae6c37574cd659714feaddfff31034116eddff0b04ccdb`。
- 通过项：货架机位稳定，虚拟罐头在举镜时出现，关镜后人物拿取现实罐头，影像食物没有变成可拿取物。
- 缺陷：阿迟被生成成现代黑色外套的城市青年，与素材包 C01 的末世拾荒者服装/造型不一致；罐头标签在画面中形成不可控的伪文字，不能作为无文字交付。角色连续性和文字边界均未达标。
- 结论：`rejected`，`canonical: false`。必须以 C01 外观重做并清除可读或伪可读标签后再审。

### S05 断桥救援

- 文件：`server/media/cg_s05_missed_bridge_t01_v01_720p.mp4`
- 任务：`task_z0ib7X6b3JV5cNmtucTgCt6xCcHdopZp`
- 媒体核验：1280×720、24 fps、8.064 s、H.264/AAC；8,041,506 bytes；SHA-256 `c8661b57c1320ae8d87a6a5a72ba19b2a82913b9ae451e9232c432aa0ef06463`。
- 缺陷：场景是现代高架/钢筋混凝土施工空间，人物穿统一现代防护服，和素材包中的末世部落服装、`scene_S05` 断桥/旧连廊构图及固定救援关系不一致。影像桥与现实断层没有同构证据，无法确认“影像不承重”这一关键视觉边界。
- 结论：`rejected`，`canonical: false`。不得用于 S05 演出；重做必须锁定断桥构图、C01/C02/C03 角色外观和固定救援结果。

### S09 炭画与五点

- 文件：`server/media/cg_s09_drawing_stars_t01_v01_720p.mp4`
- 任务：`task_GN6PQBCgkh77XUPvFLztLO946to4Zdbj`
- 媒体核验：1280×720、24 fps、8.064 s、H.264/AAC；5,900,957 bytes；SHA-256 `675d1f442c2413e20445a3eca24de8e43b7559bb3c07b2c2ee5627e70a7d45f9`。
- 缺陷：洞壁上持续出现约三个发光点，而剧本要求五个不发光的点；透镜断电后仍有明显发光效果，违反 S09 的现实观察边界。人物服装也不是素材包的阿迟造型，画面没有完成“救援、五点、向外小人”的确定构图。
- 结论：`rejected`，`canonical: false`。重做必须在断电状态下使用实体炭灰/自然星光，五点数量固定为五且不发光。

### 片尾晨光

- 文件：`server/media/cg_end_morning_t01_v01_720p.mp4`
- 任务：`task_YrbvcShLb0LLqZHZLIVwIKLljOgp8DF5`
- 媒体核验：1280×720、24 fps、8.064 s、H.264/AAC；10,253,518 bytes；SHA-256 `2e59575977733564659b88714762c32f0eeebbb2cec5ff61956d309f85254946`。
- 通过项：小花端碗进入洞口，触摸/观察岩画，镜头最终停在侧脸和洞口晨光，没有直接显示阿迟去向。
- 缺陷：岩画旁出现约四个橙色发光点，剧本要求五个不发光点；视频把五点线索做成奇迹光效，越过片尾现实边界。角色服装和洞壁构图也没有完成素材包同构确认。
- 结论：`rejected`，`canonical: false`。重做必须保留开放结尾、五个无源点位和自然晨光，不得加入奇迹光或解释性结局。

## 汇总与接入边界

| 镜头 | 结果 | `canonical` | 服务端发布 | 后续动作 |
|---|---|---:|---|---|
| S10 | `rejected` | `false` | 不发布 | 重做片头黑场、两具安睡舱人物差异、三角符号、熄灯强度和红色指示灯 |
| S01 | `rejected` | `false` | 不发布 | 按 canonical 商场空间重做 |
| S02 | `rejected` | `false` | 不发布 | 锁定 C01 外观并移除伪文字 |
| S05 | `rejected` | `false` | 不发布 | 重做同构断桥和部落角色 |
| S09 | `rejected` | `false` | 不发布 | 五个不发光点、断电现实边界 |
| 片尾 | `rejected` | `false` | 不发布 | 五个不发光点、开放式结尾 |

本记录不修改 `ui/game.js`、`data/chapter.js`、`data/media.js` 或 `dist/**`。被退回文件仍保留在本地目录供重做对照，但服务端的 `/api/media-manifest` 会过滤 `rejected`，当前没有任何一条草稿满足 `approved + canonical:true` 的发布门槛。HTTPS、微信合法域名、真机视频和音频播放仍需部署窗口提供证据。
