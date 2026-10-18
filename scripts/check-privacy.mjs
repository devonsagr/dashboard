import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

const root = process.cwd();
const ignored = new Set(['.git', 'node_modules', 'dist', 'output', '.local']);
const textTypes = new Set(['.ts', '.tsx', '.md', '.mjs', '.json', '.html', '.css', '.svg', '.bat']);
const findings = [];
let checked = 0;
async function scan(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const path = join(dir, entry.name);
    const name = relative(root, path).replaceAll('\\', '/');
    if (entry.isDirectory()) { await scan(path); continue; }
    if (/^\.env(?:\.|$)/.test(entry.name) && entry.name !== '.env.example') findings.push(`${name}: 环境配置不能入库`);
    if (!textTypes.has(extname(path))) continue;
    const text = await readFile(path, 'utf8');
    checked++;
    if (/\b[A-Za-z]:[\\/]/.test(text)) findings.push(`${name}: 发现本机绝对路径`);
    if (/obsidian:\/\//i.test(text)) findings.push(`${name}: 发现外部知识库打开链接`);
    if (/\b(?:sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})\b/.test(text)) findings.push(`${name}: 疑似密钥`);
    const emails = text.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g) || [];
    if (emails.some((email) => !email.endsWith('@example.com'))) findings.push(`${name}: 非示例邮箱`);
    // Runtime assets must not ship real profile links, platform IDs or remote media URLs.
    if (name.startsWith('src/') || name.startsWith('public/')) {
      for (const match of text.matchAll(/https?:\/\/[^\s'"`<>]+/g)) {
        const value = match[0];
        if (value.startsWith('http://www.w3.org/')) continue;
        // The iframe editor advertises an empty loopback address as a user-entered option.
        if (value === 'http://127.0.0.1:端口') continue;
        let allowed = false;
        try { const host = new URL(value).hostname; allowed = host === 'example.com' || host.endsWith('.example.com'); } catch { /* malformed URL */ }
        if (!allowed) findings.push(`${name}: 非示例外链`);
      }
    }
  }
}
await scan(root);
if (findings.length) {
  findings.forEach((finding) => console.error(finding));
  process.exitCode = 1;
} else console.log(`PASS 隐私静态检查：${checked} 个文本文件；仍需人工审阅自由文本和新素材。`);
