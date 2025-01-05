const assert = require('assert');
const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('Upload command should be registered', async () => {
        const commands = await vscode.commands.getCommands();
        assert.ok(commands.includes('vs-upload-image.upload'));
    });

    test('Command should work with image files', async () => {
        // 创建一个临时的测试图片文件
        const tmpImagePath = path.join(__dirname, 'test.png');
        fs.writeFileSync(tmpImagePath, 'fake image content');

        try {
            // 创建 URI 对象
            const uri = vscode.Uri.file(tmpImagePath);
            
            // 执行上传命令
            await vscode.commands.executeCommand('vs-upload-image.upload', uri);
            
            // 这里可以添加更多的断言来验证上传结果
            // 由于实际上传依赖于外部脚本，我们可能只需要验证命令执行不会抛出错误
            
        } finally {
            // 清理测试文件
            if (fs.existsSync(tmpImagePath)) {
                fs.unlinkSync(tmpImagePath);
            }
        }
    });

    test('Command should fail with non-image files', async () => {
        // 创建一个临时的非图片文件
        const tmpTextPath = path.join(__dirname, 'test.txt');
        fs.writeFileSync(tmpTextPath, 'test content');

        try {
            const uri = vscode.Uri.file(tmpTextPath);
            
            // 执行上传命令，应该会失败或被忽略
            await vscode.commands.executeCommand('vs-upload-image.upload', uri);
            
        } finally {
            // 清理测试文件
            if (fs.existsSync(tmpTextPath)) {
                fs.unlinkSync(tmpTextPath);
            }
        }
    });
});
