import React, { useState, useMemo } from 'react';
import { useCatalog } from '../../context/CatalogContext';
import {
  CatalogOrderPaymentStatus,
  CatalogOrderStatus,
  CustomerOrderHistoryItem,
} from '../../types/catalog';
import {
  ORDER_STATUS_LIST,
  OrderPeriodFilter,
  WhatsappOrderTemplates,
  WhatsappTemplatePresetId,
  WHATSAPP_TEMPLATE_PRESETS,
  WHATSAPP_TEMPLATE_VARIABLES,
  buildWhatsappConversationUrl,
  calculateOrdersDashboardKPIs,
  evaluateOrderLoyalty,
  filterOrdersByPeriod,
  findExistingFinancialSaleForOrder,
  formatElapsedOrderTime,
  formatWhatsappOrderMessage,
  getOrderStatusMeta,
  loadWhatsappOrderTemplates,
  saveWhatsappOrderTemplates,
  DEFAULT_WHATSAPP_ORDER_TEMPLATES,
  QuickWhatsappResponseKey,
  QUICK_WHATSAPP_OPTIONS,
  buildQuickWhatsappUrl,
} from '../../services/orderCenterService';
import { openWhatsAppShare } from '../../utils/whatsappShare';
import { OrderStatusTimeline } from '../OrderStatusTimeline';
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  PackageCheck,
  Truck,
  XCircle,
  AlertCircle,
  DollarSign,
  Search,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  Gift,
  Briefcase,
  User,
  MapPin,
  Phone,
  Calendar,
  History,
  Settings,
  Copy,
  Check,
  X,
  ArrowRight,
  Columns,
  List,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Plus,
  Printer,
  Trash2,
} from 'lucide-react';
import { ThermalReceiptModal } from './ThermalReceiptModal';

interface OrdersCenterTabProps {
  onOpenUserInTab?: (customerId: string) => void;
  onOpenBusinessTab?: () => void;
}

