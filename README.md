# Context Runner

一个强大的 VS Code 插件，让你可以通过右键菜单快速执行自定义脚本或命令。支持进度显示、国际化，并提供详细的执行日志。

## 功能特点

- 🚀 通过右键菜单快速执行命令
- 📁 支持文件和文件夹操作
- 📊 实时执行进度显示
- 🌐 支持中英文界面
- 🛠️ 支持自定义命令或脚本
- 📝 详细的执行日志

## 安装

1. 在 VS Code 中打开扩展面板 (Ctrl+Shift+P)
2. 搜索 "Context Runner"
3. 点击 "Install" 安装插件

## 使用方法

### 配置

在使用插件之前，需要先配置执行方式。有两种配置方式：

1. 使用脚本：
   ```json
   {
     "context-runner.scriptPath": "/path/to/your/script.sh"
   }
   ```
   脚本会自动接收文件路径作为第一个参数。

2. 使用自定义命令：
   ```json
   {
     // 方式 1：自动添加文件路径作为最后一个参数
     "context-runner.command": "your-command"

     // 方式 2：使用 {filePath} 指定文件路径位置
     "context-runner.command": "your-command {filePath} --other-args"
   }
   ```

   - 如果命令中包含 `{filePath}`，它会被替换为实际的文件路径
   - 如果命令中没有 `{filePath}`，文件路径会自动作为最后一个参数添加

### 使用示例

#### 示例 1：图片处理和上传

1. 首先在 `.zshrc` 中定义命令：
   ```bash
   # 将图片转换为 webp
   webp() {
     ffmpeg -i "$1" -c:v libwebp -q:v 65 "$2"
     echo "convert" "$1" 'to' "$2"
   }

   # 转换并上传
   webpp() {
     # 输入参数 $1
     local input="$1"
     # 自动生成输出文件路径，替换扩展名为 .webp
     local output="${input%.*}.webp"
     # 调用 webp 函数进行转换
     webp "$input" "$output"
     # 使用 picgo 上传生成的 .webp 文件
     local upload_output=$(picgo upload "$output")
     echo "upload" "$output"
     # 提取上传返回的 URL
     local url=$(echo "$upload_output" | sed -n 's/.*\(https:\/\/.*\)/\1/p')
     # 如果 URL 不为空，复制到剪贴板
     if [[ -n $url ]]; then
       echo "$url" | pbcopy
       echo "URL has been copied to clipboard"
     else
       echo "Error: No URL found in the upload output"
     fi
   }
   ```

2. 在 VS Code 设置中配置命令：
   ```json
   {
     "context-runner.command": "webpp {filePath}"
   }
   ```

3. 使用效果：
   - 右键点击图片，选择"执行命令"
   - 插件会调用 `webpp` 命令
   - 命令会自动：
     1. 将图片转换为 WebP 格式
     2. 使用 PicGo 上传图片
     3. 将图片 URL 复制到剪贴板

#### 示例 2：使用通用脚本

1. 创建脚本 `process.sh`：
   ```bash
   #!/bin/bash
   
   # 检查参数
   if [ -z "$1" ]; then
     echo "Usage: $0 <file_path>"
     exit 1
   fi
   
   # 获取文件路径
   FILE_PATH="$1"
   
   # 根据文件类型执行不同操作
   case "${FILE_PATH##*.}" in
     jpg|jpeg|png|gif)
       # 处理图片
       process_image "$FILE_PATH"
       ;;
     md|txt)
       # 处理文本
       process_text "$FILE_PATH"
       ;;
     *)
       echo "Unsupported file type"
       exit 1
       ;;
   esac
   ```

2. 在 VS Code 设置中配置脚本路径：
   ```json
   {
     "context-runner.scriptPath": "/path/to/process.sh"
   }
   ```

#### 示例 3：批量处理

1. 在 VS Code 设置中配置（使用任意一种方式）
2. 在资源管理器中右键点击文件夹
3. 选择"执行命令"
4. 插件会：
   - 递归处理所有文件
   - 显示总体执行进度
   - 逐个处理每个文件
   - 完成后显示成功通知

### 使用建议

1. **命令设计**：
   - 命令应该是幂等的
   - 添加适当的错误处理
   - 提供清晰的输出信息

2. **批量处理**：
   - 处理大量文件时建议使用文件夹模式
   - 可以在脚本中添加错误重试机制
   - 建议添加文件类型检查

3. **输出处理**：
   - 建议命令输出有意义的信息
   - 可以利用剪贴板集成
   - 考虑添加通知或提示

## VS Code Extension Configuration

The extension configuration in `package.json` contains several important sections that define how the extension works:

### Commands (`contributes.commands`)

Defines the commands that can be executed by users:

```json
{
    "command": "context-runner.run",         // Command ID
    "title": "%context-runner.command.run%", // Display name (supports i18n)
    "icon": "$(run)"                        // Icon in UI
}
```

### Menus (`contributes.menus`)

Specifies where commands appear in VS Code's UI:

- `explorer/context`: Right-click menu in file explorer
  - `context-runner.run`: Shows for files
  - `context-runner.runFolder`: Shows for folders
- `commandPalette`: Command palette (Cmd/Ctrl+Shift+P)
  - Commands are conditionally shown based on resource type

