// 环境诊断脚本
const fs = require('fs');
const path = require('path');

console.log('=== 环境诊断报告 ===\n');

// 1. Node.js 版本
console.log('Node.js 版本:', process.version);
console.log('平台:', process.platform);
console.log('架构:', process.arch);
console.log();

// 2. 检查关键依赖版本
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
console.log('关键依赖版本:');
console.log('  next:', packageJson.dependencies.next);
console.log('  typescript:', packageJson.dependencies.typescript || packageJson.devDependencies.typescript);
console.log('  @types/node:', packageJson.devDependencies['@types/node']);
console.log();

// 3. 检查环境变量
console.log('环境变量:');
const envVars = ['MAX_TOKENS', 'SETTING_MODEL', 'NODE_ENV', 'MEMORY_LEVEL'];
envVars.forEach(key => {
  console.log(`  ${key}:`, process.env[key] || '(未设置)');
});
console.log();

// 4. 测试正则表达式（JSON 提取逻辑）
console.log('正则表达式测试:');
const testContent = `\`\`\`json\n[{"id": "test", "name": "测试"}]\n\`\`\``;
const codeBlockMatch = testContent.match(/```(?:json)?\s*([\s\S]*?)```/);
console.log('  代码块提取:', codeBlockMatch ? '成功' : '失败');
if (codeBlockMatch) {
  console.log('  提取结果:', codeBlockMatch[1].trim());
}

// 5. 检查 node_modules 是否存在
console.log('\n文件检查:');
console.log('  node_modules 存在:', fs.existsSync('./node_modules') ? '是' : '否');
console.log('  .env.local 存在:', fs.existsSync('./.env.local') ? '是' : '否');
