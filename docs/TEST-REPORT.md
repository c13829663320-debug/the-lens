# 《透镜》V3.1 测试报告

记录时间：2026-10-17（Asia/Shanghai）。

## 自动化结果

- `npm test`：35/35 通过，覆盖状态机、透镜电量、现实/影像线索门槛、S05 救援、S09 绘画与观星、存档校验、媒体播放超时及重复回调。
- `npm run check`：10 个场景、16 个背景引用、缺失 0。
- `npm run build`：通过；微信运行时目录约 3.73 MB，无第三方运行时依赖。
- `server/npm test`：2/2 通过，覆盖健康检查、媒体清单和 Range 响应。

## 实际运行核验

- 浏览器预览：已从标题页进入主流程，真实推进到 S09 洞穴前三条线索；窄屏 HUD 已移到场景图下方的独立区域，横屏标题带已压缩，电量文字不再绘制到逻辑画布底线之外。绘画提交、五点对星、结尾完整流程仍待人工走通；对应状态门槛已有自动化测试覆盖。
- ECS：已通过公网 IP/Host 验证 systemd 服务、Nginx 代理、`/health`、`/api/media-manifest` 和 MP4 `206 Range`。
- 微信开发者工具 CLI：在最新源目录复制出的临时副本 `work/wechat-cli-check-v2`（使用当前已登录的合法 AppID `wx2d93fdfdf96aa297`）执行 `open` 与 `preview` 均返回退出码 0；预览编译报告包大小 `3,729,025` bytes。早期副本另执行过 `auto` 与 `auto-preview`，同样返回退出码 0。完整命令和限制见 [WECHAT-CLI-VERIFICATION.md](WECHAT-CLI-VERIFICATION.md)。交付工程本身仍使用 `touristappid` 占位值，不能据此宣称已绑定用户 AppID。

## 未完成验收

- 微信真机、低性能机和多品牌安全区尚未取得设备证据。
- `lens.xscxm.asia` DNS、HTTPS/TLS 与微信合法域名尚未配置。
- Seedance S01 视频仍是待美术批准的 draft，未替换 canonical 场景，也未启用远程媒体请求。
