/**
 * 宿主：把卡片模块装进画板 / 完整页 / 顶栏。
 *  - 懒加载：每张卡的实现是单独的代码块，第一次显示时才加载；
 *  - 出错隔离：每张卡（正文、完整页、顶栏挂件）各包一层 CardBoundary，一张卡崩了只影响它自己，可以「重试」；
 *  - 宿主不知道任何卡片的内部：只通过 protocol.ts 的 CardModule / CardImpl 说话。
 */
import { Component, Suspense, useEffect, useState, type ErrorInfo, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import type { CardImpl, CardModule } from './protocol';
import { mod } from './registry';

const cache = new Map<string, CardImpl>();
const loading = new Map<string, Promise<CardImpl>>();
const failed = new Map<string, unknown>();
function load(m: CardModule) {
  if (!loading.has(m.id)) loading.set(m.id, m.load().then((x) => { cache.set(m.id, x.default); failed.delete(m.id); return x.default; }).catch((e) => { failed.set(m.id, e); loading.delete(m.id); throw e; }));
  return loading.get(m.id)!;
}
/** 拿到某张卡的实现（没加载就去加载）。失败时 error 有值，retry 重新加载 */
export function useImpl(m?: CardModule) {
  const [, tick] = useState(0);
  const impl = m ? cache.get(m.id) : undefined;
  useEffect(() => { if (m && !impl) load(m).then(() => tick((x) => x + 1), () => tick((x) => x + 1)); }, [m, impl]);
  return { impl, error: m ? failed.get(m.id) : undefined, retry: () => { if (m) { failed.delete(m.id); load(m).then(() => tick((x) => x + 1), () => tick((x) => x + 1)); tick((x) => x + 1); } } };
}

interface BP { name: string; children: ReactNode; compact?: boolean; resetKey?: string }
/** 卡片出错隔离：只有这张卡显示错误，其他卡照常 */
export class CardBoundary extends Component<BP, { err?: Error; key?: string }> {
  state: { err?: Error; key?: string } = {};
  static getDerivedStateFromError(err: Error) { return { err }; }
  static getDerivedStateFromProps(p: BP, s: { err?: Error; key?: string }) { return p.resetKey !== s.key ? { err: undefined, key: p.resetKey } : null; }
  componentDidCatch(e: Error, info: ErrorInfo) { console.error(`[卡片 ${this.props.name}]`, e, info.componentStack); }
  render() {
    if (!this.state.err) return this.props.children;
    return <CardError name={this.props.name} msg={this.state.err.message} compact={this.props.compact} onRetry={() => this.setState({ err: undefined })} />;
  }
}
export function CardError({ name, msg, compact, onRetry }: { name: string; msg?: string; compact?: boolean; onRetry: () => void }) {
  return (
    <div className={`card-error ${compact ? 'compact' : ''}`} role="alert" data-nodrag>
      <AlertTriangle size={15} />
      <div><div>「{name}」出错了，其他卡片不受影响</div>{msg && <div className="small faint mono ellipsis" title={msg}>{msg}</div>}</div>
      <button className="btn xs" onClick={onRetry}><RotateCcw size={12} />重试</button>
    </div>
  );
}
const Loading = ({ page }: { page?: boolean }) => <div className={page ? 'page' : ''}><div className="skel" /><div className="skel short" /></div>;

/** 在实现加载好之后渲染 impl 里的某个可选部件（Meta / Title / Crumb …） */
export function Slot({ m, pick, fallback = null, ...rest }: { m: CardModule; pick: (i: CardImpl) => React.ComponentType<any> | undefined; fallback?: ReactNode; [k: string]: unknown }) { // eslint-disable-line
  const { impl } = useImpl(m);
  const C = impl && pick(impl);
  if (!C) return <>{fallback}</>;
  return <CardBoundary name={m.name} compact resetKey={m.id}><Suspense fallback={fallback}><C {...rest} /></Suspense></CardBoundary>;
}

/** 卡片正文（画板上） */
export function CardBody({ m, children }: { m: CardModule; children: (impl: CardImpl) => ReactNode }) {
  const { impl, error, retry } = useImpl(m);
  if (error) return <CardError name={m.name} msg="这张卡的代码没加载成功" onRetry={retry} compact />;
  if (!impl) return <Loading />;
  return <CardBoundary name={m.name}><Suspense fallback={<Loading />}>{children(impl)}</Suspense></CardBoundary>;
}

/** /c/:cardId/* —— 卡片自己的完整页 */
export function CardPage() {
  const { cardId } = useParams();
  const m = mod(cardId);
  const { impl, error, retry } = useImpl(m);
  if (!m) return <div className="page"><div className="empty"><h3>没有这张卡片：{cardId}</h3><p className="muted small">可能已经被删掉或改了名字。<Link className="link" to="/cards">看全部卡片</Link></p></div></div>;
  if (error) return <div className="page"><CardError name={m.name} msg="这张卡的代码没加载成功" onRetry={retry} /></div>;
  if (!impl) return <Loading page />;
  if (!impl.Page) return <div className="page"><div className="empty"><h3>「{m.name}」没有完整页</h3><p className="muted small">它只在画板上显示。</p></div></div>;
  return <CardBoundary name={m.name} resetKey={m.id}><Suspense fallback={<Loading page />}><impl.Page /></Suspense></CardBoundary>;
}
