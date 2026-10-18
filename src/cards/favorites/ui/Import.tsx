import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { full } from '../../../data/time';
import { PageHeader, Tag } from '../../../ui/ui';
import { useWrite, WriteNote } from '../../../ui/write';
import type { Account, Platform } from '../model';
import { S, DEMO_FILES, addLink, addManual, canStart, importFile, item, parseCues, recollect, retryBody, startImport } from '../store';
import { PF, PLATFORMS } from '../platforms';
import { SampleBadge } from './common';

const ACCTS: Account[] = ['未登录', '已保存未核验', '已登录', '已过期', '需本人验证', '无法连接', '未接入'];
const TABS = [['fav', '导入收藏'], ['link', '粘贴链接'], ['manual', '人工补充'], ['file', '导入文件']] as const;

/** 导入（S3 / S4）：收藏导入与非收藏链接分开；人工补充不冒充自动取得 */
export function ImportPage() {
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') ?? 'fav';
  return (
    <div className="page fav">
      <PageHeader title={<>导入 <SampleBadge /></>} sub="开始后可以关掉这页、去别的平台或画板；进度在顶栏「收藏任务」里。前端阶段不会操作任何真实账号或文件。" />
      <div className="seg fav-tabs" role="tablist">{TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setSp({ tab: k }, { replace: true })}><span>{l}</span></button>)}</div>
      {tab === 'fav' && <FavImport />}{tab === 'link' && <LinkForm />}{tab === 'manual' && <Manual />}{tab === 'file' && <FileImport />}
    </div>
  );
}

