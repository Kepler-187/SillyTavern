# Tiny World SillyTavern 工作环境

## 1. 目录与 Git 边界

Tiny World 将 SillyTavern 程序与项目数据分开管理：

- `tools/sillytavern/app/`：SillyTavern submodule，只保存程序版本。
- `tools/sillytavern/data/`：由 Tiny World 主仓库跟踪的共享数据，也是 SillyTavern 的实际 `dataRoot`。
- `tools/sillytavern/config.yaml`：由 Tiny World 主仓库跟踪的共享服务配置。
- `tools/sillytavern/setup.ps1`：每台电脑首次使用或依赖需要重装时运行。
- `tools/sillytavern/start.ps1`：需要启动酒馆服务时运行，不负责同步数据。

角色卡、世界书、聊天、快捷回复、预设、主题、背景和 `settings.json` 都直接保存在共享数据目录。酒馆对这些内容的修改会直接出现在 Tiny World 的 `git status` 中，不存在额外的数据同步步骤。

## 2. 首次使用

推荐克隆时直接初始化 submodule：

```powershell
git clone --recurse-submodules <tiny-world-url>
cd tiny-world
.\tools\sillytavern\setup.ps1
```

如果 Tiny World 已经克隆：

```powershell
git submodule update --init --recursive
.\tools\sillytavern\setup.ps1
```

环境要求：

- Git
- Node.js 20 或更高版本

`setup.ps1` 只初始化 submodule 并执行 `npm ci`，不会改写共享酒馆资料。

## 3. 启动

```powershell
.\tools\sillytavern\start.ps1
```

默认地址：`http://127.0.0.1:8000/`

`start.ps1` 使用固定的共享配置和数据目录启动服务。它不执行 Git 操作，也不复制或同步世界书、聊天和角色卡。

更新普通项目文本后无需运行 `start.ps1`。酒馆已经运行时，拉取到的角色卡或设置可能仍受页面缓存影响；刷新页面，必要时重启服务或新建聊天验证。

## 4. 日常 Git 流程

从其他电脑获取最新资料：

```powershell
git pull
```

只有 Tiny World 更新了 SillyTavern 程序指针时，才需要额外执行：

```powershell
git submodule update --init --recursive
.\tools\sillytavern\setup.ps1
```

在酒馆中修改世界书、角色卡或聊天后，直接检查并提交 Tiny World：

```powershell
git status --short -- tools/sillytavern/data
git add tools/sillytavern/data
git commit
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

ST 运行态是写作工作台，不自动成为 Tiny World 游戏资产的事实来源。角色声音正式文档仍优先放在 `docs/voice_profiles/{角色名}.md`；ST 世界书是写作时使用的装载副本。

## 6. 本机私有数据

每台电脑都必须单独配置 API。以下文件和运行产物被 Tiny World 的 `.gitignore` 排除：

- `secrets.json`
- `cookie-secret.txt`
- API Key、密码和 token
- `backups/`
- `thumbnails/`
- `vectors/`
- `_cache/`、`_storage/`、`_uploads/`、`_webpack/`
- 日志、统计和图片元数据缓存

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
