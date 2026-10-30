import {
  CatalogOrderPaymentStatus,
  CatalogOrderStatus,
  CustomerOrderHistoryItem,
  LoyaltyCardData,
  ManualSaleEntry,
  OrderStatusHistoryEntry,
  UserProfile,
} from '../types/catalog';
import { getUserLoyaltyCard, hasOrderStampInCard } from '../utils/loyaltyCard';

export interface OrderStatusMeta {
  status: CatalogOrderStatus;
  label: string;
  shortLabel: string;
  description: string;
  badgeClass: string;
  columnBorderClass: string;
  nextStatus?: CatalogOrderStatus;
  nextActionLabel?: string;
}

export const ORDER_STATUS_LIST: OrderStatusMeta[] = [
  {
    status: 'recebido',
    label: '1. Recebido',
    shortLabel: 'Recebido',
    description: 'Pedido registrado pelo catálogo aguardando aceitação.',
    badgeClass: 'bg-cyan-500/15 border-cyan-400/50 text-cyan-200',
    columnBorderClass: 'border-cyan-500/35',
    nextStatus: 'confirmado',
    nextActionLabel: 'Confirmar Pedido',
  },
  {
    status: 'confirmado',
    label: '2. Confirmado',
    shortLabel: 'Confirmado',
    description: 'Pedido aceito pelo estabelecimento e aguardando separação.',
    badgeClass: 'bg-blue-500/15 border-blue-400/50 text-blue-200',
    columnBorderClass: 'border-blue-500/35',
    nextStatus: 'em_separacao',
    nextActionLabel: 'Iniciar Separação',
  },
  {
    status: 'em_separacao',
    label: '3. Em Separação',
    shortLabel: 'Em Separação',
    description: 'Produtos e sabores sendo conferidos e embalados.',
    badgeClass: 'bg-purple-500/15 border-purple-400/50 text-purple-200',
    columnBorderClass: 'border-purple-500/35',
    nextStatus: 'enviado',
    nextActionLabel: 'Marcar como Enviado',
  },
  {
    status: 'enviado',
    label: '4. Enviado / Em Entrega',
    shortLabel: 'Enviado',
    description: 'Pedido despachado para entrega ou pronto para retirada.',
    badgeClass: 'bg-amber-500/15 border-amber-400/50 text-amber-200',
    columnBorderClass: 'border-amber-500/35',
    nextStatus: 'entregue',
    nextActionLabel: 'Confirmar Entrega',
  },
  {
    status: 'entregue',
    label: '5. Entregue',
    shortLabel: 'Entregue',
    description: 'Entrega confirmada ao cliente.',
    badgeClass: 'bg-emerald-500/15 border-emerald-400/50 text-emerald-200',
    columnBorderClass: 'border-emerald-500/35',
  },
  {
    status: 'cancelado',
    label: 'Cancelado',
    shortLabel: 'Cancelado',
    description: 'Pedido cancelado com justificativa registrada.',
    badgeClass: 'bg-rose-500/15 border-rose-400/50 text-rose-200',
    columnBorderClass: 'border-rose-500/35',
  },
];

export function getOrderStatusMeta(status?: string): OrderStatusMeta {
  return (
    ORDER_STATUS_LIST.find((s) => s.status === status) || ORDER_STATUS_LIST[0]
  );
}

