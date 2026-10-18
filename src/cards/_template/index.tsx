import { defineImpl, type CardProps } from '../../workbench/cards/protocol';
import { useData } from '../../data';
import { PageHeader } from '../../ui/ui';
import { useWrite, WriteNote } from '../../ui/write';
import { S, click } from './store';

function MyCard({ inst }: CardProps) {
  const n = useData((db) => db.actions.length);   // 读共享对象
  const c = S.use((d) => d.clicks);                // 读自己的数据
  const w = useWrite();
  return (
    <div className="small stack" data-nodrag>
      <div>共有 {n} 条行动 · 标题：{inst.props.title}</div>
      <button className="btn xs" onClick={() => w.run(click)}>点一下（{c}）</button>
      <WriteNote w={w} compact />
    </div>
  );
}
function MyPage() { return <div className="page"><PageHeader title="我的卡片" sub="这张卡自己的完整页" /></div>; }
export default defineImpl({ Card: MyCard, Page: MyPage });
