import { PageHeader, Seg, Tag } from '../../../ui/ui';
import { S, resetFav, setDemo } from '../store';
import { DemoPath, SampleBadge } from './common';
import type { FavData } from '../model';

const LOC: [keyof FavData['locations'], string][] = [['raw', '原始存档'], ['ref', '入库资料'], ['digest', '自己处理材料'], ['topic', '主题材料'], ['attach', '附件（跟着每条材料）'], ['trash', '回收站'], ['knowledge', '我的知识稿']];
/** 位置与设置（S12）：拟用位置和已确认位置分开；改设置只影响以后的预览 */
export function SettingsPage() {
  const d = S.use((x) => x);
  return (
    <div className="page fav">
      <PageHeader title={<>位置与设置 <SampleBadge /></>} sub="下面的路径都是演示（建议，待确认），不是真实文件。改位置只影响以后的预览，不会把旧材料搬家。" />
      <section className="fav-box">
        <div className="fav-sum-head"><b>保存位置</b><Tag tone="faint">拟用 · 未确认</Tag></div>
        {LOC.map(([k, l]) => <label key={k} className="fav-set"><span>{l}</span><input className="input" value={d.locations[k]} onChange={(e) => { S.d.locations[k] = e.target.value; S.emit(); }} /></label>)}
        <div className="small muted">已确认的位置以每份记录的回执为准，例如 <DemoPath path="系统/收藏/资料/示例·整理桌面资料的四个步骤.md" />。每条材料是一份正文 + 属于它的附件。</div>
      </section>
      <section className="fav-box">
        <div className="fav-sum-head"><b>样例切换</b><span className="small faint">只改样例，不连接任何真实能力</span></div>
        <div className="fav-set"><span>任务状态</span><Seg id="fav-feed" items={[{ key: 'live', label: '正常' }, { key: 'unknown', label: '首次未知' }, { key: 'offline', label: '断线（保留截至）' }]} value={d.demo.feed} onChange={(k) => setDemo({ feed: k })} /></div>
        <div className="fav-set"><span>AI（摘要优化 / 按批注整理）</span><Seg id="fav-ai" items={[{ key: 'ok', label: '成功' }, { key: 'failed', label: '失败' }, { key: 'unconfigured', label: '未配置' }]} value={d.demo.ai} onChange={(k) => setDemo({ ai: k })} /></div>
        <div className="small muted">写入成功 / 失败 / 结果未知 / 冲突：用顶栏的全局「模拟」开关（和其他卡共用）。</div>
        <button className="btn sm" onClick={resetFav}>重置收藏样例</button>
      </section>
      <section className="fav-box">
        <div className="fav-sum-head"><b>运行选项</b><Tag tone="faint">未接入</Tag></div>
        <div className="small muted">平台登录、浏览器方式、转写模型、翻译、AI 模型的真实配置等后端接入后再填。这里不需要填任何账号或密钥。</div>
      </section>
    </div>
  );
}
