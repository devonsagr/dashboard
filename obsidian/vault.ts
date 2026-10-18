import { App, TFile, normalizePath, parseYaml } from 'obsidian';
import type { DashboardHost, HostSnapshot } from '../src/data/host';
import type { Action, Decision, DecisionResponse, DiaryDay, Material, Project } from '../src/data/types';

type Entity = { id: string; kind: string; title: string; status: string; path: string; source?: string; body?: string; date?: string; time?: string; priority?: string; project?: string; dashboardOrder?: number; createdAt?: string; completedAt?: string; archivedAt?: string; updatedAt?: string; dataAsOf?: string; phase?: string; result?: string; nextHumanAction?: string; nextStep?: string; blocked?: boolean; context?: string; impact?: string; options?: string[]; requestType?: string; decision?: string; resolvedAt?: string; acceptanceEntry?: string };
interface Repository {
  refresh(): Promise<{ entities: Entity[] }>;
  createAction(data: Record<string, unknown>): Promise<Entity>;
  updateAction(id: string, patch: Record<string, unknown>): Promise<void>;
  toggleAction(id: string): Promise<void>;
  archiveAction(id: string): Promise<void>;
  deleteAction(id: string): Promise<void>;
  reorderActions(ids: string[]): Promise<void>;
  createProject(data: Record<string, unknown>): Promise<Entity>;
  resolveRequest(id: string, decision: string): Promise<void>;
  readEntityMarkdown(id: string): Promise<{ markdown: string }>;
  loadInformationMaterials(): Promise<Array<{ id: string; title: string; originalText: string; url: string; sourceLabel: string; source: string; capturedAt: string; publishedAt?: string; author?: string; archivedAt?: string }>>;
}
type Config = { preferences: Record<string, string>; diaryRoot: string; scratchpad: string };
const priority = { 高: 'high', 中: 'medium', 低: 'low' };
const toPriority = (value?: string): Action['priority'] => value === 'high' ? '高' : value === 'low' ? '低' : '中';
const ref = (path: string) => ({ source: 'vault', label: path.split('/').pop() || path, path });
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Hong_Kong' }).format(new Date());
const noBody = (text: string) => text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trim();

