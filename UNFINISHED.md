# 未完成项与真实限制

记录时间：2026-10-17（Asia/Shanghai）。本清单用于防止把准备工作、模拟测试或外部任务状态误写成完成。

## 阻塞发布的项目

- **当前公网媒体服务不可用/未验证**：历史检查曾通过 IP/Host 验证健康、清单和 Range；2026-10-17 最新探测显示 `lens.xscxm.asia` 在本地及公共 DNS 均为 NXDOMAIN，HTTP 被阿里云备案拦截（403），443 不可连接。需要域名/备案负责人修复后复测 DNS、HTTPS 与 Range。
- **CG 尚未正式接入**：S01、S10、S02、S05、S09 和片尾的 Seedance 2.5 草稿均已下载到 `server/media/`，通过 ffprobe/ffmpeg 基础校验并登记 hash；接触表仍需人工确认构图、人物一致性、影像边界和开放式结尾，全部保持 `draft_needs_art_review` / `canonical:false`，不能进入正式客户端播放。详见 `docs/CG-GENERATION.md`。
- **微信开发者工具/真机尚未完整验收**：此前临时项目使用已登录 AppID `wx2d93fdfdf96aa297` 执行 CLI `open` 与 `preview`，两项退出码均为 0；正式工程现已配置 AppID `wxf9d2785d37c216d4`，等待正式工程 CLI 复验和真机扫码运行、设备全流程录屏及真机媒体播放证据。详见 `docs/WECHAT-CLI-VERIFICATION.md`。
- **GitHub 远程尚未可写/访问**：远程为 `https://github.com/c13829663320-debug/the-lens.git`；最新 `git push origin main` 返回 `Repository not found`，本地阶段交付提交尚未推送。需确认仓库地址或访问权限后重试。

## 需要用户/部署方提供

- 正式微信小游戏 AppID；已登录预览 AppID 不等于已确认的交付/发布 AppID。
- 域名与 ECS 控制台权限，以及备案状态、DNS A 记录和 HTTPS 证书配置。
- 后续 SSH 运维使用隔离的 `work/keys/known_hosts` 主机记录与部署专用密钥已成功连接；私钥路径不写入文档，不要在聊天中发送私钥正文。
- 用户生成的独立角色/道具图片，按 `docs/IMAGE-PROMPTS.md` 回传原图与生成参数。
- Seedance 成片审核结果和允许发布的媒体范围。

## 已有工程限制

- `project.config.json` 已配置正式 `appid` `wxf9d2785d37c216d4`；真机和正式上传仍未验证。
- `assets/scenes/scene_S08_memory_1280_v1.jpg` 已提供严格同构的暖色视觉候选，但它来自现实底图的构图锁定处理，不是模型生成的最终美术；`S08.memory` 仍保持 `null`，等待正式图生图资源审核。
- `data/media.js` 默认 `baseUrl` 为空，远程 CG 不会在未配置域名时请求；`sceneClips` 只是清单 ID 映射，空 manifest 会安全回到静态场景。
- 角色素材多为三宫格/四宫格档案图，独立透明立绘、动作帧、口型和复杂 CG 仍需人工资源流程。
- 服务器仅做只读媒体服务，不提供云存档、用户账号或支付。客户端 version 2 存档保存真实线索、谜题、电量、设置和归一化画迹；清除小游戏数据会清除存档。
- ECS 的 systemd + Nginx 服务当前已部署；回环 health、manifest、Range 和文件 hash 验证通过。历史公网 Host 路由和 MP4 Range 曾通过，但当前 DNS/备案/443 复查失败，Docker/Compose 仍只是可选部署底座。

## 不应据此宣称的结果

不能宣称 DNS 已生效、HTTPS 已配置、CG 已作为 canonical 内容接入、Seedance 费用已结算、云端同步已完成或微信真机已通过。ECS 媒体服务的实际 HTTP 验证已记录在 DEPLOY-STATUS.md。每项状态须以真实命令输出、外网响应、媒体 hash/ffprobe、设备录屏和测试日志更新。


