/**
 * 朝星小组网盘API服务
 * 入口文件
 */

// 加载环境变量
require('dotenv').config();

// 导入应用
const { startServer } = require('./app'); // 使用修改后的应用
const { startTerminal } = require('./terminal');

// 启动服务器
startServer();

// 检查命令行参数
const args = process.argv.slice(2);
if (args.includes('--terminal') || args.includes('-t')) {
    console.log('\n启动终端模式...');
    startTerminal();
}