export const ORDER_STATUS_LABELS: Record<CatalogOrderStatus, string> = {
  recebido: 'Recebido',
  confirmado: 'Confirmado',
  em_separacao: 'Em separação',
  enviado: 'Enviado',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

export function getAllowedNextStatuses(status: CatalogOrderStatus): CatalogOrderStatus[] {
  const meta = getOrderStatusMeta(status);
  return meta.nextStatus ? [meta.nextStatus] : [];
}

const STAGE_ORDER_INDEX: Record<CatalogOrderStatus, number> = {
  recebido: 0,
  confirmado: 1,
  em_separacao: 2,
  enviado: 3,
  entregue: 4,
  cancelado: 5,
};

// In-flight action lock to block repeated double clicks in the same session
const activeActionLocks = new Set<string>();

export function acquireOrderActionLock(lockKey: string): boolean {
  if (activeActionLocks.has(lockKey)) return false;
  activeActionLocks.add(lockKey);
  return true;
}

export function releaseOrderActionLock(lockKey: string): void {
  activeActionLocks.delete(lockKey);
}

export interface StatusTransitionValidation {
  valid: boolean;
  requiresReason: boolean;
  error?: string;
}

export function validateOrderStatusTransition(
  currentStatus: CatalogOrderStatus,
  targetStatus: CatalogOrderStatus,
  reason?: string
): StatusTransitionValidation {
  if (currentStatus === targetStatus) {
    return {
      valid: false,
      requiresReason: false,
      error: 'O pedido já se encontra neste status.',
    };
  }

  const trimmedReason = (reason || '').trim();

  // Cancellation always requires an explicit reason
  if (targetStatus === 'cancelado') {
    if (trimmedReason.length < 3) {
      return {
        valid: false,
        requiresReason: true,
        error: 'Informe o motivo do cancelamento (mínimo de 3 caracteres).',
      };
    }
    return { valid: true, requiresReason: true };
  }

  // Reopening a cancelled order or moving backwards in the pipeline requires a reason
  const isReopeningCancelled = currentStatus === 'cancelado';
  const isMovingBackwards =
    STAGE_ORDER_INDEX[targetStatus] < STAGE_ORDER_INDEX[currentStatus];

  if (isReopeningCancelled || isMovingBackwards) {
    if (trimmedReason.length < 3) {
      return {
        valid: false,
        requiresReason: true,
        error:
          'Informe uma justificativa para retroceder ou reabrir o status deste pedido.',
      };
    }
    return { valid: true, requiresReason: true };
  }

  return { valid: true, requiresReason: false };
}

export interface OrderStatusUpdateInput {
  toStatus: CatalogOrderStatus;
  actorName: string;
  actorEmail?: string;
  origin: OrderStatusHistoryEntry['origin'];
  reason?: string;
  expectedVersion?: number;
  nowIso?: string;
}

export function applyOrderStatusTransition(
  order: CustomerOrderHistoryItem,
  input: OrderStatusUpdateInput
): {
  success: boolean;
  updatedOrder?: CustomerOrderHistoryItem;
  error?: string;
} {
  const currentVersion =
    typeof order.version === 'number' && order.version > 0 ? order.version : 1;

  if (
    typeof input.expectedVersion === 'number' &&
    input.expectedVersion !== currentVersion
  ) {
    return {
      success: false,
      error:
        'Este pedido foi atualizado em outra sessão. Recarregue a lista antes de alterar.',
    };
  }

  const validation = validateOrderStatusTransition(
    order.status,
    input.toStatus,
    input.reason
  );
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const now = input.nowIso || new Date().toISOString();
  const historyEntry: OrderStatusHistoryEntry = {
    id: `osh-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    fromStatus: order.status,
    toStatus: input.toStatus,
    changedAt: now,
    changedBy: input.actorName.trim() || 'Administrador',
    changedByEmail: input.actorEmail?.trim() || undefined,
    origin: input.origin,
    reason: input.reason?.trim() || undefined,
  };

  const prevHistory = Array.isArray(order.statusHistory)
    ? order.statusHistory
    : [];

  const updatedOrder: CustomerOrderHistoryItem = {
    ...order,
    status: input.toStatus,
    cancelReason:
      input.toStatus === 'cancelado'
        ? input.reason?.trim() || order.cancelReason
        : order.cancelReason,
    statusHistory: [historyEntry, ...prevHistory].slice(0, 50),
    updatedAt: now,
    updatedBy: input.actorName.trim() || 'Administrador',
    version: currentVersion + 1,
  };

  return { success: true, updatedOrder };
}

export interface OrderLoyaltyEvaluation {
  state:
    | 'granted'
    | 'eligible'
    | 'pending_payment'
    | 'pending_delivery'
    | 'cancelled'
    | 'no_account'
    | 'not_eligible';
  label: string;
  description: string;
  canGrantAutomatically: boolean;
  canGrantWithAdminOverride: boolean;
  customerCard?: LoyaltyCardData;
}

export function evaluateOrderLoyalty(
  order: CustomerOrderHistoryItem,
  customerProfile?: UserProfile | null,
  defaultGoal = 10,
  defaultReward = 'Brinde Especial ou Desconto Exclusivo na 10ª Compra'
): OrderLoyaltyEvaluation {
  const customerId = order.customerId || customerProfile?.id;
  if (!customerId) {
    return {
      state: 'no_account',
      label: 'Pedido sem conta vinculada',
      description: 'O pedido não está vinculado a um perfil de cliente autenticado.',
      canGrantAutomatically: false,
      canGrantWithAdminOverride: false,
    };
  }

  const card = customerProfile
    ? getUserLoyaltyCard(customerProfile, defaultGoal, defaultReward)
    : undefined;

  const alreadyGrantedOnOrder = order.loyaltyStampGranted === true;
  const alreadyGrantedInCard = card
    ? hasOrderStampInCard(card, order.id, order.loyaltyGrantIdempotencyKey)
    : false;

  if (alreadyGrantedOnOrder || alreadyGrantedInCard) {
    return {
      state: 'granted',
      label: 'Selo já concedido',
      description: `O selo de fidelidade referente ao pedido #${order.referenceId} já foi validado e registrado.`,
      canGrantAutomatically: false,
      canGrantWithAdminOverride: false,
      customerCard: card,
    };
  }

  if (order.status === 'cancelado') {
    return {
      state: 'cancelled',
      label: 'Não elegível (Cancelado)',
      description: 'Pedidos cancelados não geram selos de fidelidade.',
      canGrantAutomatically: false,
      canGrantWithAdminOverride: false,
      customerCard: card,
    };
  }

  if (order.loyaltyEligible === false) {
    return {
      state: 'not_eligible',
      label: 'Não elegível',
      description: 'Pedido marcado como não elegível para selo.',
      canGrantAutomatically: false,
      canGrantWithAdminOverride: false,
      customerCard: card,
    };
  }

  if (order.status !== 'entregue') {
    return {
      state: 'pending_delivery',
      label: 'Aguardando entrega',
      description: 'O selo poderá ser creditado quando o pedido for marcado como Entregue.',
      canGrantAutomatically: false,
      canGrantWithAdminOverride: false,
      customerCard: card,
    };
  }

  const paymentStatus = order.paymentStatus || 'pendente';
  if (paymentStatus !== 'pago') {
    return {
      state: 'pending_payment',
      label: 'Pagamento pendente',
      description:
        'O pedido foi entregue, mas o pagamento consta como pendente/parcial. Regularize o pagamento para creditar o selo.',
      canGrantAutomatically: false,
      canGrantWithAdminOverride: true,
      customerCard: card,
    };
  }

  return {
    state: 'eligible',
    label: 'Elegível para +1 selo',
    description: 'Pedido entregue e pago. Pronto para creditar +1 selo no cartão do cliente.',
    canGrantAutomatically: true,
    canGrantWithAdminOverride: true,
    customerCard: card,
  };
}

