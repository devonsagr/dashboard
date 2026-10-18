import { build } from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';

await mkdir('dist/obsidian', { recursive: true });
await build({ entryPoints: ['src/main.tsx'], bundle: true, format: 'iife', platform: 'browser', target: 'es2022', outfile: 'dist/obsidian/ui.js', minify: true, define: { 'process.env.NODE_ENV': '"production"' } });
await build({ entryPoints: ['obsidian/main.ts'], bundle: true, platform: 'node', format: 'cjs', target: 'es2022', external: ['obsidian'], outfile: 'dist/obsidian/main.js' });
await copyFile('obsidian/manifest.json', 'dist/obsidian/manifest.json');
console.log('Obsidian package: dist/obsidian');
