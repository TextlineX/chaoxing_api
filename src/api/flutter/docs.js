/**
 * API文档模块
 * 提供Flutter集成所需的API文档
 */

const config = require('../../config');

module.exports = (req, res) => {
    res.json({
        title: '朝星小组网盘API - Flutter集成文档',
        version: '1.0.0',
        base_url: `http://localhost:${config.SERVER.PORT}/flutter`,
        authentication: {
            description: '无需提供认证信息，服务器自动使用环境变量中的认证信息'
        },
        endpoints: [
            {
                path: '/get-download-url',
                method: 'POST',
                description: '获取文件预签名下载URL',
                headers: {},
                body: {
                    fileId: {
                        type: 'string',
                        required: true,
                        description: '文件ID，格式为id$fileId'
                    }
                },
                response: {
                    success: true,
                    data: {
                        downloadUrl: '预签名下载URL',
                        fileName: '文件名',
                        expires: '过期时间（ISO格式）'
                    }
                }
            },
            {
                path: '/api',
                method: 'POST',
                description: '统一API入口',
                headers: {},
                body: {
                    action: {
                        type: 'string',
                        required: true,
                        description: '操作类型'
                    },
                    params: {
                        type: 'object',
                        description: '操作参数'
                    }
                },
                actions: [
                    {
                        name: 'listFiles',
                        description: '获取文件列表',
                        params: {
                            folderId: {
                                type: 'string',
                                required: false,
                                default: '-1',
                                description: '文件夹ID，默认为根目录'
                            }
                        }
                    },
                    {
                        name: 'downloadFile',
                        description: '获取文件下载链接',
                        params: {
                            fileId: {
                                type: 'string',
                                required: true,
                                description: '文件ID，格式为id$fileId'
                            }
                        }
                    },
                    {
                        name: 'createFolder',
                        description: '创建文件夹',
                        params: {
                            dirName: {
                                type: 'string',
                                required: true,
                                description: '文件夹名称'
                            },
                            parentId: {
                                type: 'string',
                                required: false,
                                default: '-1',
                                description: '父文件夹ID，默认为根目录'
                            }
                        }
                    },
                    {
                        name: 'uploadFile',
                        description: '上传文件',
                        params: {
                            filePath: {
                                type: 'string',
                                required: true,
                                description: '文件路径'
                            },
                            dirId: {
                                type: 'string',
                                required: false,
                                default: '-1',
                                description: '目标文件夹ID，默认为根目录'
                            }
                        }
                    },
                    {
                        name: 'downloadFileToLocal',
                        description: '下载文件到本地',
                        params: {
                            fileId: {
                                type: 'string',
                                required: true,
                                description: '文件ID，格式为id$fileId'
                            },
                            outputPath: {
                                type: 'string',
                                required: false,
                                description: '输出路径（可选）'
                            }
                        }
                    },
                    {
                        name: 'deleteResource',
                        description: '删除文件或文件夹',
                        params: {
                            resourceId: {
                                type: 'string',
                                required: true,
                                description: '资源ID（文件ID或文件夹ID）'
                            },
                            isFolder: {
                                type: 'boolean',
                                required: false,
                                description: '是否为文件夹（true/false），如果不提供则自动判断'
                            }
                        }
                    },
                    {
                        name: 'moveResource',
                        description: '移动文件或文件夹',
                        params: {
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
                                description: '是否为文件夹（true/false），如果不提供则自动判断'
                            }
                        }
                    },
                    {
                        name: 'batchMoveResources',
                        description: '批量移动文件或文件夹',
                        params: {
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
                                description: '是否为文件夹（true/false），如果不提供则自动判断'
                            }
                        }
                    }
                ]
            },
            {
                path: '/get-upload-config',
                method: 'POST',
                description: '获取文件上传配置参数',
                headers: {},
                body: {},
                response: {
                    success: true,
                    data: {
                        uploadUrl: '上传URL',
                        puid: '用户ID',
                        token: '上传令牌',
                        headers: {
                            'User-Agent': '用户代理',
                            'Referer': 'Referer头'
                        }
                    }
                }
            }
        ],
        response_format: {
            success: {
                type: 'boolean',
                description: '操作是否成功'
            },
            data: {
                type: 'object',
                description: '返回的数据，具体结构取决于操作类型'
            }
        },
        error_response: {
            error: {
                code: {
                    type: 'string',
                    description: '错误代码'
                },
                message: {
                    type: 'string',
                    description: '错误信息'
                }
            }
        }
    });
};