// ============================================================================
// INTEGRAÇÃO COM O FINANCEIRO ("MEU NEGÓCIO") SEM DUPLICIDADE
// ============================================================================

export function getDeterministicSaleIdForOrder(orderId: string): string {
  return `sale-ord-${orderId.trim()}`;
}

export function findExistingFinancialSaleForOrder(
  order: CustomerOrderHistoryItem,
  manualSales: ManualSaleEntry[]
): ManualSaleEntry | undefined {
  const deterministicId = getDeterministicSaleIdForOrder(order.id);
  return manualSales.find(
    (s) =>
      s.id === deterministicId ||
      (order.financialSaleId && s.id === order.financialSaleId) ||
      (s.notes &&
        (s.notes.includes(`[PedidoId:${order.id}]`) ||
          s.notes.includes(`[Ref:${order.referenceId}]`)))
  );
}

export function buildManualSaleFromCatalogOrder(
  order: CustomerOrderHistoryItem,
  options?: {
    paymentStatusOverride?: 'pago' | 'parcial' | 'pendente';
    amountReceivedOverride?: number;
    receivedDate?: string;
    dueDate?: string;
    stockManaged?: boolean;
  }
): {
  success: boolean;
  sale?: ManualSaleEntry;
  error?: string;
} {
  if (order.status === 'cancelado') {
    return {
      success: false,
      error: 'Pedidos cancelados não podem gerar um novo lançamento de receita.',
    };
  }

  const total = Math.max(0, Number(order.total) || 0);
  const subtotal = Math.max(0, Number(order.subtotal) || total);
  const discount = Math.max(0, Number(order.discount) || 0);
  const deliveryFee = Math.max(0, Number(order.deliveryFee) || 0);

  const rawPayStatus =
    options?.paymentStatusOverride ||
    (order.paymentStatus === 'estornado' ? 'pendente' : order.paymentStatus) ||
    'pendente';

  let amountReceived = 0;
  let amountPending = total;
  let paymentStatus: 'pago' | 'parcial' | 'pendente' = 'pendente';

  if (rawPayStatus === 'pago') {
    paymentStatus = 'pago';
    amountReceived = total;
    amountPending = 0;
  } else if (rawPayStatus === 'parcial') {
    const paidInput =
      typeof options?.amountReceivedOverride === 'number'
        ? options.amountReceivedOverride
        : Number(order.amountPaid) || 0;
    amountReceived = Math.min(total, Math.max(0, Number(paidInput.toFixed(2))));
    amountPending = Math.max(0, Number((total - amountReceived).toFixed(2)));
    paymentStatus =
      amountPending === 0 ? 'pago' : amountReceived > 0 ? 'parcial' : 'pendente';
  } else {
    paymentStatus = 'pendente';
    amountReceived = 0;
    amountPending = total;
  }

  const nowIso = new Date().toISOString();
  const todayDate = nowIso.slice(0, 10);

  const saleItems = (order.items || []).map((item, idx) => ({
    id: `item-${order.id}-${idx}`,
    productId: item.modelId,
    flavorId: item.flavorId,
    productName: `[${item.brandName}] ${item.modelName} - ${item.flavorName}`,
    brandName: item.brandName,
    modelName: item.modelName,
    flavorName: item.flavorName,
    quantity: Number(item.quantity) || 1,
    unitPrice: Number(item.price) || 0,
    subtotal: Number(((Number(item.price) || 0) * (Number(item.quantity) || 1)).toFixed(2)),
  }));

  const receipts =
    amountReceived > 0
      ? [
          {
            id: `rcpt-ord-${order.id}`,
            amount: amountReceived,
            receiptDate: options?.receivedDate || todayDate,
            paymentMethod: order.paymentMethod || 'Pix',
            notes: `Recebimento vinculado ao pedido #${order.referenceId}`,
          },
        ]
      : [];

  const sale: ManualSaleEntry = {
    id: getDeterministicSaleIdForOrder(order.id),
    saleDate: order.createdAt || nowIso,
    customerName: order.customerName || 'Cliente Catálogo',
    customerPhone: order.customerPhone || undefined,
    deliveryType:
      order.deliveryType === 'pickup' ? 'Retirada no Local' : 'Entrega Própria',
    deliveryFee,
    discount,
    grossTotal: subtotal,
    netTotal: total,
    amountReceived,
    amountPending,
    paymentStatus,
    paymentMethod: order.paymentMethod || 'Pix',
    orderStatus: order.status === 'entregue' ? 'entregue' : 'confirmado',
    receivedDate: amountReceived > 0 ? options?.receivedDate || todayDate : undefined,
    dueDate: amountPending > 0 ? options?.dueDate || todayDate : undefined,
    items: saleItems,
    receipts,
    installments: [],
    stockManaged: Boolean(options?.stockManaged),
    notes: `Origem: Catálogo PodWave [Ref:${order.referenceId}] [PedidoId:${order.id}]${
      order.customerNotes ? ` | Obs: ${order.customerNotes}` : ''
    }`,
    createdAt: nowIso,
  };

  return { success: true, sale };
}

