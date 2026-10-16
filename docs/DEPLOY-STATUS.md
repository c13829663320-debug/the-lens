# 阿里云部署状态

记录时间：2026-10-17（Asia/Shanghai）。

| 项目 | 状态 |
|---|---|
| ECS 公网地址 | 用户已提供 `60.205.220.112` |
| 根域名 | 用户已提供 `xscxm.asia` |
| 推荐媒体域名 | `lens.xscxm.asia`，用于独立服务，保留原主站 |
| SSH 用户 | `root`；已使用受控密钥完成部署操作 |
| SSH 既有密钥本地路径 | 不写入文档，不要粘贴私钥内容 |
| 已连接 ECS | 是；只读检查后完成独立目录部署 |
| 服务器系统/已有服务检查 | Alibaba Cloud Linux 3；既有 Nginx 与 Wuhan 服务已检查，未覆盖 |
| DNS A 记录 | `lens.xscxm.asia` 尚未确认 A 记录；使用 `--resolve` 验证 IP/Host 路由 |
| HTTPS 证书与备案 | 未核验/未安装 |
| Docker/Node/Nginx | ECS Node 20.20.2 + systemd `the-lens.service`（127.0.0.1:8790）、Nginx 1.24.0；当前未使用 Docker |
| 后端源文件 | 已提供 `server/`，本地 Node 测试 2/2 通过；S01 draft 媒体仅在本地目录 |
| 媒体文件/manifest 上线 | `/opt/the-lens/server/media` 已部署；服务只登记待审 draft |
| 微信合法域名与 AppID | 待确认 |
| 云存档 | 不在当前版本范围；客户端真实本地存档 |

已完成的真实检查：`/health` 返回 200；`/api/media-manifest` 返回 1 个 MP4 draft；带 `Range: bytes=0-31` 的媒体请求返回 206，长度 32，`Content-Range` 与 3,993,189 字节文件一致。尚未配置 DNS A、TLS/HTTPS 或微信合法域名，因此不能称为微信线上可用。

## 2026-10-17 公网复查

本次从开发工作站重新探测，没有登录或改动 ECS：

- `lens.xscxm.asia` 的本地解析以及指定 `1.1.1.1`、`8.8.8.8` 的 A 记录查询均返回 NXDOMAIN。
- 绕过 DNS、将 `lens.xscxm.asia` 指向 `60.205.220.112` 的 HTTP 健康检查和媒体清单请求均返回阿里云备案拦截页（HTTP 403，`Server: Beaver`），不是媒体服务 JSON。
- 同样指定目标 IP 的 HTTPS 443 无法连接；当前不能验证 TLS 或媒体 Range。
- 因此本表上方的 ECS `/health`、manifest 和 Range 成功记录仅代表历史部署检查，当前公网媒体服务状态为不可确认/不可用。需要域名与 ECS 控制台负责人复核备案拦截、DNS、Nginx 监听和证书，再重新运行 HTTPS/Range 验证。

