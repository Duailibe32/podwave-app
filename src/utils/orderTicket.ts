import type { CartItem, CustomerOrderHistoryItem, ProgressiveDiscountConfig } from '../types/catalog';
import { formatCurrency } from './pricing';

export const ticketStages = [
  ['recebido', 'Recebido'],
  ['confirmado', 'Confirmado'],
  ['em_separacao', 'Separação'],
  ['enviado', 'A caminho'],
  ['entregue', 'Entregue'],
] as const;

const ticketDate = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Fortaleza',
});

export function formatTicketDate(date: string) {
  const parsed = Date.parse(date);
  return Number.isFinite(parsed) ? ticketDate.format(parsed).replace(', ', ' às ') : 'Data indisponível';
}

export function ticketStatus(order: CustomerOrderHistoryItem) {
  if (order.status === 'cancelado') return 'Cancelado';
  if (order.status === 'enviado' && order.deliveryType === 'pickup') return 'Pronto para retirada';
  if (order.status === 'em_separacao') return 'Em separação';
  return ticketStages.find(([status]) => status === order.status)?.[1] || 'Aguardando atualização';
}

export function ticketDelivery(order: CustomerOrderHistoryItem, config?: ProgressiveDiscountConfig) {
  if (order.status === 'cancelado') return { title: 'Pedido cancelado', detail: 'Consulte o histórico para acompanhar.' };
  if (order.status === 'entregue') return { title: 'Pedido concluído', detail: 'A loja confirmou a entrega ou retirada.' };
  if (order.deliveryType === 'pickup') return { title: 'Retirada no local', detail: 'Acompanhe quando estiver pronto.' };
  const city = order.destinationCity || order.addressSummary?.split(' - ').slice(-2).join(' - ');
  const local = config?.deliveryOrigins?.some(origin => city?.trim().localeCompare(
    origin.city + ' - ' + origin.state, 'pt-BR', { sensitivity: 'base' }
  ) === 0);
  const perKm = config?.deliveryPricingMode === 'per_km' || /Frete estimado por cidade:/i.test(order.customerNotes || '');
  return !perKm || local
    ? { title: 'Entrega Flash · 10 a 20 min', detail: 'Prazo estimado após confirmação da loja.' }
    : { title: 'Entrega regional', detail: 'Prazo a confirmar com a loja.' };
}

export function ticketItemLabel(item: CartItem) {
  const product = item.modelName || 'Item do pedido';
  const flavor = [item.flavorEmoji, item.flavorName].filter(Boolean).join(' ');
  return item.modelId === 'addon' || !flavor
    ? item.quantity + '× ' + product
    : item.quantity + '× ' + product + ' · ' + flavor;
}

export function newestTicketOrder(base: CustomerOrderHistoryItem, candidate?: CustomerOrderHistoryItem | null) {
  if (!candidate || base.id !== candidate.id || base.customerId !== candidate.customerId) return base;
  if (candidate._syncStatus === 'pending_sync' || candidate._syncStatus === 'sync_error') return base;
  const version = (candidate.version || 1) - (base.version || 1);
  if (version !== 0) return version > 0 ? candidate : base;
  const timestamp = (value: CustomerOrderHistoryItem) => Date.parse(value.updatedAt || value.createdAt) || 0;
  return timestamp(candidate) >= timestamp(base) ? candidate : base;
}

export function ticketSummary(order: CustomerOrderHistoryItem, includeAddress = false) {
  const destination = includeAddress && order.deliveryType === 'delivery' ? order.addressSummary : undefined;
  const lines = [
    '⚡ PodWave · Pedido #' + order.referenceId.replace(/^#/, ''),
    formatTicketDate(order.createdAt) + ' · ' + ticketStatus(order),
    ...order.items.map(ticketItemLabel),
    order.deliveryType === 'pickup' ? 'Retirada no local' : 'Entrega',
    destination ? 'Destino · ' + destination : '',
    includeAddress && order.customerNotes ? 'Observações · ' + order.customerNotes : '',
    'Pagamento · ' + (order.paymentMethod || 'A combinar'),
    'Total · ' + formatCurrency(order.total),
    order.discount > 0 ? 'Economia · ' + formatCurrency(order.discount) : '',
  ];
  return lines.filter(Boolean).join('\n').replace(/\uFFFD|%EF%BF%BD/gi, '');
}