// ============================================================================
// NOTIFICAÇÕES INTELIGENTES PELO WHATSAPP (COM TEMPLATES PERSONALIZÁVEIS)
// ============================================================================

export interface WhatsappOrderTemplates {
  enabled: Record<CatalogOrderStatus, boolean>;
  templates: Record<CatalogOrderStatus, string>;
}

const WHATSAPP_TEMPLATES_STORAGE_KEY = 'podwave_whatsapp_order_templates_v1';

export const DEFAULT_WHATSAPP_ORDER_TEMPLATES: WhatsappOrderTemplates = {
  enabled: {
    recebido: true,
    confirmado: true,
    em_separacao: true,
    enviado: true,
    entregue: true,
    cancelado: true,
  },
  templates: {
    recebido:
      'Olá, {nome}! Recebemos seu pedido #{referencia} na PodWave. Você poderá acompanhar as atualizações pelo seu histórico de pedidos. Obrigado!',
    confirmado:
      'Olá, {nome}! Seu pedido #{referencia} foi confirmado e seguirá para preparação. Avisaremos quando houver uma nova atualização.',
    em_separacao:
      'Olá, {nome}! Seu pedido #{referencia} já está em separação pela nossa equipe na PodWave.',
    enviado:
      'Olá, {nome}! Seu pedido #{referencia} já saiu para entrega. Obrigado pela preferência!',
    entregue:
      'Olá, {nome}! Seu pedido #{referencia} foi marcado como entregue. Obrigado pela preferência!{selo_info}',
    cancelado:
      'Olá, {nome}. Informamos que o pedido #{referencia} foi cancelado.{motivo_cancelamento} Caso tenha dúvidas, estamos à disposição.',
  },
};

