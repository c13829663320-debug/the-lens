# 阿里云部署状态

记录时间：2026-10-17（Asia/Shanghai）。

| 项目 | 状态 |
|---|---|
| ECS 公网地址 | 用户已提供 `60.205.220.112` |
| 根域名 | 用户已提供 `xscxm.asia` |
| 推荐媒体域名 | `lens.xscxm.asia`，用于独立服务，保留原主站 |
| SSH 用户 | `root`；已使用受控密钥完成部署操作 |
| SSH 既有密钥本地路径 | 不写入文档，不要粘贴私钥内容 |
| 已连接 ECS | 是；先完成只读检查，再单独部署到独立目录 |
| 服务器系统/已有服务检查 | Alibaba Cloud Linux 3；既有 Nginx 与 Wuhan 服务已检查，未覆盖 |
| DNS A 记录 | 2026-10-17 最新本地及公共 DNS 查询均为 NXDOMAIN |
| HTTPS 证书与备案 | ECS 443 不可连接；HTTP Host 请求当前返回阿里云备案拦截页 403 |
| Docker/Node/Nginx | ECS Node 20.20.2 + systemd `the-lens.service`（127.0.0.1:8790）、Nginx 1.24.0；当前未使用 Docker |
| 后端源文件 | 当前 `server/server.mjs` 已部署到 ECS，SHA-256 `f03dc83a825051bb554ad5c1e435edcb967d90480c3e60bd755a357c02112253`；本地 Node 测试 2/2 通过 |
| 媒体文件/manifest 上线 | S01 draft 媒体与带 status/canonical/hash/尺寸/时长的 manifest 已在 `/opt/the-lens/server/media`；服务只登记待审 draft |
| 微信合法域名与 AppID | 待确认 |
| 云存档 | 不在当前版本范围；客户端真实本地存档 |

历史公网检查曾通过 `/health`、manifest 与 `Range: bytes=0-31`；当前公网 DNS/HTTP/HTTPS 状态见复查记录。不能仅凭旧结果称为微信线上可用。

## 2026-10-17 公网复查

本次公网可达性探测没有登录或改动 ECS：

- `lens.xscxm.asia` 的本地解析以及指定 `1.1.1.1`、`8.8.8.8` 的 A 记录查询均返回 NXDOMAIN。
- 绕过 DNS、将 `lens.xscxm.asia` 指向 `60.205.220.112` 的 HTTP 健康检查和媒体清单请求均返回阿里云备案拦截页（HTTP 403，`Server: Beaver`），不是媒体服务 JSON。
- 同样指定目标 IP 的 HTTPS 443 无法连接；当前不能验证 TLS 或媒体 Range。
- 因此本表上方的 ECS `/health`、manifest 和 Range 成功记录仅代表历史部署检查，当前公网媒体服务状态为不可确认/不可用。需要域名与 ECS 控制台负责人复核备案拦截、DNS、Nginx 监听和证书，再重新运行 HTTPS/Range 验证。

## 2026-10-17 ECS 源码与清单更新

随后使用部署专用密钥，并通过隔离 `work/keys/known_hosts` 严格校验 ECS 主机指纹。更新前备份旧源码和 manifest 至 `/opt/the-lens/backups/20261017-current-contract/`，保留现有 MP4 与 Nginx 配置。

- 将当前 `server/server.mjs` 与 `server/media/manifest.json` 部署到 `/opt/the-lens/server/`；远端 SHA-256 分别为 `f03dc83a825051bb554ad5c1e435edcb967d90480c3e60bd755a357c02112253` 和 `bf1f0a350bee27f1bb7b11046b9d535e7f07df7203d37ddfe9103fbefa7517b0`。
- 重启后 `the-lens.service` 为 `active`；回环 `/health` 返回 200，manifest 返回 S01 `draft_needs_art_review`、`canonical:false` 及 hash/媒体元数据。
- 回环媒体请求 `Range: bytes=0-31` 返回 206、32 字节；远端 MP4 SHA-256 与本地一致：`1eae4cc2bb473c8214ecfb9378a0fb449318899134a3ea5f60df390c11ea871f`。
- 这验证了 ECS 本机服务和部署内容；DNS NXDOMAIN、HTTP 备案拦截及 443 不通仍阻止公网/微信端访问。