export const OrdersCenterTab: React.FC<OrdersCenterTabProps> = ({
  onOpenUserInTab,
  onOpenBusinessTab,
}) => {
  const {
    allCatalogOrders,
    isLoadingCatalogOrders,
    catalogOrdersError,
    fetchAllCatalogOrders,
    updateCatalogOrderStatus,
    updateCatalogOrderPayment,
    grantLoyaltyStampForOrder,
    recordOrderInFinancialSales,
    deleteCatalogOrder,
    allUsers,
    manualSales,
    settings,
  } = useCatalog();

  // Filter states
  const [periodFilter, setPeriodFilter] = useState<OrderPeriodFilter>('todos');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | CatalogOrderStatus>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | CatalogOrderPaymentStatus>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [isStatusAuditOpen, setIsStatusAuditOpen] = useState<boolean>(true);

  // Active modals & action states
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [deliveredPromptOrderId, setDeliveredPromptOrderId] = useState<string | null>(null);
  const [confirmDeleteOrder, setConfirmDeleteOrder] = useState<CustomerOrderHistoryItem | null>(null);
  const [reasonModalState, setReasonModalState] = useState<{
    orderId: string;
    targetStatus: CatalogOrderStatus;
    title: string;
  } | null>(null);
  const [reasonInput, setReasonInput] = useState<string>('');
  const [receiptOrder, setReceiptOrder] = useState<CustomerOrderHistoryItem | null>(null);

  // WhatsApp Preview & Template Config Modal
  const [whatsappModalOrder, setWhatsappModalOrder] = useState<{
    order: CustomerOrderHistoryItem;
    statusContext?: CatalogOrderStatus;
  } | null>(null);
  const [whatsappModalPhone, setWhatsappModalPhone] = useState<string>('');
  const [customWhatsappText, setCustomWhatsappText] = useState<string>('');
  const [copiedWhatsapp, setCopiedWhatsapp] = useState<boolean>(false);
  const [isTemplateConfigOpen, setIsTemplateConfigOpen] = useState<boolean>(false);
  const [whatsappTemplates, setWhatsappTemplates] = useState<WhatsappOrderTemplates>(() =>
    loadWhatsappOrderTemplates()
  );
  const [activeTemplateStage, setActiveTemplateStage] =
    useState<CatalogOrderStatus>('confirmado');
  const [activePresetId, setActivePresetId] =
    useState<WhatsappTemplatePresetId>('neon_interativo');

  // Busy & feedback states
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const showFeedback = (type: 'success' | 'error' | 'info', text: string) => {
    setFeedbackBanner({ type, text });
    setTimeout(() => setFeedbackBanner(null), 5000);
  };

  const defaultGoal = settings.loyaltyGoalStamps || 10;
  const defaultReward =
    settings.loyaltyDefaultReward ||
    'Brinde Especial ou Desconto Exclusivo na 10ª Compra';

  React.useEffect(() => {
    const handleNewOrder = () => {
      void fetchAllCatalogOrders();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('podwave_new_order_placed', handleNewOrder);
      return () => window.removeEventListener('podwave_new_order_placed', handleNewOrder);
    }
  }, [fetchAllCatalogOrders]);

  // Period-filtered orders for KPIs
  const periodFilteredOrders = useMemo(
    () =>
      filterOrdersByPeriod(
        allCatalogOrders,
        periodFilter,
        customStartDate,
        customEndDate
      ),
    [allCatalogOrders, periodFilter, customStartDate, customEndDate]
  );

  // Dashboard KPIs from period-filtered orders
  const kpis = useMemo(
    () => calculateOrdersDashboardKPIs(periodFilteredOrders, manualSales),
    [periodFilteredOrders, manualSales]
  );

  // Search + Status + Payment filtered orders for display
  const visibleOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return periodFilteredOrders.filter((ord) => {
      if (statusFilter !== 'all' && ord.status !== statusFilter) return false;
      const effectivePayStatus = ord.paymentStatus || 'pendente';
      if (paymentFilter !== 'all' && effectivePayStatus !== paymentFilter)
        return false;

      if (q) {
        const matchRef = ord.referenceId.toLowerCase().includes(q);
        const matchName = (ord.customerName || '').toLowerCase().includes(q);
        const matchPhone = (ord.customerPhone || '').toLowerCase().includes(q);
        const matchItem = (ord.items || []).some(
          (i) =>
            i.modelName.toLowerCase().includes(q) ||
            i.flavorName.toLowerCase().includes(q)
        );
        if (!matchRef && !matchName && !matchPhone && !matchItem) return false;
      }
      return true;
    });
  }, [periodFilteredOrders, statusFilter, paymentFilter, searchQuery]);

  const selectedOrder = useMemo(
    () =>
      selectedOrderId
        ? allCatalogOrders.find((o) => o.id === selectedOrderId) || null
        : null,
    [allCatalogOrders, selectedOrderId]
  );

  const deliveredPromptOrder = useMemo(
    () =>
      deliveredPromptOrderId
        ? allCatalogOrders.find((o) => o.id === deliveredPromptOrderId) || null
        : null,
    [allCatalogOrders, deliveredPromptOrderId]
  );

  // Agregador do Log de Auditoria Simples de Status de Pedidos (com Data e Horário exatos)
  const orderStatusAuditEntries = useMemo(() => {
    const entries: Array<{
      id: string;
      orderId: string;
      referenceId: string;
      customerName: string;
      fromStatus: CatalogOrderStatus | null;
      toStatus: CatalogOrderStatus;
      changedAt: string;
      changedBy: string;
      reason?: string;
    }> = [];

    for (const ord of allCatalogOrders) {
      const history =
        Array.isArray(ord.statusHistory) && ord.statusHistory.length > 0
          ? ord.statusHistory
          : [
              {
                id: `${ord.id}-init`,
                fromStatus: null,
                toStatus: ord.status,
                changedAt: ord.updatedAt || ord.createdAt,
                changedBy: ord.updatedBy || ord.customerName || 'Sistema',
                origin: 'checkout' as const,
                reason: 'Registro inicial do pedido',
              },
            ];

      for (const h of history) {
        entries.push({
          id: `${ord.id}-${h.id}-${h.changedAt}`,
          orderId: ord.id,
          referenceId: ord.referenceId.replace(/^#/, ''),
          customerName: ord.customerName || 'Cliente PodWave',
          fromStatus: h.fromStatus,
          toStatus: h.toStatus,
          changedAt: h.changedAt || ord.updatedAt || ord.createdAt,
          changedBy: h.changedBy || 'Administrador',
          reason: h.reason,
        });
      }
    }

    return entries.sort(
      (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
    );
  }, [allCatalogOrders]);

  // Handlers
  const handleInitiateStatusChange = async (
    order: CustomerOrderHistoryItem,
    targetStatus: CatalogOrderStatus
  ) => {
    if (order.status === targetStatus) return;

    const stagesOrder: CatalogOrderStatus[] = [
      'recebido',
      'confirmado',
      'em_separacao',
      'enviado',
      'entregue',
      'cancelado',
    ];
    const isBackwards =
      stagesOrder.indexOf(targetStatus) < stagesOrder.indexOf(order.status);

    if (
      targetStatus === 'cancelado' ||
      order.status === 'cancelado' ||
      isBackwards
    ) {
      setReasonInput('');
      setReasonModalState({
        orderId: order.id,
        targetStatus,
        title:
          targetStatus === 'cancelado'
            ? `Cancelar Pedido #${order.referenceId}`
            : `Alterar Status para "${getOrderStatusMeta(targetStatus).shortLabel}"`,
      });
      return;
    }

    await executeStatusChange(order.id, targetStatus);
  };

  const executeStatusChange = async (
    orderId: string,
    targetStatus: CatalogOrderStatus,
    reason?: string
  ) => {
    const previousOrder = allCatalogOrders.find((o) => o.id === orderId);
    const hadStockDeductedBefore = previousOrder?.stockDeducted === true;

    setBusyOrderId(orderId);
    try {
      const res = await updateCatalogOrderStatus(orderId, targetStatus, {
        reason,
        origin: 'admin_panel',
      });

      if (!res.success || !res.updatedOrder) {
        showFeedback(
          'error',
          res.error || 'Não foi possível atualizar o status do pedido.'
        );
        return;
      }

      setReasonModalState(null);
      setReasonInput('');

      const stockNote =
        !hadStockDeductedBefore && res.updatedOrder.stockDeducted
          ? ' • Estoque baixado e sincronizado com o banco!'
          : hadStockDeductedBefore && targetStatus === 'cancelado'
          ? ' • Estoque devolvido ao catálogo!'
          : '';

      if (targetStatus === 'entregue') {
        setDeliveredPromptOrderId(orderId);
        showFeedback(
          'success',
          `Pedido #${res.updatedOrder.referenceId} marcado como ENTREGUE!${stockNote}`
        );
      } else {
        showFeedback(
          'success',
          `Status do pedido #${res.updatedOrder.referenceId} atualizado para "${
            getOrderStatusMeta(targetStatus).shortLabel
          }".${stockNote}`
        );
      }
    } finally {
      setBusyOrderId(null);
    }
  };

  const handlePaymentStatusChange = async (
    order: CustomerOrderHistoryItem,
    newPayStatus: CatalogOrderPaymentStatus
  ) => {
    setBusyOrderId(order.id);
    try {
      const res = await updateCatalogOrderPayment(
        order.id,
        newPayStatus,
        newPayStatus === 'pago' ? order.total : 0
      );
      if (!res.success) {
        showFeedback(
          'error',
          res.error || 'Falha ao atualizar situação do pagamento.'
        );
        return;
      }
      showFeedback(
        'success',
        `Pagamento do pedido #${order.referenceId} marcado como ${newPayStatus.toUpperCase()}.`
      );
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleGrantStamp = async (
    order: CustomerOrderHistoryItem,
    allowPendingOverride = false
  ) => {
    setBusyOrderId(order.id);
    try {
      const res = await grantLoyaltyStampForOrder(
        order.id,
        `Selo validado no pedido #${order.referenceId}`,
        allowPendingOverride
      );
      if (!res.success) {
        showFeedback('error', res.error || 'Não foi possível creditar o selo.');
        return;
      }
      showFeedback(
        'success',
        `+1 selo creditado com sucesso para ${
          order.customerName || 'o cliente'
        } (${res.updatedCard?.stamps}/${res.updatedCard?.goal} selos)!`
      );
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleRecordInFinancial = async (order: CustomerOrderHistoryItem) => {
    setBusyOrderId(order.id);
    try {
      const res = await recordOrderInFinancialSales(order.id, {
        paymentStatusOverride:
          order.paymentStatus === 'pago'
            ? 'pago'
            : order.paymentStatus === 'parcial'
            ? 'parcial'
            : 'pendente',
      });
      if (!res.success) {
        showFeedback(
          'error',
          res.error || 'Não foi possível registrar a venda no financeiro.'
        );
        return;
      }
      if (res.alreadyExists) {
        showFeedback(
          'info',
          `A venda referente ao pedido #${order.referenceId} já estava registrada em Minhas Vendas.`
        );
      } else {
        showFeedback(
          'success',
          `Pedido #${order.referenceId} registrado em Minhas Vendas (Meu Negócio) sem duplicidade!`
        );
      }
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleConfirmDeleteOrder = async () => {
    if (!confirmDeleteOrder) return;
    const target = confirmDeleteOrder;
    setBusyOrderId(target.id);
    try {
      const res = await deleteCatalogOrder(target.id);
      if (!res.success) {
        showFeedback('error', res.error || 'Não foi possível excluir o pedido.');
        return;
      }
      if (selectedOrderId === target.id) {
        setSelectedOrderId(null);
      }
      if (deliveredPromptOrderId === target.id) {
        setDeliveredPromptOrderId(null);
      }
      setConfirmDeleteOrder(null);
      showFeedback('success', `Pedido #${target.referenceId} excluído com sucesso!`);
    } finally {
      setBusyOrderId(null);
    }
  };

  const openWhatsappComposer = (
    order: CustomerOrderHistoryItem,
    statusContext?: CatalogOrderStatus
  ) => {
    const profile = order.customerId
      ? allUsers.find((u) => u.id === order.customerId)
      : undefined;
    const msg = formatWhatsappOrderMessage(
      order,
      statusContext || order.status,
      whatsappTemplates,
      profile?.loyaltyCard
    );
    setCustomWhatsappText(msg);
    setWhatsappModalPhone(order.customerPhone || profile?.phoneWhatsapp || '');
    setCopiedWhatsapp(false);
    setWhatsappModalOrder({ order, statusContext });
  };

  /**
   * Respostas Rápidas em 1 Clique para WhatsApp:
   * - 'pix': Chave Pix para Pagamento
   * - 'entrega': Pedido Saiu para Entrega
   * - 'selo': Obrigado pela Compra! Ganhou 1 Selo no Cartão
   */
  const handleQuickWhatsapp = async (
    order: CustomerOrderHistoryItem,
    key: QuickWhatsappResponseKey
  ) => {
    const profile = order.customerId
      ? allUsers.find((u) => u.id === order.customerId)
      : undefined;

    // Se for "+1 Selo" e o selo ainda não foi concedido, credita automaticamente
    if (key === 'selo' && !order.loyaltyStampGranted && order.status !== 'cancelado') {
      try {
        await grantLoyaltyStampForOrder(order.id, undefined, true);
      } catch (err) {
        console.warn('Aviso ao conceder selo automaticamente:', err);
      }
    }

    // Se for "Saiu para Entrega" e o pedido ainda estiver nas etapas iniciais, avança para 'enviado'
    if (
      key === 'entrega' &&
      (order.status === 'confirmado' || order.status === 'em_separacao' || order.status === 'recebido')
    ) {
      try {
        await updateCatalogOrderStatus(order.id, 'enviado', {
          origin: 'admin_panel',
          reason: 'Pedido despachado para entrega via botão rápido de WhatsApp',
        });
      } catch (err) {
        console.warn('Aviso ao atualizar status para enviado:', err);
      }
    }

    const result = buildQuickWhatsappUrl(order, key, settings, profile?.loyaltyCard);

    // Copia o texto para a área de transferência como contingência rápida
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(result.message);
      }
    } catch {
      // ignore
    }

    // Se não tiver telefone válido cadastrado, abre o modal para conferência
    if (!result.valid || !result.url) {
      setCustomWhatsappText(result.message);
      setWhatsappModalPhone(order.customerPhone || profile?.phoneWhatsapp || '');
      setCopiedWhatsapp(true);
      setWhatsappModalOrder({ order });
      showFeedback(
        'info',
        'Telefone ausente no pedido. Texto copiado! Digite o número abaixo para abrir o WhatsApp.'
      );
      return;
    }

    const opened = openWhatsAppShare(order.customerPhone || '', result.message);
    if (opened) {
      const label =
        key === 'pix'
          ? 'Chave Pix para Pagamento'
          : key === 'entrega'
          ? 'Pedido Saiu para Entrega'
          : 'Obrigado pela Compra! Ganhou 1 Selo no Cartão';
      showFeedback('success', `WhatsApp aberto (${label}) e mensagem copiada para o clipboard!`);
    }
  };

  const handleSaveTemplates = (e: React.FormEvent) => {
    e.preventDefault();
    saveWhatsappOrderTemplates(whatsappTemplates);
    setIsTemplateConfigOpen(false);
    showFeedback(
      'success',
      'Modelos de mensagens do WhatsApp salvos com sucesso!'
    );
  };

  const handleApplyPreset = (presetId: WhatsappTemplatePresetId) => {
    const preset = WHATSAPP_TEMPLATE_PRESETS[presetId];
    if (!preset) return;
    setActivePresetId(presetId);
    setWhatsappTemplates((prev) => ({
      ...prev,
      presetId,
      templates: { ...preset.templates },
    }));
  };

  const handleInsertVariableIntoActiveStage = (token: string) => {
    setWhatsappTemplates((prev) => {
      const current = prev.templates[activeTemplateStage] || '';
      const separator = current.endsWith(' ') || current.endsWith('\n') || !current ? '' : ' ';
      return {
        ...prev,
        templates: {
          ...prev.templates,
          [activeTemplateStage]: `${current}${separator}${token}`,
        },
      };
    });
  };

  // Sample order for live WhatsApp preview in Template Studio
  const samplePreviewOrder: CustomerOrderHistoryItem = useMemo(() => {
    if (allCatalogOrders.length > 0) {
      return {
        ...allCatalogOrders[0],
        loyaltyStampGranted: true,
        cancelReason:
          allCatalogOrders[0].cancelReason || 'Solicitação do cliente via atendimento',
      };
    }
    return {
      id: 'preview-ord-1',
      referenceId: 'PW-8492',
      customerId: 'preview-cust-1',
      customerName: 'Lucas Duailibe',
      customerPhone: '(86) 99988-7766',
      createdAt: new Date().toISOString(),
      subtotal: 190,
      discount: 10,
      deliveryFee: 10,
      total: 190,
      paymentMethod: 'PIX',
      paymentStatus: 'pago',
      amountPaid: 190,
      deliveryType: 'delivery',
      addressSummary: 'Av. Nossa Senhora de Fátima, 1420 - Fátima, Teresina/PI',
      status: activeTemplateStage,
      loyaltyEligible: true,
      loyaltyStampGranted: true,
      cancelReason: 'Solicitação de reagendamento pelo cliente',
      items: [
        {
          id: 'item-prev-1',
          modelId: 'm1',
          modelName: 'Ignite V150',
          brandName: 'IGNITE',
          flavorId: 'f1',
          flavorName: 'Watermelon Ice',
          flavorEmoji: '🍉',
          flavorColor: '#FF3366',
          imageUrl: '',
          quantity: 1,
          price: 110,
        },
        {
          id: 'item-prev-2',
          modelId: 'm2',
          modelName: 'Elfbar BC10000',
          brandName: 'ELFBAR',
          flavorId: 'f2',
          flavorName: 'Grape Ice',
          flavorEmoji: '🍇',
          flavorColor: '#8423DA',
          imageUrl: '',
          quantity: 1,
          price: 80,
        },
      ],
    };
  }, [allCatalogOrders, activeTemplateStage]);

  const liveTemplatePreviewText = useMemo(
    () =>
      formatWhatsappOrderMessage(
        samplePreviewOrder,
        activeTemplateStage,
        whatsappTemplates,
        {
          stamps: 4,
          goal: defaultGoal,
          completedCards: 0,
          rewardDescription: defaultReward,
        }
      ),
    [samplePreviewOrder, activeTemplateStage, whatsappTemplates, defaultGoal, defaultReward]
  );

  const renderOrderCard = (order: CustomerOrderHistoryItem, compact = false) => {
    const statusMeta = getOrderStatusMeta(order.status);
    const customerProfile = order.customerId
      ? allUsers.find((u) => u.id === order.customerId)
      : undefined;
    const loyaltyEval = evaluateOrderLoyalty(
      order,
      customerProfile,
      defaultGoal,
      defaultReward
    );
    const existingSale = findExistingFinancialSaleForOrder(order, manualSales);
    const payStatus = existingSale?.paymentStatus || order.paymentStatus || 'pendente';
    const isBusy = busyOrderId === order.id;
    const isNewOrder = order.status === 'recebido';

    return (
      <div
        key={order.id}
        className={`rounded-2xl bg-[#11152A] border transition-all p-4 flex flex-col justify-between gap-3 shadow-lg ${
          isNewOrder
            ? 'border-[#00DFFF]/60 shadow-[0_0_16px_rgba(0,223,255,0.14)]'
            : 'border-[#8423DA]/30 hover:border-[#00DFFF]/40'
        }`}
      >
        {/* Top Row: Reference + Elapsed Time + Status Badge */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black text-[#00DFFF] px-2 py-0.5 rounded-lg bg-[#00DFFF]/10 border border-[#00DFFF]/35">
                #{order.referenceId.replace(/^#/, '')}
              </span>
              <span
                className="text-[11px] text-[#A5A5B8] flex items-center gap-1 font-medium"
                title={new Date(order.createdAt).toLocaleString('pt-BR')}
              >
                <Clock className="w-3 h-3 text-[#00DFFF]" />
                {formatElapsedOrderTime(order.createdAt)}
              </span>
            </div>

            <span
              className={`px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider ${statusMeta.badgeClass}`}
            >
              {statusMeta.shortLabel}
            </span>
          </div>

          {/* Customer Info */}
          <div className="flex items-start justify-between gap-2 pt-1">
            <div>
              <h4 className="font-heading font-bold text-white text-sm flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#00DFFF] shrink-0" />
                <span className="truncate max-w-[180px]">
                  {order.customerName || 'Cliente PodWave'}
                </span>
              </h4>
              {order.customerPhone && (
                <p className="text-[11px] text-[#C4C6D8] flex items-center gap-1 mt-0.5">
                  <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>{order.customerPhone}</span>
                </p>
              )}
            </div>

            <div className="text-right">
              <span className="font-heading font-black text-emerald-400 text-sm block tabular-nums">
                R$ {(Number(order.total) || 0).toFixed(2).replace('.', ',')}
              </span>
              <span className="text-[10px] text-[#A5A5B8] block">
                {order.paymentMethod}
              </span>
            </div>
          </div>

          {/* Items Summary */}
          <div className="p-2.5 rounded-xl bg-[#080811]/70 border border-white/5 space-y-1">
            {(order.items || []).slice(0, compact ? 2 : 4).map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-[11px] text-gray-200 gap-2"
              >
                <span className="truncate">
                  <strong className="text-[#00DFFF]">{item.quantity}x</strong>{' '}
                  {item.modelName} — {item.flavorName}
                </span>
                <span className="font-mono text-[10px] text-gray-400 shrink-0">
                  R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                </span>
              </div>
            ))}
            {(order.items || []).length > (compact ? 2 : 4) && (
              <p className="text-[10px] text-[#00DFFF] font-semibold">
                + {(order.items || []).length - (compact ? 2 : 4)} outro(s) item(ns)
              </p>
            )}
          </div>

          {/* Delivery / Pickup & Badges */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-gray-300 font-semibold">
              <MapPin className="w-2.5 h-2.5 text-[#00DFFF]" />
              {order.deliveryType === 'pickup' ? 'Retirada' : 'Entrega'}
            </span>

            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase ${
                payStatus === 'pago'
                  ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
                  : payStatus === 'parcial'
                  ? 'bg-amber-500/15 border-amber-400/40 text-amber-300'
                  : 'bg-rose-500/15 border-rose-400/40 text-rose-300'
              }`}
            >
              <DollarSign className="w-2.5 h-2.5" />
              {payStatus === 'pago'
                ? 'Pago'
                : payStatus === 'parcial'
                ? 'Parcial'
                : 'Pag. Pendente'}
            </span>

            {order.stockDeducted && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-400/40 text-cyan-200 text-[10px] font-bold"
                title="Itens deste pedido já foram descontados automaticamente do estoque"
              >
                <PackageCheck className="w-2.5 h-2.5 text-[#00DFFF]" />
                Estoque Baixado
              </span>
            )}

            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold ${
                loyaltyEval.state === 'granted'
                  ? 'bg-[#00DFFF]/15 border-[#00DFFF]/50 text-[#00DFFF]'
                  : loyaltyEval.state === 'eligible'
                  ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                  : 'bg-white/5 border-white/10 text-gray-400'
              }`}
              title={loyaltyEval.description}
            >
              <Gift className="w-2.5 h-2.5" />
              {loyaltyEval.label}
            </span>

            {existingSale && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-400/40 text-purple-200 text-[10px] font-bold">
                <Briefcase className="w-2.5 h-2.5" />
                Venda Registrada
              </span>
            )}
          </div>
        </div>

        {/* Respostas Rápidas WhatsApp (1 Clique) */}
        <div className="pt-2 border-t border-white/10 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-[#00DFFF] flex items-center gap-1 tracking-wider">
              <MessageSquare className="w-3 h-3 text-emerald-400" />
              WhatsApp 1 Clique
            </span>
            {order.customerPhone ? (
              <span className="text-[10px] text-emerald-400/90 font-mono flex items-center gap-1">
                <Phone className="w-2.5 h-2.5" />
                {order.customerPhone}
              </span>
            ) : (
              <span className="text-[10px] text-amber-400 font-medium">
                Sem telefone
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {/* 1. Chave Pix para Pagamento */}
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void handleQuickWhatsapp(order, 'pix')}
              title="Chave Pix para Pagamento: envia chave Pix, total e itens em 1 clique"
              className="py-1.5 px-1 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/30 border border-emerald-400/35 hover:border-emerald-400 text-emerald-300 text-[10px] font-black flex items-center justify-center gap-1 cursor-pointer transition shadow-sm text-center leading-tight active:scale-95"
            >
              <DollarSign className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="truncate">Chave Pix</span>
            </button>

            {/* 2. Pedido Saiu para Entrega */}
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void handleQuickWhatsapp(order, 'entrega')}
              title="Pedido Saiu para Entrega: notifica despacho com endereço e itens em 1 clique"
              className="py-1.5 px-1 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-400/35 hover:border-cyan-400 text-cyan-300 text-[10px] font-black flex items-center justify-center gap-1 cursor-pointer transition shadow-sm text-center leading-tight active:scale-95"
            >
              <Truck className="w-3 h-3 text-cyan-400 shrink-0" />
              <span className="truncate">Saiu Entrega</span>
            </button>

            {/* 3. Obrigado pela Compra! Ganhou 1 Selo no Cartão */}
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void handleQuickWhatsapp(order, 'selo')}
              title="Obrigado pela Compra! Ganhou 1 Selo no Cartão: credita selo e agradece em 1 clique"
              className="py-1.5 px-1 rounded-xl bg-[#E53CF3]/15 hover:bg-[#E53CF3]/30 border border-[#E53CF3]/35 hover:border-[#E53CF3] text-[#E53CF3] text-[10px] font-black flex items-center justify-center gap-1 cursor-pointer transition shadow-sm text-center leading-tight active:scale-95"
            >
              <Gift className="w-3 h-3 text-[#E53CF3] shrink-0" />
              <span className="truncate">+1 Selo Cartão</span>
            </button>
          </div>
        </div>

        {/* Seletor Visual de Status Rápido (Supabase Realtime) */}
        <div className="pt-2 border-t border-white/10 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-gray-300 flex items-center gap-1 tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Status Visual • Realtime
            </span>
            <span className="text-[9px] text-[#A5A5B8]">
              Clique para alterar estado
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
            {(
              [
                { id: 'recebido', label: 'Pendente', activeClass: 'bg-cyan-500/25 border-[#00DFFF] text-[#00DFFF]' },
                { id: 'confirmado', label: 'Confirmado', activeClass: 'bg-blue-500/25 border-blue-400 text-blue-200' },
                { id: 'em_separacao', label: 'Em Preparo', activeClass: 'bg-amber-500/25 border-amber-400 text-amber-200' },
                { id: 'enviado', label: 'Enviado', activeClass: 'bg-purple-500/25 border-purple-400 text-purple-200' },
                { id: 'entregue', label: 'Entregue', activeClass: 'bg-emerald-500/25 border-emerald-400 text-emerald-200' },
                { id: 'cancelado', label: 'Cancelado', activeClass: 'bg-rose-500/25 border-rose-400 text-rose-200' },
              ] as Array<{ id: CatalogOrderStatus; label: string; activeClass: string }>
            ).map((stage) => {
              const isCurrent = order.status === stage.id;
              return (
                <button
                  key={stage.id}
                  type="button"
                  disabled={isBusy || isCurrent}
                  onClick={() => handleInitiateStatusChange(order, stage.id)}
                  className={`py-1 px-1.5 rounded-lg border text-[9px] font-black uppercase tracking-tight transition-all cursor-pointer truncate ${
                    isCurrent
                      ? `${stage.activeClass} shadow-sm`
                      : 'bg-[#080811]/80 border-white/10 text-gray-400 hover:border-[#00DFFF]/40 hover:text-white'
                  } disabled:cursor-default`}
                  title={`Alterar status do pedido #${order.referenceId} para ${stage.label}`}
                >
                  {isCurrent ? `● ${stage.label}` : stage.label}
                </button>
              );
            })}
          </div>

          {/* Log de Auditoria Simples do Pedido (Data e Horário de cada mudança de status) */}
          <div className="mt-2 p-2.5 rounded-xl bg-[#080811]/90 border border-[#8423DA]/25 space-y-1.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-black uppercase tracking-wider text-[#00DFFF] flex items-center gap-1">
                <History className="w-3 h-3 text-[#00DFFF]" />
                <span>Log de Auditoria de Status</span>
              </span>
              <span className="text-[9px] font-mono text-gray-400">
                {(order.statusHistory?.length || 1)}{' '}
                {(order.statusHistory?.length || 1) === 1 ? 'registro' : 'registros'}
              </span>
            </div>

            <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
              {(order.statusHistory && order.statusHistory.length > 0
                ? [...order.statusHistory].reverse().slice(0, 4)
                : [
                    {
                      id: 'init',
                      fromStatus: null,
                      toStatus: order.status,
                      changedAt: order.updatedAt || order.createdAt,
                      changedBy: order.updatedBy || order.customerName || 'Sistema',
                      origin: 'checkout' as const,
                    },
                  ]
              ).map((entry, idx) => {
                const formattedDt = new Date(entry.changedAt).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });
                const fromLabel = entry.fromStatus
                  ? getOrderStatusMeta(entry.fromStatus).shortLabel
                  : 'Criação';
                const toLabel = getOrderStatusMeta(entry.toStatus).shortLabel;
                return (
                  <div
                    key={`${entry.id}-${idx}`}
                    className="flex items-center justify-between gap-2 text-[10px] py-0.5 border-b border-white/5 last:border-0"
                  >
                    <div className="flex items-center gap-1 min-w-0 truncate">
                      <span className="text-gray-400 truncate">{fromLabel}</span>
                      <ArrowRight className="w-2.5 h-2.5 text-[#00DFFF] shrink-0" />
                      <span className="font-bold text-white truncate">{toLabel}</span>
                    </div>
                    <span className="font-mono text-[9px] text-emerald-300 shrink-0 tabular-nums">
                      {formattedDt}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Fast Action Bar */}
        <div className="pt-2 border-t border-white/10 flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {statusMeta.nextStatus && (
              <button
                type="button"
                disabled={isBusy}
                onClick={() =>
                  handleInitiateStatusChange(order, statusMeta.nextStatus!)
                }
                className="flex-1 min-w-[130px] py-2 px-2.5 rounded-xl bg-gradient-to-r from-[#8423DA] via-[#007BFF] to-[#00DFFF] hover:brightness-110 text-white font-black text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition disabled:opacity-50"
              >
                <span>{statusMeta.nextActionLabel}</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </button>
            )}

            {order.status === 'entregue' && (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => setDeliveredPromptOrderId(order.id)}
                className="flex-1 min-w-[130px] py-2 px-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition"
              >
                <Gift className="w-3.5 h-3.5 text-[#00DFFF] shrink-0" />
                <span>Ações Pós-Entrega</span>
              </button>
            )}

            {order.status !== 'cancelado' && !order.loyaltyStampGranted && (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => handleGrantStamp(order, true)}
                title="Creditar +1 Selo Fidelidade para este pedido"
                className="px-2.5 py-2 rounded-xl bg-[#E53CF3]/15 hover:bg-[#E53CF3]/30 border border-[#E53CF3]/40 text-[#E53CF3] text-[11px] font-black flex items-center gap-1 cursor-pointer transition shrink-0 disabled:opacity-40"
              >
                <Gift className="w-3.5 h-3.5 shrink-0" />
                <span>+1 Selo</span>
              </button>
            )}

            {order.status !== 'cancelado' && !existingSale && (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => handleRecordInFinancial(order)}
                title="Registrar pedido em Minhas Vendas (Meu Negócio)"
                className="px-2.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/40 text-purple-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition shrink-0 disabled:opacity-40"
              >
                <Briefcase className="w-3.5 h-3.5 text-[#00DFFF] shrink-0" />
                <span>Lançar Venda</span>
              </button>
            )}

            {existingSale && onOpenBusinessTab && (
              <button
                type="button"
                onClick={onOpenBusinessTab}
                title="Ver venda registrada na aba Meu Negócio"
                className="px-2.5 py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-400/40 text-purple-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition shrink-0"
              >
                <Briefcase className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Meu Negócio</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => openWhatsappComposer(order)}
              aria-label={`Preparar mensagem de WhatsApp para pedido ${order.referenceId}`}
              title="Preparar mensagem de WhatsApp"
              className="p-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-300 cursor-pointer transition shrink-0"
            >
              <MessageSquare className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setReceiptOrder(order)}
              aria-label={`Imprimir comprovante térmico para pedido #${order.referenceId}`}
              title="Imprimir Comprovante Térmico (58mm / 80mm) para Balcão ou Motoboy"
              className="px-2.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/35 border border-purple-400/40 hover:border-purple-300 text-purple-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition shrink-0 active:scale-95"
            >
              <Printer className="w-3.5 h-3.5 text-[#00DFFF] shrink-0" />
              <span>Imprimir</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedOrderId(order.id)}
              className="px-2.5 py-2 rounded-xl bg-[#181D3D] hover:bg-[#8423DA]/30 border border-white/10 text-gray-200 text-[11px] font-bold cursor-pointer transition shrink-0"
            >
              Detalhes
            </button>

            <button
              type="button"
              disabled={isBusy}
              onClick={() => setConfirmDeleteOrder(order)}
              aria-label={`Excluir pedido #${order.referenceId}`}
              title="Excluir pedido da Central de Pedidos"
              className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/35 text-rose-300 cursor-pointer transition shrink-0 disabled:opacity-40"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#141838] via-[#11152A] to-[#181D3D] border-2 border-[#00DFFF]/35 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00DFFF]/15 border border-[#00DFFF]/40 text-[#00DFFF] text-[11px] font-black uppercase tracking-wider">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Central Inteligente de Pedidos • Tempo Real</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-[10px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Supabase Realtime Ativo</span>
            </div>
          </div>
          <h2 className="font-heading text-2xl sm:text-3xl font-black text-white">
            Gerenciamento de Pedidos, Fidelidade e Financeiro
          </h2>
          <p className="text-xs sm:text-sm text-[#A5A5B8] max-w-2xl">
            Acompanhe a fila de pedidos do catálogo com escuta instantânea via Supabase Realtime, altere o status visual (Pendente, Confirmado, Em Preparo, Enviado, Entregue) em 1 clique e integre vendas reais ao módulo Meu Negócio.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onOpenBusinessTab && (
            <button
              type="button"
              onClick={onOpenBusinessTab}
              className="px-3.5 py-2.5 rounded-xl bg-purple-600/25 hover:bg-purple-600/40 border border-purple-400/50 text-xs font-black text-purple-200 flex items-center gap-1.5 cursor-pointer transition"
            >
              <Briefcase className="w-4 h-4 text-[#00DFFF]" />
              <span>Abrir Meu Negócio</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsStatusAuditOpen((prev) => !prev)}
            className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
              isStatusAuditOpen
                ? 'bg-[#00DFFF]/20 border-[#00DFFF] text-[#00DFFF]'
                : 'bg-[#181D3D] hover:bg-[#8423DA]/30 border-[#8423DA]/40 text-gray-200'
            }`}
          >
            <History className="w-4 h-4 text-[#00DFFF]" />
            <span>Log de Auditoria ({orderStatusAuditEntries.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setIsTemplateConfigOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-[#181D3D] hover:bg-[#8423DA]/30 border border-[#8423DA]/40 text-xs font-bold text-gray-200 flex items-center gap-1.5 cursor-pointer transition"
          >
            <Settings className="w-4 h-4 text-[#00DFFF]" />
            <span>Modelos WhatsApp</span>
          </button>

          <button
            type="button"
            disabled={isLoadingCatalogOrders}
            onClick={() => void fetchAllCatalogOrders()}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00DFFF] to-[#007BFF] text-[#080811] font-black text-xs flex items-center gap-1.5 cursor-pointer transition hover:brightness-110 disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoadingCatalogOrders ? 'animate-spin' : ''}`}
            />
            <span>
              {isLoadingCatalogOrders ? 'Atualizando...' : 'Atualizar Pedidos'}
            </span>
          </button>
        </div>
      </div>

      {/* LOG DE AUDITORIA SIMPLES DE ALTERAÇÕES DE STATUS DE PEDIDO */}
      {isStatusAuditOpen && (
        <div className="p-5 rounded-3xl bg-[#0D1022] border-2 border-[#00DFFF]/35 shadow-xl space-y-3 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#00DFFF]/15 border border-[#00DFFF]/40 flex items-center justify-center text-[#00DFFF]">
                <History className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-heading text-sm sm:text-base font-black text-white flex items-center gap-2">
                  <span>Log de Auditoria de Status de Pedidos</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-[10px] font-mono">
                    {orderStatusAuditEntries.length} registro(s)
                  </span>
                </h3>
                <p className="text-[11px] text-[#A5A5B8]">
                  Histórico cronológico de processamento de cada venda com data, horário exato, status anterior, novo status e responsável.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsStatusAuditOpen(false)}
              className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-[#141838] hover:bg-white/10 border border-white/10 text-[11px] font-bold text-gray-300 cursor-pointer"
            >
              Ocultar Log
            </button>
          </div>

          {orderStatusAuditEntries.length === 0 ? (
            <p className="text-xs text-[#A5A5B8] py-4 text-center">
              Nenhuma alteração de status registrada até o momento. Assim que um pedido for recebido ou tiver o status alterado, o histórico aparecerá aqui com data e hora.
            </p>
          ) : (
            <div className="max-h-60 overflow-y-auto pr-1 space-y-1.5">
              {orderStatusAuditEntries.slice(0, 30).map((item) => {
                const formattedDate = new Date(item.changedAt).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                });
                const formattedTime = new Date(item.changedAt).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });
                const fromMeta = item.fromStatus ? getOrderStatusMeta(item.fromStatus) : null;
                const toMeta = getOrderStatusMeta(item.toStatus);

                return (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-[#141838]/90 border border-white/10 hover:border-[#00DFFF]/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span className="font-mono text-[11px] font-black text-emerald-300 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-400/30 tabular-nums shrink-0">
                        📅 {formattedDate} às {formattedTime}
                      </span>

                      <button
                        type="button"
                        onClick={() => setSelectedOrderId(item.orderId)}
                        className="font-mono text-xs font-black text-[#00DFFF] hover:underline cursor-pointer shrink-0"
                        title="Abrir detalhes completos deste pedido"
                      >
                        #{item.referenceId}
                      </button>

                      <span className="text-gray-200 font-bold truncate max-w-[160px]">
                        {item.customerName}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-gray-300 font-semibold">
                          {fromMeta ? fromMeta.shortLabel : 'Novo Pedido'}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-[#00DFFF] shrink-0" />
                        <span
                          className={`px-2 py-0.5 rounded-md border text-[10px] font-black uppercase ${toMeta.badgeClass}`}
                        >
                          {toMeta.shortLabel}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-[#A5A5B8] shrink-0">
                      {item.reason && (
                        <span className="text-amber-300 italic truncate max-w-[200px]">
                          "{item.reason}"
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded bg-[#0D1022] border border-white/10 text-[10px] text-gray-300 font-mono">
                        Por: {item.changedBy}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Feedback Banner */}
      {feedbackBanner && (
        <div
          role="status"
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between gap-3 ${
            feedbackBanner.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-200'
              : feedbackBanner.type === 'error'
              ? 'bg-rose-500/15 border-rose-400/50 text-rose-200'
              : 'bg-cyan-500/15 border-cyan-400/50 text-cyan-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackBanner.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            <span>{feedbackBanner.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            aria-label="Fechar aviso"
            className="text-gray-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error State with Retry Button (Section 1 / 11) */}
      {catalogOrdersError && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <p className="font-bold text-white">
                Falha ao consultar pedidos no servidor
              </p>
              <p className="text-rose-200/90">{catalogOrdersError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void fetchAllCatalogOrders()}
            className="px-3.5 py-2 rounded-xl bg-rose-500/25 hover:bg-rose-500/35 border border-rose-400/50 text-white font-bold text-xs cursor-pointer shrink-0"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* 3.1 Period Filter + Real Dashboard KPIs */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                ['hoje', 'Hoje'],
                ['ultimos_7_dias', 'Últimos 7 dias'],
                ['mes_atual', 'Mês atual'],
                ['personalizado', 'Personalizado'],
                ['todos', 'Todo o histórico'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setPeriodFilter(key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  periodFilter === key
                    ? 'bg-[#00DFFF] text-[#080811] border-[#00DFFF] font-black'
                    : 'bg-[#11152A] text-gray-300 border-white/10 hover:border-[#00DFFF]/40'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {periodFilter === 'personalizado' && (
            <div className="flex items-center gap-2 text-xs">
              <label className="text-gray-300 font-semibold">
                De:
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="ml-1.5 p-1.5 rounded-lg bg-[#11152A] border border-white/15 text-white"
                />
              </label>
              <label className="text-gray-300 font-semibold">
                Até:
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="ml-1.5 p-1.5 rounded-lg bg-[#11152A] border border-white/15 text-white"
                />
              </label>
            </div>
          )}
        </div>

        {/* 8 Real Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          <div className="p-3.5 rounded-2xl bg-[#11152A] border border-cyan-500/35 space-y-1">
            <span className="text-[10px] font-bold uppercase text-cyan-300 block">
              Recebidos
            </span>
            <span className="font-heading text-2xl font-black text-white tabular-nums">
              {kpis.recebidos}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#11152A] border border-blue-500/35 space-y-1">
            <span className="text-[10px] font-bold uppercase text-blue-300 block">
              Aguard. Separação
            </span>
            <span className="font-heading text-2xl font-black text-white tabular-nums">
              {kpis.aguardandoSeparacao}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#11152A] border border-purple-500/35 space-y-1">
            <span className="text-[10px] font-bold uppercase text-purple-300 block">
              Em Separação
            </span>
            <span className="font-heading text-2xl font-black text-white tabular-nums">
              {kpis.emSeparacao}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#11152A] border border-amber-500/35 space-y-1">
            <span className="text-[10px] font-bold uppercase text-amber-300 block">
              Enviados
            </span>
            <span className="font-heading text-2xl font-black text-white tabular-nums">
              {kpis.enviados}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#11152A] border border-emerald-500/35 space-y-1">
            <span className="text-[10px] font-bold uppercase text-emerald-300 block">
              Entregues
            </span>
            <span className="font-heading text-2xl font-black text-white tabular-nums">
              {kpis.entregues}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#11152A] border border-rose-500/35 space-y-1">
            <span className="text-[10px] font-bold uppercase text-rose-300 block">
              Cancelados
            </span>
            <span className="font-heading text-2xl font-black text-white tabular-nums">
              {kpis.cancelados}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#11152A] border border-orange-500/35 space-y-1">
            <span className="text-[10px] font-bold uppercase text-orange-300 block">
              Pag. Pendente ({kpis.pagamentoPendenteCount})
            </span>
            <span className="font-heading text-base font-black text-orange-200 tabular-nums block">
              R$ {kpis.pagamentoPendenteTotal.toFixed(2).replace('.', ',')}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/50 to-[#11152A] border border-emerald-400/50 space-y-1">
            <span className="text-[10px] font-black uppercase text-emerald-300 block">
              Faturamento Pago
            </span>
            <span className="font-heading text-base font-black text-emerald-300 tabular-nums block">
              R$ {kpis.faturamentoPago.toFixed(2).replace('.', ',')}
            </span>
          </div>
        </div>
      </div>

      {/* Search, Filters & View Mode Switcher */}
      <div className="p-4 rounded-2xl bg-[#11152A] border border-[#8423DA]/30 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por #referência, nome do cliente, WhatsApp ou produto..."
            aria-label="Buscar pedidos"
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#080811] border border-white/10 text-xs text-white focus:outline-none focus:border-[#00DFFF]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            aria-label="Filtrar por status do pedido"
            className="px-3 py-2 rounded-xl bg-[#080811] border border-white/10 text-xs text-white font-semibold"
          >
            <option value="all">Todos os Status</option>
            {ORDER_STATUS_LIST.map((s) => (
              <option key={s.status} value={s.status}>
                {s.label}
              </option>
            ))}
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value as any)}
            aria-label="Filtrar por situação do pagamento"
            className="px-3 py-2 rounded-xl bg-[#080811] border border-white/10 text-xs text-white font-semibold"
          >
            <option value="all">Todos os Pagamentos</option>
            <option value="pendente">Pagamento Pendente</option>
            <option value="parcial">Pagamento Parcial</option>
            <option value="pago">Pagamento Quitado (Pago)</option>
          </select>

          <div className="flex rounded-xl bg-[#080811] p-1 border border-white/10">
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-[#8423DA] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Fila</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-[#8423DA] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Grade</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Orders Content: Loading / Empty / Kanban / Grid */}
      {isLoadingCatalogOrders && allCatalogOrders.length === 0 ? (
        <div className="py-16 text-center space-y-3 rounded-3xl bg-[#11152A]/60 border border-white/10">
          <RefreshCw className="w-8 h-8 text-[#00DFFF] animate-spin mx-auto" />
          <p className="text-sm font-bold text-white">
            Consultando pedidos registrados no banco...
          </p>
        </div>
      ) : visibleOrders.length === 0 && !catalogOrdersError ? (
        <div className="py-16 text-center space-y-3 rounded-3xl bg-[#11152A]/60 border border-white/10">
          <ShoppingBag className="w-10 h-10 text-[#00DFFF] mx-auto opacity-80" />
          <div>
            <h3 className="font-heading text-base font-bold text-white">
              Nenhum pedido encontrado para os filtros selecionados
            </h3>
            <p className="text-xs text-[#A5A5B8] max-w-md mx-auto mt-1">
              Assim que clientes autenticados registrarem pedidos no catálogo, eles aparecerão organizados nesta fila em tempo real.
            </p>
          </div>
        </div>
      ) : viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 items-start">
          {ORDER_STATUS_LIST.filter((s) => s.status !== 'cancelado').map(
            (stage) => {
              const stageOrders = visibleOrders.filter(
                (o) => o.status === stage.status
              );
              return (
                <div
                  key={stage.status}
                  className={`rounded-2xl bg-[#0B0E1D] border ${stage.columnBorderClass} p-3 space-y-3`}
                >
                  <div className="flex items-center justify-between px-1">
                    <span className="font-heading font-black text-xs text-white uppercase tracking-wider">
                      {stage.shortLabel}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-black border ${stage.badgeClass}`}
                    >
                      {stageOrders.length}
                    </span>
                  </div>

                  <div className="space-y-3 max-h-[68vh] overflow-y-auto pr-0.5">
                    {stageOrders.length === 0 ? (
                      <div className="py-8 text-center rounded-xl border border-dashed border-white/10 text-[11px] text-gray-500">
                        Sem pedidos nesta etapa
                      </div>
                    ) : (
                      stageOrders.map((ord) => renderOrderCard(ord, true))
                    )}
                  </div>
                </div>
              );
            }
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleOrders.map((ord) => renderOrderCard(ord, false))}
        </div>
      )}

      {/* ===================== MODAL DE DETALHES COMPLETOS DO PEDIDO ===================== */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-detail-modal-title"
        >
          <div className="w-full max-w-2xl rounded-3xl bg-[#0D1022] border-2 border-[#00DFFF]/40 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
            <div className="p-5 bg-[#141838] border-b border-white/10 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black text-[#00DFFF] px-2.5 py-0.5 rounded-lg bg-[#00DFFF]/15 border border-[#00DFFF]/40">
                    #{selectedOrder.referenceId.replace(/^#/, '')}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase ${
                      getOrderStatusMeta(selectedOrder.status).badgeClass
                    }`}
                  >
                    {getOrderStatusMeta(selectedOrder.status).label}
                  </span>
                </div>
                <h3
                  id="order-detail-modal-title"
                  className="font-heading text-base font-black text-white mt-1"
                >
                  Detalhes e Auditoria do Pedido
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrderId(null)}
                aria-label="Fechar detalhes do pedido"
                className="min-w-[44px] min-h-[44px] rounded-xl bg-[#181D3D] hover:bg-[#8423DA]/30 text-gray-300 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 text-xs">
              <OrderStatusTimeline
                status={selectedOrder.status}
                cancelReason={selectedOrder.cancelReason}
                statusHistory={selectedOrder.statusHistory}
              />

              {/* Customer & Delivery Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#141838] border border-white/10 space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-[#00DFFF] block">
                    Dados do Cliente
                  </span>
                  <p className="font-bold text-white text-sm">
                    {selectedOrder.customerName || 'Cliente PodWave'}
                  </p>
                  {selectedOrder.customerPhone && (
                    <p className="text-gray-300">
                      WhatsApp: {selectedOrder.customerPhone}
                    </p>
                  )}
                  {selectedOrder.customerEmail && (
                    <p className="text-gray-400">
                      E-mail: {selectedOrder.customerEmail}
                    </p>
                  )}
                  {selectedOrder.customerId && onOpenUserInTab && (
                    <button
                      type="button"
                      onClick={() => {
                        const cid = selectedOrder.customerId!;
                        setSelectedOrderId(null);
                        onOpenUserInTab(cid);
                      }}
                      className="mt-1 inline-flex items-center gap-1 text-[#00DFFF] hover:underline font-bold cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Abrir Ficha Completa do Cliente</span>
                    </button>
                  )}
                </div>

                <div className="p-3.5 rounded-2xl bg-[#141838] border border-white/10 space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-[#00DFFF] block">
                    Entrega & Pagamento
                  </span>
                  <p className="font-bold text-white">
                    {selectedOrder.deliveryType === 'pickup'
                      ? 'Retirada no Local'
                      : 'Entrega no Endereço'}
                  </p>
                  {selectedOrder.addressSummary && (
                    <p className="text-gray-300">
                      {selectedOrder.addressSummary}
                    </p>
                  )}
                  <p className="text-gray-300">
                    Forma de pagamento:{' '}
                    <strong className="text-white">
                      {selectedOrder.paymentMethod}
                    </strong>
                  </p>
                  {selectedOrder.customerNotes && (
                    <p className="text-amber-200 bg-amber-500/10 border border-amber-400/30 rounded-lg p-2 mt-1">
                      Obs. do cliente: {selectedOrder.customerNotes}
                    </p>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="rounded-2xl bg-[#141838] border border-white/10 p-4 space-y-2.5">
                <h4 className="font-heading font-bold text-white text-xs uppercase tracking-wider">
                  Itens do Pedido ({(selectedOrder.items || []).length})
                </h4>
                <div className="divide-y divide-white/5">
                  {(selectedOrder.items || []).map((item, idx) => (
                    <div
                      key={idx}
                      className="py-2 flex items-center justify-between gap-3"
                    >
                      <div>
                        <p className="font-bold text-white">
                          {item.quantity}x [{item.brandName}] {item.modelName}
                        </p>
                        <p className="text-[11px] text-[#00DFFF]">
                          Sabor: {item.flavorName} {item.flavorEmoji || ''}
                        </p>
                      </div>
                      <span className="font-mono font-bold text-white tabular-nums">
                        R${' '}
                        {(item.price * item.quantity)
                          .toFixed(2)
                          .replace('.', ',')}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-white/10 space-y-1">
                  <div className="flex justify-between text-gray-400">
                    <span>Subtotal:</span>
                    <span>
                      R$ {selectedOrder.subtotal.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  {selectedOrder.discount > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Descontos aplicados:</span>
                      <span>
                        - R$ {selectedOrder.discount.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  )}
                  {(selectedOrder.deliveryFee || 0) > 0 && (
                    <div className="flex justify-between text-gray-300">
                      <span>Taxa de entrega:</span>
                      <span>
                        R${' '}
                        {(selectedOrder.deliveryFee || 0)
                          .toFixed(2)
                          .replace('.', ',')}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black text-white pt-1">
                    <span>Valor Total:</span>
                    <span className="text-emerald-400">
                      R$ {selectedOrder.total.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status, Payment, Loyalty & Financial Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#141838] border border-white/10 space-y-2">
                  <label className="block text-[10px] font-black uppercase text-[#00DFFF]">
                    Alterar Etapa do Pedido
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {ORDER_STATUS_LIST.map((st) => (
                      <button
                        key={st.status}
                        type="button"
                        disabled={
                          busyOrderId === selectedOrder.id ||
                          selectedOrder.status === st.status
                        }
                        onClick={() =>
                          handleInitiateStatusChange(selectedOrder, st.status)
                        }
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                          selectedOrder.status === st.status
                            ? `${st.badgeClass} ring-1 ring-white/30`
                            : 'bg-[#080811] text-gray-300 border-white/10 hover:border-[#00DFFF]/50'
                        }`}
                      >
                        {st.shortLabel}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#141838] border border-white/10 space-y-2">
                  <label className="block text-[10px] font-black uppercase text-[#00DFFF]">
                    Situação do Pagamento
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        ['pendente', 'Pendente'],
                        ['parcial', 'Parcial'],
                        ['pago', 'Pago (Quitado)'],
                      ] as const
                    ).map(([payKey, payLabel]) => (
                      <button
                        key={payKey}
                        type="button"
                        disabled={busyOrderId === selectedOrder.id}
                        onClick={() =>
                          handlePaymentStatusChange(selectedOrder, payKey)
                        }
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                          (selectedOrder.paymentStatus || 'pendente') === payKey
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-black'
                            : 'bg-[#080811] text-gray-300 border-white/10 hover:border-emerald-400/40'
                        }`}
                      >
                        {payLabel}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Loyalty, Stock & Financial Quick Integration */}
              <div className="p-4 rounded-2xl bg-[#141838] border border-[#8423DA]/35 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase text-[#00DFFF] block">
                      Fidelidade, Estoque & Financeiro ("Meu Negócio")
                    </span>
                    {selectedOrder.stockDeducted && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-400/40 text-cyan-200 text-[10px] font-bold">
                        <PackageCheck className="w-3 h-3 text-[#00DFFF]" />
                        Estoque Baixado
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-300">
                    {selectedOrder.loyaltyStampGranted
                      ? '✓ Selo fidelidade já creditado para este pedido.'
                      : 'Credite +1 selo ao entregar ou lance a venda sem duplicidade.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={
                      busyOrderId === selectedOrder.id ||
                      selectedOrder.loyaltyStampGranted === true ||
                      selectedOrder.status === 'cancelado'
                    }
                    onClick={() => handleGrantStamp(selectedOrder, true)}
                    className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                  >
                    <Gift className="w-3.5 h-3.5" />
                    <span>
                      {selectedOrder.loyaltyStampGranted
                        ? 'Selo já concedido'
                        : 'Creditar +1 Selo'}
                    </span>
                  </button>

                  {findExistingFinancialSaleForOrder(
                    selectedOrder,
                    manualSales
                  ) ? (
                    <span className="px-3 py-2 rounded-xl bg-purple-500/20 border border-purple-400/50 text-purple-200 font-bold text-xs flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Venda já registrada</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={
                        busyOrderId === selectedOrder.id ||
                        selectedOrder.status === 'cancelado'
                      }
                      onClick={() => handleRecordInFinancial(selectedOrder)}
                      className="px-3 py-2 rounded-xl bg-[#00DFFF]/20 hover:bg-[#00DFFF]/30 border border-[#00DFFF]/50 text-[#00DFFF] font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                    >
                      <Briefcase className="w-3.5 h-3.5" />
                      <span>Registrar no Financeiro</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => openWhatsappComposer(selectedOrder)}
                    className="px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 text-emerald-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Personalizar WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReceiptOrder(selectedOrder)}
                    className="px-3 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/35 border border-purple-400/50 text-purple-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#00DFFF]" />
                    <span>Imprimir Comprovante (58/80mm)</span>
                  </button>

                  <button
                    type="button"
                    disabled={busyOrderId === selectedOrder.id}
                    onClick={() => setConfirmDeleteOrder(selectedOrder)}
                    className="px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/35 border border-rose-400/50 text-rose-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-40"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Excluir Pedido</span>
                  </button>
                </div>
              </div>

              {/* Respostas Rápidas WhatsApp de 1 Clique no Modal de Detalhes */}
              <div className="p-4 rounded-2xl bg-[#11152A] border border-emerald-500/35 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    <span className="font-heading font-black text-xs text-white uppercase tracking-wider">
                      Respostas Rápidas WhatsApp (1 Clique)
                    </span>
                  </div>
                  <span className="text-[11px] text-[#A5A5B8]">
                    Abre a conversa oficial e copia a mensagem pronta para a área de transferência
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => void handleQuickWhatsapp(selectedOrder, 'pix')}
                    className="p-3.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/40 text-emerald-200 text-xs font-bold flex flex-col items-center justify-center gap-1.5 cursor-pointer transition text-center shadow-sm active:scale-95"
                  >
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <span className="font-black text-white">Chave Pix para Pagamento</span>
                    <span className="text-[10px] text-emerald-300/80">Valor, chave Pix e dados</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleQuickWhatsapp(selectedOrder, 'entrega')}
                    className="p-3.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 text-cyan-200 text-xs font-bold flex flex-col items-center justify-center gap-1.5 cursor-pointer transition text-center shadow-sm active:scale-95"
                  >
                    <Truck className="w-4 h-4 text-cyan-400" />
                    <span className="font-black text-white">Pedido Saiu para Entrega</span>
                    <span className="text-[10px] text-cyan-300/80">Endereço e despacho</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleQuickWhatsapp(selectedOrder, 'selo')}
                    className="p-3.5 rounded-xl bg-[#E53CF3]/15 hover:bg-[#E53CF3]/25 border border-[#E53CF3]/40 text-[#E53CF3] text-xs font-bold flex flex-col items-center justify-center gap-1.5 cursor-pointer transition text-center shadow-sm active:scale-95"
                  >
                    <Gift className="w-4 h-4 text-[#E53CF3]" />
                    <span className="font-black text-white">+1 Selo no Cartão</span>
                    <span className="text-[10px] text-purple-300/80">Agradecimento e crédito</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL PÓS-ENTREGA (SECTION 5.1) ===================== */}
      {deliveredPromptOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delivered-prompt-title"
        >
          <div className="w-full max-w-lg rounded-3xl bg-[#0D1022] border-2 border-emerald-400/50 shadow-2xl p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-300 shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3
                    id="delivered-prompt-title"
                    className="font-heading text-lg font-black text-white"
                  >
                    Pedido entregue com sucesso!
                  </h3>
                  <p className="text-xs text-[#A5A5B8]">
                    Pedido #{deliveredPromptOrder.referenceId} •{' '}
                    {deliveredPromptOrder.customerName || 'Cliente PodWave'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeliveredPromptOrderId(null)}
                aria-label="Fechar confirmação de entrega"
                className="p-2 rounded-xl bg-[#141838] text-gray-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              {/* Option 1: Loyalty Stamp */}
              <div className="p-3.5 rounded-2xl bg-[#141838] border border-white/10 flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-white flex items-center gap-1.5">
                    <Gift className="w-4 h-4 text-[#00DFFF]" />
                    <span>1. Cartão Fidelidade (+1 Selo)</span>
                  </p>
                  <p className="text-[11px] text-[#A5A5B8] mt-0.5">
                    {deliveredPromptOrder.loyaltyStampGranted
                      ? 'Selo já concedido e auditado para este pedido.'
                      : (deliveredPromptOrder.paymentStatus || 'pendente') !==
                        'pago'
                      ? 'Atenção: pagamento ainda consta como pendente. Confirme o pagamento ou autorize manualmente.'
                      : 'Cliente elegível para receber +1 selo validado.'}
                  </p>
                </div>

                {deliveredPromptOrder.loyaltyStampGranted ? (
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold shrink-0">
                    ✓ Creditado
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={busyOrderId === deliveredPromptOrder.id}
                    onClick={() => handleGrantStamp(deliveredPromptOrder, true)}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#8423DA] to-[#00DFFF] text-white font-black cursor-pointer shrink-0 disabled:opacity-40"
                  >
                    Creditar +1 Selo
                  </button>
                )}
              </div>

              {/* Option 2: Financial Sale */}
              <div className="p-3.5 rounded-2xl bg-[#141838] border border-white/10 flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-white flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-purple-400" />
                    <span>2. Lançar em Minhas Vendas (Financeiro)</span>
                  </p>
                  <p className="text-[11px] text-[#A5A5B8] mt-0.5">
                    Registra o pedido no módulo Meu Negócio com proteção contra duplicidade.
                  </p>
                </div>

                {findExistingFinancialSaleForOrder(
                  deliveredPromptOrder,
                  manualSales
                ) ? (
                  <span className="px-3 py-1.5 rounded-xl bg-purple-500/20 border border-purple-400/40 text-purple-200 font-bold shrink-0">
                    Venda já registrada
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={busyOrderId === deliveredPromptOrder.id}
                    onClick={() =>
                      handleRecordInFinancial(deliveredPromptOrder)
                    }
                    className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black cursor-pointer shrink-0 disabled:opacity-40"
                  >
                    Registrar Venda
                  </button>
                )}
              </div>

              {/* Option 3: WhatsApp Notification */}
              <div className="p-3.5 rounded-2xl bg-[#141838] border border-white/10 flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-white flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    <span>3. Avisar Cliente no WhatsApp</span>
                  </p>
                  <p className="text-[11px] text-[#A5A5B8] mt-0.5">
                    Prepara a mensagem de entrega (incluindo confirmação do selo se já creditado).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    openWhatsappComposer(deliveredPromptOrder, 'entregue')
                  }
                  className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 text-emerald-200 font-black cursor-pointer shrink-0"
                >
                  Abrir WhatsApp
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setDeliveredPromptOrderId(null)}
                className="px-5 py-2.5 rounded-xl bg-[#181D3D] hover:bg-white/10 text-white text-xs font-bold cursor-pointer"
              >
                Concluir sem ações adicionais
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL DE JUSTIFICATIVA (CANCELAMENTO / REABERTURA) ===================== */}
      {reasonModalState && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-3xl bg-[#0D1022] border-2 border-rose-500/40 p-6 space-y-4">
            <h3 className="font-heading text-base font-black text-white">
              {reasonModalState.title}
            </h3>
            <p className="text-xs text-[#A5A5B8]">
              Esta alteração exige uma justificativa que ficará preservada no histórico de auditoria do pedido.
            </p>
            <textarea
              rows={3}
              value={reasonInput}
              onChange={(e) => setReasonInput(e.target.value)}
              placeholder="Informe o motivo ou justificativa (mínimo 3 caracteres)..."
              className="w-full p-3 rounded-xl bg-[#141838] border border-white/15 text-xs text-white focus:outline-none focus:border-[#00DFFF]"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReasonModalState(null)}
                className="px-4 py-2 rounded-xl bg-[#141838] text-gray-300 text-xs font-bold cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={reasonInput.trim().length < 3}
                onClick={() =>
                  void executeStatusChange(
                    reasonModalState.orderId,
                    reasonModalState.targetStatus,
                    reasonInput
                  )
                }
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-black cursor-pointer disabled:opacity-40"
              >
                Confirmar Alteração
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE PEDIDO ===================== */}
      {confirmDeleteOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-3xl bg-[#0D1022] border-2 border-rose-500/50 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading text-base font-black text-white">
                  Excluir Pedido #{confirmDeleteOrder.referenceId}
                </h3>
                <p className="text-xs text-[#A5A5B8]">
                  Cliente: {confirmDeleteOrder.customerName || 'Cliente PodWave'}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              Tem certeza que deseja excluir permanentemente este pedido da Central de Pedidos e do banco de dados?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteOrder(null)}
                className="px-4 py-2 rounded-xl bg-[#141838] hover:bg-white/10 text-gray-300 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={busyOrderId === confirmDeleteOrder.id}
                onClick={() => void handleConfirmDeleteOrder()}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Permanentemente</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL DE PRÉVIA E ENVIO WHATSAPP (SECTION 7) ===================== */}
      {whatsappModalOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-xl rounded-3xl bg-[#0D1022] border-2 border-emerald-500/40 p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-heading text-base font-black text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-400" />
                <span>Comunicação Interativa pelo WhatsApp</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTemplateStage(
                      whatsappModalOrder.statusContext || whatsappModalOrder.order.status
                    );
                    setIsTemplateConfigOpen(true);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-[#141838] hover:bg-[#8423DA]/30 border border-[#8423DA]/40 text-[11px] font-bold text-[#00DFFF] flex items-center gap-1 cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Personalizar Modelos</span>
                </button>
                <button
                  type="button"
                  onClick={() => setWhatsappModalOrder(null)}
                  aria-label="Fechar janela de WhatsApp"
                  className="p-2 rounded-xl bg-[#141838] text-gray-300 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Stage Quick Switcher inside Composer */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase text-[#00DFFF] block">
                Escolher modelo por etapa do pedido:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {ORDER_STATUS_LIST.map((st) => {
                  const currentStage =
                    whatsappModalOrder.statusContext || whatsappModalOrder.order.status;
                  return (
                    <button
                      key={st.status}
                      type="button"
                      onClick={() =>
                        openWhatsappComposer(whatsappModalOrder.order, st.status)
                      }
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                        currentStage === st.status
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-black'
                          : 'bg-[#141838] border-white/10 text-gray-300 hover:border-emerald-400/40'
                      }`}
                    >
                      {st.shortLabel}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Editable WhatsApp Phone Number */}
            <div className="space-y-1">
              <label className="block text-[10px] font-black uppercase text-[#A5A5B8]">
                WhatsApp do Cliente (com DDD)
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={whatsappModalPhone}
                  onChange={(e) => setWhatsappModalPhone(e.target.value)}
                  placeholder="Ex: (86) 99999-9999"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#141838] border border-white/15 text-xs text-white focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-black uppercase text-[#A5A5B8]">
                Mensagem Pronta (editável antes de enviar)
              </label>
              <textarea
                rows={7}
                value={customWhatsappText}
                onChange={(e) => setCustomWhatsappText(e.target.value)}
                className="w-full p-3 rounded-xl bg-[#141838] border border-white/15 text-xs text-white font-sans leading-relaxed focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(customWhatsappText);
                  setCopiedWhatsapp(true);
                  setTimeout(() => setCopiedWhatsapp(false), 2500);
                }}
                className="px-3.5 py-2 rounded-xl bg-[#141838] hover:bg-white/10 border border-white/10 text-xs font-bold text-gray-200 flex items-center gap-1.5 cursor-pointer"
              >
                {copiedWhatsapp ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Mensagem Copiada!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#00DFFF]" />
                    <span>Copiar Mensagem</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  const built = buildWhatsappConversationUrl(
                    whatsappModalPhone,
                    customWhatsappText
                  );
                  if (!built.valid || !built.url) {
                    showFeedback(
                      'error',
                      built.error ||
                        'Informe um número de WhatsApp válido com DDD no campo acima.'
                    );
                    return;
                  }
                  window.open(built.url, '_blank', 'noopener,noreferrer');
                }}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-[#080811] font-black text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Abrir Conversa no WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL DE CONFIGURAÇÃO DE MODELOS WHATSAPP (ESTÚDIO INTERATIVO) ===================== */}
      {isTemplateConfigOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSaveTemplates}
            className="w-full max-w-4xl rounded-3xl bg-[#0D1022] border-2 border-[#00DFFF]/40 shadow-2xl p-5 sm:p-6 space-y-5 my-auto max-h-[92vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#00DFFF]/15 border border-[#00DFFF]/40 text-[#00DFFF] text-[10px] font-black uppercase tracking-wider mb-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Estúdio Interativo WhatsApp • PodWave</span>
                </div>
                <h3 className="font-heading text-lg sm:text-xl font-black text-white">
                  Personalizar Modelos de Mensagens (WhatsApp)
                </h3>
                <p className="text-xs text-[#A5A5B8]">
                  Escolha um pacote visual pronto, insira variáveis dinâmicas com 1 clique e veja como a mensagem aparece no celular do cliente.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsTemplateConfigOpen(false)}
                aria-label="Fechar configurações de modelos"
                className="p-2 rounded-xl bg-[#141838] text-gray-300 hover:text-white cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 1. Pacotes de Estilo Interativos (Presets) */}
            <div className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#00DFFF] block">
                1. Escolha um Estilo de Comunicação (Aplicação Instantânea)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {Object.values(WHATSAPP_TEMPLATE_PRESETS).map((preset) => {
                  const isSelected = activePresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplyPreset(preset.id)}
                      className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                        isSelected
                          ? 'bg-gradient-to-br from-[#181F48] to-[#121631] border-[#00DFFF] shadow-[0_0_15px_rgba(0,223,255,0.18)]'
                          : 'bg-[#141838] border-white/10 hover:border-[#00DFFF]/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-heading font-black text-xs text-white">
                          {preset.name}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-[#00DFFF]/15 border border-[#00DFFF]/35 text-[9px] font-black uppercase text-[#00DFFF]">
                          {preset.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#A5A5B8] leading-snug">
                        {preset.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Stage Tabs */}
            <div className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#00DFFF] block">
                2. Selecione a Etapa do Pedido para Editar
              </span>
              <div className="flex flex-wrap gap-1.5">
                {ORDER_STATUS_LIST.map((st) => {
                  const isActive = activeTemplateStage === st.status;
                  const isEnabled = whatsappTemplates.enabled[st.status] !== false;
                  return (
                    <button
                      key={st.status}
                      type="button"
                      onClick={() => setActiveTemplateStage(st.status)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-[#00DFFF] text-[#080811] border-[#00DFFF] font-black'
                          : 'bg-[#141838] text-gray-200 border-white/10 hover:border-[#00DFFF]/40'
                      }`}
                    >
                      <span>{st.shortLabel}</span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isEnabled ? 'bg-emerald-400' : 'bg-gray-500'
                        }`}
                        title={isEnabled ? 'Modelo ativo' : 'Modelo desativado'}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Editor + Live Preview Side-by-Side */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* Left Column: Variable Chips + Textarea Editor */}
              <div className="lg:col-span-7 space-y-3 p-4 rounded-2xl bg-[#141838] border border-white/10">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="font-heading font-black text-sm text-white">
                      {getOrderStatusMeta(activeTemplateStage).label}
                    </span>
                    <p className="text-[11px] text-[#A5A5B8]">
                      Clique nas variáveis abaixo para inserir no texto da etapa.
                    </p>
                  </div>

                  <label className="flex items-center gap-1.5 text-xs font-bold text-gray-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={whatsappTemplates.enabled[activeTemplateStage] !== false}
                      onChange={(e) =>
                        setWhatsappTemplates((prev) => ({
                          ...prev,
                          enabled: {
                            ...prev.enabled,
                            [activeTemplateStage]: e.target.checked,
                          },
                        }))
                      }
                    />
                    <span>Modelo Ativo</span>
                  </label>
                </div>

                {/* Interactive Variable Insertion Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {WHATSAPP_TEMPLATE_VARIABLES.map((v) => (
                    <button
                      key={v.token}
                      type="button"
                      onClick={() => handleInsertVariableIntoActiveStage(v.token)}
                      title={`${v.label} — Ex: ${v.example}`}
                      className="px-2.5 py-1 rounded-lg bg-[#080811] hover:bg-[#00DFFF]/20 border border-[#00DFFF]/35 text-[11px] font-mono font-bold text-[#00DFFF] flex items-center gap-1 cursor-pointer transition"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{v.token}</span>
                    </button>
                  ))}
                </div>

                <textarea
                  rows={8}
                  value={whatsappTemplates.templates[activeTemplateStage] || ''}
                  onChange={(e) =>
                    setWhatsappTemplates((prev) => ({
                      ...prev,
                      templates: {
                        ...prev.templates,
                        [activeTemplateStage]: e.target.value,
                      },
                    }))
                  }
                  placeholder="Digite o modelo da mensagem para esta etapa..."
                  className="w-full p-3.5 rounded-xl bg-[#080811] border border-white/15 text-xs text-white font-sans leading-relaxed focus:outline-none focus:border-[#00DFFF]"
                />
              </div>

              {/* Right Column: Live WhatsApp Chat Bubble Preview */}
              <div className="lg:col-span-5 rounded-2xl bg-[#0B141A] border border-emerald-500/35 overflow-hidden shadow-xl">
                <div className="px-4 py-3 bg-[#202C33] border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-300 font-black text-xs">
                      PW
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white leading-tight">
                        Prévia Real no WhatsApp
                      </p>
                      <p className="text-[10px] text-emerald-400">
                        {getOrderStatusMeta(activeTemplateStage).shortLabel} • online
                      </p>
                    </div>
                  </div>
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                </div>

                <div className="p-4 bg-[#0B141A] min-h-[230px] flex flex-col justify-end">
                  <div className="rounded-2xl rounded-tr-none bg-[#005C4B] text-[#E9EDEF] p-3.5 text-xs whitespace-pre-wrap leading-relaxed shadow-md border border-emerald-400/20">
                    {liveTemplatePreviewText}
                    <div className="text-[10px] text-emerald-200/75 text-right mt-1.5">
                      Agora • ✓✓
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setActivePresetId('neon_interativo');
                  setWhatsappTemplates(DEFAULT_WHATSAPP_ORDER_TEMPLATES);
                }}
                className="text-xs text-gray-300 hover:text-white flex items-center gap-1.5 cursor-pointer font-bold"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#00DFFF]" />
                <span>Restaurar Padrão Neon Interativo</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsTemplateConfigOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#141838] hover:bg-white/10 text-xs font-bold text-gray-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00DFFF] to-[#007BFF] text-[#080811] font-black text-xs cursor-pointer hover:brightness-110"
                >
                  Salvar Modelos do WhatsApp
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Modal de Impressão de Comprovante Térmico (58mm / 80mm) para Balcão e Motoboy */}
      <ThermalReceiptModal
        order={receiptOrder}
        isOpen={Boolean(receiptOrder)}
        onClose={() => setReceiptOrder(null)}
        settings={settings}
      />
    </div>
  );
};
