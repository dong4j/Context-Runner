/**
 * VS Code 图片上传插件
 * 
 * 这个插件允许用户通过右键菜单上传图片到指定服务器。主要功能包括：
 * 1. 支持单个图片上传
 * 2. 支持文件夹批量上传
 * 3. 支持上传进度显示
 * 4. 支持自定义上传命令或脚本
 * 5. 支持中英文国际化
 * 
 * @module vs-upload-image
 */

const vscode = require('vscode');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// 通知自动关闭时间（毫秒）
const NOTIFICATION_TIMEOUT = 3000;

/**
 * 显示带自动关闭的通知
 * 这个函数封装了 VS Code 的通知 API，并添加了自动关闭功能
 * 
 * @param {string} message - 要显示的消息
 * @param {'info' | 'warning' | 'error'} type - 通知类型：info（信息）, warning（警告）, error（错误）
 * @example
 * showNotification('上传成功'); // 显示信息通知
 * showNotification('上传失败', 'error'); // 显示错误通知
 */
function showNotification(message, type = 'info') {
    let notification;
    switch (type) {
        case 'error':
            notification = vscode.window.showErrorMessage(message);
            break;
        case 'warning':
            notification = vscode.window.showWarningMessage(message);
            break;
        default:
            notification = vscode.window.showInformationMessage(message);
    }

    // 设置定时器自动关闭通知
    setTimeout(() => {
        notification.then(item => {
            if (item) {
                // @ts-ignore - VS Code API 类型定义中可能没有 dispose 方法
                item.dispose();
            }
        });
    }, NOTIFICATION_TIMEOUT);
}

/**
 * 获取本地化字符串
 * 使用 VS Code 的本地化 API 获取对应语言的字符串
 * 
 * @param {string} key - 本地化字符串的键
 * @param {...any} args - 替换参数
 * @returns {string} 本地化后的字符串
 * @example
 * localize('vs-upload-image.info.uploadSuccess'); // 返回当前语言的"上传成功"文本
 */
function localize(key, ...args) {
    const message = vscode.l10n.t(key);
    if (args.length > 0) {
        return message.replace(/\{(\d+)\}/g, (match, index) => args[index] || '');
    }
    return message;
}

/**
 * 写入日志
 * 将操作日志写入到用户目录下的 .vs-upload-image/upload.log 文件
 * 
 * @param {string} content - 日志内容
 * @example
 * writeLog('Starting upload for file: example.png');
 */
function writeLog(content) {
    const logDir = path.join(os.homedir(), '.vs-upload-image');
    const logFile = path.join(logDir, 'upload.log');
    
    // 确保日志目录存在
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    
    // 写入日志，包含时间戳
    const timestamp = new Date().toISOString();
    const logContent = `[${timestamp}] ${content}\n`;
    fs.appendFileSync(logFile, logContent);
}

/**
 * 获取环境变量
 * 这个函数会尝试加载用户的 shell 配置（如 .zshrc），以确保能够使用用户配置的命令
 * 
 * @returns {Promise<{[key: string]: string}>} 包含环境变量的对象
 * @example
 * const env = await getEnvironmentVariables();
 * console.log(env.PATH); // 显示 PATH 环境变量
 */
async function getEnvironmentVariables() {
    return new Promise((resolve, reject) => {
        // 检查默认 shell
        const shell = process.env.SHELL || '/bin/zsh';
        const isZsh = shell.includes('zsh');
        
        // 使用 zsh 获取环境变量
        const command = isZsh ? 
            'zsh -i -c "source ~/.zshrc > /dev/null 2>&1; env"' : 
            'bash -ilc "env"';
            
        writeLog(`Using shell command: ${command}`);
        
        exec(command, { shell: isZsh ? '/bin/zsh' : '/bin/bash' }, (error, stdout, stderr) => {
            if (error) {
                writeLog(`Error getting environment: ${error.message}`);
                // 如果获取失败，返回当前进程的环境变量
                resolve(process.env);
                return;
            }

            try {
                const env = {};
                stdout.split('\n').forEach(line => {
                    const [key, ...values] = line.split('=');
                    if (key) {
                        env[key] = values.join('=');
                    }
                });
                
                // 确保有基本的环境变量
                env.HOME = env.HOME || os.homedir();
                env.PATH = env.PATH || process.env.PATH;
                env.SHELL = env.SHELL || shell;
                
                writeLog(`Loaded environment variables. PATH=${env.PATH}`);
                resolve(env);
            } catch (e) {
                writeLog(`Error parsing environment: ${e.message}`);
                resolve(process.env);
            }
        });
    });
}

