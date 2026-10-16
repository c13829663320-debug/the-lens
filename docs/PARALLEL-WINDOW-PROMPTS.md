# 并行开发窗口提示词

使用前提：每个窗口使用独立 worktree 或独立分支；不要在同一个工作目录同时运行格式化、构建清理或覆盖 `dist/`。所有剧情必须以最终剧本和 `docs/STORY-BOUNDARIES.md` 为准，角色名称固定为“阿迟 / 小花 / 族长”。完成后运行相关测试，并在提交信息中写明实际验证结果。

## 窗口 A：关卡与移动端体验

```text
你负责《透镜 THE LENS》的客户端关卡与移动端体验。先阅读 README.md、docs/AUDIT-V3.1.md、docs/PRD.md、docs/SCENE-CONFIG.md、docs/STORY-BOUNDARIES.md 和 ui/game.js、systems/model.js、data/chapter.js。

任务边界：
1. 审计并完善 CH00-CH06 的触屏流程、交互提示、透镜现实/影像切换、线索门槛、谜题反馈、对话推进、暂停/设置和开放式结尾。
2. 优先修复可玩性阻塞、触屏热区、横竖屏/安全区布局和存档恢复问题。
3. 不修改服务器、Seedance 媒体生成流程、资源压缩脚本和远程部署配置；不要覆盖其他窗口正在处理的媒体文件。
4. 不新增原剧本没有的对白、关系或结局；小花不能改名为阿禾。
5. 为新增逻辑补充有行为价值的测试，运行 npm test、npm run check、npm run build，并记录人工未验证项。

交付：源码修改、必要测试、docs/TEST-REPORT.md 的真实结果更新，以及一个清晰的提交。不要把 dist/ 的手工修改当作源代码修改；构建由 npm run build 生成。
``` 

## 窗口 B：CG、资源与后端媒体

```text
你负责《透镜 THE LENS》的 CG/资源管线和阿里云媒体后端。先阅读 README.md、docs/CG-PLAN.md、docs/CG-METHOD-REFERENCE.md、docs/CG-GENERATION.md、docs/IMAGE-PROMPTS.md、docs/ALIYUN.md、server/ 和 data/media.js。

任务边界：
1. 检查 Seedance 2.5 S01 草稿的审核状态；未获美术确认前不得改成 canonical 或宣称正式接入。
2. 按剧本整理后续 CG 的镜头表、生成提示词、版本命名、审核清单和媒体 manifest；只接入已存在且可验证的文件。
3. 维护 server/ 的媒体清单、Range 响应、健康检查、systemd/Nginx 部署说明和服务端测试；不得把密钥放入客户端。
4. 检查图片尺寸、缺失引用、压缩结果和资源映射；不直接修改 ui/game.js 的关卡逻辑或人物剧情。
5. 运行 server/npm test、npm run check、npm run build，并记录真实的 ECS、域名、HTTPS、微信合法域名和真机限制。

交付：资源/CG 文档、manifest 或后端修复、必要测试和清晰提交。对于待生成或待审核素材，明确标记 draft/pending，不用占位文件冒充完成。
```

## 合并规则

```text
合并前先拉取主分支并查看冲突；只合并自己负责的文件范围。合并后在主工作树重新运行 npm test、npm run check、npm run build，并检查 dist/wechat 与源代码一致。任何未实际运行的微信真机、正式 AppID、远程 CG 或 GitHub 发布步骤都必须写成未验证，不得宣称完成。
```
