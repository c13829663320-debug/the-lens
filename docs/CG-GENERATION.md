# S01 显影CG执行记录

状态：首条图生任务`failed`；经明确授权的纯文本恢复重试`completed`，已下载并通过本机媒体校验。该片为待美术审阅的环境CG草稿。

已按用户指定参考聊天方法切换到`https://draw.openai-next.com`。用户完成登录后，于已登录令牌页指定`lens-test-20261016`行的请求示例临时取得Bearer令牌，只保存在浏览器任务内存，不输出、不写入源码或交付物。

本次只提交1次`POST /v1/video/generations`，HTTP 200；任务ID为`task_BMlK5mm9JVqqrjn94rw0QoXTq01W6oWP`，初始状态`queued`。参数为模型`doubao-seedance-2-5-260628`、8秒、720p、16:9、`generate_audio:false`。平台提交响应返回`billing_detail.price=4`、`cost_quota=2000000`；货币单位和最终结算/退款状态未确认，不称为人民币。

随后`GET /v1/tasks/{task_id}`返回HTTP 200、`action: image_to_video`、`task_type: image_to_video`、`status: failed`、`progress: 100%`，无`result_url`、无`result`或视频输出。API响应与其`properties`字段没有提供`error/message/fail_reason`。可以确认平台识别了图生视频任务，无法据现有证据确定上游失败原因。

平台令牌页实际请求示例明确通用字段`model/prompt/duration/image/images/size/input_reference`与Seedance的`metadata.resolution/ratio/content`。本次使用文档明确的顶层`image`字段，引用原S01现实图的已上传公共JPEG；没有套用Weave的`image_url/end_image_url`字段。首尾帧配对格式未确认，本次仅用单幅现实参考。

待提交提示词方向：固定广角商场外景，无人物、无文字、无新增实体；从低饱和黑白废墟缓慢显现克制的旧文明色彩记忆，建筑没有实际修复或变化，最后回到静默现实。尊重输入素材的实际建筑比例、空间关系与末世质感；禁止蓝色科技遮罩、泛光、粒子或广告UI。

预期交付路径为`server/media/cg_s01_reveal_720p_v1.mp4`，当前没有创建任何占位MP4冒充生成结果。

首条图生任务失败后，获得一次有实质变化的恢复重试授权：移除`image`字段，使用参考聊天已验证的纯文本请求格式。第二任务ID为`task_5ZmtlE4uw1pl4zv8oehX6gzdUlnZ68p9`，HTTP 200、初始`queued`，模型、时长、画质和比例相同，`generate_audio:true`，提示词仅要求环境风、无语音或音乐。第二提交响应同样为`price=4`、`cost_quota=2000000`。两次提交价格字段合计8个平台单位，单位以及首失败退款仍未确认，不能声称首任务未扣费。

只轮询第二任务，没有继续重投。视频已保存到`server/media/cg_s01_reveal_720p_v1.mp4`，并通过ffprobe和ffmpeg全量解码；首帧、中帧、尾帧已生成人工审阅接触表。尚未进行微信真机播放、音频听感审阅或逐帧美术批准。该视频的纯文本生成构图与原S01图片不同，manifest标注为草稿预览，不能替换canonical场景图。
