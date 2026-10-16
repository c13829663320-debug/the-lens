# 《透镜 THE LENS》V5.0 阶段交付单

记录基线：`f5d8829`（2026-10-17，Asia/Shanghai）。本交付单先冻结公共模块，按当前仓库和可复现实测结果同步状态。`c75e6b7`、`f5d8829` 等提交由其他窗口产生；本窗口不把它们视为已经完成的进一步验收，也不覆盖其未合并成果。

## 1. 当前已完成的实际功能

- 当前工程可运行原生 Canvas 微信小游戏和浏览器预览，已有 S10→S01→S02→S06→S03→S04→S05→S07→S08→S09 的章节模型、透镜模式/电量、观察门槛、固定救援因果、洞穴绘画与本地存档恢复。
- 已有场景资源映射和运行时压缩资源；`npm run check` 当前报告 10 个场景、16 个背景引用、缺失 0。
- 共享媒体服务提供只读 `GET/HEAD /health`、`/api/media-manifest` 和 `/media/<filename>`，支持单一字节 Range、路径穿越拒绝、未知扩展名拒绝和 manifest 中缺失文件过滤。
- `server/media/cg_s01_reveal_720p_v1.mp4` 是当前唯一可验证的 CG 文件（约 3,993,189 bytes，1280×720、24fps、约 8.04 秒、H.264/AAC）。它仍为 `draft_needs_art_review`，建筑构图与 canonical S01 不同；没有改成 canonical，也没有由 `data/media.js` 远程启用。
- `docs/CG-SHOTLIST.md` 已记录 S10、S02、S05、S09 和片尾镜头表、提示词骨架、版本命名、审核清单及 pending/draft/approved 状态规则；待生成镜头没有占位媒体文件。
- 服务端运行基线已与真实 ECS 记录对齐为 Node 20；当前域名、HTTPS、微信合法域名和真机结论仍按 `docs/DEPLOY-STATUS.md` 标为待确认。

以上是对仓库当前内容的事实描述，不代表本窗口重新验收了其他窗口的客户端提交。

## 2. 正在开发的功能

- S01 Seedance 2.5 视频的逐帧美术审核、听感审核和 canonical 决策。
- S10 旧时代蒙太奇、S02 食品区显影、S05 断桥救援、S09 炭画与五点、片尾晨光五组 CG：均为 `pending_generation`，尚未生成或尚未有可接入文件。
- 仅在批准后才进行的媒体 hash/元数据登记、生产 manifest、HTTPS 远程播放和微信失败回退验证。
- 阿里云 `lens.xscxm.asia` 的 DNS A、TLS/HTTPS、微信请求/下载合法域名、外网验证和真机播放。
- 其他窗口正在推进的触摸/横屏/结尾设置恢复改动，当前只观察提交结果，不在本阶段继续扩展公共模块。

## 3. 新增和修改的文件路径

当前基线最近两次提交涉及以下唯一文件路径：

- `README.md`
- `dist/browser.js`
- `dist/wechat/ui/game.js`
- `docs/CG-PLAN.md`
- `docs/CG-SHOTLIST.md`（新增）
- `docs/TEST-REPORT.md`
- `server/Dockerfile`
- `server/package.json`
- `tests/game-touch.test.js`
- `ui/game.js`

当前工作树在交付前为干净状态。本窗口没有改动 `server/server.mjs`、`server/test/server.test.mjs`、`server/media/manifest.json` 或 `data/media.js`。任务开始时曾观察到其他窗口的 `data/chapter.js` 未提交变化；本窗口没有覆盖或合并该变化，当前基线也不把它列为工作树未提交项。

## 4. 使用或新增的公共接口

没有新增公共接口。当前使用的既有接口为：

