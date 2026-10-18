import { defineImpl } from '../../workbench/cards/protocol';
import { useData } from '../../data';
import { MaterialRow } from '../../ui/objects';
import { Empty, PageHeader, SampleMark, Section } from '../../ui/ui';
import { QuickNote } from './QuickNote';

/** 完整页：写一条 + 全部随手记（点开是材料详情，归「收件」卡） */
function CapturesPage() {
  const list = useData((db) => db.materials.filter((m) => m.kind === 'capture'));
  return (
    <div className="page">
      <PageHeader title="随手记" sub={<>原话保存在 系统/随手记/随手记收件箱.md。存进去的每一条也是收件里的一条材料，读、消化、转行动都在那边做。<SampleMark /></>} />
      <div className="card" style={{ padding: 12, marginBottom: 16 }}><QuickNote inst={{ id: 'page', kind: 'quick-note', x: 0, y: 0, w: 6, h: 4, props: {} }} view="" edit={false} setProps={() => undefined} /></div>
      <Section title="全部随手记" count={list.length}>{list.length ? list.map((m) => <MaterialRow key={m.id} m={m} />) : <Empty title="还没有随手记" />}</Section>
    </div>
  );
}
export default defineImpl({ Card: QuickNote, Page: CapturesPage });
