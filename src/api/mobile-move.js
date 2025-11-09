/**
 * 超星网盘文件移动功能
 * 实现文件和文件夹的移动操作
 */

const express = require('express');
const axios = require('axios');
const { ApiError, createParamError } = require('../utils/error');
const config = require('../config');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

const router = express.Router();

/**
 * 移动文件或文件夹
 * POST /mobile/move
 * 请求体：
 *   - resourceId: 资源ID（文件ID或文件夹ID）
 *   - targetId: 目标文件夹ID
 *   - isFolder: 是否为文件夹（可选，如果不提供则自动判断）
 */
router.post('/move', async (req, res, next) => {
    try {
        const { resourceId, targetId, isFolder } = req.body;

        // 从请求头获取认证信息
        const cookie = req.headers.cookie;
        const bbsid = req.headers.bbsid;

        // 验证认证信息
        if (!cookie || !bbsid) {
            throw new ApiError('认证信息不完整，请提供Cookie和Bbsid', 401, 'AUTH_ERROR');
        }

        // 验证必要参数
        if (!resourceId) {
            throw createParamError('resourceId不能为空');
        }

        if (!targetId) {
            throw createParamError('targetId不能为空');
        }

        // 自动判断资源类型
        let isFolderParam = null;
        if (isFolder !== undefined) {
            isFolderParam = isFolder === 'true' || isFolder === true;
        } else {
            // 如果包含$符号，则为文件，否则为文件夹
            isFolderParam = !resourceId.includes('$');
        }

        // 构建请求参数
        let query;
        if (isFolderParam) {
            // 移动文件夹
            query = {
                bbsid,
                folderIds: resourceId,
                targetId
            };
        } else {
            // 移动文件
            const recId = resourceId.split('$')[0];
            query = {
                bbsid,
                recIds: recId,
                targetId
            };
        }

        // 发送移动请求
        const response = await axios.get(
            `${config.API_BASE}/pc/resource/moveResource`,
            {
                params: query,
                headers: {
                    'Cookie': cookie,
                    'User-Agent': config.HEADERS.USER_AGENT,
                    'Referer': config.HEADERS.REFERER
                }
            }
        );

        // 检查响应
        if (response.data.status) {
            res.json({
                success: true,
                data: {
                    message: '移动成功',
                    resourceId,
                    targetId,
                    type: isFolderParam ? '文件夹' : '文件'
                }
            });
        } else {
            throw new Error(response.data.msg || '移动失败');
        }
    } catch (error) {
        next(error);
    }
});

/**
 * 批量移动文件或文件夹
 * POST /mobile/batch-move
 * 请求体：
 *   - resourceIds: 资源ID数组
 *   - targetId: 目标文件夹ID
 *   - isFolder: 是否为文件夹（可选，如果不提供则自动判断）
 */
router.post('/batch-move', async (req, res, next) => {
    try {
        const { resourceIds, targetId, isFolder } = req.body;

        // 从请求头获取认证信息
        const cookie = req.headers.cookie;
        const bbsid = req.headers.bbsid;

        // 验证认证信息
        if (!cookie || !bbsid) {
            throw new ApiError('认证信息不完整，请提供Cookie和Bbsid', 401, 'AUTH_ERROR');
        }

        // 验证必要参数
        if (!resourceIds || !Array.isArray(resourceIds) || resourceIds.length === 0) {
            throw createParamError('resourceIds不能为空且必须是数组');
        }

        if (!targetId) {
            throw createParamError('targetId不能为空');
        }

        // 自动判断资源类型
        let isFolderParam = null;
        if (isFolder !== undefined) {
            isFolderParam = isFolder === 'true' || isFolder === true;
        }

        // 分离文件和文件夹
        const fileIds = [];
        const folderIds = [];

        if (isFolderParam !== null) {
            // 如果明确指定了类型
            if (isFolderParam) {
                folderIds.push(...resourceIds);
            } else {
                fileIds.push(...resourceIds.map(id => id.split('$')[0]));
            }
        } else {
            // 自动判断类型
            resourceIds.forEach(id => {
                if (id.includes('$')) {
                    fileIds.push(id.split('$')[0]);
                } else {
                    folderIds.push(id);
                }
            });
        }

        // 构建请求参数
        const query = {
            bbsid,
            targetId
        };

        // 添加文件ID
        if (fileIds.length > 0) {
            query.recIds = fileIds.join(',');
        }

        // 添加文件夹ID
        if (folderIds.length > 0) {
            query.folderIds = folderIds.join(',');
        }

        // 发送移动请求
        const response = await axios.get(
            `${config.API_BASE}/pc/resource/moveResource`,
            {
                params: query,
                headers: {
                    'Cookie': cookie,
                    'User-Agent': config.HEADERS.USER_AGENT,
                    'Referer': config.HEADERS.REFERER
                }
            }
        );

        // 检查响应
        if (response.data.status) {
            res.json({
                success: true,
                data: {
                    message: '批量移动成功',
                    resourceIds,
                    targetId,
                    movedCount: resourceIds.length,
                    fileCount: fileIds.length,
                    folderCount: folderIds.length
                }
            });
        } else {
            throw new Error(response.data.msg || '批量移动失败');
        }
    } catch (error) {
        next(error);
    }
});

/**
 * API文档
 */
router.get('/docs', (req, res) => {
    res.json({
        title: '超星网盘文件移动API',
        version: '1.0.0',
        base_url: `http://localhost:${config.SERVER.PORT}/mobile`,
        authentication: {
            description: '需要在请求头中提供Cookie和Bbsid认证信息',
            headers: {
                Cookie: {
                    type: 'string',
                    required: true,
                    description: '用户Cookie'
                },
                Bbsid: {
                    type: 'string',
                    required: true,
                    description: '用户Bbsid'
                }
            }
        },
        endpoints: [
            {
                path: '/move',
                method: 'POST',
                description: '移动文件或文件夹',
                headers: {
                    Cookie: '用户Cookie',
                    Bbsid: '用户Bbsid'
                },
                body: {
                    resourceId: {
                        type: 'string',
                        required: true,
                        description: '资源ID（文件ID或文件夹ID）'
                    },
                    targetId: {
                        type: 'string',
                        required: true,
                        description: '目标文件夹ID'
                    },
                    isFolder: {
                        type: 'boolean',
                        required: false,
                        description: '是否为文件夹（可选，如果不提供则自动判断）'
                    }
                },
                response: {
                    success: true,
                    data: {
                        message: '移动成功',
                        resourceId: '资源ID',
                        targetId: '目标文件夹ID',
                        type: '资源类型（文件/文件夹）'
                    }
                }
            },
            {
                path: '/batch-move',
                method: 'POST',
                description: '批量移动文件或文件夹',
                headers: {
                    Cookie: '用户Cookie',
                    Bbsid: '用户Bbsid'
                },
                body: {
                    resourceIds: {
                        type: 'array',
                        required: true,
                        description: '资源ID数组'
                    },
                    targetId: {
                        type: 'string',
                        required: true,
                        description: '目标文件夹ID'
                    },
                    isFolder: {
                        type: 'boolean',
                        required: false,
                        description: '是否为文件夹（可选，如果不提供则自动判断）'
                    }
                },
                response: {
                    success: true,
                    data: {
                        message: '批量移动成功',
                        resourceIds: '资源ID数组',
                        targetId: '目标文件夹ID',
                        movedCount: '移动的资源数量',
                        fileCount: '文件数量',
                        folderCount: '文件夹数量'
                    }
                }
            }
        ]
    });
});

module.exports = router;