- 根脚本：`npm test`、`npm run check`、`npm run build`。
- 服务端模块导出：`parseRange(value, size)`、`createMediaServer(options)`。
- HTTP：`GET/HEAD /health`、`GET/HEAD /api/media-manifest`、`GET/HEAD /media/<filename>`；写请求返回 405，Range 错误返回 416。
- `data/media.js` 导出字段：`baseUrl`、`clips`、`sceneClips`、`manifestPath`。当前 `baseUrl` 和 `clips` 为空，`sceneClips.S01` 只保留稳定 ID，不代表远程播放已启用。
- 测试通过内部 `ui/game.js` 行为和 platform video adapter 验证，没有将其内部方法承诺为外部 API。

## 5. 依赖其他窗口的内容

- 其他窗口的客户端触摸、横屏 HUD、结尾设置恢复和相关测试提交；需要先确认其剧情边界和公共模块影响，再决定是否保留。
- Seedance S01 的美术审核结论，以及后续五组镜头的真实生成文件、源任务信息、提示词、媒体元数据和 SHA-256。
- 具备权限的部署窗口提供 ECS 外网复核、DNS/TLS 证书、Nginx 代理和 systemd 状态证据；当前文档中的 IP/域名记录不等于这些条件已完成。
- 微信后台 AppID、请求/下载合法域名和至少一台真机的横屏、视频原生层、音频、切后台及失败回退结果。

## 6. 已执行的测试及真实结果

在当前基线、未修改工作树上执行：

- `npm test`：通过 44/44。
- `npm run check`：通过，`scenes: 10`、`backgroundReferences: 16`、`missing: 0`。
- `npm --prefix server test`：通过 2/2，覆盖 Range、HEAD、manifest 过滤、错误码、CORS 条件和路径穿越。
- `npm run build`：成功，生成 `dist/browser.js` 和 `dist/wechat/`，`runtimeBytes: 3734308`，`dependencyCount: 0`。
- S01 媒体已有 ffprobe/ffmpeg 基础解码和首/中/尾接触表记录；尚未完成逐帧美术签字、听感、微信开发者工具和真机验证。
- ECS 记录中已有一次 `--resolve` 验证 `/health`、manifest 和 MP4 `206 Range`；DNS A、HTTPS/TLS、微信合法域名和真机均未据此宣称完成。

## 7. 当前最需要其他窗口配合的事项

1. 对 S01 草稿给出明确的 `approved`、`rejected` 或继续 `draft_needs_art_review` 结论；未批准前不要修改 `data/media.js` 或把 manifest 条目标为 canonical。
2. 对五组 pending CG 按 `docs/CG-SHOTLIST.md` 生成并回传可验证文件与审核元数据，不要用占位文件替代。
3. 提供真实 ECS 的 DNS/TLS/Nginx/systemd 外网证据和微信合法域名、AppID、真机限制；没有证据就继续标记 pending。
4. 在继续公共模块改动前，确认其他窗口的 `ui/game.js`、`tests/game-touch.test.js`、构建产物和 `docs/TEST-REPORT.md` 是否纳入统一分支。

## 8. 接下来准备修改的文件

在收到上述同步结果前，本窗口不修改公共客户端模块。后续若继续后端/资源管线，候选文件为：

- `server/media/manifest.json`：仅登记实际存在、hash/尺寸/审核状态齐全的文件。
- `server/server.mjs`、`server/test/server.test.mjs`：如需补充 manifest 元数据验证或健康检查测试，先保持向后兼容。
- `server/nginx/the-lens.conf.example`、`server/systemd/the-lens.service.example`：补齐与真实 ECS `127.0.0.1:8790`、`lens.xscxm.asia` 的部署示例。
- `docs/ALIYUN.md`、`docs/DEPLOY-STATUS.md`：只记录有命令输出或控制台证据的 DNS、HTTPS、微信和真机状态。
- `docs/CG-GENERATION.md`、`docs/CG-SHOTLIST.md`：随实际生成/审核结果更新，不把计划状态改成完成。

在阶段交付单同步完成前，不修改 `ui/game.js`、`data/chapter.js`、`systems/` 或人物剧情逻辑。
