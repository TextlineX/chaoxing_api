/**
 * 超星网盘命令行工具 - 文件移动功能
 */

const axios = require('axios');
const { program } = require('commander');
const chalk = require('chalk');
const Table = require('cli-table3');
const config = require('../config');
const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const dotenv = require('dotenv');

// 导出program对象，以便在主文件中使用
module.exports = { program };

// 加载环境变量
dotenv.config();

// 基础配置
const BASE_URL = config.API_BASE;
const COOKIE = process.env.COOKIE || '';
const BBSID = process.env.BBSID || '';

// 请求头配置
const headers = {
    'Cookie': COOKIE,
    'Bbsid': BBSID,
    'User-Agent': config.HEADERS.USER_AGENT,
    'Referer': config.HEADERS.REFERER
};

/**
 * 移动文件或文件夹
 * @param {string} resourceId - 资源ID（文件ID或文件夹ID）
 * @param {string} targetId - 目标文件夹ID
 * @param {boolean} isFolder - 是否为文件夹（可选，如果不提供则自动判断）
 * @returns {Promise<Object>} 移动结果
 */
async function moveResource(resourceId, targetId, isFolder) {
    try {
        // 构建请求参数
        let query;
        if (isFolder === true) {
            // 移动文件夹
            query = {
                bbsid: BBSID,
                folderIds: resourceId,
                targetId
            };
        } else if (isFolder === false) {
            // 移动文件
            const recId = resourceId.split('$')[0];
            query = {
                bbsid: BBSID,
                recIds: recId,
                targetId
            };
        } else {
            // 自动判断
            if (resourceId.includes('$')) {
                const recId = resourceId.split('$')[0];
                query = {
                    bbsid: BBSID,
                    recIds: recId,
                    targetId
                };
            } else {
                query = {
                    bbsid: BBSID,
                    folderIds: resourceId,
                    targetId
                };
            }
        }

        // 发送移动请求
        const response = await axios.get(
            `${BASE_URL}/pc/resource/moveResource`,
            {
                params: query,
                headers
            }
        );

        // 检查响应
        if (response.data.status) {
            return {
                success: true,
                data: {
                    message: '移动成功',
                    resourceId,
                    targetId,
                    type: isFolder === true ? '文件夹' : (isFolder === false ? '文件' : (resourceId.includes('$') ? '文件' : '文件夹'))
                }
            };
        } else {
            throw new Error(response.data.msg || '移动失败');
        }
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * 获取文件列表
 * @param {string} folderId - 文件夹ID，默认为根目录
 * @returns {Promise<Array>} 文件列表
 */
async function listFiles(folderId = '-1') {
    try {
        // 获取文件夹
        const folderResponse = await axios.get(
            `${BASE_URL}/pc/resource/getResourceList`,
            {
                params: { bbsid: BBSID, folderId, recType: '1' },
                headers
            }
        );

        if (folderResponse.data.result !== 1) {
            throw new Error(folderResponse.data.msg || '获取文件夹失败');
        }

        // 获取文件
        const fileResponse = await axios.get(
            `${BASE_URL}/pc/resource/getResourceList`,
            {
                params: { bbsid: BBSID, folderId, recType: '2' },
                headers
            }
        );

        if (fileResponse.data.result !== 1) {
            throw new Error(fileResponse.data.msg || '获取文件失败');
        }

        // 合并结果
        const files = [...(folderResponse.data.list || []), ...(fileResponse.data.list || [])];
        return files.map(file => {
            const isFolder = file.content.folderName?.length > 0;
            return {
                name: isFolder ? file.content.folderName : file.content.name,
                type: isFolder ? '文件夹' : (file.content.suffix || file.content.filetype || '未知'),
                size: isFolder ? '-' : (file.content.size || 0),
                uploadTime: new Date(file.content.uploadDate || file.inserttime).toLocaleString(),
                id: isFolder ? file.id.toString() : `${file.id}$${file.content.fileId || file.content.objectId}`
            };
        });
    } catch (error) {
        console.error(chalk.red(`获取文件列表失败: ${error.message}`));
        return [];
    }
}

/**
 * 显示文件列表
 * @param {Array} files - 文件列表
 * @param {string} title - 列表标题
 */
function displayFiles(files, title) {
    if (files.length === 0) {
        console.log(chalk.yellow('此文件夹为空'));
        return;
    }

    console.log(chalk.blue(`\n${title}:`));

    // 创建表格
    const table = new Table({
        head: ['ID', '名称', '类型', '大小', '上传时间'],
        colWidths: [20, 30, 10, 15, 20]
    });

    // 添加行
    files.forEach(file => {
        table.push([
            file.id,
            file.name.length > 27 ? file.name.substring(0, 27) + '...' : file.name,
            file.type,
            file.type === '文件夹' ? '-' : (file.size > 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(2)}MB` : `${(file.size / 1024).toFixed(2)}KB`),
            file.uploadTime
        ]);
    });

    // 显示表格
    console.log(table.toString());
}

/**
 * 交互式选择文件或文件夹
 * @param {Array} files - 文件列表
 * @param {string} type - 选择类型（'source'或'target'）
 * @param {string} currentFolderId - 当前文件夹ID
 * @returns {Promise<Object>} 选择结果
 */
async function selectFile(files, type, currentFolderId) {
    // 如果是目标文件夹选择，只显示文件夹
    const displayFiles = type === 'target' ? files.filter(f => f.type === '文件夹') : files;

    if (displayFiles.length === 0 && type === 'target') {
        return { id: currentFolderId, name: '当前文件夹' };
    }

    // 添加返回上级选项
    if (currentFolderId !== '-1') {
        displayFiles.unshift({
            id: '..',
            name: '.. (返回上级)',
            type: '文件夹',
            size: '-',
            uploadTime: ''
        });
    }

    // 显示文件列表
    displayFiles(displayFiles, type === 'source' ? '请选择要移动的文件或文件夹' : '请选择目标文件夹');

    // 选择文件
    const { selectedId } = await inquirer.prompt([
        {
            type: 'list',
            name: 'selectedId',
            message: type === 'source' ? '请选择要移动的文件或文件夹:' : '请选择目标文件夹:',
            choices: displayFiles.map(f => ({ name: `${f.name} (${f.id})`, value: f.id }))
        }
    ]);

    // 如果选择返回上级
    if (selectedId === '..') {
        // 获取上级文件夹列表
        const parentFiles = await listFiles('-1'); // 这里简化处理，实际应该获取真正的上级
        return selectFile(parentFiles, type, '-1');
    }

    // 返回选择的文件
    const selectedFile = displayFiles.find(f => f.id === selectedId);
    return {
        id: selectedId,
        name: selectedFile.name,
        type: selectedFile.type
    };
}

/**
 * 移动命令
 */
program
    .command('move')
    .description('移动文件或文件夹')
    .option('-s, --source <id>', '源文件或文件夹ID')
    .option('-t, --target <id>', '目标文件夹ID')
    .option('-f, --folder', '源是文件夹（默认自动判断）')
    .option('-i, --interactive', '交互式选择')
    .action(async (options) => {
        try {
            // 检查认证信息
            if (!COOKIE || !BBSID) {
                console.error(chalk.red('错误: 未设置Cookie或Bbsid，请检查环境变量'));
                process.exit(1);
            }

            let sourceId, targetId, isFolder;

            // 交互式选择
            if (options.interactive) {
                console.log(chalk.blue('=== 交互式文件移动 ==='));

                // 获取根目录文件列表
                const rootFiles = await listFiles('-1');

                // 选择源文件
                const source = await selectFile(rootFiles, 'source', '-1');
                sourceId = source.id;
                isFolder = source.type === '文件夹';

                // 获取目标文件夹列表
                const target = await selectFile(rootFiles, 'target', '-1');
                targetId = target.id;

                console.log(chalk.green(`\n准备移动: ${source.name} (${sourceId}) -> ${target.name} (${targetId})`));

                // 确认操作
                const { confirm } = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'confirm',
                        message: '确认移动吗?',
                        default: false
                    }
                ]);

                if (!confirm) {
                    console.log(chalk.yellow('操作已取消'));
                    return;
                }
            } else {
                // 命令行参数
                sourceId = options.source;
                targetId = options.target;
                isFolder = options.folder;

                if (!sourceId || !targetId) {
                    console.error(chalk.red('错误: 必须指定源ID和目标ID'));
                    process.exit(1);
                }
            }

            // 执行移动
            console.log(chalk.blue('正在移动...'));
            const result = await moveResource(sourceId, targetId, isFolder);

            if (result.success) {
                console.log(chalk.green(`\n✓ ${result.data.message}`));
                console.log(chalk.gray(`资源ID: ${result.data.resourceId}`));
                console.log(chalk.gray(`目标ID: ${result.data.targetId}`));
                console.log(chalk.gray(`类型: ${result.data.type}`));
            } else {
                console.error(chalk.red(`\n✗ 移动失败: ${result.error}`));
                process.exit(1);
            }
        } catch (error) {
            console.error(chalk.red(`错误: ${error.message}`));
            process.exit(1);
        }
    });


