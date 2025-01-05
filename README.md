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

2. 使用自定义命令：
   ```json
   {
     "context-runner.command": "your-command {filePath}"
   }
   ```

注意：命令中的 `{filePath}` 会被替换为实际的文件路径。

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
   # 安装依赖
   npm install
   
   # 安装 VS Code 扩展开发工具
   npm install -g @vscode/vsce
   ```

2. **开发模式**
   - 按 F5 启动调试
   - 在新窗口中测试插件
   - 代码修改后会自动重新加载

3. **打包发布**
   ```bash
   # 打包插件
   npm run package
   
   # 发布插件
   npm run publish
   ```

### 开发注意事项

1. **VS Code API 使用**
   - 使用 `vscode.window.withProgress` 显示进度
   - 使用 `vscode.workspace.getConfiguration` 获取配置
   - 使用 `vscode.commands.registerCommand` 注册命令

2. **错误处理**
   - 所有可能的错误都要捕获并显示友好的错误信息
   - 使用 writeLog 函数记录详细日志

3. **国际化**
   - 所有用户可见的字符串都要使用 localize 函数
   - 在语言包文件中添加新的字符串

4. **性能优化**
   - 使用异步操作处理文件
   - 批量处理时显示整体进度
   - 通知提示自动关闭

### 调试技巧

1. **输出面板**
   - 使用 `console.log` 进行调试
   - 在输出面板选择 "Context Runner" 查看日志

2. **断点调试**
   - 在代码中设置断点
   - 使用 VS Code 的调试控制台

3. **日志文件**
   - 查看 `~/.context-runner/run.log` 文件
   - 包含详细的操作记录和错误信息

## 常见问题

1. **找不到命令**
   - 检查 PATH 环境变量
   - 确保命令在终端中可用
   - 检查 .zshrc 配置

2. **执行失败**
   - 查看执行日志获取详细错误信息
   - 确认文件权限正确
   - 验证脚本权限

3. **进度条不显示**
   - 确认使用了最新版本的 VS Code
   - 检查是否有其他插件冲突

## 贡献指南

欢迎提交 Pull Request 或创建 Issue！

1. Fork 本仓库
2. 创建特性分支
3. 提交改动
4. 创建 Pull Request

## 许可证

MIT License - 详见 LICENSE 文件
