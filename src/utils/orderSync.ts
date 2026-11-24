import { CustomerOrderHistoryItem } from '../types/catalog';

/** Only an untouched checkout draft can be retried as a new customer order. */
export function isInitialOrderDraft(order: CustomerOrderHistoryItem): boolean {
  return order.status === 'recebido' && (order.version ?? 1) === 1
    && (order.paymentStatus || 'pendente') === 'pendente' && (order.amountPaid ?? 0) === 0
    && !order.stockDeducted && !order.stockDeductedAt && !order.financialSaleId && !order.financialRecordedAt
    && !order.loyaltyStampGranted && !order.loyaltyStampGrantedAt && !order.loyaltyGrantIdempotencyKey
    && (order.statusHistory || []).every(event => event.toStatus === 'recebido' && !event.fromStatus);
}

export function isPendingOrderDraft(order: CustomerOrderHistoryItem, customerId?: string): boolean {
  return (order._syncStatus === 'pending_sync' || order._syncStatus === 'sync_error')
    && isInitialOrderDraft(order) && (!customerId || order.customerId === customerId);
}

/** A successful server snapshot owns confirmed orders, including an empty snapshot.
 * Legacy cache entries are not proof of an unsent draft and must never be reinserted by a read.
 */
export function reconcileOrderSnapshot(
  remote: CustomerOrderHistoryItem[], local: CustomerOrderHistoryItem[], customerId?: string,
): CustomerOrderHistoryItem[] {
  const rows = new Map<string, CustomerOrderHistoryItem>();
  const references = new Set(remote.map(order => order.referenceId).filter(Boolean));
  for (const order of local) {
    if (isPendingOrderDraft(order, customerId) && !references.has(order.referenceId)) rows.set(order.id, order);
  }
  for (const order of remote) {
    if (!customerId || order.customerId === customerId) rows.set(order.id, {...order, _syncStatus: 'synced'});
  }
  return Array.from(rows.values()).sort((a,b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

// Shared caches predate project scoping and belong to the original production storefront.
const legacyProject = 'https://hccrgzjkbmgutpazlljb.supabase.co';
const draftsKey = (project: string, customer: string) =>
  'podwave_drafts_v1:' + encodeURIComponent(project.replace(/\/+$/, '')) + ':' + encodeURIComponent(customer);

function readRows(key: string): CustomerOrderHistoryItem[] {
  const rows = JSON.parse(localStorage.getItem(key) || '[]');
  return Array.isArray(rows) ? rows : [];
}

export function migrateLegacyOrderCache(): void {
  try {
    for (const source of ['podwave_shared_catalog_orders_v2', 'podwave_order_cache_review_v1']) {
      if (localStorage.getItem(source) === null) continue;
      const groups = new Map<string, CustomerOrderHistoryItem[]>();
      for (const row of readRows(source)) {
        if (!row?.customerId || !row.id || !isPendingOrderDraft(row)) continue;
        const key = draftsKey(legacyProject, row.customerId);
        const group = groups.get(key) ?? readRows(key);
        if (!group.some(existing => existing.id === row.id)) group.push(row);
        groups.set(key, group);
      }
      for (const [key, rows] of groups) localStorage.setItem(key, JSON.stringify(rows));
      localStorage.removeItem(source);
    }
  } catch {
    // Leave the source available for another migration attempt if storage is full.
  }
}

export function readOrderDrafts(project?: string, customer?: string): CustomerOrderHistoryItem[] {
  if (!project || !customer) return [];
  try {
    return readRows(draftsKey(project, customer)).filter(row => row && isPendingOrderDraft(row, customer));
  } catch { return []; }
}

export function removeOrderDraft(id: string, project: string, customer: string): void {
  const key = draftsKey(project, customer);
  const rows = readOrderDrafts(project, customer);
  if (!rows.some(row => row.id === id)) return;
  const remaining = rows.filter(row => row.id !== id);
  try {
    if (remaining.length) localStorage.setItem(key, JSON.stringify(remaining));
    else localStorage.removeItem(key);
  } catch { /* The authenticated server snapshot still takes precedence. */ }
}
