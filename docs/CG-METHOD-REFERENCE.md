# 指定参考聊天的视频模型调用方法

参考聊天ID：`01a144fc-0fc6-7851-a56a-f34406332597`。只检查了此ID对应的本地会话记录；没有改写参考聊天，没有发起新的生成请求，没有输出或保存密钥。

参考聊天的成功路线使用`https://draw.openai-next.com`平台和模型`doubao-seedance-2-5-260628`，通过已登录的Tabbit浏览器执行同源`page.fetch`。它与Weave的付费计划限制是两套独立服务。

## 已由历史响应验证的方法

提交：`POST https://draw.openai-next.com/v1/video/generations`。

```json
{
  "model": "doubao-seedance-2-5-260628",
  "prompt": "实际待生成CG的具体提示词",
  "duration": 8,
  "metadata": {
    "resolution": "720p",
    "ratio": "16:9",
    "generate_audio": true
  }
}
```

请求头为`Content-Type: application/json`与`Authorization: Bearer <平台API令牌>`。这里只记录格式，不含任何令牌值。

历史认证方法：在`https://draw.openai-next.com/token`中定位令牌名`lens-test-20261016`，打开该行的工具菜单→请求示例→视频 / task，在当前浏览器执行上下文中临时取得请求示例里的令牌并提交；令牌不进入输出、源码、小游戏客户端或交付文档。

正确状态端点：`GET https://draw.openai-next.com/v1/tasks/{task_id}`，同样带Bearer认证。历史中的`GET /v1/video/generations/{task_id}`、`/v1/videos/{task_id}`、`/v1/video/tasks/{task_id}`均返回404，不能复用这些错误轮询路径。

历史成功响应为：`status: completed`、`progress: 100%`；媒体地址位于`result_url`，也出现在`result.data.content.video_url`。历史媒体是8秒、720p、24fps、16:9、有音频。签名媒体地址有有效期，不应当作永久资产地址。

## 可复用程度与当前边界

参考聊天使用PowerShell内联Tabbit JavaScript，没有发现保存在原工作目录中的调用脚本。当前执行进程也没有可复用的DRAW/DOUBAO/SEEDANCE/VIDEO/API_KEY/API_TOKEN环境变量名；没有读取任何环境变量秘密值。

历史提交响应的`billing_detail.price`为4，但返回中未证明其货币单位，也不是本次新CG报价。复用时应当以该平台当前模型说明、请求参数和实际返回计费结果为准。该历史成功请求只证明文本生成视频，不证明参考图参数格式；若要首尾帧生成，应先读取该平台视频请求示例/文档，不能直接套用Weave的字段。

本次方法核查没有创建令牌、修改平台账户、提交生成任务、发送任何扣费请求，也没有下载历史媒体。
