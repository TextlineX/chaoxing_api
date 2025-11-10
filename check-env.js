/**
 * 环境变量检查脚本
 * 用于诊断Vercel环境变量配置问题
 */

console.log('=== 环境变量检查 ===
');

// 检查必需的环境变量
const requiredVars = ['COOKIE', 'BBSID'];
const optionalVars = ['ENABLE_DEBUG_LOG'];

let hasErrors = false;

// 检查必需变量
console.log('必需环境变量:');
requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
        console.log(`✅ ${varName}: 已设置 (长度: ${value.length})`);
    } else {
        console.log(`❌ ${varName}: 未设置`);
        hasErrors = true;
    }
});

// 检查可选变量
console.log('
可选环境变量:');
optionalVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
        console.log(`✅ ${varName}: ${value}`);
    } else {
        console.log(`⚠️ ${varName}: 未设置 (使用默认值)`);
    }
});

// 检查环境
console.log('
环境信息:');
console.log(`NODE_ENV: ${process.env.NODE_ENV || '未设置'}`);
console.log(`VERCEL: ${process.env.VERCEL ? '是' : '否'}`);
console.log(`VERCEL_ENV: ${process.env.VERCEL_ENV || '未设置'}`);

// 总结
console.log('
=== 检查结果 ===');
if (hasErrors) {
    console.log('❌ 发现问题：缺少必需的环境变量');
    console.log('
解决方案:');
    console.log('1. 在Vercel控制台中设置环境变量');
    console.log('2. 使用Vercel CLI: vercel env add <变量名>');
    console.log('3. 重新部署应用: vercel --prod');
} else {
    console.log('✅ 所有必需的环境变量已设置');
}
