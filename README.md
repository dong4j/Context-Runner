# VS Upload Image

一个用于快速上传图片的 VS Code 插件。支持单个图片上传和文件夹批量上传，带进度显示和国际化支持。

## 功能特点

- 🖼️ 支持单个图片上传
- 📁 支持文件夹批量上传
- 📊 实时上传进度显示
- 🌐 支持中英文界面
- 🛠️ 支持自定义上传命令或脚本
- 📝 详细的上传日志

## 安装

1. 在 VS Code 中打开扩展面板 (Ctrl+Shift+X)
2. 搜索 "VS Upload Image"
3. 点击 "Install" 安装插件

## 使用方法

### 配置

在使用插件之前，需要先配置上传方式。有两种配置方式：

1. 使用上传脚本：
   ```json
   {
     "vs-upload-image.scriptPath": "/path/to/your/upload.sh"
   }
   ```

2. 使用自定义命令：
   ```json
   {
     "vs-upload-image.uploadCommand": "your-upload-command {imagePath}"
   }
   ```

注意：命令中的 `{imagePath}` 会被替换为实际的图片路径。

### 使用

1. 上传单个图片：
   - 在文件资源管理器中右键点击图片文件
   - 选择 "上传图片"

2. 上传文件夹中的所有图片：
   - 在文件资源管理器中右键点击文件夹
   - 选择 "上传所有图片"

3. 查看上传日志：
   - 通过命令面板 (Ctrl+Shift+P)
   - 输入 "Show Upload Log"

## 开发指南

如果你想参与开发或者基于此插件进行二次开发，以下是一些重要信息：

### 项目结构

```
vs-upload-image/
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
   - 处理文件上传和进度显示
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
   - 使用异步操作处理文件上传
   - 批量上传时显示整体进度
   - 通知提示自动关闭

### 调试技巧

1. **输出面板**
   - 使用 `console.log` 进行调试
   - 在输出面板选择 "VS Upload Image" 查看日志

2. **断点调试**
   - 在代码中设置断点
   - 使用 VS Code 的调试控制台

3. **日志文件**
   - 查看 `~/.vs-upload-image/upload.log` 文件
   - 包含详细的操作记录和错误信息

## 常见问题

1. **找不到上传命令**
   - 检查 PATH 环境变量
   - 确保命令在终端中可用
   - 检查 .zshrc 配置

2. **上传失败**
   - 查看上传日志获取详细错误信息
   - 确认网络连接正常
   - 验证上传脚本权限

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
