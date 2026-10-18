import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Languages, RotateCw, Sparkles } from 'lucide-react';
import { History, Tag } from '../../../ui/ui';
import { full } from '../../../data/time';
import { REC_NAME, type FavItem } from '../model';
import { S, TOPICS, activeTask, markRead, recsOf, retryBody, retryTranslate, setTopic, startAiSummary } from '../store';
import { PF } from '../platforms';
import { Annotate } from './Annotate';
import { DemoPath, Facts, Plat, SampleBadge, Times } from './common';
import { Gallery, Inline, Thumb, Viewer } from './media';
import { Player, usePlayer } from './Player';
import { Subtitles } from './Subtitles';

/** 阅读详情（S6）：原文 / 摘要 / 译文 / 批注边界分明 */
export function Reader({ it, onDone }: { it: FavItem; onDone: (why: string) => void }) {
  const bilingual = S.use((d) => d.bilingual);
  const ai = S.use((d) => d.demo.ai);
  const p = usePlayer(it);
  const [trk, setTrk] = useState(0);
  const [rv, setRv] = useState<{ imgs: NonNullable<FavItem['replies']>['items'][number]['imgs']; i: number } | null>(null);
  const canTr = it.body.blocks.some((b) => b.t === 'p' && b.trState) || it.replies?.items.some((r) => r.trState) || it.tracks?.some((t) => t.cues.some((c) => c.tr));
  const trFailed = it.body.blocks.some((b) => b.t === 'p' && b.trState === 'failed') || it.replies?.items.some((r) => r.trState === 'failed');
  const task = activeTask(it.id);
  const recs = recsOf(it.id);
  const tracks = it.tracks ?? [];
  const tr = tracks[Math.min(trk, tracks.length - 1)];
  return (
    <article className="fav-reader">
      <header className="fav-r-head">
        <div className="row wrap small"><Plat p={it.platform} /><Tag tone={it.nature === '收藏' ? 'neutral' : 'info'}>{it.nature}</Tag>{it.folders?.length ? <span className="muted">出处：{it.folders.map((f) => `「${f}」`).join('')}</span> : null}<SampleBadge /></div>
        <h2 className="fav-title">{it.title}</h2>
        <div className="row wrap small muted">{it.author ?? '作者未知'} · <a className="link" href={it.url} target="_blank" rel="noreferrer">{it.url.replace(/^https?:\/\//, '')}<ExternalLink size={11} /></a></div>
        <Times it={it} />
        <div className="row wrap"><Facts it={it} /></div>
        <div className="row wrap small">
          <label className="muted">主题 <select className="input fav-sel" value={it.topic} onChange={(e) => setTopic(it.id, e.target.value)}>{TOPICS.map((t) => <option key={t}>{t}</option>)}</select></label>
          <span className="faint">自动粗分，可手动改；主题不等于理解</span>
          <span style={{ flex: 1 }} />
          <button className="btn sm btn-ghost" onClick={() => markRead(it.id, !it.read)}>{it.read ? '取消已读' : '标为已读'}</button>
          {canTr && <button className={`btn sm ${bilingual ? 'btn-primary' : ''}`} onClick={() => { S.d.bilingual = !bilingual; S.emit(); }} aria-pressed={bilingual}><Languages size={13} />双语</button>}
        </div>
        {bilingual && trFailed && <div className="fav-note-line warn">有段落 / 回复的译文失败；原文照常显示 <button className="btn sm" onClick={() => retryTranslate(it.id)}><RotateCw size={12} />重试译文</button></div>}
        {task && <div className="fav-note-line">正在进行：{task.label} · {task.stage} <Link className="link" to="/c/favorites/tasks">看任务</Link></div>}
      </header>

      {/* 摘要：本机原句 + 可选 AI 优化。两者都不进入批注、预览或整理依据 */}
      <section className="fav-sum">
        <div className="fav-sum-head"><b>本机摘要 · 原文选句</b>{it.summaryPartial && <Tag tone="warn">基于部分文字</Tag>}<span className="small faint">快速判断值不值得看；不是原文，也不进入你的批注</span></div>
        {it.summary?.length ? <ul>{it.summary.map((s, i) => <li key={i}>「{s}」</li>)}</ul> : <div className="small muted">尚无可用文字，不生成摘要。</div>}
        <div className="fav-ai">
          {(!it.ai || it.ai.state === 'none') && <button className="btn sm" disabled={!it.summary?.length} onClick={() => startAiSummary(it.id)}><Sparkles size={12} />AI 优化</button>}
          {it.ai?.state === 'running' && <span className="small muted">AI 正在概括已取得文字…（可以继续读，结果单独更新）</span>}
          {it.ai?.state === 'ok' && <div className="fav-ai-box"><span className="ai-tag">AI 概括</span> {it.ai.text}{it.ai.basisVersion !== it.version && <Tag tone="warn">原文已更新：这份概括不是针对最新文字</Tag>}<button className="btn sm btn-ghost" onClick={() => startAiSummary(it.id)}>重新概括</button></div>}
          {(it.ai?.state === 'failed' || it.ai?.state === 'unconfigured') && <div className="fav-note-line warn">{it.ai.error}{it.ai.state === 'failed' && <button className="btn sm" onClick={() => startAiSummary(it.id)}><RotateCw size={12} />重试</button>}</div>}
          {ai !== 'ok' && <span className="small faint">（样例：AI 设为「{ai === 'failed' ? '会失败' : '未配置'}」，可在设置里切换）</span>}
        </div>
      </section>

      {it.video && <Player it={it} p={p} />}
      {tracks.length > 1 && <div className="seg" role="tablist">{tracks.map((t, i) => <button key={t.id} className={i === trk ? 'on' : ''} onClick={() => setTrk(i)}><span>{t.kind}</span></button>)}</div>}
      {tr && <Subtitles key={tr.id} it={it} tr={tr} p={p} bilingual={bilingual} />}
      {it.video && !tracks.length && <div className="fav-note-line">{PF[it.platform].video ? '暂无字幕：还没有尝试取得视频文字（不等于没有语音）' : '视频原链接，未取得视频文字'}</div>}

      <section className="fav-body prose">
        {it.body.intro && <p className="fav-intro"><span className="small faint">简介（不是正文）</span><br />{it.body.intro}</p>}
        {it.body.state === '部分' && <div className="fav-note-line warn">部分正文：只取得了下面这些段落</div>}
        {(it.body.state === '仅元信息' || it.body.state === '未取得') && (
          <div className="fav-note-line warn">
            {it.body.state === '未取得' ? (task ? '正文正在取得…' : '正文未取得') : '正文未取得：只有标题和简介'}
            {!task && <button className="btn sm" onClick={() => retryBody(it.id)}><RotateCw size={12} />重试取得</button>}
            <Link className="btn sm btn-ghost" to={`/c/favorites/import?tab=manual&item=${it.id}`}>人工补充</Link>
          </div>
        )}
        {it.body.blocks.map((b, i) => b.t === 'p' ? <p key={i}>{b.text}{bilingual && b.trState && (b.trState === 'ok' ? <span className="fav-tr">{b.tr}</span> : <span className="fav-tr bad">译文失败</span>)}</p>
          : b.t === 'img' ? <Inline key={b.img.id} img={b.img} itemId={it.id} /> : <Gallery key={i} imgs={b.imgs} style={b.style} itemId={it.id} />)}
      </section>

      {it.replies && (
        <section className="fav-replies">
          <div className="fav-sum-head"><b>回复</b><span className="small muted">{it.replies.scope}</span></div>
          {it.replies.items.map((r) => (
            <div key={r.id} className="fav-reply">
              <div className="small"><b>{r.who}</b>{r.quote && <span className="faint"> 回复 {r.quote}</span>}</div>
              <div>{r.text}</div>
              {bilingual && (r.trState === 'ok' ? <div className="fav-tr">{r.tr}</div> : r.trState === 'failed' ? <div className="fav-tr bad">译文失败</div> : /^[\p{Emoji}\s]+$/u.test(r.text) ? <div className="fav-tr faint">（表情，不翻译）</div> : null)}
              {r.imgs && <div className="fav-reply-imgs">{r.imgs.map((im, k) => <Thumb key={im.id} img={im} itemId={it.id} onOpen={() => setRv({ imgs: r.imgs, i: r.imgs!.slice(0, k).filter((x) => !x.missing).length })} />)}</div>}
            </div>
          ))}
        </section>
      )}
      {rv?.imgs && <Viewer imgs={rv.imgs} index={rv.i} onClose={() => setRv(null)} />}

      {recs.length > 0 && (
        <section className="fav-recs">
          <div className="fav-sum-head"><b>同源的分流记录</b><span className="small faint">各自独立：批注、加工、位置互不影响</span></div>
          {recs.map((r) => <Link key={r.id} to={`/c/favorites/r/${r.id}`} className="fav-rec-link"><Tag tone="accent">{REC_NAME[r.kind]}</Tag><span className="ellipsis">{r.note}</span>{r.trashed ? <Tag tone="faint">已回收</Tag> : <Tag>{r.status}</Tag>}</Link>)}
        </section>
      )}

      <details className="fav-src">
        <summary className="small muted">来源与历史</summary>
        <dl className="fav-dl">
          <dt>平台</dt><dd>{PF[it.platform].name}{PF[it.platform].compat && '（宿主兼容入口，未按本卡标准验证）'}</dd>
          <dt>来源性质</dt><dd>{it.nature}{it.manual && ` · 人工补充（${it.manual.kind}，你声明的来源：${it.manual.declared}，${full(it.manual.at)}）`}</dd>
          <dt>原链接</dt><dd className="fav-wrap">{it.url}（演示地址）</dd>
          <dt>版本</dt><dd>{it.versions.map((v) => <div key={v.v}>v{v.v} · {full(v.at)} · {v.note}</div>)}</dd>
          <dt>原始存档</dt><dd><DemoPath path={`${S.d.locations.raw.replace('<平台>', PF[it.platform].name)}${it.title}.md`} /></dd>
          {it.shared && <><dt>宿主</dt><dd>这条也出现在收件里（同一来源，不是副本）</dd></>}
        </dl>
        <History items={[...it.history].reverse()} />
      </details>

      <Annotate it={it} onDone={onDone} />
    </article>
  );
}
