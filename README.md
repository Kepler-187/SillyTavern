# Tiny World 酒馆（SillyTavern）独立工作环境

## 1. 目录与 Git 边界

酒馆自 216c315b（2026-08，添加文心写作助手）起从 Tiny World 主仓库移出，改为**独立 git 仓库**同步，不再由 Tiny World 主仓库跟踪。

- 独立仓库位置：`tools/sillytavern/`（本目录）
- 远程仓库：`https://github.com/Kepler-187/SillyTavern.git`
- 默认分支：`main`（保存共享资料、脚本与配置）
- `app/`：SillyTavern 程序 submodule，指向同一个远程的 `release` 分支（固定版本 8172dcd0e）
- `data/`：共享数据（角色卡、世界书、聊天、快捷回复、设置），也是酒馆的实际 `dataRoot`
- `config.yaml`、`setup.ps1`、`start.ps1`、`README.md`：随 `main` 分支同步

角色卡、世界书、聊天、快捷回复、预设、主题、背景和 `settings.json` 都直接保存在 `data/`，酒馆对内容的修改会直接出现在本仓库的 `git status`，提交推送后即可同步到其他电脑。

> 重要：Tiny World 主仓库不再跟踪 `tools/sillytavern`（`.gitignore` 已排除）。不要在主仓库里提交酒馆内容；酒馆的 Git 操作全部在本目录完成。

## 2. 首次使用（新电脑）

```powershell
git clone https://github.com/Kepler-187/SillyTavern.git
cd SillyTavern
git submodule update --init --recursive
pwsh .\setup.ps1
```

环境要求：Git、Node.js 20 或更高版本、PowerShell 7（pwsh）。

`setup.ps1` 只初始化 submodule 并执行 `npm ci`，不会改写共享酒馆资料。

## 3. 启动

必须用 **PowerShell 7（pwsh）** 运行脚本。Windows PowerShell 5.1 对无 BOM 的 UTF-8 中文会乱码。

```powershell
pwsh .\start.ps1
```

默认地址：`http://127.0.0.1:8000/`

`start.ps1` 使用固定的共享配置和数据目录启动服务。它不执行 Git 操作，也不复制或同步世界书、聊天和角色卡。

酒馆已经运行时，拉取到的角色卡或设置可能仍受页面缓存影响；刷新页面，必要时重启服务或新建聊天验证。

## 4. 日常 Git 流程

从其他电脑获取最新资料（在酒馆独立仓库内）：

```powershell
git pull
```

更新酒馆程序版本（app submodule）：

```powershell
git submodule update --init --recursive
pwsh .\setup.ps1
```

在酒馆中修改世界书、角色卡或聊天后，提交并推送（在酒馆独立仓库内）：

```powershell
git status --short
git add data
git commit -m "说明这次修改"
git push
```

多台电脑不要同时修改同一本世界书或同一个聊天文件。修改前先 `git pull`，完成后及时提交和推送。

## 5. 共享资料

当前文心环境包括：

- 角色卡：`data/default-user/characters/文心.png`
- 主要世界书：`TW-00-文心写作内核`
- 附加世界书：`TW-10-世界观-全局`
- 附加世界书：`TW-20-文本规范`
- 附加世界书：`TW-30-角色声音`
- 快捷回复：`data/default-user/QuickReplies/文心写作.json`
- 文心聊天：`data/default-user/chats/文心/`
- 用户设置与世界书绑定：`data/default-user/settings.json`

注意：本机 TW-10 / TW-30 世界书内容与 git 版本可能不一致，以本地正在运行的版本为准，需要同步时人工确认后再提交。

ST 运行态是写作工作台，不自动成为 Tiny World 游戏资产的事实来源。角色声音正式文档仍优先放在 `docs/voice_profiles/{角色名}.md`；ST 世界书是写作时使用的装载副本。

## 6. 本机私有数据

每台电脑都必须单独配置 API。以下文件和运行产物被本仓库的 `.gitignore` 排除，永不提交：

- `data/cookie-secret.txt`
- `data/default-user/secrets.json`
- API Key、密码和 token
- `backups/`、`thumbnails/`、`vectors/`
- `_cache/`、`_storage/`、`_uploads/`、`_webpack/`
- `app/node_modules/`（由 setup.ps1 重建）
- 日志（`st_stdout.log`、`st_stderr.log`、`content.log`、`stats.json`）

