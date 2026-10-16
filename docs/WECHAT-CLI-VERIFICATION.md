# 微信开发者工具 CLI 验证记录

日期：2026-10-17（Asia/Shanghai）  
工具：微信开发者工具 2.02.2608070（`D:\微信web开发者工具\微信开发者工具.exe`）  
CLI：`D:\微信web开发者工具\wechatidecli.cmd`  
CLI HTTP 服务：`http://127.0.0.1:41915`  

## 已执行

工具已处于登录状态，`islogin --port 41915` 返回 `{"login":true}`。为避免修改交付工程的占位配置，先将 `outputs/the-lens` 复制到临时目录：

`work/wechat-cli-check-v2`（本次记录采用最新源目录重新复制的 v2 副本；早期 `work/wechat-cli-check` 结果相同。）

临时副本仅将 `project.config.json` 的 `appid` 改为当前本机已登录且可用的 `wx2d93fdfdf96aa297`，并关闭 URL 校验；源工程仍保留 `touristappid`。

执行命令及结果：

```powershell
D:\微信web开发者工具\wechatidecli.cmd open --project <work\\wechat-cli-check-v2> --port 41915
D:\微信web开发者工具\wechatidecli.cmd preview --project <work\\wechat-cli-check-v2> --port 41915 --qr-format image --qr-output <work\\wechat-cli-preview-v2-qr.png> --info-output <work\\wechat-cli-preview-v2-info.json>
```

以上命令均返回退出码 `0`。`preview` 和 `auto-preview` 均输出：

```json
{
  "size": {
    "total": 3729025,
    "packages": [{"name": "TOTAL", "size": 3729025}]
  }
}
```

`preview` 同时生成了临时二维码文件 `work/wechat-cli-preview-qr.png`。该文件用于预览流程验证，不是微信真机运行证据。

## 边界与未完成项

- 直接对交付工程执行 `open` 会因 `project.config.json` 使用占位 `touristappid` 返回“**不存在此 AppID**”。这证明当前工程尚未绑定用户自己的微信小游戏 AppID；不能把该工程直接导入后的结果标记为发布可用。
- 上述成功结果证明：在一个使用合法 AppID 的临时副本上，微信开发者工具能够打开项目并完成预览编译，包大小约 3.73 MB。
- 当前没有微信真机扫码运行、触屏全流程、音频播放、远程 CG 合法域名或正式上传结果，因此这些项目仍属于未验证项。
- `auto` 仅启用开发者工具自动化能力；本次未将其当作真机测试或完整游戏流程测试。