export function loadWhatsappOrderTemplates(): WhatsappOrderTemplates {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return DEFAULT_WHATSAPP_ORDER_TEMPLATES;
  }
  try {
    const raw = localStorage.getItem(WHATSAPP_TEMPLATES_STORAGE_KEY);
    if (!raw) return DEFAULT_WHATSAPP_ORDER_TEMPLATES;
    const parsed = JSON.parse(raw);
    return {
      enabled: {
        ...DEFAULT_WHATSAPP_ORDER_TEMPLATES.enabled,
        ...(parsed?.enabled || {}),
      },
      templates: {
        ...DEFAULT_WHATSAPP_ORDER_TEMPLATES.templates,
        ...(parsed?.templates || {}),
      },
    };
  } catch {
    return DEFAULT_WHATSAPP_ORDER_TEMPLATES;
  }
}

export function saveWhatsappOrderTemplates(config: WhatsappOrderTemplates): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(WHATSAPP_TEMPLATES_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore storage quota errors
  }
}

export function formatWhatsappOrderMessage(
  order: CustomerOrderHistoryItem,
  statusOverride?: CatalogOrderStatus,
  config: WhatsappOrderTemplates = loadWhatsappOrderTemplates(),
  loyaltyCardAfterGrant?: LoyaltyCardData | null
): string {
  const targetStatus = statusOverride || order.status;
  const rawTemplate =
    config.templates[targetStatus] ||
    DEFAULT_WHATSAPP_ORDER_TEMPLATES.templates[targetStatus];

  const customerName = (order.customerName || 'Cliente').trim();
  const ref = (order.referenceId || order.id).replace(/^#/, '');

  // NEVER claim a stamp was credited unless order.loyaltyStampGranted is explicitly confirmed!
  let seloInfo = '';
  if (targetStatus === 'entregue' && order.loyaltyStampGranted === true) {
    if (loyaltyCardAfterGrant) {
      seloInfo = ` Creditamos +1 selo no seu Cartão Fidelidade PodWave (agora você está com ${loyaltyCardAfterGrant.stamps}/${loyaltyCardAfterGrant.goal} selos).`;
    } else {
      seloInfo =
        ' Creditamos +1 selo validado no seu Cartão Fidelidade Digital PodWave!';
    }
  }

  const motivoCancelamento =
    targetStatus === 'cancelado' && order.cancelReason
      ? ` Motivo: ${order.cancelReason}.`
      : '';

  return rawTemplate
    .replace(/\{nome\}/g, customerName)
    .replace(/\{referencia\}/g, ref)
    .replace(/\{total\}/g, `R$ ${(Number(order.total) || 0).toFixed(2).replace('.', ',')}`)
    .replace(/\{selo_info\}/g, seloInfo)
    .replace(/\{motivo_cancelamento\}/g, motivoCancelamento)
    .trim();
}

export function validateAndFormatWhatsappPhone(rawPhone?: string | null): {
  valid: boolean;
  digits: string;
  error?: string;
} {
  const digitsOnly = String(rawPhone || '').replace(/\D/g, '');
  if (!digitsOnly || digitsOnly.length < 10) {
    return {
      valid: false,
      digits: '',
      error: 'Número de telefone ausente ou inválido (mínimo 10 dígitos com DDD).',
    };
  }
  const normalized = digitsOnly.startsWith('55')
    ? digitsOnly
    : `55${digitsOnly}`;
  if (normalized.length < 12 || normalized.length > 13) {
    return {
      valid: false,
      digits: normalized,
      error: 'Número de WhatsApp fora do padrão brasileiro (DDD + número).',
    };
  }
  return { valid: true, digits: normalized };
}

export function buildWhatsappConversationUrl(
  rawPhone: string,
  message: string
): { valid: boolean; url?: string; error?: string } {
  const check = validateAndFormatWhatsappPhone(rawPhone);
  if (!check.valid) {
    return { valid: false, error: check.error };
  }
  const encoded = encodeURIComponent(message);
  return {
    valid: true,
    url: `https://wa.me/${check.digits}?text=${encoded}`,
  };
}

// ============================================================================
// INDICADORES REAIS DO DASHBOARD DE PEDIDOS & FILTROS DE PERÍODO
// ============================================================================

export type OrderPeriodFilter =
  | 'hoje'
  | 'ultimos_7_dias'
  | 'mes_atual'
  | 'personalizado'
  | 'todos';

export function filterOrdersByPeriod(
  orders: CustomerOrderHistoryItem[],
  period: OrderPeriodFilter,
  customStart?: string,
  customEnd?: string,
  now = new Date()
): CustomerOrderHistoryItem[] {
  if (period === 'todos') return orders;

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0
  );

  return orders.filter((order) => {
    const created = new Date(order.createdAt);
    if (Number.isNaN(created.getTime())) return false;

    if (period === 'hoje') {
      return created >= startOfToday;
    }
    if (period === 'ultimos_7_dias') {
      const sevenDaysAgo = new Date(startOfToday);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      return created >= sevenDaysAgo;
    }
    if (period === 'mes_atual') {
      return (
        created.getFullYear() === now.getFullYear() &&
        created.getMonth() === now.getMonth()
      );
    }
    if (period === 'personalizado') {
      const orderDay = order.createdAt.slice(0, 10);
      if (customStart && orderDay < customStart) return false;
      if (customEnd && orderDay > customEnd) return false;
      return true;
    }
    return true;
  });
}

