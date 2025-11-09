/**
 * 终端界面模块
 * 提供命令行交互界面
 */

const readline = require('readline');
const { listFiles, downloadFile, makeDir, uploadFile, deleteResource } = require('./services/file');
const { isDebugEnabled } = require('../debugLogger');

// 创建命令行接口
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// 显示帮助信息
function showHelp() {
    console.log(`
可用命令:
  help                    - 显示帮助信息
  list [folderId]         - 列出文件和文件夹 (默认folderId=-1表示根目录)
  download <fileId>       - 下载文件
  mkdir <dirName> [parentId] - 创建文件夹 (默认parentId=-1表示根目录)
  upload <filePath> [dirId] - 上传文件 (默认dirId=-1表示根目录)
  delete <resourceId> [--folder|--file] - 删除文件或文件夹，可使用--folder或--file指定类型
  debug on/off            - 开启/关闭调试日志
  exit                    - 退出程序
    `);
}

// 处理命令
async function handleCommand(input) {
    const args = input.trim().split(' ');
    const command = args[0].toLowerCase();

    try {
        switch (command) {
            case 'help':
                showHelp();
                break;

            case 'list':
                const folderId = args[1] || '-1';
                console.log('正在获取文件列表...');
                const files = await listFiles(process.env.COOKIE, process.env.BBSID, folderId);
                console.log('\n文件列表:');
                console.table(files);
                break;

            case 'download':
                if (args.length < 2) {
                    console.log('错误: 请提供文件ID');
                    break;
                }
                console.log('正在获取下载链接...');
                const downloadInfo = await downloadFile(process.env.COOKIE, process.env.BBSID, args[1]);
                console.log(`文件名: ${downloadInfo.fileName}`);
                console.log(`下载链接: ${downloadInfo.downloadUrl}`);
                break;

            case 'mkdir':
                if (args.length < 2) {
                    console.log('错误: 请提供文件夹名称');
                    break;
                }
                const dirName = args[1];
                const parentId = args[2] || '-1';
                console.log('正在创建文件夹...');
                const mkdirResult = await makeDir(process.env.COOKIE, process.env.BBSID, dirName, parentId);
                console.log(mkdirResult.message);
                break;

            case 'upload':
                if (args.length < 2) {
                    console.log('错误: 请提供文件路径');
                    break;
                }
                const filePath = args[1];
                const dirId = args[2] || '-1';
                console.log('正在上传文件...');
                const uploadResult = await uploadFile(process.env.COOKIE, process.env.BBSID, filePath, dirId);
                console.log(uploadResult.message);
                break;

            case 'delete':
                if (args.length < 2) {
                    console.log('错误: 请提供资源ID');
                    break;
                }
                const isFolderFlag = args.includes('--folder');
                const isFileFlag = args.includes('--file');
                let isFolderParam = null;
                
                if (isFolderFlag && isFileFlag) {
                    console.log('错误: 不能同时指定--folder和--file参数');
                    break;
                } else if (isFolderFlag) {
                    isFolderParam = true;
                } else if (isFileFlag) {
                    isFolderParam = false;
                }
                
                console.log('正在删除资源...');
                const deleteResult = await deleteResource(process.env.COOKIE, process.env.BBSID, args[1], isFolderParam);
                console.log(`${deleteResult.message} (${deleteResult.type})`);
                break;

            case 'debug':
                if (args.length < 2) {
                    console.log('错误: 请提供on或off参数');
                    break;
                }
                const debugState = args[1].toLowerCase();
                if (debugState === 'on') {
                    process.env.ENABLE_DEBUG_LOG = 'true';
                    console.log('调试日志已开启');
                } else if (debugState === 'off') {
                    process.env.ENABLE_DEBUG_LOG = 'false';
                    console.log('调试日志已关闭');
                } else {
                    console.log('错误: 无效参数，请使用on或off');
                }
                break;

            case 'exit':
                console.log('再见!');
                rl.close();
                process.exit(0);
                break;

            default:
                if (command) {
                    console.log(`未知命令: ${command}`);
                    console.log('输入"help"查看可用命令');
                }
        }
    } catch (error) {
        console.error(`错误: ${error.message}`);
    }
}

// 启动终端界面
function startTerminal() {
    console.log(`
===================================
  朝星小组网盘 - 终端界面模式
===================================
输入"help"查看可用命令
当前调试日志状态: ${isDebugEnabled() ? '已开启' : '已关闭'}
    `);

    rl.setPrompt('> ');
    rl.prompt();

    rl.on('line', (input) => {
        handleCommand(input);
        rl.prompt();
    });

    rl.on('close', () => {
        console.log('\n再见!');
        process.exit(0);
    });
}

module.exports = {
    startTerminal
};