function FavImport() {
  const { platform } = useParams(); const nav = useNavigate();
  const p = (PLATFORMS.find((x) => x.id === platform && x.id !== 'web')?.id ?? 'bili') as Platform;
  const d = S.use((x) => x);
  const info = PF[p]; const acct = d.accounts[p]; const last = d.lastRun[p];
  const [folders, setFolders] = useState<string[]>([]);
  const [tag, setTag] = useState(false);
  const [mode, setMode] = useState<'最新核对' | '续读'>('最新核对');
  const [fill, setFill] = useState(false);
  const [runId, setRunId] = useState('');
  const scope = p === 'bili' ? folders : [info.scope];
  const why = canStart(p, folders, tag);
  const run = d.imports.find((r) => r.id === runId);
  const setAcct = (a: Account) => { S.d.accounts[p] = a; S.emit(); };
  return (
    <>
      <div className="pill-row fav-plats">{PLATFORMS.filter((x) => x.id !== 'web').map((x) => <button key={x.id} className={`pill ${x.id === p ? 'on' : ''}`} onClick={() => { nav(`/c/favorites/import/${x.id}`); setRunId(''); setFolders([]); }}>{x.name}{x.compat && '（兼容）'}<span className="count">{d.accounts[x.id]}</span></button>)}</div>
      <div className="fav-grid2">
        <section className="fav-box">
          <div className="fav-sum-head"><b>{info.name}</b>{info.compat && <Tag tone="faint">宿主已有来源的兼容入口 · 未按本卡标准验证</Tag>}</div>
          <dl className="fav-dl"><dt>范围</dt><dd>{info.scope}</dd><dt>能取得</dt><dd>{info.can}</dd><dt>限制</dt><dd>{info.limits.map((l) => <div key={l}>· {l}</div>)}</dd><dt>方式</dt><dd>{info.methods.join(' / ')}（沿用常用 Chrome 是可选的，不要求装扩展）</dd></dl>
        </section>
        <section className="fav-box">
          <div className="fav-sum-head"><b>账号</b><Tag tone={acct === '已登录' ? 'ok' : acct === '已保存未核验' ? 'info' : acct === '未接入' ? 'faint' : 'warn'}>{acct}</Tag></div>
          <div className="small muted">
            {acct === '未登录' && '还没登录。登录后会保存状态，下次复用。'}
            {acct === '已保存未核验' && '有保存的登录状态，但还没核验权限——这不等于能读取收藏。'}
            {acct === '已登录' && '已核验，可以开始。'}
            {acct === '已过期' && '登录已过期，需要重新登录。'}
            {acct === '需本人验证' && '平台要求你本人在原站完成验证。关掉窗口不等于验证完成，这里也不会替你点「已完成」。'}
            {acct === '无法连接' && '现在连不上平台。已选的范围会保留。'}
            {acct === '未接入' && '这个平台还没接入：可以看能力和限制，不能开始。'}
          </div>
          <div className="row wrap">
            {(acct === '未登录' || acct === '已过期') && <button className="btn sm" onClick={() => setAcct('已保存未核验')}>登录（演示：不会操作账号）</button>}
            {acct === '已保存未核验' && <button className="btn sm" onClick={() => setAcct('已登录')}>重新核验</button>}
            {acct === '需本人验证' && <><a className="btn sm" href="https://example.com/demo/verify" target="_blank" rel="noreferrer">去原站验证（演示地址）</a><button className="btn sm btn-ghost" onClick={() => setAcct('已保存未核验')}>我已在原站完成验证</button></>}
          </div>
          <label className="small faint">样例切换：<select className="input fav-sel" value={acct} onChange={(e) => setAcct(e.target.value as Account)}>{ACCTS.map((a) => <option key={a}>{a}</option>)}</select></label>
        </section>
      </div>
      <section className="fav-box">
        <div className="fav-sum-head"><b>本次范围</b></div>
        {p === 'bili' ? (
          <div className="fav-folders">
            <div className="small muted">平台返回的自建收藏夹（合成名称）。先选再开始；他人订阅的夹默认不算。</div>
            {d.folders.map((f) => <label key={f.id} className="check-row"><input type="checkbox" checked={folders.includes(f.name)} onChange={() => setFolders(folders.includes(f.name) ? folders.filter((x) => x !== f.name) : [...folders, f.name])} />{f.name}<span className="faint small">{f.count} 条（上次看到）</span></label>)}
          </div>
        ) : <div className="small">{info.scope}{p === 'douyin' && <label className="check-row"><input type="checkbox" checked={tag} onChange={() => setTag(!tag)} />确认收藏标签是「示例」</label>}</div>}
        <div className="fav-modes">
          <label className="check-row"><input type="radio" checked={mode === '最新核对'} onChange={() => setMode('最新核对')} /><b>从最新收藏核对</b><span className="small muted">从顶部开始，看有没有新增；不删除平台上已取消的本地内容</span></label>
          <label className="check-row"><input type="radio" checked={mode === '续读'} disabled={!last?.stopAt} onChange={() => setMode('续读')} /><b>继续上次未完成的范围</b><span className="small muted">{last?.stopAt ? `上次 ${full(last.at)} 停在 ${last.stopAt}（范围：${last.scope.join('、')}）；不会检查这之后的新收藏` : '没有未完成的范围'}</span></label>
          <label className="check-row"><input type="checkbox" checked={fill} onChange={() => setFill(!fill)} />同时补齐本次清单里仍未完成的旧材料<span className="small muted">（完整的和已删除的跳过；不会自动恢复历史暂停队列）</span></label>
        </div>
        <div className="row"><button className="btn btn-primary sm" disabled={!!why} onClick={() => setRunId(startImport(p, scope, mode, fill))}>开始</button>{why && <span className="small tone-warn-text">{why}</span>}</div>
        {run && (
          <div className="fav-run">
            {!run.rows.length ? <div className="small">已接受任务：{mode}进行中…可以离开这页，进度在顶栏。</div> : <>
              <div className="row wrap"><b>本次结果</b>{(['新增', '重复', '跳过', '待补', '失败'] as const).map((k) => <Tag key={k} tone={k === '失败' ? 'bad' : k === '新增' ? 'ok' : 'neutral'}>{k} {run.rows.filter((r) => r.result === k).length}</Tag>)}</div>
              <div className={`fav-note-line ${run.reachedEnd ? '' : 'warn'}`}>{run.note}</div>
              <table className="fav-table"><tbody>{run.rows.map((r, i) => <tr key={i}><td>{r.itemId ? <Link className="link" to={`/c/favorites/i/${r.itemId}`}>{r.title}</Link> : r.title}</td><td><Tag tone={r.result === '失败' ? 'bad' : 'neutral'}>{r.result}</Tag></td><td className="small muted">{r.why}{r.recollect && <button className="btn sm" onClick={() => { const u = S.d.purged.find((x) => x.title === r.title)?.url; if (u) { const id = recollect(u); if (id) nav(`/c/favorites/i/${id}`); } }}>重新收集</button>}</td></tr>)}</tbody></table>
            </>}
          </div>
        )}
      </section>
    </>
  );
}

