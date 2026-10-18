import { spawn } from 'node:child_process';
import { preview } from 'vite';

// Reuse the existing browser suites, with one fresh browser context per suite.
const server = process.env.URL ? undefined : await preview();
const url = process.env.URL || server.resolvedUrls.local[0];
const suites = ['回归', '收藏', '收藏-边界', '流程'];
let failed = false;
try {
  for (const suite of suites) {
    console.log(`\n运行 ${suite}`);
    const code = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [`tests/${suite}.mjs`], {
        stdio: 'inherit', env: { ...process.env, URL: url.replace(/\/$/, '') },
      });
      child.once('error', reject);
      child.once('exit', (code) => resolve(code));
    });
    if (code !== 0) failed = true;
  }
} finally {
  if (server) await new Promise((resolve) => server.httpServer.close(resolve));
}
process.exitCode = failed ? 1 : 0;
