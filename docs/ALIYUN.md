# 阿里云 ECS 部署说明（可选媒体服务）

当前仓库提供 `server/` 的 Node.js 标准库服务。它只做健康检查、读取本地 CG manifest、只读媒体 Range；微信小游戏的剧情存档仍在客户端本地。ECS `60.205.220.112` 已安装 Node 20，并由独立 `the-lens.service` 监听 `127.0.0.1:8790`，Nginx 使用 `lens.xscxm.asia` 代理；既有 Nginx/Wuhan 配置未覆盖。DNS、HTTPS 与微信合法域名仍待配置。实时状态见 DEPLOY-STATUS.md。

## 准备

使用现有 ECS `60.205.220.112`，先只读检查系统、已有服务、磁盘与开放端口，再确定安装和反代位置。推荐为小游戏媒体新建 `lens.xscxm.asia` 的 A 记录指向该 IP，保留根域名 `xscxm.asia` 的现有主站。ECS 既有 Nginx 与服务已检查，不能覆盖默认站点。

SSH 需用户给出已有私钥本地路径与控制台确认的 SSH 用户名，不要求把私钥粘贴到聊天。Windows 常见位置可在 PowerShell 仅查看文件名：

```powershell
Get-ChildItem -LiteralPath "$env:USERPROFILE\.ssh" -File | Select-Object Name, FullName
# 如果当初从阿里云下载过 .pem，也可查看 Downloads 中 .pem 文件名。
Get-ChildItem -LiteralPath "$env:USERPROFILE\Downloads" -File -Filter *.pem | Select-Object Name, FullName
ssh -i "C:\path\existing-key.pem" <SSH_USERNAME>@60.205.220.112
```

命令中的占位路径/用户名必须替换为真实信息；不要读取或输出私钥内容。若文件是 `.ppk`，先在本机使用 PuTTYgen 转为 OpenSSH 私钥，保留原件，避免在不明网站转换。若没有私钥，需按阿里云控制台支持的方式处理 ECS 登录，而不是创建一个无绑定的新密钥假装可以登录。

安全组仅放行 `22/tcp`（维护白名单）和 `80/443/tcp`（Nginx），当前 Node 由 systemd 直接运行；Docker/Compose 是需要迁移时可选的底座，不代表当前 ECS 状态。准备 `lens.xscxm.asia` 的 HTTPS 证书（可用 Certbot/阿里云证书服务）以及通过发布流程上传的审核媒体。服务器时区与应用时间记录统一 UTC；面向用户的产品日期按客户端规则显示。

## 部署

当前 ECS 已完成 Node 20 + systemd 部署；更新时只替换审核媒体和 manifest，并重启独立服务：

```bash
sudo systemctl status the-lens.service
sudo systemctl restart the-lens.service
curl -fsS http://127.0.0.1:8790/health
```

若迁移到另一台主机，Docker/Compose 可作为可选底座：

```bash
docker compose build --pull
docker compose up -d
curl -fsS http://127.0.0.1:8080/health
```

先检查已有 Nginx 配置，在独立 server block 安装 `nginx/the-lens.conf.example`，将示例域名替换为 `lens.xscxm.asia` 和真实证书路径后 `nginx -t && systemctl reload nginx`。首次只确认 `https://lens.xscxm.asia/health` 返回 `{"ok":true,...}`，再把该域名配置到微信后台业务域名/下载域名（需按微信平台当前规则完成校验）。将 `ALLOWED_ORIGIN` 设为实际小游戏 WebView/预览来源；微信原生请求通常不依赖浏览器 CORS，未知 Origin 不回 CORS 头。部署中不得覆盖根域名现有站点，也不先占用未经检查的端口。

## 安全与运维

- 绝不把阿里云 AccessKey、微信 AppSecret、Seedance token 放入客户端、manifest、镜像或 Git。使用 ECS RAM 最小权限角色、环境变量注入或密钥服务；本服务不需要 AK。
- 媒体目录只读挂载，容器非 root、只读根文件系统、丢弃 Linux capabilities；Nginx 限速。更新媒体先校验 hash，再原子替换 manifest，失败立即回滚。
- 本服务拒绝路径穿越、未知扩展名、超长 URL、写请求和不支持的 Range；日志记录状态码/耗时，不记录 token、用户存档或完整 Origin。
- ECS 云盘和媒体备份按公司策略配置。备份 `manifest.json`、审核源文件和 hash；测试恢复而非只声明备份。
- 监控 `/health`、容器内存/重启、ECS 带宽和 4xx/5xx。媒体不可用时客户端退回包内静帧，不阻塞核心流程。

## 上线检查

`npm test` 通过；Docker health 通过；HTTPS 证书链和 TLS 版本正确；`GET/HEAD`、Range、错误码、静态缓存头与路径穿越均在外网验证；微信后台域名校验和最小权限完成；压力/带宽与媒体体积记录。已有服务器 IP 和根域名不等于已登录、DNS 生效或上线；没有上述实际证据不能声称部署或真机通过。


