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

// 日志级别映射
const LOG_LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
};

// 创建日志目录和文件
try {
    if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true, mode: 0o755 });
    }
    if (!fs.existsSync(LOG_FILE)) {
        fs.writeFileSync(LOG_FILE, '', { mode: 0o644 });
    }
} catch (error) {
    console.error('Failed to create log directory or file:', error);
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
 */
function writeLog(message, type = 'INFO') {
    try {
        const config = vscode.workspace.getConfiguration('context-runner');
        const logEnabled = config.get('logEnabled', true);
        const logLevel = config.get('logLevel', 'info').toLowerCase();
        
        if (!logEnabled) {
            return;
        }

        const messageType = type.toLowerCase();
        if (LOG_LEVELS[messageType] > LOG_LEVELS[logLevel]) {
            return;
        }

        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${type}] ${message}\n`;
        fs.appendFileSync(LOG_FILE, logMessage, { encoding: 'utf8', mode: 0o644 });
    } catch (error) {
        console.error('Failed to write log:', error);
        vscode.window.showErrorMessage(`Failed to write log: ${error.message}`);
    }
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
    console.log('executeCommand called with:', { filePath, current, total });
    
    const config = vscode.workspace.getConfiguration('context-runner');
    const scriptPath = config.get('scriptPath');
    const command = config.get('command');
    
    if (!scriptPath && !command) {
        console.error('No script or command configured');
        showNotification(localize('error.noConfig'), 'error');
        return;
    }

    // 获取环境变量
    const env = await getEnvironmentVariables();
    console.log('Environment variables loaded');

    // 准备执行的命令
    let cmd;
    if (scriptPath) {
        cmd = `"${scriptPath}" "${filePath}"`;
    } else {
        if (command.includes('{filePath}')) {
            cmd = command.replace('{filePath}', `"${filePath}"`);
        } else {
            cmd = `${command} "${filePath}"`;
        }
    }
    
    console.log('Prepared command:', cmd);
    writeLog(`Executing command: ${cmd}`, 'INFO');
    
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
    console.log('runSingle called with uri:', uri ? uri.fsPath : 'undefined');
    
    if (!uri) {
        console.error('No file selected');
        showNotification(localize('error.noFile'), 'error');
        return;
    }

    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: localize('command.run'),
            cancellable: false
        }, async (progress) => {
            writeLog(`Running command for file: ${uri.fsPath}`, 'INFO');
            await executeCommand(uri.fsPath, progress, 1, 1);
            showNotification(localize('info.success'), 'info');
        });
    } catch (error) {
        console.error('Error in runSingle:', error);
        writeLog(`Error in runSingle: ${error.message}`, 'ERROR');
        showNotification(localize('error.scriptError', error.message), 'error');
    }
}

/**
 * 处理文件夹
 * @param {vscode.Uri} uri 文件夹 URI
 */
async function runFolder(uri) {
    console.log('runFolder called with uri:', uri ? uri.fsPath : 'undefined');
    
    if (!uri) {
        console.error('No folder selected');
        showNotification(localize('error.noFile'), 'error');
        return;
    }

    try {
        const files = await vscode.workspace.findFiles(
            new vscode.RelativePattern(uri.fsPath, '**/*'),
            '**/node_modules/**'
        );

        if (files.length === 0) {
            console.log('No files found in folder');
            showNotification(localize('info.noFiles'), 'warning');
            return;
        }

        console.log(`Found ${files.length} files in folder`);
        
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: localize('command.runFolder'),
            cancellable: false
        }, async (progress) => {
            for (let i = 0; i < files.length; i++) {
                writeLog(`Processing file ${i + 1}/${files.length}: ${files[i].fsPath}`, 'INFO');
                await executeCommand(files[i].fsPath, progress, i + 1, files.length);
            }
            showNotification(localize('info.success'), 'info');
        });
    } catch (error) {
        console.error('Error in runFolder:', error);
        writeLog(`Error in runFolder: ${error.message}`, 'ERROR');
        showNotification(localize('error.scriptError', error.message), 'error');
    }
}

/**
 * 显示日志
 */
async function showLog() {
    try {
        if (!fs.existsSync(LOG_FILE)) {
            showNotification(localize('info.noLogFile'), 'warning');
            return;
        }

        // 检查文件是否可读
        try {
            await fs.promises.access(LOG_FILE, fs.constants.R_OK);
        } catch (error) {
            showNotification(`Cannot read log file: ${error.message}`, 'error');
            return;
        }

        // 尝试打开日志文件
        try {
            const doc = await vscode.workspace.openTextDocument(LOG_FILE);
            await vscode.window.showTextDocument(doc, { preview: false });
        } catch (error) {
            showNotification(`Failed to open log file: ${error.message}`, 'error');
        }
    } catch (error) {
        showNotification(`Error accessing log: ${error.message}`, 'error');
    }
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
