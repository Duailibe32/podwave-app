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
} from '../../services/orderCenterService';
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
} from 'lucide-react';

interface OrdersCenterTabProps {
  onOpenUserInTab?: (customerId: string) => void;
}

export const OrdersCenterTab: React.FC<OrdersCenterTabProps> = ({
  onOpenUserInTab,
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
    allUsers,
    manualSales,
    settings,
    isOwner,
  } = useCatalog();

  // Filter states
  const [periodFilter, setPeriodFilter] = useState<OrderPeriodFilter>('todos');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | CatalogOrderStatus>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | CatalogOrderPaymentStatus>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  // Active modals & action states
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [deliveredPromptOrderId, setDeliveredPromptOrderId] = useState<string | null>(null);
  const [reasonModalState, setReasonModalState] = useState<{
    orderId: string;
    targetStatus: CatalogOrderStatus;
    title: string;
  } | null>(null);
  const [reasonInput, setReasonInput] = useState<string>('');

  // WhatsApp Preview & Template Config Modal
  const [whatsappModalOrder, setWhatsappModalOrder] = useState<{
    order: CustomerOrderHistoryItem;
    statusContext?: CatalogOrderStatus;
  } | null>(null);
  const [customWhatsappText, setCustomWhatsappText] = useState<string>('');
  const [copiedWhatsapp, setCopiedWhatsapp] = useState<boolean>(false);
  const [isTemplateConfigOpen, setIsTemplateConfigOpen] = useState<boolean>(false);
  const [whatsappTemplates, setWhatsappTemplates] = useState<WhatsappOrderTemplates>(() =>
    loadWhatsappOrderTemplates()
  );

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

      if (targetStatus === 'entregue') {
        setDeliveredPromptOrderId(orderId);
        showFeedback(
          'success',
          `Pedido #${res.updatedOrder.referenceId} marcado como ENTREGUE!`
        );
      } else {
        showFeedback(
          'success',
          `Status do pedido #${res.updatedOrder.referenceId} atualizado para "${
            getOrderStatusMeta(targetStatus).shortLabel
          }".`
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
    setCopiedWhatsapp(false);
    setWhatsappModalOrder({ order, statusContext });
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

        {/* Fast Action Bar */}
        <div className="pt-2 border-t border-white/10 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            {statusMeta.nextStatus && (
              <button
                type="button"
                disabled={isBusy}
                onClick={() =>
                  handleInitiateStatusChange(order, statusMeta.nextStatus!)
                }
                className="flex-1 py-2 px-2.5 rounded-xl bg-gradient-to-r from-[#8423DA] via-[#007BFF] to-[#00DFFF] hover:brightness-110 text-white font-black text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition disabled:opacity-50"
              >
                <span>{statusMeta.nextActionLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {order.status === 'entregue' && (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => setDeliveredPromptOrderId(order.id)}
                className="flex-1 py-2 px-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition"
              >
                <Gift className="w-3.5 h-3.5 text-[#00DFFF]" />
                <span>Ações Pós-Entrega</span>
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
              onClick={() => setSelectedOrderId(order.id)}
              className="px-2.5 py-2 rounded-xl bg-[#181D3D] hover:bg-[#8423DA]/30 border border-white/10 text-gray-200 text-[11px] font-bold cursor-pointer transition shrink-0"
            >
              Detalhes
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#141838] via-[#11152A] to-[#181D3D] border-2 border-[#00DFFF]/35 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00DFFF]/15 border border-[#00DFFF]/40 text-[#00DFFF] text-[11px] font-black uppercase tracking-wider">
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Central Inteligente de Pedidos • Tempo Real</span>
          </div>
          <h2 className="font-heading text-2xl sm:text-3xl font-black text-white">
            Gerenciamento de Pedidos, Fidelidade e Financeiro
          </h2>
          <p className="text-xs sm:text-sm text-[#A5A5B8] max-w-2xl">
            Acompanhe a fila de pedidos do catálogo, atualize etapas com auditoria, credite selos sem duplicidade e integre vendas reais ao módulo Meu Negócio.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isOwner && (
            <button
              type="button"
              onClick={() => setIsTemplateConfigOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-[#181D3D] hover:bg-[#8423DA]/30 border border-[#8423DA]/40 text-xs font-bold text-gray-200 flex items-center gap-1.5 cursor-pointer transition"
            >
              <Settings className="w-4 h-4 text-[#00DFFF]" />
              <span>Modelos WhatsApp</span>
            </button>
          )}

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

              {/* Loyalty & Financial Quick Integration */}
              <div className="p-4 rounded-2xl bg-[#141838] border border-[#8423DA]/35 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black uppercase text-[#00DFFF] block">
                    Fidelidade & Financeiro ("Meu Negócio")
                  </span>
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
                      selectedOrder.status !== 'entregue'
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
                    disabled={
                      busyOrderId === deliveredPromptOrder.id ||
                      !deliveredPromptOrder.customerId
                    }
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

      {/* ===================== MODAL DE PRÉVIA E ENVIO WHATSAPP (SECTION 7) ===================== */}
      {whatsappModalOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-3xl bg-[#0D1022] border-2 border-emerald-500/40 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base font-black text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-400" />
                <span>Comunicação pelo WhatsApp</span>
              </h3>
              <button
                type="button"
                onClick={() => setWhatsappModalOrder(null)}
                aria-label="Fechar janela de WhatsApp"
                className="p-2 rounded-xl bg-[#141838] text-gray-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-[#A5A5B8]">
              Confira ou edite a mensagem abaixo antes de abrir a conversa no WhatsApp. O envio final é confirmado por você no aplicativo do WhatsApp.
            </p>

            <textarea
              rows={4}
              value={customWhatsappText}
              onChange={(e) => setCustomWhatsappText(e.target.value)}
              className="w-full p-3 rounded-xl bg-[#141838] border border-white/15 text-xs text-white focus:outline-none focus:border-emerald-400"
            />

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
                  const phone = whatsappModalOrder.order.customerPhone || '';
                  const built = buildWhatsappConversationUrl(
                    phone,
                    customWhatsappText
                  );
                  if (!built.valid || !built.url) {
                    showFeedback(
                      'error',
                      built.error ||
                        'O cliente não possui um número de WhatsApp válido cadastrado.'
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

      {/* ===================== MODAL DE CONFIGURAÇÃO DE MODELOS WHATSAPP (SECTION 7.5) ===================== */}
      {isTemplateConfigOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSaveTemplates}
            className="w-full max-w-xl rounded-3xl bg-[#0D1022] border-2 border-[#8423DA]/50 p-6 space-y-4 my-auto max-h-[88vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base font-black text-white">
                Personalizar Modelos de Mensagens (WhatsApp)
              </h3>
              <button
                type="button"
                onClick={() => setIsTemplateConfigOpen(false)}
                aria-label="Fechar configurações de modelos"
                className="p-2 rounded-xl bg-[#141838] text-gray-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-[#A5A5B8]">
              Variáveis disponíveis: <code className="text-[#00DFFF]">{'{nome}'}</code>,{' '}
              <code className="text-[#00DFFF]">{'{referencia}'}</code>,{' '}
              <code className="text-[#00DFFF]">{'{total}'}</code>,{' '}
              <code className="text-[#00DFFF]">{'{selo_info}'}</code> (incluído apenas quando o selo for confirmado no banco).
            </p>

            <div className="space-y-3 text-xs">
              {ORDER_STATUS_LIST.map((st) => (
                <div
                  key={st.status}
                  className="p-3 rounded-2xl bg-[#141838] border border-white/10 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{st.label}</span>
                    <label className="flex items-center gap-1.5 text-[11px] text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={whatsappTemplates.enabled[st.status] !== false}
                        onChange={(e) =>
                          setWhatsappTemplates((prev) => ({
                            ...prev,
                            enabled: {
                              ...prev.enabled,
                              [st.status]: e.target.checked,
                            },
                          }))
                        }
                      />
                      <span>Modelo Ativo</span>
                    </label>
                  </div>
                  <textarea
                    rows={2}
                    value={whatsappTemplates.templates[st.status] || ''}
                    onChange={(e) =>
                      setWhatsappTemplates((prev) => ({
                        ...prev,
                        templates: {
                          ...prev.templates,
                          [st.status]: e.target.value,
                        },
                      }))
                    }
                    className="w-full p-2 rounded-xl bg-[#080811] border border-white/10 text-xs text-white"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() =>
                  setWhatsappTemplates(DEFAULT_WHATSAPP_ORDER_TEMPLATES)
                }
                className="text-xs text-gray-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar Padrão</span>
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00DFFF] to-[#007BFF] text-[#080811] font-black text-xs cursor-pointer"
              >
                Salvar Modelos
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
