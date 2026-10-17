# 微信开发者工具 CLI 验证记录（含历史快照和当前复验）

日期：2026-10-17（Asia/Shanghai）  
工具：微信开发者工具 2.02.2608070（`D:\微信web开发者工具\微信开发者工具.exe`）  
CLI：`D:\微信web开发者工具\wechatidecli.cmd`  
CLI HTTP 服务：`http://127.0.0.1:41915`  

## 历史 CLI v2 快照

以下记录对应早期构建快照；当前构建结果见文末的“2026-10-17 当前构建复验”。

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

## 2026-10-17 当前构建复验

从当前已构建的 `dist/wechat/` 复制运行时文件到隔离临时项目 `work/wechat-cli-check-v3`，并在临时配置中设置 `miniprogramRoot: "./"`、当前登录 AppID `wx2d93fdfdf96aa297` 和 `urlCheck: false`。交付源工程未改，仍使用 `touristappid`。

执行：

```powershell
D:\微信web开发者工具\wechatidecli.cmd open --project <work\wechat-cli-check-v3> --port 41915
D:\微信web开发者工具\wechatidecli.cmd preview --project <work\wechat-cli-check-v3> --port 41915 --qr-format image --qr-output <work\wechat-cli-check-v3\preview-qr.png> --info-output <work\wechat-cli-check-v3\preview-info.json>
```

两条命令均返回退出码 `0`。在干净临时副本 `work/wechat-cli-source-v1` 上按正式工程目录结构重新执行后，CLI 报告总包 `3,747,337` bytes。该副本保留 `miniprogramRoot: "./dist/wechat/"`，只将 AppID 改为本机已登录的测试 AppID，并关闭 URL 校验；二维码和报告 JSON 写在项目目录外。

复核结果：`dist/wechat/` 含 58 个运行时文件、总计 `3,747,115` bytes；临时副本对应的运行时文件均与构建产物 SHA-256 一致，源工程配置文件另计。此前 `work/wechat-cli-check-v3` 将两个二维码和两个报告 JSON 放在项目根目录，CLI 报告因此变为 `3,794,468` bytes；该值不代表当前运行时包。后续以正式目录结构副本的 `3,747,337` bytes 作为本次 CLI 复验值，以 `npm run build` 的 `runtimeBytes: 3,747,115` 作为可复算的运行时文件大小。

此结果证明当前构建可被该版本开发者工具打开并编译预览，不证明手机扫码、生产 AppID、合法域名、真机全流程或远程 CG 播放通过。

## 2026-10-17 正式工程复验（当前证据）

当前源工程的 `project.config.json` 使用正式 AppID `wxf9d2785d37c216d4`、`compileType: "game"` 和 `miniprogramRoot: "./dist/wechat/"`。执行：

```powershell
D:\微信web开发者工具\wechatidecli.cmd islogin --port 41915
D:\微信web开发者工具\wechatidecli.cmd open --project <outputs\the-lens> --port 41915
D:\微信web开发者工具\wechatidecli.cmd preview --project <outputs\the-lens> --port 41915 --qr-format image --qr-output <work\wechat-formal-preview\preview-qr.png> --info-output <work\wechat-formal-preview\preview-info.json>
```

实际结果：`islogin` 返回 `{"login":true}`，`open` 返回 0。`preview` 已解析正式 AppID 并进入 `compile_start`，随后报告 `dist/wechat/app.json` 缺失；该工程是原生小游戏，入口文件是 `game.json` / `game.js`。CLI 进程仍返回 0，但编译错误使本次结果只能记为“打开成功、预览编译未通过”，不能写成二维码可用或真机通过。

当前构建已验证 `dist/wechat` 内有 `game.json` 和 `game.js`，未加入小程序 `app.json` 兼容文件，以免把原生小游戏工程伪装成小程序。需要在微信开发者工具界面继续确认该版本对小游戏项目的编译入口，或使用支持小游戏的工具链；当前没有真机扫码、触控全流程、音频和视频播放证据。

## 2026-10-17 正确测试 AppID 复验

用户确认用于本机开发者工具测试的 AppID 为 `wx2d93fdfdf96aa297`。为避免覆盖交付工程配置，将当前工作树完整复制到隔离目录 `work/current-cli-wx2d93fdfdf96aa297-r1`，只在该副本中设置：

- `appid: wx2d93fdfdf96aa297`
- `miniprogramRoot: ./dist/wechat/`
- `compileType: game`
- `setting.urlCheck: false`（仅本机测试）

执行结果：

```text
islogin: {"login":true}
open: exit 0
preview: exit 0
Using AppID: wx2d93fdfdf96aa297
preview package: 4,038,314 bytes
```

二维码和报告写入 `work/current-cli-wx2d93fdfdf96aa297-r1-output/`，没有写入交付工程。该结果证明当前构建可以被已登录的开发者工具以该测试 AppID 打开并完成 CLI 预览编译；不证明微信真机、正式上传、动态安全区、音频或远程 CG 已通过。交付工程 `project.config.json` 仍保留正式配置 `wxf9d2785d37c216d4`，不会把测试 AppID 混入最终包。