```json
{
    "when": "resourceScheme == file",     // Show only for files
    "command": "context-runner.run",      // Command to execute
    "group": "navigation"                 // Menu group
}
```

### Configuration (`contributes.configuration`)

User-configurable settings:

```json
{
    "context-runner.scriptPath": {
        "type": "string",
        "default": "",
        "markdownDescription": "..."      // Description (supports i18n)
    }
}
```

Available settings:
- `scriptPath`: Script file to execute (takes precedence over command)
- `command`: Shell command to run when no script is configured
- `logEnabled`: Enable/disable logging
- `logLevel`: Set log detail level (error/warn/info/debug)

### Activation Events (`activationEvents`)

Specifies when the extension should be activated:

```json
"activationEvents": [
    "onCommand:context-runner.run",       // Activate when command is invoked
    "onCommand:context-runner.runFolder",
    "onCommand:context-runner.showLog"
]
```

### Language Support (`l10n`)

Internationalization files:
- `package.nls.json`: English strings
- `package.nls.zh-cn.json`: Chinese strings

Use `%key%` in package.json to reference localized strings.

### Icons and UI (`icon`, `badges`)

- `icon`: Extension icon in marketplace
- `badges`: Marketplace badges (build status, version, etc.)

### Development Settings

For extension development:
- `engines.vscode`: Compatible VS Code version
- `scripts`: NPM scripts for packaging and publishing
- `devDependencies`: Development tools and type definitions

### Best Practices

1. Use semantic versioning for `version`
2. Keep dependencies minimal
3. Use clear, descriptive command names
4. Provide meaningful command categories
5. Include detailed configuration descriptions
6. Support multiple languages through l10n
7. Follow VS Code's UI/UX guidelines

## 开发指南

如果你想参与开发或者基于此插件进行二次开发，以下是一些重要信息：

### 项目结构

```
context-runner/
├── package.json           # 插件配置文件
├── package.nls.json      # 英文语言包
├── package.nls.zh-cn.json # 中文语言包
├── extension.js          # 主要代码文件
└── resources/           # 资源文件夹
    ├── icon.svg         # 插件图标
    ├── dark/           # 深色主题图标
    └── light/          # 浅色主题图标
```

### 关键文件说明

1. **package.json**
   - 定义插件的基本信息
   - 配置命令和菜单项
   - 设置插件的激活事件
   - 定义配置项

2. **extension.js**
   - 插件的主要逻辑
   - 包含所有命令的实现
   - 处理文件操作和进度显示
   - 实现国际化支持

3. **语言包文件**
   - package.nls.json：英文语言包
   - package.nls.zh-cn.json：中文语言包

### 开发步骤

1. **环境准备**
   ```bash
   # 克隆项目
   git clone https://github.com/dong4j/context-runner.git
   cd context-runner

   # 安装依赖
   npm install
   ```

2. **开发模式**
   ```bash
   # 打开 VS Code
   code .

   # 按 F5 启动调试
   # 这会打开一个新的 VS Code 窗口，其中加载了你的插件
   # 代码修改后会自动重新加载
   ```

3. **打包和发布**
   ```bash
   # 打包插件
   npm run package
   # 这会在项目根目录生成 context-runner-0.1.0.vsix 文件

   # 发布到 VS Code 市场（需要 Personal Access Token）
   npm run publish
   ```

### 安装方式

1. **从 VS Code 市场安装**
   - 打开 VS Code
   - 按 `Ctrl+Shift+X`（Windows/Linux）或 `Cmd+Shift+X`（macOS）打开扩展面板
   - 搜索 "Context Runner"
   - 点击 "Install" 安装

2. **从 VSIX 文件安装**
   ```bash
   # 方式 1：使用 VS Code 命令面板
   # 1. 按 Ctrl+Shift+P（Windows/Linux）或 Cmd+Shift+P（macOS）
   # 2. 输入 "Install from VSIX"
   # 3. 选择 context-runner-0.1.0.vsix 文件

   # 方式 2：使用命令行
   code --install-extension context-runner-0.1.0.vsix
   ```

3. **从源码安装**
   ```bash
   # 克隆项目
   git clone https://github.com/dong4j/context-runner.git
   cd context-runner

   # 安装依赖
   npm install

   # 打包
   npm run package

   # 安装
   code --install-extension context-runner-0.1.0.vsix
   ```

### 升级插件

1. **从 VS Code 市场升级**
   - VS Code 会自动检查和提示更新
   - 也可以在扩展面板中手动检查更新

2. **手动升级**
   ```bash
   # 1. 先卸载旧版本
   code --uninstall-extension dong4j.context-runner

   # 2. 安装新版本
   code --install-extension context-runner-0.1.0.vsix
   ```

### 故障排除

1. **查看日志**
   - 在命令面板中执行 "Show Run Log" 命令
   - 日志文件位于 `~/.context-runner/run.log`

2. **常见问题**
   - 如果命令执行失败，检查：
     1. 命令或脚本路径是否正确
     2. 命令或脚本是否有执行权限
     3. 环境变量是否正确加载

3. **调试模式**
   - 按 F5 启动调试模式
   - 在 DEBUG CONSOLE 中查看详细日志
   - 可以设置断点进行调试

### 贡献代码

1. Fork 项目
2. 创建功能分支
3. 提交改动
4. 推送到分支
5. 提交 Pull Request

## 许可证

MIT License - 详见 LICENSE 文件
