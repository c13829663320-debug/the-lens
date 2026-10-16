# 未完成项与真实限制

记录时间：2026-10-17（Asia/Shanghai）。本清单用于防止把准备工作、模拟测试或外部任务状态误写成完成。

## 阻塞发布的项目

- **当前公网媒体服务不可用/未验证**：历史检查曾通过 IP/Host 验证健康、清单和 Range；2026-10-17 最新探测显示 `lens.xscxm.asia` 在本地及公共 DNS 均为 NXDOMAIN，HTTP 被阿里云备案拦截（403），443 不可连接。需要域名/备案负责人修复后复测 DNS、HTTPS 与 Range。
- **CG 尚未接入**：Seedance 任务 `task_5ZmtlE4uw1pl4zv8oehX6gzdUlnZ68p9` 已报告完成，草稿已下载到 `server/media/cg_s01_reveal_720p_v1.mp4` 并通过 ffprobe/ffmpeg 基础校验；草稿文件和 manifest 已部署到 ECS 并核对 hash。接触表提示其构图与 canonical S01 不同，尚未完成人工剧情/画面批准，不能进入正式客户端播放。
- **微信开发者工具/真机尚未完整验收**：2026-10-17 已从当前最新 `dist/wechat` 创建隔离临时项目，使用已登录 AppID `wx2d93fdfdf96aa297` 执行 CLI `open` 与 `preview`，两项退出码均为 0，包大小 `3,747,337` bytes。交付工程仍为 `touristappid` 占位值，尚无手机扫码运行、设备全流程录屏或真机媒体播放证据。详见 `docs/WECHAT-CLI-VERIFICATION.md`。
- **GitHub 远程尚未可写/访问**：远程为 `https://github.com/c13829663320-debug/the-lens.git`；此前 `git ls-remote` 和普通 `git push origin main` 均返回 `Repository not found`，本轮再次查询也返回相同错误。源代码基线 `9f84f30` 尚未推送，当前文档同步需与工程一并推送；需确认仓库地址和访问权限后重试。

## 需要用户/部署方提供

- 正式微信小游戏 AppID；已登录预览 AppID 不等于已确认的交付/发布 AppID。
- 域名与 ECS 控制台权限，以及备案状态、DNS A 记录和 HTTPS 证书配置。
- 后续 SSH 运维使用隔离的 `work/keys/known_hosts` 主机记录与部署专用密钥已成功连接；私钥路径不写入文档，不要在聊天中发送私钥正文。
- 用户生成的独立角色/道具图片，按 `docs/IMAGE-PROMPTS.md` 回传原图与生成参数。
- Seedance 成片审核结果和允许发布的媒体范围。

## 已有工程限制

- `project.config.json` 的 `appid` 仍为 `touristappid` 占位值。
- `data/media.js` 默认 `baseUrl` 为空，远程 CG 不会在未配置域名时请求；`sceneClips` 只是清单 ID 映射，空 manifest 会安全回到静态场景。
- 角色素材多为三宫格/四宫格档案图，独立透明立绘、动作帧、口型和复杂 CG 仍需人工资源流程。
- 服务器仅做只读媒体服务，不提供云存档、用户账号或支付。客户端 version 2 存档保存真实线索、谜题、电量、设置和归一化画迹；清除小游戏数据会清除存档。
- ECS 的 systemd + Nginx 服务当前已部署；回环 health、manifest、Range 和文件 hash 验证通过。历史公网 Host 路由和 MP4 Range 曾通过，但当前 DNS/备案/443 复查失败，Docker/Compose 仍只是可选部署底座。

## 不应据此宣称的结果

不能宣称 DNS 已生效、HTTPS 已配置、CG 已作为 canonical 内容接入、Seedance 费用已结算、云端同步已完成或微信真机已通过。ECS 媒体服务的实际 HTTP 验证已记录在 DEPLOY-STATUS.md。每项状态须以真实命令输出、外网响应、媒体 hash/ffprobe、设备录屏和测试日志更新。


