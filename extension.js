/**
 * Context Runner - VS Code Extension
 * 
 * 这个插件允许用户通过右键菜单快速执行自定义脚本或命令。
 * 支持单个文件和文件夹批量处理，提供进度显示和国际化支持。
 * 
 * 主要功能：
 * 1. 通过右键菜单快速执行命令
 * 2. 支持文件和文件夹操作
 * 3. 实时执行进度显示
 * 4. 支持中英文界面
 * 5. 支持自定义命令或脚本
 * 6. 详细的执行日志
 * 
 * @author dong4j
 * @version 0.0.1
 * @since 2024-01-05
 */

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const iconv = require('iconv-lite');

// 日志目录
const LOG_DIR = path.join(os.homedir(), '.context-runner');
// 日志文件
const LOG_FILE = path.join(LOG_DIR, 'run.log');

// 创建日志目录
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR);
}

/**
 * 显示通知消息
 * @param {string} message 消息内容
 * @param {string} type 消息类型：'info', 'warning', 'error'
 * @param {number} [timeout=3000] 自动关闭时间（毫秒）
 * @example
 * showNotification('命令执行成功', 'info');
 * showNotification('执行失败：文件不存在', 'error');
 */
function showNotification(message, type, timeout = 3000) {
    let notification;
    switch (type) {
        case 'info':
            notification = vscode.window.showInformationMessage(message);
            break;
        case 'warning':
            notification = vscode.window.showWarningMessage(message);
            break;
        case 'error':
            notification = vscode.window.showErrorMessage(message);
            break;
        default:
            notification = vscode.window.showInformationMessage(message);
    }
    
    // 自动关闭通知
    if (timeout > 0) {
        setTimeout(() => {
            notification.dispose();
        }, timeout);
    }
}

/**
 * 本地化字符串
 * @param {string} key 本地化 key
 * @param {...string} args 替换参数
 * @returns {string} 本地化后的字符串
 * @example
 * localize('command.run.title') // => "执行命令"
 * localize('info.progress', '50', '1', '2') // => "正在执行 50%（1/2）"
 */
function localize(key, ...args) {
    const message = `context-runner.${key}`;
    if (args.length > 0) {
        return vscode.l10n.t(message, ...args);
    }
    return vscode.l10n.t(message);
}

/**
 * 写入日志
 * @param {string} message 日志消息
 * @param {string} [type='INFO'] 日志类型
 * @example
 * writeLog('开始执行命令: ls -l');
 * writeLog('执行失败：文件不存在', 'ERROR');
 */
function writeLog(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type}] ${message}\n`;
    fs.appendFileSync(LOG_FILE, logMessage);
}

/**
 * 获取环境变量
 * 从用户的 shell 配置文件（如 .zshrc）中获取环境变量
 * @returns {Promise<Object>} 环境变量对象
 */
async function getEnvironmentVariables() {
    return new Promise((resolve) => {
        const shell = os.platform() === 'win32' ? 'cmd.exe' : 'zsh';
        const shellArgs = os.platform() === 'win32' ? ['/c', 'set'] : ['-ic', 'env'];
        
        const child = exec(`${shell} ${shellArgs.join(' ')}`, (error, stdout) => {
            if (error) {
                console.error('获取环境变量失败:', error);
                resolve(process.env);
                return;
            }
            
            const env = {};
            const output = iconv.decode(Buffer.from(stdout), 'utf8');
            output.split('\n').forEach(line => {
                const parts = line.split('=');
                if (parts.length >= 2) {
                    env[parts[0]] = parts.slice(1).join('=');
                }
            });
            
            resolve({ ...process.env, ...env });
        });
        
        child.on('error', () => resolve(process.env));
    });
}

/**
 * 执行命令
 * @param {string} filePath 文件路径
 * @param {vscode.Progress} progress 进度对象
 * @param {number} [current] 当前进度
 * @param {number} [total] 总数
 * @returns {Promise<void>}
 */
async function executeCommand(filePath, progress, current, total) {
    const config = vscode.workspace.getConfiguration('context-runner');
    const scriptPath = config.get('scriptPath');
    const command = config.get('command');
    
    if (!scriptPath && !command) {
        showNotification(localize('error.noScriptPath'), 'error');
        return;
    }
    
    // 获取环境变量
    const env = await getEnvironmentVariables();
    
    // 准备执行的命令
    let cmd;
    if (scriptPath) {
        cmd = `"${scriptPath}" "${filePath}"`;
    } else {
        cmd = command.replace('{filePath}', `"${filePath}"`);
    }
    
    writeLog(`执行命令: ${cmd}`);
    
    // 更新进度
    if (progress && total) {
        const percentage = Math.round((current / total) * 100);
        progress.report({
            message: localize('info.progress', percentage.toString(), current.toString(), total.toString()),
            increment: (1 / total) * 100
        });
    }
    
    return new Promise((resolve, reject) => {
        exec(cmd, { env }, (error, stdout, stderr) => {
            if (error) {
                writeLog(`执行失败: ${error.message}`, 'ERROR');
                writeLog(`错误输出: ${stderr}`, 'ERROR');
                reject(error);
                return;
            }
            
            writeLog(`执行成功: ${stdout}`);
            resolve(stdout);
        });
    });
}

/**
 * 处理单个文件
 * @param {vscode.Uri} uri 文件 URI
 */
async function runSingle(uri) {
    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: localize('command.run'),
            cancellable: false
        }, async (progress) => {
            await executeCommand(uri.fsPath, progress);
            showNotification(localize('info.success'), 'info');
        });
    } catch (error) {
        showNotification(localize('error.scriptError', error.message), 'error');
    }
}

/**
 * 处理文件夹
 * @param {vscode.Uri} uri 文件夹 URI
 */
async function runFolder(uri) {
    try {
        const files = await vscode.workspace.findFiles(
            new vscode.RelativePattern(uri.fsPath, '**/*'),
            '**/node_modules/**'
        );
        
        if (files.length === 0) {
            showNotification(localize('info.noFiles'), 'warning');
            return;
        }
        
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: localize('command.runFolder'),
            cancellable: false
        }, async (progress) => {
            for (let i = 0; i < files.length; i++) {
                await executeCommand(files[i].fsPath, progress, i + 1, files.length);
            }
            showNotification(localize('info.success'), 'info');
        });
    } catch (error) {
        showNotification(localize('error.scriptError', error.message), 'error');
    }
}

/**
 * 显示日志
 */
async function showLog() {
    if (!fs.existsSync(LOG_FILE)) {
        showNotification(localize('info.noLogFile'), 'warning');
        return;
    }
    
    const doc = await vscode.workspace.openTextDocument(LOG_FILE);
    await vscode.window.showTextDocument(doc);
}

/**
 * 激活插件
 * @param {vscode.ExtensionContext} context 插件上下文
 */
function activate(context) {
    // 注册命令
    context.subscriptions.push(
        vscode.commands.registerCommand('context-runner.run', runSingle),
        vscode.commands.registerCommand('context-runner.runFolder', runFolder),
        vscode.commands.registerCommand('context-runner.showLog', showLog)
    );
}

/**
 * 停用插件
 */
function deactivate() {}

module.exports = {
    activate,
    deactivate
};
