# 未完成项与真实限制

记录时间：2026-10-17（Asia/Shanghai）。本清单用于防止把准备工作、模拟测试或外部任务状态误写成完成。

## 阻塞发布的项目

- **阿里云域名尚未完成**：ECS `60.205.220.112` 的独立媒体服务已由 systemd 运行并通过公网 IP/Host 验证；仍需配置 `lens.xscxm.asia` DNS A、HTTPS 和微信合法域名。
- **DNS/HTTPS 未完成**：ECS 已部署服务并通过 `--resolve lens.xscxm.asia:80:60.205.220.112` 验证健康、清单和 Range；`lens.xscxm.asia` 的 DNS A 记录、证书、备案和微信合法域名仍待配置。
- **CG 尚未接入**：Seedance 任务 `task_5ZmtlE4uw1pl4zv8oehX6gzdUlnZ68p9` 已报告完成，草稿已下载到 `server/media/cg_s01_reveal_720p_v1.mp4` 并通过 ffprobe/ffmpeg 基础校验。接触表提示其构图与 canonical S01 不同；本地 manifest 仅登记 draft 预览。尚未完成人工剧情/画面批准、最终转码、hash 登记、ECS 远程部署或微信播放验证，不能把任务完成状态当成游戏已播放。
- **微信开发者工具/真机尚未完整验收**：已用本机 CLI 在临时副本（合法 AppID `wx2d93fdfdf96aa297`）真实执行导入、预览编译和自动预览，包大小 `3,729,025` bytes；交付工程仍为 `touristappid` 占位值，尚无真实用户 AppID 直接导入结果、微信真机扫码运行或设备录屏。详见 `docs/WECHAT-CLI-VERIFICATION.md`。

## 需要用户/部署方提供

- 真实微信小游戏 AppID。
- SSH 用户名、现有私钥本地路径（Windows 可只用 `Get-ChildItem "$env:USERPROFILE\.ssh"` 查看文件名，不要粘贴密钥内容）。
- DNS 管理权限、`lens.xscxm.asia` A 记录确认、HTTPS 证书/备案信息。
- 用户生成的独立角色/道具图片，按 `docs/IMAGE-PROMPTS.md` 回传原图与生成参数。
- Seedance 成片审核结果和允许发布的媒体范围。

## 已有工程限制

- `project.config.json` 的 `appid` 仍为 `touristappid` 占位值。
- `data/media.js` 默认 `baseUrl` 为空，远程 CG 不会在未配置域名时请求；`sceneClips` 只是清单 ID 映射，空 manifest 会安全回到静态场景。
- 角色素材多为三宫格/四宫格档案图，独立透明立绘、动作帧、口型和复杂 CG 仍需人工资源流程。
- 服务器仅做只读媒体服务，不提供云存档、用户账号或支付。客户端 version 2 存档保存真实线索、谜题、电量、设置和归一化画迹；清除小游戏数据会清除存档。
- 服务端当前使用 ECS systemd + Nginx，公网 Host 路由和 MP4 Range 已通过；Docker/Compose 只是可选部署底座，HTTPS 尚未配置。

## 不应据此宣称的结果

不能宣称 DNS 已生效、HTTPS 已配置、CG 已作为 canonical 内容接入、Seedance 费用已结算、云端同步已完成或微信真机已通过。ECS 媒体服务的实际 HTTP 验证已记录在 DEPLOY-STATUS.md。每项状态须以真实命令输出、外网响应、媒体 hash/ffprobe、设备录屏和测试日志更新。


