import { ItemView, Notice, Plugin, WorkspaceLeaf } from 'obsidian';
import { VaultBridge } from './vault';

const VIEW = 'dashboard-v5';
interface Settings { preferences: Record<string, string>; diaryRoot: string; scratchpad: string }

export default class DashboardPlugin extends Plugin {
  declare settings: Settings;
  async onload() {
    this.settings = { preferences: {}, diaryRoot: '日记', scratchpad: '系统/随手记/随手记收件箱.md', ...await this.loadData() };
    this.registerView(VIEW, (leaf) => new DashboardView(leaf, this));
    this.addCommand({ id: 'open', name: '打开 v5 仪表盘', callback: () => this.open() });
    this.addRibbonIcon('layout-dashboard', '打开 v5 仪表盘', () => this.open());
  }
  async open() {
    const leaf = this.app.workspace.getLeavesOfType(VIEW)[0] || this.app.workspace.getLeaf('tab');
    await leaf.setViewState({ type: VIEW, active: true }); await this.app.workspace.revealLeaf(leaf);
  }
}

class DashboardView extends ItemView {
  constructor(leaf: WorkspaceLeaf, private plugin: DashboardPlugin) { super(leaf); }
  getViewType() { return VIEW; }
  getDisplayText() { return '仪表盘 v5'; }
  getIcon() { return 'layout-dashboard'; }
  async onOpen() {
    const container = this.contentEl; container.empty(); container.style.padding = '0'; container.style.overflow = 'hidden';
    try {
      const bridge = new VaultBridge(this.app, this.plugin.settings, () => this.plugin.saveData(this.plugin.settings));
      const dir = this.plugin.manifest.dir!;
      const [js, css] = await Promise.all([this.app.vault.adapter.read(`${dir}/ui.js`), this.app.vault.adapter.read(`${dir}/ui.css`)]);
      const frame = container.createEl('iframe'); frame.style.cssText = 'width:100%;height:100%;border:0;display:block';
      frame.title = '仪表盘 v5';
      frame.onload = () => {
        const win = frame.contentWindow!; const doc = frame.contentDocument!;
        (win as unknown as { dashboardHost: VaultBridge }).dashboardHost = bridge;
        const style = doc.createElement('style'); style.textContent = css; doc.head.append(style);
        const syncTheme = () => {
          const theme = getComputedStyle(container);
          for (const key of ['background-primary', 'background-secondary', 'background-modifier-hover', 'background-modifier-border', 'background-modifier-border-hover', 'text-normal', 'text-muted', 'text-faint', 'font-interface', 'interactive-accent', 'interactive-accent-hover']) {
            doc.documentElement.style.setProperty(`--${key}`, theme.getPropertyValue(`--${key}`));
          }
        };
        syncTheme(); this.registerEvent(this.app.workspace.on('css-change', syncTheme));
        const script = doc.createElement('script'); script.textContent = js; doc.body.append(script);
      };
      frame.srcdoc = '<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div></body></html>';
    } catch (error) { container.setText(`无法打开 v5：${error instanceof Error ? error.message : error}`); new Notice('v5 未连接，请确认原仪表盘插件已启用'); }
  }
  async onClose() { this.contentEl.empty(); }
}
