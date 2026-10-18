import assert from 'node:assert/strict';
import { build } from 'esbuild';

// In-memory, synthetic Vault only. No access to the user's installed Vault.
const bundle = await build({
  stdin: { contents: "export { VaultBridge } from './obsidian/vault'; export { TFile } from 'obsidian';", resolveDir: process.cwd() },
  bundle: true, write: false, format: 'esm', platform: 'node',
  plugins: [{ name: 'obsidian-test-api', setup(b) {
    b.onResolve({ filter: /^obsidian$/ }, () => ({ path: 'obsidian', namespace: 'test' }));
    b.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: `
      export class TFile { constructor(path, text, mtime) { this.path = path; this.text = text; this.stat = { mtime }; } }
      export const normalizePath = p => p.replaceAll('\\\\', '/');
      export const parseYaml = s => s ? JSON.parse(s) : {};
    ` }));
  } }],
});
const { VaultBridge, TFile } = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const files = new Map();
let time = Date.parse('2026-01-01T08:00:00Z');
const put = (path, text) => { const f = new TFile(path, text, ++time); files.set(path, f); return f; };
const fm = (file) => JSON.parse(file.text.match(/^---\n([\s\S]*?)\n---/)?.[1] || '{}');
const body = (file) => file.text.replace(/^---\n[\s\S]*?\n---\n/, '');
const record = (data, text = '') => put(data.path, `---\n${JSON.stringify(data)}\n---\n${text}`);
const entities = () => [...files.values()].filter((f) => f instanceof TFile && f.text.startsWith('---')).map((f) => ({ ...fm(f), path: f.path, archivedAt: fm(f).archived_at, resolvedAt: fm(f).resolved_at }));
const change = (id, patch) => { const e = entities().find((e) => e.id === id); record({ ...e, ...patch }, body(files.get(e.path))); };
let sequence = 0;
const repo = {
  refresh: async () => ({ entities: entities() }),
  readEntityMarkdown: async (id) => ({ markdown: files.get(entities().find((e) => e.id === id).path).text }),
  createAction: async (input) => {
    assert.ok(input.date); assert.ok(['high', 'medium', 'low'].includes(input.priority));
    const e = { ...input, id: `a${++sequence}`, kind: 'action', status: 'active', path: `系统/行动/a${sequence}.md` };
    record(e, input.body || ''); return e;
  },
  updateAction: async (id, patch) => change(id, patch),
  toggleAction: async (id) => change(id, { status: entities().find((e) => e.id === id).status === 'done' ? 'active' : 'done' }),
  archiveAction: async (id) => change(id, { archived_at: new Date(++time).toISOString() }),
  deleteAction: async (id) => files.delete(entities().find((e) => e.id === id).path),
  reorderActions: async (ids) => ids.forEach((id, i) => change(id, { dashboardOrder: i })),
  createProject: async (input) => { const e = { ...input, id: 'p-new', kind: 'project', path: '系统/项目/new.md' }; record(e); return e; },
  resolveRequest: async (id, decision) => change(id, { decision, status: decision === 'later' ? 'pending' : 'resolved' }),
  loadInformationMaterials: async () => [],
};
let opened;
const app = {
  plugins: { getPlugin: (id) => id === 'jarvis-dashboard' ? { repository: repo } : undefined },
  vault: {
    getName: () => 'Synthetic Vault', getAbstractFileByPath: (path) => files.get(path),
    read: async (file) => file.text,
    create: async (path, text) => { assert.equal(files.has(path), false); return put(path, text); },
    createFolder: async (path) => files.set(path, { path }),
    process: async (file, fn) => { const next = fn(file.text); file.text = next; file.stat.mtime = ++time; },
  },
  fileManager: { processFrontMatter: async (file, fn) => { const data = fm(file); fn(data); record(data, body(file)); } },
  workspace: { openLinkText: async (path) => { opened = path; } },
};
const config = { preferences: {}, diaryRoot: '日记', scratchpad: '系统/随手记/随手记收件箱.md' };
let saves = 0;
const bridge = new VaultBridge(app, config, async () => { saves++; });
record({ id: 'p1', kind: 'project', title: '合成项目', path: '系统/项目/p1.md', status: 'active' });
record({ id: 'r1', kind: 'request', title: '合成选择', path: '系统/需要我/r1.md', status: 'pending', requestType: 'choice', options: ['方案 A', '方案 B'], protected: '保留' }, '原始正文');
put(config.scratchpad, '# 合成收件箱\n\n已有手写段落\n');
await bridge.load();

