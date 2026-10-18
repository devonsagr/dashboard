import { defineImpl } from '../../workbench/cards/protocol';
import { QuickEdit } from './QuickEdit';
export default defineImpl({
  Card: QuickEdit,
  Title: ({ props }) => <>{(props.file ?? '').split('/').pop()?.replace(/\.md$/, '') || '快捷编辑'}</>,
});
