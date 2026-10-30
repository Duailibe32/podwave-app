import React, { useState, useMemo, useEffect } from 'react';
import { useCatalog } from '../../context/CatalogContext';
import {
  CashMovementEntry,
  CashAccountChannel,
  InitialCashBalanceConfig,
  ManualSaleEntry,
  ManualExpenseEntry,
  MerchandisePurchaseEntry,
} from '../../types/catalog';
import { CashMovementModal } from './CashMovementModal';
import { CashBalanceConfigModal } from './CashBalanceConfigModal';
import { CashFlowCharts, CashFlowChartItem } from './CashFlowCharts';
import {
  ArrowLeftRight,
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  Building,
  Banknote,
  CreditCard,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  AlertCircle,
  Eye,
  Edit2,
  Trash2,
  Sliders,
  DollarSign,
  Layers,
  Sparkles,
  TrendingUp,
  X,
  Clock,
  ExternalLink,
  Database,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export interface ConsolidatedCashMovement {
  id: string;
  effectiveDate: string; // ISO string or YYYY-MM-DD
  type: 'entrada' | 'saida' | 'transferencia';
  originType:
    | 'venda'
    | 'despesa'
    | 'compra_estoque'
    | 'aporte_inicial'
    | 'retirada_pro_labore'
    | 'ajuste_saldo'
    | 'transferencia'
    | 'avulso';
  referenceId?: string;
  description: string;
  category: string;
  accountChannel: CashAccountChannel;
  destinationAccountChannel?: CashAccountChannel;
  amount: number;
  notes?: string;
  accumulatedBalance?: number;
  isStandalone?: boolean;
  isPriorToReferenceDate?: boolean;
  sourceRecord?: ManualSaleEntry | ManualExpenseEntry | MerchandisePurchaseEntry;
}

const mapPaymentMethodToChannel = (method?: string): CashAccountChannel => {
  if (!method) return 'dinheiro_caixa';
  const m = method.toLowerCase();
  if (m.includes('pix')) return 'pix_banco';
  if (m.includes('dinheiro')) return 'dinheiro_caixa';
  if (m.includes('debito') || m.includes('credito') || m.includes('cartao')) return 'cartao_maquininha';
  return 'outro';
};

const getChannelLabel = (channel: CashAccountChannel): string => {
  switch (channel) {
    case 'pix_banco':
      return 'Pix / Banco';
    case 'dinheiro_caixa':
      return 'Dinheiro / Gaveta';
    case 'cartao_maquininha':
      return 'Cartão / Maquininha';
    case 'outro':
      return 'Outro Canal';
    default:
      return channel;
  }
};

const getChannelIcon = (channel: CashAccountChannel) => {
  switch (channel) {
    case 'pix_banco':
      return <Building className="w-3.5 h-3.5 text-[#00DFFF]" />;
    case 'dinheiro_caixa':
      return <Banknote className="w-3.5 h-3.5 text-[#10B981]" />;
    case 'cartao_maquininha':
      return <CreditCard className="w-3.5 h-3.5 text-[#8423DA]" />;
    case 'outro':
      return <Wallet className="w-3.5 h-3.5 text-[#FACC15]" />;
  }
};

const getOriginBadge = (originType: string) => {
  switch (originType) {
    case 'venda':
      return { label: 'Venda', bg: 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30' };
    case 'despesa':
      return { label: 'Despesa', bg: 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30' };
    case 'compra_estoque':
      return { label: 'Estoque / Compra', bg: 'bg-[#00DFFF]/15 text-[#00DFFF] border-[#00DFFF]/30' };
    case 'transferencia':
      return { label: 'Transferência', bg: 'bg-[#8423DA]/20 text-[#C084FC] border-[#8423DA]/40' };
    case 'aporte_inicial':
      return { label: 'Aporte', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
    case 'retirada_pro_labore':
      return { label: 'Pró-labore', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
    case 'ajuste_saldo':
      return { label: 'Ajuste', bg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' };
    default:
      return { label: 'Lançamento Avulso', bg: 'bg-gray-500/20 text-gray-300 border-gray-500/40' };
  }
};

export const MyCashFlowSection: React.FC = () => {
  const {
    manualSales,
    manualExpenses,
    merchandisePurchases,
    cashMovements,
    manualCommitments,
    removeCashMovement,
    initialCashConfig,
    saveInitialCashBalances,
    hasLocalInitialBalancesPendingMigration,
    importLocalInitialBalancesToSupabase,
    dismissLocalInitialBalancesPrompt,
    supabaseStatus,
  } = useCatalog();

  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementToEdit, setMovementToEdit] = useState<CashMovementEntry | null>(null);
  const [detailsMovement, setDetailsMovement] = useState<ConsolidatedCashMovement | null>(null);
  const [movementToDelete, setMovementToDelete] = useState<CashMovementEntry | null>(null);
  const [showCharts, setShowCharts] = useState(true);
  const [isMigratingLocal, setIsMigratingLocal] = useState(false);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [periodFilter, setPeriodFilter] = useState<
    'all' | 'today' | '7d' | '30d' | 'this_month' | 'last_month' | 'custom'
  >('this_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'entrada' | 'saida' | 'transferencia'>('all');
  const [channelFilter, setChannelFilter] = useState<'all' | CashAccountChannel>('all');
  const [originFilter, setOriginFilter] = useState<'all' | 'vendas' | 'despesas' | 'compras' | 'avulsos'>('all');

  // Sorting and Pagination
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);

  // Helper: Obter data de referência de um canal específico
  const getChannelReferenceDate = (channel: CashAccountChannel): string => {
    return (
      initialCashConfig.channelReferenceDates?.[channel] ||
      initialCashConfig.referenceDate ||
      `${new Date().getFullYear()}-01-01`
    );
  };

  // 1. CONSOLIDATION ENGINE: Zero duplicidade, derivação 100% dinâmica a partir dos registros de origem
  const rawConsolidatedMovements = useMemo<ConsolidatedCashMovement[]>(() => {
    const list: ConsolidatedCashMovement[] = [];

    // A. Recebimentos reais das Vendas Manuais
    manualSales.forEach((sale) => {
      if (sale.receipts && sale.receipts.length > 0) {
        sale.receipts.forEach((r) => {
          if (r.amount > 0) {
            list.push({
              id: `sale-rcpt-${r.id}`,
              effectiveDate: r.receiptDate || sale.saleDate,
              type: 'entrada',
              originType: 'venda',
              referenceId: sale.id,
              description: `Recebimento Venda #${sale.id.slice(0, 8)}${
                sale.customerName ? ` (${sale.customerName})` : ''
              }`,
              category: 'Venda de Produtos',
              accountChannel: mapPaymentMethodToChannel(r.paymentMethod || sale.paymentMethod),
              amount: r.amount,
              notes: r.notes || sale.notes,
              sourceRecord: sale,
            });
          }
        });
      } else if (sale.amountReceived && sale.amountReceived > 0) {
        list.push({
          id: `sale-rcpt-${sale.id}`,
          effectiveDate: sale.receivedDate || sale.saleDate,
          type: 'entrada',
          originType: 'venda',
          referenceId: sale.id,
          description: `Recebimento Venda #${sale.id.slice(0, 8)}${
            sale.customerName ? ` (${sale.customerName})` : ''
          }`,
          category: 'Venda de Produtos',
          accountChannel: mapPaymentMethodToChannel(sale.paymentMethod),
          amount: sale.amountReceived,
          notes: sale.notes,
          sourceRecord: sale,
        });
      }
    });

    // B. Pagamentos reais das Despesas Operacionais
    manualExpenses.forEach((expense) => {
      if (expense.payments && expense.payments.length > 0) {
        expense.payments.forEach((p) => {
          if (p.amount > 0) {
            list.push({
              id: `exp-pay-${p.id}`,
              effectiveDate: p.paymentDate || expense.expenseDate,
              type: 'saida',
              originType: 'despesa',
              referenceId: expense.id,
              description: `Pagamento Despesa: ${expense.description}`,
              category: expense.category || 'Despesa Operacional',
              accountChannel: mapPaymentMethodToChannel(p.paymentMethod || expense.paymentMethod),
              amount: p.amount,
              notes: p.notes || expense.notes,
              sourceRecord: expense,
            });
          }
        });
      } else if (expense.amountPaid && expense.amountPaid > 0) {
        list.push({
          id: `exp-pay-${expense.id}`,
          effectiveDate: expense.expenseDate,
          type: 'saida',
          originType: 'despesa',
          referenceId: expense.id,
          description: `Pagamento Despesa: ${expense.description}`,
          category: expense.category || 'Despesa Operacional',
          accountChannel: mapPaymentMethodToChannel(expense.paymentMethod),
          amount: expense.amountPaid,
          notes: expense.notes,
          sourceRecord: expense,
        });
      }
    });

    // C. Pagamentos reais das Compras de Mercadorias (Estoque)
    merchandisePurchases.forEach((purchase) => {
      if (purchase.payments && purchase.payments.length > 0) {
        purchase.payments.forEach((p) => {
          if (p.amount > 0) {
            list.push({
              id: `purch-pay-${p.id}`,
              effectiveDate: p.paymentDate || purchase.purchaseDate,
              type: 'saida',
              originType: 'compra_estoque',
              referenceId: purchase.id,
              description: `Pgto Fornecedor: ${purchase.supplierName}`,
              category: 'Compra de Mercadorias (Estoque)',
              accountChannel: mapPaymentMethodToChannel(p.paymentMethod || purchase.paymentMethod),
              amount: p.amount,
              notes: p.notes || purchase.notes,
              sourceRecord: purchase,
            });
          }
        });
      } else if (purchase.amountPaid && purchase.amountPaid > 0) {
        list.push({
          id: `purch-pay-${purchase.id}`,
          effectiveDate: purchase.purchaseDate,
          type: 'saida',
          originType: 'compra_estoque',
          referenceId: purchase.id,
          description: `Pgto Fornecedor: ${purchase.supplierName}`,
          category: 'Compra de Mercadorias (Estoque)',
          accountChannel: mapPaymentMethodToChannel(purchase.paymentMethod),
          amount: purchase.amountPaid,
          notes: purchase.notes,
          sourceRecord: purchase,
        });
      }
    });

    // D. Lançamentos Avulsos e Transferências Internas (cashMovements)
    cashMovements.forEach((cm) => {
      if (cm.originType === 'transferencia') {
        list.push({
          id: `cm-${cm.id}`,
          effectiveDate: cm.movementDate,
          type: 'transferencia',
          originType: 'transferencia',
          referenceId: cm.id,
          description: cm.description || 'Transferência entre Contas',
          category: cm.category || 'Transferência Interna',
          accountChannel: cm.accountChannel,
          destinationAccountChannel: cm.destinationAccountChannel || 'outro',
          amount: cm.amount,
          notes: cm.notes,
          isStandalone: true,
        });
      } else {
        list.push({
          id: `cm-${cm.id}`,
          effectiveDate: cm.movementDate,
          type: cm.type,
          originType: cm.originType,
          referenceId: cm.id,
          description: cm.description,
          category:
            cm.category || (cm.type === 'entrada' ? 'Aporte / Entrada Avulsa' : 'Retirada / Saída Avulsa'),
          accountChannel: cm.accountChannel,
          amount: cm.amount,
          notes: cm.notes,
          isStandalone: true,
        });
      }
    });

    // E. Pagamentos e Recebimentos reais de Compromissos Avulsos (Contas Pendentes)
    manualCommitments.forEach((commitment) => {
      if (commitment.payments && commitment.payments.length > 0) {
        commitment.payments.forEach((p) => {
          if (p.amount > 0) {
            list.push({
              id: `comm-pay-${p.id}`,
              effectiveDate: p.paymentDate,
              type: commitment.type === 'a_receber' ? 'entrada' : 'saida',
              originType: 'avulso',
              referenceId: commitment.id,
              description: `${commitment.type === 'a_receber' ? 'Recebimento' : 'Pagamento'}: ${commitment.description} (${commitment.counterpartyName})`,
              category: commitment.category || 'Compromissos Financeiros',
              accountChannel: p.accountChannel || mapPaymentMethodToChannel(p.paymentMethod),
              amount: p.amount,
              notes: p.notes || commitment.notes,
              isStandalone: true,
            });
          }
        });
      } else if (commitment.amountPaid && commitment.amountPaid > 0) {
        list.push({
          id: `comm-pay-${commitment.id}`,
          effectiveDate: commitment.issueDate,
          type: commitment.type === 'a_receber' ? 'entrada' : 'saida',
          originType: 'avulso',
          referenceId: commitment.id,
          description: `${commitment.type === 'a_receber' ? 'Recebimento' : 'Pagamento'}: ${commitment.description} (${commitment.counterpartyName})`,
          category: commitment.category || 'Compromissos Financeiros',
          accountChannel: commitment.accountChannel || mapPaymentMethodToChannel(commitment.paymentMethod),
          amount: commitment.amountPaid,
          notes: commitment.notes,
          isStandalone: true,
        });
      }
    });

    return list;
  }, [manualSales, manualExpenses, merchandisePurchases, cashMovements, manualCommitments]);

  // 2. CÁLCULO CRONOLÓGICO, RESPEITO À DATA DE REFERÊNCIA & SALDO PROGRESSIVO
  // Regra Obrigatória: Evitar dupla contagem! Movimentações anteriores à data de referência
  // do canal NÃO duplicam o saldo inicial, pois o saldo inicial já as contempla.
  const { allMovementsWithBalance, globalChannelBalances, globalKpis } = useMemo(() => {
    const totalInitial =
      (initialCashConfig.pix_banco || 0) +
      (initialCashConfig.dinheiro_caixa || 0) +
      (initialCashConfig.cartao_maquininha || 0) +
      (initialCashConfig.outro || 0);

    const channelBalances: Record<CashAccountChannel, number> = {
      pix_banco: initialCashConfig.pix_banco || 0,
      dinheiro_caixa: initialCashConfig.dinheiro_caixa || 0,
      cartao_maquininha: initialCashConfig.cartao_maquininha || 0,
      outro: initialCashConfig.outro || 0,
    };

    let totalEntradasValidas = 0;
    let totalSaidasValidas = 0;

    // Ordenação cronológica estrita (mais antiga para mais recente)
    const sorted = [...rawConsolidatedMovements].sort((a, b) =>
      new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime()
    );

    let runningGlobal = totalInitial;

    const processed = sorted.map((m) => {
      const mDateStr = m.effectiveDate.slice(0, 10);
      const originRefDate = getChannelReferenceDate(m.accountChannel);
      const isPriorToOriginRef = mDateStr < originRefDate;

      // Se for anterior à data base do canal, não altera o saldo acumulado inicial
      if (isPriorToOriginRef) {
        return {
          ...m,
          isPriorToReferenceDate: true,
          accumulatedBalance: runningGlobal,
        };
      }

      // Movimentação válida (>= data de referência do canal)
      if (m.type === 'entrada') {
        runningGlobal += m.amount;
        channelBalances[m.accountChannel] = (channelBalances[m.accountChannel] || 0) + m.amount;
        totalEntradasValidas += m.amount;
      } else if (m.type === 'saida') {
        runningGlobal -= m.amount;
        channelBalances[m.accountChannel] = (channelBalances[m.accountChannel] || 0) - m.amount;
        totalSaidasValidas += m.amount;
      } else if (m.type === 'transferencia') {
        channelBalances[m.accountChannel] = (channelBalances[m.accountChannel] || 0) - m.amount;
        if (m.destinationAccountChannel) {
          const destRefDate = getChannelReferenceDate(m.destinationAccountChannel);
          if (mDateStr >= destRefDate) {
            channelBalances[m.destinationAccountChannel] =
              (channelBalances[m.destinationAccountChannel] || 0) + m.amount;
          }
        }
      }

      return {
        ...m,
        isPriorToReferenceDate: false,
        accumulatedBalance: runningGlobal,
      };
    });

    return {
      allMovementsWithBalance: processed,
      globalChannelBalances: channelBalances,
      globalKpis: {
        totalInitial,
        totalEntradas: totalEntradasValidas,
        totalSaidas: totalSaidasValidas,
        finalCashBalance: totalInitial + totalEntradasValidas - totalSaidasValidas,
      },
    };
  }, [rawConsolidatedMovements, initialCashConfig]);

  // 3. INTERVALO DE DATAS DO FILTRO ATIVO
  const activePeriodRange = useMemo<{ startStr: string | null; endStr: string | null }>(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (periodFilter === 'all') {
      return { startStr: null, endStr: null };
    }
    if (periodFilter === 'today') {
      return { startStr: todayStr, endStr: todayStr };
    }
    if (periodFilter === '7d') {
      const d7 = new Date();
      d7.setDate(now.getDate() - 7);
      return { startStr: d7.toISOString().slice(0, 10), endStr: todayStr };
    }
    if (periodFilter === '30d') {
      const d30 = new Date();
      d30.setDate(now.getDate() - 30);
      return { startStr: d30.toISOString().slice(0, 10), endStr: todayStr };
    }
    if (periodFilter === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
      return { startStr: firstDay, endStr: lastDay };
    }
    if (periodFilter === 'last_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
      return { startStr: firstDay, endStr: lastDay };
    }
    if (periodFilter === 'custom') {
      return {
        startStr: customStartDate || null,
        endStr: customEndDate || null,
      };
    }
    return { startStr: null, endStr: null };
  }, [periodFilter, customStartDate, customEndDate]);

  // 4. SALDO DE ABERTURA DO PERÍODO (CONSIDERA TODO O HISTÓRICO ATÉ O INÍCIO DO INTERVALO)
  // Regra Obrigatória: Ao aplicar filtros, o saldo de abertura não é zerado nem limitado apenas
  // aos itens visíveis. Ele é composto pelo Saldo Inicial Base + todas as movimentações anteriores
  // ao início do período selecionado.
  const periodOpeningBalance = useMemo<number>(() => {
    const { startStr } = activePeriodRange;
    if (!startStr) {
      // Período 'all': o saldo de abertura é o próprio Saldo Inicial Total
      return globalKpis.totalInitial;
    }

    let opening = 0;

    // Componentes de saldo inicial que já estavam ativos na data de início do período
    (['pix_banco', 'dinheiro_caixa', 'cartao_maquininha', 'outro'] as CashAccountChannel[]).forEach(
      (channel) => {
        const refDate = getChannelReferenceDate(channel);
        if (refDate <= startStr) {
          opening += initialCashConfig[channel] || 0;
        }
      }
    );

    // Soma de todas as movimentações válidas que ocorreram ANTES do início do filtro
    allMovementsWithBalance.forEach((m) => {
      const mDateStr = m.effectiveDate.slice(0, 10);
      const channelRef = getChannelReferenceDate(m.accountChannel);

      // Apenas movimentações >= data de referência da conta E < data inicial do período
      if (mDateStr >= channelRef && mDateStr < startStr) {
        if (m.type === 'entrada') {
          opening += m.amount;
        } else if (m.type === 'saida') {
          opening -= m.amount;
        }
      }
    });

    return opening;
  }, [activePeriodRange, globalKpis.totalInitial, initialCashConfig, allMovementsWithBalance]);

  // 5. FILTRAGEM DOS ITENS VISÍVEIS
  const filteredMovements = useMemo(() => {
    const { startStr, endStr } = activePeriodRange;

    return allMovementsWithBalance.filter((m) => {
      const mDateStr = m.effectiveDate.slice(0, 10);

      // Busca por texto
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesDesc = m.description.toLowerCase().includes(query);
        const matchesCat = m.category.toLowerCase().includes(query);
        const matchesNotes = m.notes ? m.notes.toLowerCase().includes(query) : false;
        if (!matchesDesc && !matchesCat && !matchesNotes) return false;
      }

      // Filtro de Data do Período
      if (startStr && mDateStr < startStr) return false;
      if (endStr && mDateStr > endStr) return false;

      // Filtro de Tipo
      if (typeFilter !== 'all' && m.type !== typeFilter) return false;

      // Filtro de Canal
      if (channelFilter !== 'all') {
        if (m.type === 'transferencia') {
          if (m.accountChannel !== channelFilter && m.destinationAccountChannel !== channelFilter) {
            return false;
          }
        } else {
          if (m.accountChannel !== channelFilter) return false;
        }
      }

      // Filtro de Origem
      if (originFilter !== 'all') {
        if (originFilter === 'vendas' && m.originType !== 'venda') return false;
        if (originFilter === 'despesas' && m.originType !== 'despesa') return false;
        if (originFilter === 'compras' && m.originType !== 'compra_estoque') return false;
        if (
          originFilter === 'avulsos' &&
          m.originType !== 'aporte_inicial' &&
          m.originType !== 'retirada_pro_labore' &&
          m.originType !== 'ajuste_saldo' &&
          m.originType !== 'transferencia' &&
          m.originType !== 'avulso'
        )
          return false;
      }

      return true;
    });
  }, [allMovementsWithBalance, searchTerm, activePeriodRange, typeFilter, channelFilter, originFilter]);

  // Totais do período ativo selecionado
  const activePeriodMetrics = useMemo(() => {
    let entradas = 0;
    let saidas = 0;

    filteredMovements.forEach((m) => {
      // Movimentações anteriores à referência não somam entradas/saídas operacionais
      if (m.isPriorToReferenceDate) return;
      if (m.type === 'entrada') entradas += m.amount;
      if (m.type === 'saida') saidas += m.amount;
    });

    const resultado = entradas - saidas;
    const fechamento = periodOpeningBalance + resultado;

    return {
      openingBalance: periodOpeningBalance,
      entradas,
      saidas,
      resultado,
      fechamento,
    };
  }, [filteredMovements, periodOpeningBalance]);

  // 6. ORDENAÇÃO DE EXIBIÇÃO E PAGINAÇÃO
  const displayedMovements = useMemo(() => {
    const list = [...filteredMovements];
    if (sortDirection === 'desc') {
      list.sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());
    } else {
      list.sort((a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime());
    }
    return list;
  }, [filteredMovements, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(displayedMovements.length / rowsPerPage));
  const paginatedMovements = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return displayedMovements.slice(start, start + rowsPerPage);
  }, [displayedMovements, currentPage, rowsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, periodFilter, customStartDate, customEndDate, typeFilter, channelFilter, originFilter]);

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const chartItems = useMemo<CashFlowChartItem[]>(() => {
    return allMovementsWithBalance.map((m) => ({
      id: m.id,
      date: m.effectiveDate,
      type: m.type,
      amount: m.amount,
      category: m.category,
      description: m.description,
    }));
  }, [allMovementsWithBalance]);

  // Exportação CSV
  const handleExportCSV = () => {
    if (displayedMovements.length === 0) {
      alert('Nenhuma movimentação para exportar no filtro atual.');
      return;
    }

    const headers = [
      'Data Efetiva',
      'Tipo',
      'Origem',
      'Categoria',
      'Canal de Origem',
      'Canal de Destino',
      'Descricao',
      'Valor (R$)',
      'Saldo Acumulado (R$)',
      'Observacoes',
    ];

    const rows = displayedMovements.map((m) => [
      formatDateTime(m.effectiveDate),
      m.type === 'entrada' ? 'Entrada (+)' : m.type === 'saida' ? 'Saida (-)' : 'Transferencia (int)',
      getOriginBadge(m.originType).label,
      m.category || '',
      getChannelLabel(m.accountChannel),
      m.destinationAccountChannel ? getChannelLabel(m.destinationAccountChannel) : '',
      `"${m.description.replace(/"/g, '""')}"`,
      m.amount.toFixed(2).replace('.', ','),
      (m.accumulatedBalance ?? 0).toFixed(2).replace('.', ','),
      `"${(m.notes || (m.isPriorToReferenceDate ? 'Anterior ao saldo inicial' : '')).replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `fluxo_de_caixa_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteMovement = async (cm: CashMovementEntry) => {
    const res = await removeCashMovement(cm.id);
    if (res.success) {
      setMovementToDelete(null);
    } else {
      alert('Erro ao excluir lançamento: ' + (res.error || 'Erro desconhecido'));
    }
  };

  // Importar saldos locais para o Supabase com confirmação
  const handleImportLocalBalances = async () => {
    setIsMigratingLocal(true);
    const res = await importLocalInitialBalancesToSupabase();
    setIsMigratingLocal(false);
    if (res.success) {
      alert(res.message);
    } else {
      alert('Aviso: ' + res.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* BANNER DE CONFIRMAÇÃO: MIGRAÇÃO DE SALDOS LOCAIS (NÃO-AUTOMÁTICA) */}
      {hasLocalInitialBalancesPendingMigration && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-[#141838] via-[#0D1022] to-[#141838] border border-[#00DFFF]/40 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00DFFF]/15 border border-[#00DFFF]/30 flex items-center justify-center shrink-0">
              <Database className="w-5 h-5 text-[#00DFFF]" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                Saldos Iniciais Detectados neste Navegador
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                  Local
                </span>
              </h4>
              <p className="text-xs text-gray-300 leading-relaxed max-w-2xl">
                Identificamos saldos iniciais configurados localmente neste dispositivo. Para garantir que os mesmos valores apareçam no computador e no celular, deseja enviá-los para o banco de dados Supabase?
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
            <button
              onClick={dismissLocalInitialBalancesPrompt}
              className="px-3.5 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white text-xs font-semibold transition-colors"
            >
              Dispensar
            </button>
            <button
              onClick={handleImportLocalBalances}
              disabled={isMigratingLocal}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00DFFF] to-[#8423DA] hover:opacity-95 text-white text-xs font-bold shadow-lg shadow-[#00DFFF]/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isMigratingLocal ? 'Enviando ao Supabase...' : 'Importar para o Supabase'}
            </button>
          </div>
        </div>
      )}

      {/* 1. TOP HEADER & ACTION BUTTONS */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[#0D1022] border border-[#8423DA]/25 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00DFFF] via-[#8423DA] to-[#10B981] p-0.5 flex items-center justify-center shadow-[0_0_20px_rgba(0,223,255,0.25)] shrink-0">
            <div className="w-full h-full bg-[#080811] rounded-[14px] flex items-center justify-center">
              <ArrowLeftRight className="w-6 h-6 text-[#00DFFF]" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-xl sm:text-2xl font-black text-white">
                Fluxo de Caixa
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-[#10B981]/10 border border-[#10B981]/30 text-[10px] font-extrabold text-[#10B981] uppercase tracking-wider">
                Consolidado Real
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#00DFFF]/10 border border-[#00DFFF]/30 text-[10px] font-extrabold text-[#00DFFF] flex items-center gap-1">
                <Database className="w-2.5 h-2.5" />
                Supabase
              </span>
            </div>
            <p className="text-xs text-[#A5A5B8] mt-0.5">
              Livro caixa unificado com saldos iniciais sincronizados no Supabase e conciliação cronológica
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle Charts */}
          <button
            onClick={() => setShowCharts((prev) => !prev)}
            className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${
              showCharts
                ? 'bg-[#141838] border-[#00DFFF]/40 text-[#00DFFF]'
                : 'bg-[#080811] border-white/10 text-gray-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            {showCharts ? 'Ocultar Gráficos' : 'Ver Gráficos'}
          </button>

          {/* Config Saldos Iniciais */}
          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-[#080811] border border-white/10 hover:border-[#8423DA]/50 text-gray-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Sliders className="w-4 h-4 text-[#8423DA]" />
            Saldos Iniciais
          </button>

          {/* Novo Lançamento Avulso */}
          <button
            onClick={() => {
              setMovementToEdit(null);
              setIsMovementModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00DFFF] to-[#8423DA] hover:opacity-95 text-white text-xs font-black shadow-lg shadow-[#00DFFF]/20 flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            + Lançamento Avulso
          </button>
        </div>
      </div>

      {/* 2. KPIS COM CÁLCULO PRECISO DO SALDO DE ABERTURA CONSIDERANDO TODO O HISTÓRICO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Saldo de Abertura do Período */}
        <div className="p-4 rounded-2xl bg-[#0D1022] border border-[#8423DA]/30 space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span className="font-semibold">
              {periodFilter === 'all' ? 'Saldo Inicial Total' : 'Saldo de Abertura do Período'}
            </span>
            <Wallet className="w-4 h-4 text-[#8423DA]" />
          </div>
          <div className="font-heading text-2xl font-black text-white">
            {formatBRL(activePeriodMetrics.openingBalance)}
          </div>
          <div className="text-[11px] text-gray-400 flex items-center justify-between">
            <span className="truncate max-w-[200px]" title="Considera saldo inicial base + histórico anterior">
              {activePeriodRange.startStr
                ? `Posição em ${formatDateTime(activePeriodRange.startStr).split(' ')[0]}`
                : `Base: ${initialCashConfig.referenceDate}`}
            </span>
            <button
              onClick={() => setIsConfigModalOpen(true)}
              className="text-[#00DFFF] hover:underline text-[10px] font-bold shrink-0"
            >
              Configurar
            </button>
          </div>
        </div>

        {/* Entradas no Período */}
        <div className="p-4 rounded-2xl bg-[#0D1022] border border-[#10B981]/30 space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span className="font-semibold">
              {periodFilter === 'all' ? 'Total Entradas Realizadas' : 'Entradas no Período'}
            </span>
            <ArrowDownLeft className="w-4 h-4 text-[#10B981]" />
          </div>
          <div className="font-heading text-2xl font-black text-[#10B981]">
            {formatBRL(activePeriodMetrics.entradas)}
          </div>
          <div className="text-[11px] text-gray-400">
            <span>Recebimentos efetivos quitados</span>
          </div>
        </div>

        {/* Saídas no Período */}
        <div className="p-4 rounded-2xl bg-[#0D1022] border border-[#EF4444]/30 space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span className="font-semibold">
              {periodFilter === 'all' ? 'Total Saídas Desembolsadas' : 'Saídas no Período'}
            </span>
            <ArrowUpRight className="w-4 h-4 text-[#EF4444]" />
          </div>
          <div className="font-heading text-2xl font-black text-[#EF4444]">
            {formatBRL(activePeriodMetrics.saidas)}
          </div>
          <div className="text-[11px] text-gray-400">
            <span>Gastos, compras e retiradas pagas</span>
          </div>
        </div>

        {/* Saldo de Fechamento / Saldo do Período */}
        <div
          className={`p-4 rounded-2xl bg-[#0D1022] border space-y-2 ${
            activePeriodMetrics.fechamento >= 0 ? 'border-[#00DFFF]/40' : 'border-rose-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span className="font-semibold">
              {periodFilter === 'all' ? 'Saldo Atual em Caixa' : 'Saldo de Fechamento do Período'}
            </span>
            <Sparkles className="w-4 h-4 text-[#00DFFF]" />
          </div>
          <div
            className={`font-heading text-2xl font-black ${
              activePeriodMetrics.fechamento >= 0 ? 'text-[#00DFFF]' : 'text-rose-400'
            }`}
          >
            {formatBRL(activePeriodMetrics.fechamento)}
          </div>
          <div className="text-[11px] text-gray-400 flex items-center justify-between">
            <span>Abertura + Entradas - Saídas</span>
            <span
              className={`font-bold ${
                activePeriodMetrics.resultado >= 0 ? 'text-[#10B981]' : 'text-rose-400'
              }`}
            >
              {activePeriodMetrics.resultado >= 0 ? '+' : ''}
              {formatBRL(activePeriodMetrics.resultado)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. DISPONIBILIDADE ATUAL POR CANAL FINANCEIRO */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0D1022] border border-[#8423DA]/20 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#8423DA]" />
            <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
              Disponibilidade por Canal Financeiro (Saldo Real em Cada Conta)
            </h4>
          </div>
          <span className="text-[11px] text-gray-500">
            Calculado a partir da data de referência de cada conta
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Pix / Banco */}
          <div className="p-3 rounded-xl bg-[#080811] border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#00DFFF]/10 flex items-center justify-center">
                <Building className="w-4 h-4 text-[#00DFFF]" />
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-300 block">Pix / Banco</span>
                <span className="text-[10px] text-gray-500">
                  Ref: {getChannelReferenceDate('pix_banco')}
                </span>
              </div>
            </div>
            <div className="font-heading font-black text-sm text-white">
              {formatBRL(globalChannelBalances.pix_banco)}
            </div>
          </div>

          {/* Dinheiro / Gaveta */}
          <div className="p-3 rounded-xl bg-[#080811] border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#10B981]/10 flex items-center justify-center">
                <Banknote className="w-4 h-4 text-[#10B981]" />
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-300 block">Dinheiro Físico</span>
                <span className="text-[10px] text-gray-500">
                  Ref: {getChannelReferenceDate('dinheiro_caixa')}
                </span>
              </div>
            </div>
            <div className="font-heading font-black text-sm text-white">
              {formatBRL(globalChannelBalances.dinheiro_caixa)}
            </div>
          </div>

          {/* Cartão / Maquininha */}
          <div className="p-3 rounded-xl bg-[#080811] border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#8423DA]/10 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-[#8423DA]" />
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-300 block">Cartão / POS</span>
                <span className="text-[10px] text-gray-500">
                  Ref: {getChannelReferenceDate('cartao_maquininha')}
                </span>
              </div>
            </div>
            <div className="font-heading font-black text-sm text-white">
              {formatBRL(globalChannelBalances.cartao_maquininha)}
            </div>
          </div>

          {/* Outro */}
          <div className="p-3 rounded-xl bg-[#080811] border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#FACC15]/10 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-[#FACC15]" />
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-300 block">Outro Canal</span>
                <span className="text-[10px] text-gray-500">
                  Ref: {getChannelReferenceDate('outro')}
                </span>
              </div>
            </div>
            <div className="font-heading font-black text-sm text-white">
              {formatBRL(globalChannelBalances.outro)}
            </div>
          </div>
        </div>
      </div>

      {/* 4. VISUAL CHARTS SECTION (TOGGLEABLE) */}
      {showCharts && (
        <CashFlowCharts
          movements={chartItems}
          initialBalance={periodOpeningBalance}
        />
      )}

      {/* 5. INTERACTIVE SUPERPLANILHA CONTROLS (FILTERS & ACTIONS) */}
      <div className="p-5 rounded-3xl bg-[#0D1022] border border-[#8423DA]/25 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por descrição, cliente, fornecedor ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#080811] border border-[#8423DA]/25 text-white text-xs placeholder-gray-500 focus:outline-none focus:border-[#00DFFF] transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick period buttons & Export */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Period filter dropdown */}
            <div className="flex items-center gap-1 bg-[#080811] rounded-xl border border-white/10 p-1">
              {(
                [
                  { id: 'today', label: 'Hoje' },
                  { id: '7d', label: '7d' },
                  { id: 'this_month', label: 'Este Mês' },
                  { id: 'last_month', label: 'Mês Ant.' },
                  { id: 'all', label: 'Tudo' },
                  { id: 'custom', label: 'Custom' },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPeriodFilter(p.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    periodFilter === p.id
                      ? 'bg-[#00DFFF]/20 text-[#00DFFF] border border-[#00DFFF]/40'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* CSV Export Button */}
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-[#10B981]/10 hover:bg-[#10B981]/20 border border-[#10B981]/30 text-[#10B981] text-xs font-bold flex items-center gap-1.5 transition-colors"
              title="Exportar planilha Excel formatada (CSV)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Exportar CSV
            </button>
          </div>
        </div>

        {/* Custom date range bar if selected */}
        {periodFilter === 'custom' && (
          <div className="p-3 rounded-xl bg-[#080811] border border-white/5 flex flex-wrap items-center gap-3 text-xs animate-in fade-in">
            <span className="text-gray-400 font-semibold flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#00DFFF]" />
              Intervalo Personalizado:
            </span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-[#0D1022] border border-white/10 text-white text-xs"
              />
              <span className="text-gray-500">até</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-[#0D1022] border border-white/10 text-white text-xs"
              />
            </div>
          </div>
        )}

        {/* Filter Badges Row (Tipo, Canal, Origem) */}
        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
          {/* Tipo Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 text-[11px] font-semibold uppercase">Tipo:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="px-2.5 py-1 rounded-lg bg-[#080811] border border-white/10 text-xs text-white focus:outline-none focus:border-[#00DFFF]"
            >
              <option value="all">Todos os Tipos</option>
              <option value="entrada">Apenas Entradas (+)</option>
              <option value="saida">Apenas Saídas (-)</option>
              <option value="transferencia">Apenas Transferências (⇄)</option>
            </select>
          </div>

          {/* Canal Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 text-[11px] font-semibold uppercase">Canal:</span>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value as any)}
              className="px-2.5 py-1 rounded-lg bg-[#080811] border border-white/10 text-xs text-white focus:outline-none focus:border-[#00DFFF]"
            >
              <option value="all">Todos os Canais</option>
              <option value="pix_banco">Pix / Conta Bancária</option>
              <option value="dinheiro_caixa">Dinheiro / Gaveta</option>
              <option value="cartao_maquininha">Cartão / Maquininha</option>
              <option value="outro">Outro Canal</option>
            </select>
          </div>

          {/* Origem Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 text-[11px] font-semibold uppercase">Origem:</span>
            <select
              value={originFilter}
              onChange={(e) => setOriginFilter(e.target.value as any)}
              className="px-2.5 py-1 rounded-lg bg-[#080811] border border-white/10 text-xs text-white focus:outline-none focus:border-[#00DFFF]"
            >
              <option value="all">Todas as Origens</option>
              <option value="vendas">Vendas de Clientes</option>
              <option value="despesas">Gastos Operacionais</option>
              <option value="compras">Compras de Estoque</option>
              <option value="avulsos">Lançamentos Avulsos</option>
            </select>
          </div>

          {/* Records count */}
          <div className="ml-auto text-[11px] text-gray-500">
            Mostrando <span className="font-bold text-white">{displayedMovements.length}</span>{' '}
            {displayedMovements.length === 1 ? 'movimentação' : 'movimentações'}
          </div>
        </div>
      </div>

      {/* 6. SUPERPLANILHA TABLE */}
      <div className="rounded-3xl bg-[#0D1022] border border-[#8423DA]/25 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs tabular-nums">
            <thead>
              <tr className="bg-[#121633] border-b border-[#8423DA]/25 text-[10px] text-[#C4C6D8] font-extrabold uppercase tracking-wider select-none">
                <th
                  onClick={() => setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                  className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Data & Hora</span>
                    {sortDirection === 'desc' ? (
                      <ChevronDown className="w-3.5 h-3.5 text-[#00DFFF]" />
                    ) : (
                      <ChevronUp className="w-3.5 h-3.5 text-[#00DFFF]" />
                    )}
                  </div>
                </th>
                <th className="py-3.5 px-4">Descrição / Histórico</th>
                <th className="py-3.5 px-4">Origem</th>
                <th className="py-3.5 px-4">Categoria</th>
                <th className="py-3.5 px-4">Canal / Conta</th>
                <th className="py-3.5 px-4 text-right">Valor Efetivo</th>
                <th className="py-3.5 px-4 text-right">Saldo Acumulado</th>
                <th className="py-3.5 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#8423DA]/15">
              {paginatedMovements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center">
                    <div className="max-w-md mx-auto space-y-2">
                      <ArrowLeftRight className="w-10 h-10 text-gray-500 mx-auto" />
                      <h4 className="font-bold text-white text-sm">
                        Nenhuma movimentação financeira encontrada
                      </h4>
                      <p className="text-xs text-[#A5A5B8]">
                        Os pagamentos recebidos de vendas e desembolsos de despesas/compras aparecerão aqui automaticamente na data em que forem quitados.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedMovements.map((m) => {
                  const badge = getOriginBadge(m.originType);
                  return (
                    <tr
                      key={m.id}
                      className={`hover:bg-[#141838]/60 transition-colors group ${
                        m.isPriorToReferenceDate ? 'opacity-65' : ''
                      }`}
                    >
                      {/* Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-gray-200 font-semibold align-middle tabular-nums">
                        {formatDateTime(m.effectiveDate)}
                      </td>

                      {/* Description */}
                      <td className="py-3.5 px-4 max-w-xs align-middle">
                        <div className="font-bold text-white truncate" title={m.description}>
                          {m.description}
                        </div>
                        {m.isPriorToReferenceDate ? (
                          <div className="text-[10px] text-amber-400/90 font-medium flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            Anterior à data base inicial (não duplica saldo)
                          </div>
                        ) : m.notes ? (
                          <div className="text-[11px] text-[#A5A5B8] truncate" title={m.notes}>
                            {m.notes}
                          </div>
                        ) : null}
                      </td>

                      {/* Origin Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap align-middle">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}
                        >
                          {badge.label}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-gray-300 align-middle">
                        <span className="truncate max-w-[140px] block" title={m.category}>
                          {m.category || '—'}
                        </span>
                      </td>

                      {/* Channel / Conta */}
                      <td className="py-3.5 px-4 whitespace-nowrap align-middle">
                        {m.type === 'transferencia' ? (
                          <div className="flex items-center gap-1.5 text-[11px] text-[#C084FC] font-medium">
                            <span>{getChannelLabel(m.accountChannel)}</span>
                            <span className="text-gray-400">→</span>
                            <span>
                              {m.destinationAccountChannel
                                ? getChannelLabel(m.destinationAccountChannel)
                                : 'Outro'}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-gray-200 font-medium">
                            {getChannelIcon(m.accountChannel)}
                            <span>{getChannelLabel(m.accountChannel)}</span>
                          </div>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-heading font-black text-sm align-middle tabular-nums">
                        {m.type === 'entrada' && (
                          <span className="text-[#10B981] flex items-center justify-end gap-1">
                            <span>+</span> {formatBRL(m.amount)}
                          </span>
                        )}
                        {m.type === 'saida' && (
                          <span className="text-[#EF4444] flex items-center justify-end gap-1">
                            <span>-</span> {formatBRL(m.amount)}
                          </span>
                        )}
                        {m.type === 'transferencia' && (
                          <span className="text-[#C084FC] flex items-center justify-end gap-1">
                            <span>⇄</span> {formatBRL(m.amount)}
                          </span>
                        )}
                      </td>

                      {/* Accumulated Balance */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-heading font-black text-xs text-white align-middle tabular-nums">
                        <span
                          className={
                            (m.accumulatedBalance ?? 0) >= 0 ? 'text-gray-100' : 'text-rose-400'
                          }
                        >
                          {formatBRL(m.accumulatedBalance ?? 0)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {/* View details */}
                          <button
                            onClick={() => setDetailsMovement(m)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-[#00DFFF] hover:bg-white/5 transition-colors"
                            title="Ver Detalhes do Lançamento"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* If standalone, allow edit and delete */}
                          {m.isStandalone && (
                            <>
                              <button
                                onClick={() => {
                                  const original = cashMovements.find(
                                    (cm) => cm.id === m.referenceId || `cm-${cm.id}` === m.id
                                  );
                                  if (original) {
                                    setMovementToEdit(original);
                                    setIsMovementModalOpen(true);
                                  }
                                }}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-amber-400 hover:bg-white/5 transition-colors"
                                title="Editar Lançamento Avulso"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => {
                                  const original = cashMovements.find(
                                    (cm) => cm.id === m.referenceId || `cm-${cm.id}` === m.id
                                  );
                                  if (original) {
                                    setMovementToDelete(original);
                                  }
                                }}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-white/5 transition-colors"
                                title="Excluir Lançamento Avulso"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 7. PAGINATION FOOTER */}
        {displayedMovements.length > 0 && (
          <div className="p-4 bg-[#080811] border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <span>Linhas por página:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => setRowsPerPage(Number(e.target.value))}
                className="px-2 py-1 rounded bg-[#0D1022] border border-white/10 text-white text-xs"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-[11px] text-gray-500">
                Página {currentPage} de {totalPages}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg bg-[#0D1022] border border-white/10 text-white text-xs disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/5"
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1.5 rounded-lg bg-[#0D1022] border border-white/10 text-white text-xs disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/5"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: CONFIG SALDOS INICIAIS */}
      <CashBalanceConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        currentConfig={initialCashConfig}
        onSave={saveInitialCashBalances}
      />

      {/* MODAL 2: LANÇAMENTO AVULSO & TRANSFERÊNCIA */}
      <CashMovementModal
        isOpen={isMovementModalOpen}
        onClose={() => {
          setIsMovementModalOpen(false);
          setMovementToEdit(null);
        }}
        movementToEdit={movementToEdit}
      />

      {/* MODAL 3: DETALHES COMPLETOS DO LANÇAMENTO */}
      {detailsMovement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#0B0D1B] border border-[#8423DA]/30 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00DFFF] to-[#8423DA] p-0.5 flex items-center justify-center">
                  <div className="w-full h-full bg-[#080811] rounded-[10px] flex items-center justify-center">
                    <Eye className="w-4 h-4 text-[#00DFFF]" />
                  </div>
                </div>
                <div>
                  <h3 className="font-heading text-base font-black text-white">
                    Detalhes do Lançamento
                  </h3>
                  <p className="text-[11px] text-gray-400">ID: {detailsMovement.id}</p>
                </div>
              </div>
              <button
                onClick={() => setDetailsMovement(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-3 rounded-2xl bg-[#080811] border border-white/5 flex items-center justify-between">
                <span className="text-gray-400 font-semibold">Valor Efetivo:</span>
                <span
                  className={`font-heading text-lg font-black ${
                    detailsMovement.type === 'entrada'
                      ? 'text-[#10B981]'
                      : detailsMovement.type === 'saida'
                      ? 'text-[#EF4444]'
                      : 'text-[#C084FC]'
                  }`}
                >
                  {detailsMovement.type === 'entrada' ? '+' : detailsMovement.type === 'saida' ? '-' : '⇄'}{' '}
                  {formatBRL(detailsMovement.amount)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#080811] border border-white/5">
                  <span className="text-gray-500 block text-[10px] uppercase font-bold">Data Efetiva</span>
                  <span className="text-white font-medium">{formatDateTime(detailsMovement.effectiveDate)}</span>
                </div>
                <div className="p-3 rounded-xl bg-[#080811] border border-white/5">
                  <span className="text-gray-500 block text-[10px] uppercase font-bold">Origem</span>
                  <span className="text-white font-medium">{getOriginBadge(detailsMovement.originType).label}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#080811] border border-white/5">
                  <span className="text-gray-500 block text-[10px] uppercase font-bold">Categoria</span>
                  <span className="text-white font-medium">{detailsMovement.category || '—'}</span>
                </div>
                <div className="p-3 rounded-xl bg-[#080811] border border-white/5">
                  <span className="text-gray-500 block text-[10px] uppercase font-bold">Canal Financeiro</span>
                  <span className="text-white font-medium">{getChannelLabel(detailsMovement.accountChannel)}</span>
                </div>
              </div>

              {detailsMovement.destinationAccountChannel && (
                <div className="p-3 rounded-xl bg-[#080811] border border-white/5">
                  <span className="text-gray-500 block text-[10px] uppercase font-bold">Canal de Destino (Transferência)</span>
                  <span className="text-[#C084FC] font-medium">{getChannelLabel(detailsMovement.destinationAccountChannel)}</span>
                </div>
              )}

              <div className="p-3 rounded-xl bg-[#080811] border border-white/5">
                <span className="text-gray-500 block text-[10px] uppercase font-bold">Descrição Completa</span>
                <p className="text-white mt-1 leading-relaxed">{detailsMovement.description}</p>
              </div>

              {detailsMovement.notes && (
                <div className="p-3 rounded-xl bg-[#080811] border border-white/5">
                  <span className="text-gray-500 block text-[10px] uppercase font-bold">Observações / Detalhes</span>
                  <p className="text-gray-300 mt-1 leading-relaxed">{detailsMovement.notes}</p>
                </div>
              )}

              {detailsMovement.isPriorToReferenceDate && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p>
                    A data desta movimentação é anterior à data de referência do canal ({getChannelReferenceDate(detailsMovement.accountChannel)}). O sistema preserva este registro para consulta histórica, mas não o soma ao saldo para evitar duplicidade com o saldo inicial configurado.
                  </p>
                </div>
              )}

              {!detailsMovement.isStandalone && !detailsMovement.isPriorToReferenceDate && (
                <div className="p-3 rounded-xl bg-[#00DFFF]/5 border border-[#00DFFF]/20 text-[11px] text-[#A5A5B8] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-[#00DFFF] shrink-0 mt-0.5" />
                  <p>
                    Este lançamento foi consolidado automaticamente a partir do módulo original ({getOriginBadge(detailsMovement.originType).label}). Qualquer alteração realizada lá refletirá imediatamente aqui.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setDetailsMovement(null)}
                className="px-4 py-2 rounded-xl bg-[#141838] text-white text-xs font-bold hover:bg-[#8423DA]/30 transition-colors"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CONFIRMAR EXCLUSÃO DE LANÇAMENTO AVULSO */}
      {movementToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#0B0D1B] border border-rose-500/30 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <Trash2 className="w-6 h-6 shrink-0" />
              <h3 className="font-heading text-lg font-bold text-white">
                Excluir Lançamento Avulso?
              </h3>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              Você tem certeza que deseja excluir o lançamento{' '}
              <strong className="text-white font-bold">"{movementToDelete.description}"</strong> de valor{' '}
              <strong className="text-rose-400 font-bold">{formatBRL(movementToDelete.amount)}</strong>? Essa ação recalculará o saldo acumulado de caixa.
            </p>
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setMovementToDelete(null)}
                className="px-4 py-2 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDeleteMovement(movementToDelete)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