const created = await bridge.execute('action-new', { title: '合成行动', date: '2026-01-01', priority: '高', projectId: 'p1' });
let snapshot = await bridge.load();
assert.equal(snapshot.actions[0].priority, '高');
assert.equal(snapshot.actions[0].projectId, 'p1');
await bridge.execute('action-edit', { id: created.targetId, patch: { priority: '低', projectId: '' } });
await bridge.execute('action-toggle', { id: created.targetId });
await bridge.execute('action-archive', { id: created.targetId });
snapshot = await bridge.load();
assert.ok(snapshot.actions[0].done); assert.ok(snapshot.actions[0].archived);
await bridge.execute('action-unarchive', { id: created.targetId });
assert.equal((await bridge.load()).actions[0].archived, undefined);
console.log('PASS 行动映射、项目关联、完成和归档');

const original = '  合成原话\n```text\n保留空格和围栏\n```\n';
await bridge.execute('capture', { text: original, type: '原话' });
assert.ok(files.get(config.scratchpad).text.startsWith('# 合成收件箱\n\n已有手写段落'));
assert.equal((await bridge.load()).materials[0].text, original);
console.log('PASS 随手记追加及原文保留');

await bridge.execute('respond', { id: 'r1', response: { kind: '选方案', optionId: '0', text: '合成说明' } });
snapshot = await bridge.load();
assert.equal(snapshot.decisions[0].response.text, '合成说明');
assert.equal(snapshot.decisions[0].response.optionId, '0');
assert.equal(snapshot.decisions[0].status, 'resolved');
assert.equal(fm(files.get('系统/需要我/r1.md')).protected, '保留');
assert.equal(body(files.get('系统/需要我/r1.md')), '原始正文');
await bridge.execute('reopen', { id: 'r1' });
assert.equal((await bridge.load()).decisions[0].status, 'open');
await bridge.execute('check-action', { id: 'r1' }); await bridge.load();
const count = entities().length;
await bridge.execute('check-action', { id: 'r1' });
assert.equal(entities().length, count);
console.log('PASS 请求回应重读、原字段保留、验收行动去重');

const day = await bridge.diary('2026-01-02');
assert.equal(day.files[0].state, 'missing');
await bridge.execute('diary', { date: day.date, kind: '用户原文', text: '合成日记' });
const first = (await bridge.diary(day.date)).files[0];
await app.vault.process(files.get(first.path), () => '外部修改');
await bridge.load(); // An unrelated refresh must not bless a stale editor's version.
await assert.rejects(() => bridge.execute('diary', { date: day.date, kind: '用户原文', text: '旧草稿', mtime: first.mtime }), { code: 'conflict' });
assert.equal(files.get(first.path).text, '外部修改');
const latest = (await bridge.diary(day.date)).files[0];
await bridge.execute('diary', { date: day.date, kind: '用户原文', text: '合成更新', mtime: latest.mtime });
assert.equal(files.get(first.path).text, '合成更新');
console.log('PASS 日记新建、更新和并发修改冲突');

await bridge.open(first.path); assert.equal(opened, first.path);
await assert.rejects(() => bridge.open('日记/不存在.md'), /尚未创建/);
await Promise.all([bridge.savePreference('theme', 'dark'), bridge.savePreference('layout', 'synthetic')]);
assert.equal(saves, 2); assert.equal(config.preferences.theme, 'dark');
await assert.rejects(() => bridge.execute('ai-generate', {}), /尚未接到 Vault/);
assert.throws(() => new VaultBridge({ ...app, plugins: { getPlugin: () => undefined } }, config, async () => {}), /请先启用/);
console.log('PASS 打开原文、配置保存、未接入操作和缺失依赖');
