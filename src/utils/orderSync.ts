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

/** Keep excluded browser records available for manual review, outside active order lists. */
export function archiveUnconfirmedOrderCache(local: CustomerOrderHistoryItem[], current: CustomerOrderHistoryItem[]): void {
  if (typeof localStorage === 'undefined') return;
  const ids = new Set(current.map(order => order.id));
  const excluded = local.filter(order => !ids.has(order.id) && !isPendingOrderDraft(order));
  if (!excluded.length) return;
  try {
    const key = 'podwave_order_cache_review_v1';
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    const previous: CustomerOrderHistoryItem[] = Array.isArray(parsed) ? parsed : [];
    const archived = new Map(previous.map(order => [order.id, order]));
    for (const order of excluded) archived.set(order.id, order);
    localStorage.setItem(key, JSON.stringify(Array.from(archived.values())));
  } catch {
    // Keep the original shared cache when archival cannot be confirmed.
    throw new Error('Não foi possível preservar o histórico local para conferência.');
  }
}

export function markOrderCacheSynced(id: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const key = 'podwave_shared_catalog_orders_v2';
    const rows = JSON.parse(localStorage.getItem(key) || '[]');
    if (Array.isArray(rows)) localStorage.setItem(key, JSON.stringify(rows.map(order => order.id === id ? {...order, _syncStatus: 'synced'} : order)));
  } catch { /* A confirmed server result remains authoritative if local storage is unavailable. */ }
}