/**
 * 执行上传命令
 * 这个函数负责实际执行上传操作，支持两种模式：
 * 1. 使用自定义命令（uploadCommand）
 * 2. 使用上传脚本（scriptPath）
 * 
 * @param {string} imagePath - 要上传的图片路径
 * @param {vscode.Progress} progress - VS Code 进度对象
 * @param {number} index - 当前是第几个文件
 * @param {number} total - 总文件数
 * @returns {Promise<void>}
 * @example
 * await executeUploadCommand('/path/to/image.png', progress, 1, 1);
 */
async function executeUploadCommand(imagePath, progress, index, total) {
    const config = vscode.workspace.getConfiguration('vs-upload-image');
    const uploadCommand = config.get('uploadCommand');
    const scriptPath = config.get('scriptPath');

    // 获取完整的环境变量
    const env = await getEnvironmentVariables();
    writeLog(`Using SHELL=${env.SHELL}`);

    return new Promise((resolve, reject) => {
        // 更新进度
        if (progress) {
            const percentage = Math.round((index / total) * 100);
            progress.report({ 
                message: localize('vs-upload-image.info.uploadInProgress', percentage, index, total),
                increment: (1 / total) * 100 
            });
        }

        if (uploadCommand) {
            // 使用自定义命令
            const command = uploadCommand.replace(/\{imagePath\}/g, imagePath);
            writeLog(`Executing custom command: ${command}`);
            
            // 构建完整的 zsh 命令
            const fullCommand = `source ~/.zshrc > /dev/null 2>&1 && ${command}`;
            writeLog(`Full command: ${fullCommand}`);
            
            // 使用 zsh -i -c 执行命令
            exec(`zsh -i -c "${fullCommand}"`, {
                env,
                shell: '/bin/zsh'
            }, (error, stdout, stderr) => {
                if (error) {
                    writeLog(`Error: ${error.message}`);
                    reject(error);
                    return;
                }
                if (stdout) writeLog(`stdout: ${stdout}`);
                if (stderr) writeLog(`stderr: ${stderr}`);
                resolve();
            });
        } else if (scriptPath) {
            // 使用脚本路径
            writeLog(`Executing script: "${scriptPath}" "${imagePath}"`);
            
            // 构建完整的 zsh 命令
            const fullCommand = `source ~/.zshrc > /dev/null 2>&1 && "${scriptPath}" "${imagePath}"`;
            writeLog(`Full command: ${fullCommand}`);
            
            // 使用 zsh -i -c 执行命令
            exec(`zsh -i -c "${fullCommand}"`, {
                env,
                shell: '/bin/zsh'
            }, (error, stdout, stderr) => {
                if (error) {
                    writeLog(`Error: ${error.message}`);
                    reject(error);
                    return;
                }
                if (stdout) writeLog(`stdout: ${stdout}`);
                if (stderr) writeLog(`stderr: ${stderr}`);
                resolve();
            });
        } else {
            reject(new Error('No upload command or script path configured'));
        }
    });
}

/**
 * 上传单个图片
 * 处理单个图片的上传，包括进度显示和错误处理
 * 
 * @param {vscode.Uri} uri - VS Code 的 URI 对象，包含文件路径
 * @returns {Promise<void>}
 * @example
 * vscode.commands.registerCommand('vs-upload-image.upload', uploadSingleImage);
 */
async function uploadSingleImage(uri) {
    if (!uri) {
        showNotification(localize('vs-upload-image.error.noImage'), 'error');
        return;
    }

    const filePath = uri.fsPath;
    writeLog(`Starting upload for file: ${filePath}`);
    
    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: path.basename(filePath),
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0 });
            await executeUploadCommand(filePath, progress, 1, 1);
            progress.report({ increment: 100 });
        });
        
        showNotification(localize('vs-upload-image.info.uploadSuccess'));
    } catch (error) {
        const errorMsg = localize('vs-upload-image.error.scriptError', error.message);
        writeLog(errorMsg);
        showNotification(errorMsg, 'error');
    }
}

/**
 * 上传文件夹中的所有图片
 * 递归遍历文件夹，找到所有支持的图片文件并上传
 * 
 * @param {vscode.Uri} uri - VS Code 的 URI 对象，包含文件夹路径
 * @returns {Promise<void>}
 * @example
 * vscode.commands.registerCommand('vs-upload-image.uploadFolder', uploadFolderImages);
 */
