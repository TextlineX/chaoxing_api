/**
 * 配置模块
 * 包含API基础URL、请求头等配置信息
 */

// 导出配置常量
module.exports = {
    // API基础URL
    API_BASE: 'https://groupweb.chaoxing.com',
    DOWNLOAD_API: 'https://noteyd.chaoxing.com',
    UPLOAD_API: 'https://pan-yz.chaoxing.com',
    
    // 请求头配置
    HEADERS: {
        USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) quark-cloud-drive/2.5.20 Chrome/100.0.4896.160 Electron/18.3.5.4-b478491100 Safari/537.36 Channel/pckk_other_ch',
        REFERER: 'https://chaoxing.com/',
        ACCEPT: 'application/json, text/plain, */*'
    },
    
    // 服务器配置
    SERVER: {
        PORT: process.env.PORT || 3000
    }
};