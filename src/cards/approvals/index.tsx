import { defineImpl } from '../../workbench/cards/protocol';
import { store, useData } from '../../data';
import { Approvals, ApprovalsPage } from './Approvals';

export default defineImpl({
  Card: Approvals,
  Meta: () => <>{useData(() => store.pendingApprovals().length)}</>,
  Page: ApprovalsPage,
});
