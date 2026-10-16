# 《透镜 THE LENS》可运行工程

这是一个原生 Canvas 2D 微信小游戏工程，并附共享浏览器预览与可选的只读媒体服务。故事适配依据用户在会话中提供的《五分钟科幻寓言短片｜最终完整版剧本》；`work/original/透镜_图片素材包_20261016` 是原始美术包。现有资源中能直接使用的场景、岩画、道具和 UI 已转为运行时资产；角色三宫格仍按档案参考处理，不能直接当作独立动画精灵。

官方参考：[微信小游戏文档指引](https://developers.weixin.qq.com/minigame/introduction/) · [小游戏开发指南](https://developers.weixin.qq.com/minigame/dev/guide/)。工程使用官方小游戏 `game.js` / Canvas 运行模型，`project.config.json` 的 `compileType` 为 `game`。

## 当前真实状态

- 本地项目测试：`npm test` 通过 35/35；`server/` 测试通过 2/2；`npm run check` 通过 10 场景、16 个背景引用、缺失 0。另有平台视频适配 mock，覆盖超时、跳过、音量和原生回调重入。
- 浏览器预览可从标题开始，存档使用浏览器 `localStorage`；浏览器播放的 CG 和音频受自动播放策略影响。
- S01 CG 任务 `task_5ZmtlE4uw1pl4zv8oehX6gzdUlnZ68p9` 已由平台报告完成，草稿已下载到 `server/media/cg_s01_reveal_720p_v1.mp4` 并通过本机 ffprobe/ffmpeg 基础校验。接触表显示建筑构图与 canonical S01 不同，当前为待美术审阅草稿；本地 manifest 仅登记为 draft 预览，`data/media.js` 仍保持空 `baseUrl`，所以不能称为线上或游戏已接入。
- 阿里云 ECS 已部署独立 `the-lens.service`（Node 20，127.0.0.1:8790），Nginx 以 `lens.xscxm.asia` 代理。通过 `--resolve lens.xscxm.asia:80:60.205.220.112` 已实测 `/health`、`/api/media-manifest` 和 MP4 `206 Range`；DNS A 记录、HTTPS/TLS 与微信合法域名仍待配置。
- 自动化浏览器流程已真实点击完成至 S09 的洞穴前三条线索；绘画、五点对星、结尾和微信开发者工具检查仍需继续。微信真机尚未测试。详见 [UNFINISHED.md](UNFINISHED.md) 与 [docs/DEPLOY-STATUS.md](docs/DEPLOY-STATUS.md)。

## 构建运行时包

在 `outputs/the-lens` 目录执行：

```powershell
npm test
npm run check
npm run build
```

`npm run build` 生成 `dist/browser.js` 和 `dist/wechat/`。构建只复制运行时目录，不把测试、原始素材包或服务端密钥放入小游戏包。`project.config.json` 的 `miniprogramRoot` 指向 `./dist/wechat/`，目前 `appid` 为 `touristappid` 占位值，发布前必须替换为真实 AppID；不要把 AppSecret 放入项目。

## 浏览器预览

```powershell
npm run build
npm start
```

打开 `http://127.0.0.1:8787/`。预览服务只绑定本机回环地址，支持基本资源读取和路径穿越拒绝。用开发者工具或浏览器检查横屏/窄屏、安全区、鼠标/触摸绘线、观星拖动、暂停、设置、存档恢复和结尾。浏览器体验是功能预览，不是微信真机证据。

## 微信开发者工具

1. 先运行 `npm run build`。
2. 在微信开发者工具选择“小游戏”项目，导入本目录的 `project.config.json`，项目目录按配置自动取 `dist/wechat/`。
3. 将 `appid` 替换为真实小游戏 AppID；在真机/预览前按微信后台规则配置 `lens.xscxm.asia` 为请求/下载合法域名（CG 是可选远程媒体，失败必须回到包内静帧）。
4. 核验横屏、安全区、视频原生层顶部跳过条、音频开关、切后台、存档坏损与资源失败。开发者工具模拟器不等于已通过真机。

## 本地媒体后端

服务是 Node.js 22 标准库 HTTP，只读提供：

- `GET/HEAD /health`
- `GET/HEAD /api/media-manifest`：只返回 manifest 中真实存在、扩展名允许的文件
- `GET/HEAD /media/<filename>`：支持单一字节 Range，不支持写入或目录遍历

```powershell
cd server
npm test
npm start
```

默认监听 `0.0.0.0:8080`，本地可用 `curl http://127.0.0.1:8080/health`。ECS 当前由 systemd 管理的 `the-lens.service` 监听 `127.0.0.1:8790`，Nginx 以 `lens.xscxm.asia` 代理；Docker/Compose 仅作为可选部署底座，不是当前 ECS 的运行方式。`server/media/manifest.json` 当前登记 S01 draft 预览，但 draft 未获 canonical 美术批准；`data/media.js` 空 `baseUrl` 会让客户端继续使用包内静帧。只有审核通过、登记 hash、启用 HTTPS 并完成微信域名配置后才可让客户端请求远程条目。服务不保存游戏存档、账号或密钥。

## 阿里云部署边界

线上媒体服务使用独立子域 `lens.xscxm.asia`，不占用根域现有主站。当前 ECS 部署记录、Docker 可选方案、Nginx 配置和安全要求见 [docs/ALIYUN.md](docs/ALIYUN.md) 与 [docs/DEPLOY-STATUS.md](docs/DEPLOY-STATUS.md)。DNS A、HTTPS、备案、微信合法域名和 CG 审批仍是发布前置条件。任何 AccessKey、微信 AppSecret、Seedance token 只能通过受控环境变量/密钥服务提供，不能进入客户端或 Git。

## 目录

`data/` 章节与媒体映射；`systems/` 状态、存档、音频、资源；`ui/` Canvas UI；`platform/` 微信/浏览器适配；`assets/` 运行时压缩资源；`tests/` 自动测试；`server/` 可选媒体服务；`docs/` 场景配置、提示词、CG 记录、部署状态。