不要使用 `git add -f` 强制提交上述内容。首次启动后，在 SillyTavern 页面中配置本机 API。

## 7. Agent 操作约定

涉及 ST 部署、角色卡、世界书装载或绑定时，以本页为入口。涉及游戏文本创作、角色声音、世界书内容、对白或任务文案时，同时使用 `.agents/skills/game-text-writing/SKILL.md`。

默认操作流程：

1. 确认 submodule、共享配置和目标资料真实存在。
2. 检查 `http://127.0.0.1:8000/` 是否可访问；服务未运行时显式报告。
3. 读取 ST 当前实际状态，再决定修改内容。
4. 角色卡、世界书和绑定优先通过 ST HTTP 接口修改。
5. 修改后通过接口回读，确认保存结果。
6. 检查 Git 变更不包含密钥和运行时缓存。

常用接口：

- 获取 CSRF token：`GET /csrf-token`
- 读取角色卡：`POST /api/characters/get`
- 合并角色卡字段：`POST /api/characters/merge-attributes`
- 读取世界书：`POST /api/worldinfo/get`
- 保存世界书：`POST /api/worldinfo/edit`
- 删除世界书：`POST /api/worldinfo/delete`
- 读取 ST 设置：`POST /api/settings/get`
- 保存 ST 设置：`POST /api/settings/save`

所有写接口都要使用同一会话取得的 CSRF token。角色卡是带 TavernCard 元数据的 PNG，应由 ST 接口读写，不直接重写 PNG 数据块。


## 8. DLG 工作台（dlg-workbench）

在酒馆里直接打开 Tiny World 主仓库的 DLG 文件，由文心阅读、对话式改写，写为规范文本，并在复检后写入同名 DLG。

组成（均在本目录内）：

- 前端扩展：`data/default-user/extensions/dlg-workbench/`（酒馆输入框上方的「DLG 工作台」工具条）
- 服务端插件：`app/plugins/dlg-workbench/index.mjs`（提供 `/api/plugins/dlg-workbench/*` 文件读写接口）
- 配置：`config.yaml` 已启用 `enableServerPlugins: true`
- 规范文本目录：`data/default-user/规范文本/`（与 DLG 同名、镜像子目录，首次保存时自动创建）
- 版本历史目录：`data/default-user/dlg-history/`（读取/写入时自动记录 DLG 内容版本，按内容去重，不重复追加）

使用流程（刷新酒馆页面后可见工具条）：

1. 「读取 DLG」：弹窗列出 `data/dialogues` 下全部 DLG（可输入关键字搜索，也可直接输入相对路径），选中后内容作为消息注入聊天（读取时自动把当前内容记为 V1 初版；若与历史最新版相同则不重复记录）。
2. 「改写」：文心阅读该 DLG 并与你讨论改写目标（玩家角色、触发前状态、演出模式、创作问题），确认后再落稿。
3. 「写为规范文本」：文心把确定稿整理为规范文本（`=== 节点 ===`、`角色: 台词`、`-> 选项 => 目标`、`@end`），用 ` ```norm ` 代码块输出。
4. 「保存规范文本」：从文心回复提取 ` ```norm ` 块，保存到规范文本目录，文件名与 DLG 一致。
5. 「写入 DLG」：先由程序解析校验规范文本结构（失败显式报错、不进入下一步），再请文心按 DLG 写入规范复检（演出呈现、玩家代理权、选项跳转、`@end` 可达、固定主角声音）。
6. 「确认写入」：文心复检通过后手动确认，程序再次解析校验并写入同名 DLG，回读验证后报告结果（写入成功即追加新版本快照 V2、V3…，带时间戳，保存于 dlg-history/）。

注意：

- `app/` 是 submodule：更新 app 前先备份或重新放置 `app/plugins/dlg-workbench/`，`setup.ps1` 会重置 submodule。
- `data/default-user/extensions/` 被 `.gitignore` 忽略：换电脑时需重新复制 `dlg-workbench` 扩展目录（或从备份恢复）。
- 写入只改 `.dlg` 文件，不触碰 `.dlg.import`（Godot 会自动重新导入）。
- 写入 DLG 覆盖前必须先经过文心复检与手动确认，任何解析错误都会中止写入，不做静默兜底。