/** Reuse the installed repository. This adapter owns no server and no parallel business database. */
export class VaultBridge implements DashboardHost {
  vaultName: string;
  private repository: Repository;
  private entities = new Map<string, Entity>();
  private diaryDays = new Map<string, DiaryDay>();
  private saveQueue = Promise.resolve();
  get preferences() { return this.config.preferences; }
  constructor(private app: App, private config: Config, private saveSettings: () => Promise<void>) {
    const manager = (app as unknown as { plugins: { getPlugin(id: string): { repository?: Repository } | undefined } }).plugins;
    const repository = manager.getPlugin('jarvis-dashboard')?.repository;
    if (!repository?.refresh) throw new Error('请先启用现有仪表盘插件，v5 会复用它的 Vault 读写能力');
    this.repository = repository; this.vaultName = app.vault.getName();
  }
  async load(): Promise<HostSnapshot> {
    const snapshot = await this.repository.refresh(); this.entities = new Map(snapshot.entities.map((e) => [e.id, e]));
    const actions: Action[] = await Promise.all(snapshot.entities.filter((e) => e.kind === 'action').map(async (e, i) => ({
      id: e.id, title: e.title, body: noBody((await this.repository.readEntityMarkdown(e.id)).markdown), date: e.date, time: e.time,
      priority: toPriority(e.priority), order: e.dashboardOrder ?? i, createdAt: e.createdAt || e.updatedAt || '', path: e.path,
      done: e.status === 'done' ? e.completedAt || e.updatedAt || e.date : undefined, archived: e.archivedAt,
      projectId: snapshot.entities.find((p) => p.kind === 'project' && [p.title, p.path, `[[${p.path}]]`, `[[${p.title}]]`, `[[${p.path.replace(/\.md$/, '')}]]`].includes(e.project || ''))?.id,
      refs: [ref(e.path)], materialIds: [], history: [],
    })));
    const projects: Project[] = snapshot.entities.filter((e) => e.kind === 'project').map((e) => ({
      id: e.id, name: e.title, ownership: '产品项目', status: e.archivedAt ? '已归档' : e.status === 'done' ? '已完成' : e.blocked ? '受阻' : e.status === 'paused' ? '等待用户' : '进行中',
      stage: e.phase || '', purpose: e.result || '', scenario: '', scope: { in: [], out: [] }, doneDef: [], requirements: [], modules: [],
      docs: [{ label: '项目原文', path: e.path, role: '权威' }], follow: { next: e.nextHumanAction || e.nextStep || '', owner: '我', asOf: e.dataAsOf || e.updatedAt || '' },
      eng: { registered: false, note: '当前读取 Vault 项目原文，工程仓库未在此扫描' },
      handoff: { lastReliable: { text: 'Vault 项目原文', at: e.dataAsOf || e.updatedAt || '', ref: ref(e.path) }, unfinished: [], failed: [], resumeWith: [ref(e.path)] },
      workItems: [], refreshes: [], path: e.path, asOf: e.dataAsOf || e.updatedAt || '',
    }));
    const decisions: Decision[] = await Promise.all(snapshot.entities.filter((e) => e.kind === 'request').map(async (e) => {
      const markdown = (await this.repository.readEntityMarkdown(e.id)).markdown;
      const fm = parseYaml(markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] || '') || {};
      const response: DecisionResponse | undefined = e.decision ? {
        kind: fm.dashboard_response_kind || ({ approve: '通过', confirm: '已操作', review: '补充', reject: '需修改', later: '稍后' } as const)[e.decision as 'approve'] || '补充',
        text: fm.decision_note || '', optionId: fm.decision_option, at: e.resolvedAt || e.updatedAt || '',
      } : undefined;
      return {
      id: e.id, kind: e.requestType === 'acceptance' ? '验收' : e.requestType === 'choice' ? '选择' : '操作', title: e.title,
      projectId: projects.find((p) => [p.name, p.path, `[[${p.path}]]`, `[[${p.name}]]`].includes(e.project || ''))?.id,
      raisedBy: 'Vault', path: e.path, asOf: e.dataAsOf || e.updatedAt || '', whyNow: e.context || '', blocks: e.impact || '', done: [], uncertain: [], criteria: [],
      options: e.options?.map((label, i) => ({ id: String(i), label })),
      entry: e.acceptanceEntry ? { label: '验收入口', ...(/^https?:\/\//.test(e.acceptanceEntry) ? { url: e.acceptanceEntry } : { path: e.acceptanceEntry.replace(/^\[\[|\]\]$/g, '') }) } : undefined,
      status: e.status === 'resolved' ? 'resolved' : e.decision === 'later' ? 'later' : 'open', freshness: 'current', response, responses: response ? [response] : [],
      actionIds: actions.filter((a) => a.body?.includes(`[[${e.path}]]`)).map((a) => a.id), refs: [ref(e.path)], history: [],
    }; }));
    const materials = await this.readScratchpad();
    const collected = await this.repository.loadInformationMaterials();
    for (const m of collected) materials.push({ id: m.id, kind: 'collect', sourceId: 'C13', channel: m.sourceLabel, platform: m.source,
      title: m.title, text: m.originalText, author: m.author, receivedAt: m.capturedAt, contentAt: m.publishedAt, archived: m.archivedAt,
      ref: { source: 'C13', label: m.sourceLabel, url: m.url }, ai: { state: 'none' }, outputs: [], projectLinks: [], batchIds: [], history: [],
    });
    await Promise.all([...new Set([today(), ...this.diaryDays.keys()])].map((date) => this.diary(date)));
    const paths = new Set([...snapshot.entities.map((e) => e.path), this.config.scratchpad, ...[...this.diaryDays.values()].flatMap((d) => d.files.map((f) => f.path))]);
    const recentDocs = [...paths].flatMap((path) => { const file = this.app.vault.getAbstractFileByPath(path); return file instanceof TFile ? [{ path, at: new Date(file.stat.mtime).toISOString() }] : []; });
    return { actions, projects, decisions, materials, diary: [...this.diaryDays.values()], library: [], recentDocs };
  }
  async execute(op: string, data: Record<string, unknown>) {
    const id = String(data.id || ''); const entity = this.entities.get(id);
    const path = entity?.path;
    if (op === 'action-new') {
      if (!data.date) throw new Error('现有行动文件需要日期，请先选日期');
      const project = this.entities.get(String(data.projectId || ''));
      const created = await this.repository.createAction({ ...data, project: project ? `[[${project.path}]]` : undefined, priority: priority[data.priority as keyof typeof priority] || 'medium' });
      return { targetId: created.id, path: created.path };
    }
    if (op === 'action-edit') {
      const patch = { ...data.patch as Record<string, unknown> };
      if (patch.priority) patch.priority = priority[patch.priority as keyof typeof priority];
      if ('projectId' in patch) { const project = this.entities.get(String(patch.projectId || '')); patch.project = project ? `[[${project.path}]]` : ''; delete patch.projectId; }
      await this.repository.updateAction(id, patch);
    } else if (op === 'action-toggle') await this.repository.toggleAction(id);
    else if (op === 'action-archive') await this.repository.archiveAction(id);
    else if (op === 'action-unarchive') {
      const file = this.app.vault.getAbstractFileByPath(path!); if (!(file instanceof TFile)) throw new Error('行动文件不存在');
      await this.app.fileManager.processFrontMatter(file, (fm) => { delete fm.archived_at; delete fm.archivedAt; });
    }
    else if (op === 'action-delete') { await this.repository.deleteAction(id); return { targetId: id, path, detail: '已移到 Obsidian 废纸篓，可在废纸篓恢复' }; }
    else if (op === 'action-reorder') await this.repository.reorderActions(data.ids as string[]);
    else if (op === 'project-new') {
      const created = await this.repository.createProject({ title: data.name, result: data.purpose, status: 'active' });
      return { targetId: created.id, path: created.path };
    } else if (op === 'check-action') {
      const existing = [...this.entities.values()].find((e) => e.kind === 'action' && e.source === `[[${path}]]`);
      if (existing) return { targetId: existing.id, path: existing.path, detail: '已有验收行动' };
      const created = await this.repository.createAction({ title: `验收：${entity!.title}`, date: today(), priority: 'medium', source: `[[${path}]]`, body: `验收请求：[[${path}]]\n\n完成行动后，请回到请求给出验收结论。` });
      return { targetId: created.id, path: created.path };
    } else if (op === 'reopen') {
      const file = this.app.vault.getAbstractFileByPath(path!);
      if (!(file instanceof TFile)) throw new Error('请求文件不存在');
      await this.app.fileManager.processFrontMatter(file, (fm) => {
        fm.status = 'pending'; delete fm.decision; delete fm.resolved_at; delete fm.decision_note; delete fm.decision_option; delete fm.dashboard_response_kind;
        fm.updated_at = new Date().toISOString(); fm.updated_by = 'user';
      });
    } else if (op === 'respond') {
      const response = data.response as { kind: string; text: string; optionId?: string };
      const choice = ({ 通过: 'approve', 需修改: 'reject', 选方案: 'confirm', 已操作: 'confirm', 补充: 'review', 稍后: 'later', 不适用: 'reject' } as Record<string, string>)[response.kind];
      await this.repository.resolveRequest(id, choice);
      const file = this.app.vault.getAbstractFileByPath(path!);
      if (file instanceof TFile) await this.app.fileManager.processFrontMatter(file, (fm) => {
        fm.dashboard_response_kind = response.kind; fm.decision_note = response.text;
        if (response.optionId) fm.decision_option = response.optionId; else delete fm.decision_option;
      });
    } else if (op === 'capture') {
      const text = String(data.text); const at = new Date().toISOString(); const key = `scratch-${crypto.randomUUID().slice(0, 12)}`;
      const fence = '`'.repeat(Math.max(3, ...[...text.matchAll(/`+/g)].map((m) => m[0].length + 1)));
      const style = ({ 想法: '灵感', 问题: '问题', 原话: '原话' } as Record<string, string>)[String(data.type)] || '随记';
      const block = `\n<!-- jarvis-scratchpad-entry:v1 id=${key} -->\n### ${at}\n\n- 来源：仪表盘\n- 类型：${style}\n- v5类型：${data.type}\n\n${fence}text\n${text}\n${fence}\n`;
      const file = this.app.vault.getAbstractFileByPath(this.config.scratchpad);
      if (file instanceof TFile) await this.app.vault.process(file, (current) => current.trimEnd() + '\n' + block);
      else { await this.ensureFolder(this.config.scratchpad); await this.app.vault.create(this.config.scratchpad, '# 随手记收件箱\n\n<!-- jarvis-dashboard:scratchpad-inbox:v1 -->\n' + block); }
      return { targetId: key, path: this.config.scratchpad };
    } else if (op === 'diary') {
      const day = await this.diary(String(data.date), false); const target = day.files.find((f) => f.kind === data.kind);
      if (!target) throw new Error('未知日记类型');
      const file = this.app.vault.getAbstractFileByPath(target.path);
      if (file instanceof TFile) {
        await this.app.vault.process(file, () => {
          if (new Date(file.stat.mtime).toISOString() !== data.mtime) throw Object.assign(new Error('日记已在其他位置修改，请重新读取后再保存'), { code: 'conflict' });
          return String(data.text);
        });
      } else {
        if (data.mtime) throw Object.assign(new Error('日记已在其他位置删除，请重新读取'), { code: 'conflict' });
        await this.ensureFolder(target.path); await this.app.vault.create(target.path, String(data.text));
      }
      await this.diary(String(data.date)); return { path: target.path };
    } else throw new Error('这一项尚未接到 Vault，请先打开原文处理');
    return { targetId: id, path };
  }
  async diary(date: string, refresh = true): Promise<DiaryDay> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('日期格式不正确');
    if (!refresh && this.diaryDays.has(date)) return this.diaryDays.get(date)!;
    const dir = `${this.config.diaryRoot}/${date.slice(0, 7)}/${+date.slice(8) <= 15 ? '上半月' : '下半月'}/${date}`;
    const files = await Promise.all((['用户原文', '生活日记整理版', 'AI项目日志'] as const).map(async (kind) => {
      const path = `${dir}/${date}_${kind}.md`; const file = this.app.vault.getAbstractFileByPath(path);
      if (!(file instanceof TFile)) return { kind, path, state: 'missing' as const };
      const text = await this.app.vault.read(file);
      return { kind, path, state: text ? 'exists' as const : 'empty' as const, text, mtime: new Date(file.stat.mtime).toISOString() };
    }));
    const day = { date, files }; this.diaryDays.set(date, day); return day;
  }
  async open(path: string) {
    if (!(this.app.vault.getAbstractFileByPath(path.split('#')[0]) instanceof TFile)) throw new Error('文件尚未创建或已移动，请先保存或刷新');
    await this.app.workspace.openLinkText(path, '', true);
  }
  savePreference(key: string, value: string) {
    this.config.preferences[key] = value;
    const run = this.saveQueue.then(this.saveSettings); this.saveQueue = run.catch(() => {}); return run;
  }
  private async ensureFolder(path: string) {
    const parts = normalizePath(path).split('/'); parts.pop();
    let folder = ''; for (const part of parts) { folder = folder ? `${folder}/${part}` : part; if (!this.app.vault.getAbstractFileByPath(folder)) await this.app.vault.createFolder(folder); }
  }
  private async readScratchpad(): Promise<Material[]> {
    const file = this.app.vault.getAbstractFileByPath(this.config.scratchpad); if (!(file instanceof TFile)) return [];
    const text = await this.app.vault.read(file); const markers = [...text.matchAll(/<!-- jarvis-scratchpad-entry:v1 id=([\w-]+) -->/g)];
    return markers.map((marker, i) => {
      const block = text.slice(marker.index, markers[i + 1]?.index ?? text.length);
      const content = block.match(/^(`{3,})text[^\n]*\n([\s\S]*?)\r?\n\1(?:\r?\n|$)/m)?.[2] || '';
      const at = block.match(/^### (.+)$/m)?.[1].trim() || '';
      const style = block.match(/^- 类型：(.+)$/m)?.[1].trim();
      const originalType = block.match(/^- v5类型：(.+)$/m)?.[1].trim() as Material['captureType'];
      return { id: marker[1], kind: 'capture' as const, captureType: originalType || (style === '灵感' ? '想法' as const : style === '问题' ? '问题' as const : style === '原话' ? '原话' as const : undefined), sourceId: 'C08', channel: '随手记', title: content.trim().split('\n')[0].slice(0, 40), text: content,
        contentAt: at, receivedAt: at, ref: { ...ref(this.config.scratchpad), anchor: `#${at}` }, ai: { state: 'none' as const }, outputs: [], projectLinks: [], batchIds: [], history: [],
      };
    }).filter((m) => m.text).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  }
}