export interface OrdersDashboardKPIs {
  total: number;
  recebidos: number;
  aguardandoSeparacao: number; // confirmados
  emSeparacao: number;
  enviados: number;
  entregues: number;
  cancelados: number;
  pagamentoPendenteCount: number;
  pagamentoPendenteTotal: number;
  faturamentoPago: number;
}

export function calculateOrdersDashboardKPIs(
  orders: CustomerOrderHistoryItem[],
  manualSales: ManualSaleEntry[] = []
): OrdersDashboardKPIs {
  const seenOrderIds = new Set<string>();
  let total = 0;
  let recebidos = 0;
  let aguardandoSeparacao = 0;
  let emSeparacao = 0;
  let enviados = 0;
  let entregues = 0;
  let cancelados = 0;
  let pagamentoPendenteCount = 0;
  let pagamentoPendenteTotalCents = 0;
  let faturamentoPagoCents = 0;

  for (const order of orders) {
    if (!order?.id || seenOrderIds.has(order.id)) continue;
    seenOrderIds.add(order.id);
    total += 1;

    switch (order.status) {
      case 'recebido':
        recebidos += 1;
        break;
      case 'confirmado':
        aguardandoSeparacao += 1;
        break;
      case 'em_separacao':
        emSeparacao += 1;
        break;
      case 'enviado':
        enviados += 1;
        break;
      case 'entregue':
        entregues += 1;
        break;
      case 'cancelado':
        cancelados += 1;
        break;
    }

    if (order.status === 'cancelado') continue;

    const linkedSale = findExistingFinancialSaleForOrder(order, manualSales);
    const totalCents = Math.round((Number(order.total) || 0) * 100);

    let paidCents = 0;
    let payStatus: CatalogOrderPaymentStatus = order.paymentStatus || 'pendente';

    if (linkedSale) {
      paidCents = Math.min(
        totalCents,
        Math.max(0, Math.round((Number(linkedSale.amountReceived) || 0) * 100))
      );
      payStatus = linkedSale.paymentStatus;
    } else if (payStatus === 'pago') {
      paidCents = totalCents;
    } else if (payStatus === 'parcial') {
      paidCents = Math.min(
        totalCents,
        Math.max(0, Math.round((Number(order.amountPaid) || 0) * 100))
      );
    }

    const pendingCents = Math.max(0, totalCents - paidCents);
    faturamentoPagoCents += paidCents;

    if (payStatus !== 'pago' || pendingCents > 0) {
      pagamentoPendenteCount += 1;
      pagamentoPendenteTotalCents += pendingCents;
    }
  }

  return {
    total,
    recebidos,
    aguardandoSeparacao,
    emSeparacao,
    enviados,
    entregues,
    cancelados,
    pagamentoPendenteCount,
    pagamentoPendenteTotal: Number((pagamentoPendenteTotalCents / 100).toFixed(2)),
    faturamentoPago: Number((faturamentoPagoCents / 100).toFixed(2)),
  };
}

export function formatElapsedOrderTime(createdAtIso: string, now = new Date()): string {
  const created = new Date(createdAtIso);
  if (Number.isNaN(created.getTime())) return 'Agora';
  const diffMs = Math.max(0, now.getTime() - created.getTime());
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Agora mesmo';
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    const remMins = mins % 60;
    return remMins > 0 ? `há ${hours}h ${remMins}m` : `há ${hours}h`;
  }
  const days = Math.floor(hours / 24);
  return days === 1 ? 'há 1 dia' : `há ${days} dias`;
}