function LinkForm() {
  const nav = useNavigate();
  const [url, setUrl] = useState('https://example.com/demo/s/desk'); const [title, setTitle] = useState(''); const [type, setType] = useState('文章'); const [fav, setFav] = useState(false);
  const [res, setRes] = useState<ReturnType<typeof addLink> | null>(null);
  const [msg, setMsg] = useState('');
  return (
    <section className="fav-box fav-form">
      <div className="small muted">你主动提供的链接默认是「非收藏链接」；只有你明确声明，才标为收藏。平台相同不代表是你的收藏。</div>
      <label>原始链接<input className="input" value={url} onChange={(e) => { setUrl(e.target.value); setRes(null); }} /></label>
      <label>标题（可选）<input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <label>类型<select className="input fav-sel" value={type} onChange={(e) => setType(e.target.value)}><option>文章</option><option>帖子</option><option>视频</option></select></label>
      <label className="check-row"><input type="checkbox" checked={fav} onChange={() => setFav(!fav)} />这是我的收藏</label>
      <div className="row"><button className="btn btn-primary sm" disabled={!/^https?:\/\//.test(url)} onClick={() => { setRes(addLink(url, title, type, fav)); setMsg(''); }}>开始</button><span className="small faint">试试：https://example.com/demo/s/desk 是已有文章的短链</span></div>
      {res?.existing && <div className="fav-note-line">这个来源已经有了：「{item(res.existing)?.title}」，没有新建副本。<button className="btn sm" onClick={() => nav(`/c/favorites/i/${res.existing}`)}>打开已有</button>{res.retry && <button className="btn sm" onClick={() => setMsg(retryBody(res.existing!) ? '已排队重试已有材料' : '已有任务在跑，没有重复创建')}>重试取得</button>}{!res.retry && <span className="small muted">已完整；如需更新请在材料里重试</span>}</div>}
      {res?.created && <div className="fav-note-line">已接受：正在取得内容（排队不等于已取得）。<button className="btn sm" onClick={() => nav(`/c/favorites/i/${res.created}`)}>打开</button></div>}
      {msg && <div className="small muted">{msg}</div>}
    </section>
  );
}

function Manual() {
  const [sp] = useSearchParams();
  const items = S.use((d) => d.items.filter((i) => !i.trashed && !i.id.startsWith('fb')));
  const [id, setId] = useState(sp.get('item') ?? 'f05'); const [declared, setDeclared] = useState(''); const [kind, setKind] = useState<'正文' | '字幕'>('正文'); const [text, setText] = useState('');
  const w = useWrite();
  const bad = kind === '字幕' && text.trim() && !parseCues(text);
  return (
    <section className="fav-box fav-form">
      <div className="small muted">平台受限时，可以贴你实际看到的正文，或带时间轴的字幕。会标「人工补充」和你声明的来源，保留原版本；不会假称自动取得。</div>
      <label>补充到<select className="input" value={id} onChange={(e) => setId(e.target.value)}>{items.map((i) => <option key={i.id} value={i.id}>{i.title}（正文{i.body.state}）</option>)}</select></label>
      <label>你声明的来源<input className="input" placeholder="例如：我在原站看到的正文" value={declared} onChange={(e) => setDeclared(e.target.value)} /></label>
      <div className="seg">{(['正文', '字幕'] as const).map((k) => <button key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}><span>{k}</span></button>)}</div>
      <textarea className="input fav-ta" rows={6} placeholder={kind === '字幕' ? '00:00-00:08 第一句\n00:08-00:17 第二句' : '贴上你看到的正文'} value={text} onChange={(e) => setText(e.target.value)} />
      {bad && <div className="fav-note-line warn">有的行没有时间轴：不能当作字幕。可以改成「正文」保存。</div>}
      <div className="row"><button className="btn btn-primary sm" disabled={!text.trim() || !!bad || w.busy} onClick={async () => { const r = await w.run(() => addManual(id, text, declared, kind)); if (r.status === 'ok') setText(''); }}>保存补充</button><Link className="link small" to={`/c/favorites/i/${id}`}>打开这条</Link></div>
      <WriteNote w={w} />
    </section>
  );
}

function FileImport() {
  const [name, setName] = useState<string>(DEMO_FILES[0].name);
  const [res, setRes] = useState<ReturnType<typeof importFile> | null>(null);
  return (
    <section className="fav-box fav-form">
      <div className="small muted">TXT / JSON 清单作为辅助方式（默认非收藏）。前端阶段只用合成文件演示，不读写本机任何位置。</div>
      <div className="pill-row">{DEMO_FILES.map((f) => <button key={f.name} className={`pill ${name === f.name ? 'on' : ''}`} onClick={() => { setName(f.name); setRes(null); }}>{f.name}</button>)}</div>
      <div className="small">已选文件：<b>{name}</b>（合成）</div>
      <div className="row"><button className="btn btn-primary sm" onClick={() => setRes(importFile(name))}>导入</button></div>
      {res?.error && <div className="fav-note-line warn">{res.error}</div>}
      {res && !res.error && <>
        <div className="row wrap"><Tag tone="ok">有效 {res.rows.filter((r) => !r.result.startsWith('无效')).length}</Tag><Tag tone="bad">无效 {res.rows.filter((r) => r.result.startsWith('无效')).length}</Tag><Tag>重复 {res.rows.filter((r) => r.result.startsWith('重复')).length}</Tag></div>
        <table className="fav-table"><tbody>{res.rows.map((r, i) => <tr key={i}><td className="fav-wrap">{r.url || '（空行）'}</td><td>{r.itemId ? <Link className="link" to={`/c/favorites/i/${r.itemId}`}>{r.result}</Link> : r.result}</td></tr>)}</tbody></table>
      </>}
    </section>
  );
}