async function uploadFolderImages(uri) {
    if (!uri) {
        showNotification(localize('vs-upload-image.error.noImage'), 'error');
        return;
    }

    const folderPath = uri.fsPath;
    writeLog(`Starting upload for folder: ${folderPath}`);

    try {
        // 递归获取所有图片文件
        const imageFiles = [];
        const walk = (dir) => {
            const files = fs.readdirSync(dir);
            files.forEach(file => {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);
                if (stat.isDirectory()) {
                    walk(filePath);
                } else if (/\.(png|jpg|jpeg|gif|webp)$/i.test(file)) {
                    imageFiles.push(filePath);
                }
            });
        };
        walk(folderPath);

        if (imageFiles.length === 0) {
            showNotification(localize('vs-upload-image.info.noImages'));
            return;
        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: path.basename(folderPath),
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0 });
            
            for (let i = 0; i < imageFiles.length; i++) {
                await executeUploadCommand(imageFiles[i], progress, i + 1, imageFiles.length);
            }
            
            progress.report({ increment: 100 });
        });

        showNotification(localize('vs-upload-image.info.uploadSuccess'));
    } catch (error) {
        const errorMsg = localize('vs-upload-image.error.scriptError', error.message);
        writeLog(errorMsg);
        showNotification(errorMsg, 'error');
    }
}

/**
 * 插件激活入口
 * 当插件被激活时，这个函数会被 VS Code 调用
 * 在这里注册所有的命令和事件监听器
 * 
 * @param {vscode.ExtensionContext} context - VS Code 插件上下文
 * @example
 * // 这个函数会在插件激活时自动调用
 * activate(context);
 */
function activate(context) {
    // 注册查看日志命令
    let showLogCommand = vscode.commands.registerCommand('vs-upload-image.showLog', () => {
        const logFile = path.join(os.homedir(), '.vs-upload-image', 'upload.log');
        if (fs.existsSync(logFile)) {
            vscode.workspace.openTextDocument(logFile).then(doc => {
                vscode.window.showTextDocument(doc);
            });
        } else {
            showNotification(localize('vs-upload-image.info.noLogFile'));
        }
    });

    // 注册上传单个图片命令
    let uploadCommand = vscode.commands.registerCommand('vs-upload-image.upload', async (uri) => {
        // 检查配置
        const config = vscode.workspace.getConfiguration('vs-upload-image');
        const scriptPath = config.get('scriptPath');
        const uploadCommand = config.get('uploadCommand');

        if (!scriptPath && !uploadCommand) {
            const result = await vscode.window.showErrorMessage(
                localize('vs-upload-image.error.noScriptPath'),
                localize('vs-upload-image.button.configure'),
                localize('vs-upload-image.button.cancel')
            );
            
            if (result === localize('vs-upload-image.button.configure')) {
                vscode.commands.executeCommand('workbench.action.openSettings', 'vs-upload-image');
            }
            return;
        }

        await uploadSingleImage(uri);
    });

    // 注册上传文件夹命令
    let uploadFolderCommand = vscode.commands.registerCommand('vs-upload-image.uploadFolder', async (uri) => {
        // 检查配置
        const config = vscode.workspace.getConfiguration('vs-upload-image');
        const scriptPath = config.get('scriptPath');
        const uploadCommand = config.get('uploadCommand');

        if (!scriptPath && !uploadCommand) {
            const result = await vscode.window.showErrorMessage(
                localize('vs-upload-image.error.noScriptPath'),
                localize('vs-upload-image.button.configure'),
                localize('vs-upload-image.button.cancel')
            );
            
            if (result === localize('vs-upload-image.button.configure')) {
                vscode.commands.executeCommand('workbench.action.openSettings', 'vs-upload-image');
            }
            return;
        }

        await uploadFolderImages(uri);
    });

    // 将命令添加到插件上下文的订阅中
    context.subscriptions.push(showLogCommand);
    context.subscriptions.push(uploadCommand);
    context.subscriptions.push(uploadFolderCommand);
}

/**
 * 插件停用函数
 * 当插件被停用时，这个函数会被调用
 * 用于清理资源
 */
function deactivate() {}

// 导出插件的激活和停用函数
module.exports = {
    activate,
    deactivate
}
