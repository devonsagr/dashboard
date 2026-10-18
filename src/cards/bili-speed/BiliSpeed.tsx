import { Link } from 'react-router-dom';
import { KV, PageHeader, Section, Tag } from '../../ui/ui';

/**
 * B站倍速（R31）：本轮不迁移。原工具（浏览器扩展 + 本地桥）继续在原入口使用。
 * 这里只放一张「未接入」说明卡，避免在仪表盘里做一个假的倍速控制。
 */
export function BiliCard() {
  return (
    <div className="stack" style={{ gap: 6 }}>
      <Tag tone="faint">本轮不迁移</Tag>
      <div className="small muted">倍速控制仍用原来的浏览器扩展。这张卡只是入口说明，不能在这里控制播放。</div>
      <Link className="link small" to="/c/bili-speed">为什么 · 原入口在哪</Link>
    </div>
  );
}

export default function BiliPage() {
  return (
    <div className="page">
      <PageHeader title="B站倍速" sub="本轮不迁移到新仪表盘，保留原工具入口。" actions={<Tag tone="faint">未接入</Tag>} />
      <Section title="现状">
        <KV rows={[['原工具', '浏览器扩展 + 本地桥（C16）'], ['提供', '当前 B站页面、倍速预设与映射'], ['不是', '观看历史'], ['新仪表盘', '不显示状态、不发控制命令']]} />
      </Section>
      <Section title="为什么不迁">
        <div className="prose" style={{ padding: '0 8px 10px' }}>
          <p>倍速控制要在 B站页面里实时生效，依赖扩展注入；放进仪表盘只能做一个远程开关，反而多一层故障点。</p>
          <p>以后如果需要，在 <span className="mono">src/features/runtime/bili-speed/</span> 里把卡片状态改成「样例 / 已接入」，接扩展的状态读取即可；卡片位置和画板不用动。</p>
        </div>
      </Section>
    </div>
  );
}
