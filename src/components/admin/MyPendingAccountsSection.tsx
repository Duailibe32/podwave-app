import React, { useState, useMemo } from 'react';
import { useCatalog } from '../../context/CatalogContext';
import {
  PendingAccountItem,
  PendingAccountOrigin,
  PendingAccountType,
  PendingAccountUrgency,
  ManualCommitmentEntry,
} from '../../types/catalog';
import {
  Clock,
  Search,
  Filter,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Download,
  Layers,
  Sparkles,
  CreditCard,
  Edit2,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  FileSpreadsheet,
  X,
  RefreshCw,
} from 'lucide-react';
import { PendingSettlementModal } from './PendingSettlementModal';
import { InstallmentConfigModal } from './InstallmentConfigModal';
import { ManualCommitmentModal } from './ManualCommitmentModal';
import { PendingAccountsCalendar } from './PendingAccountsCalendar';

type FilterTab = 'todas' | 'a_receber' | 'a_pagar' | 'vencidas' | 'vence_hoje' | '7_dias' | 'quitadas';

export const MyPendingAccountsSection: React.FC = () => {
  const {
    manualSales,
    manualExpenses,
    merchandisePurchases,
    manualCommitments,
    removeManualCommitment,
    fetchBusinessData,
  } = useCatalog();

  // Navigation & View Mode
  const [viewMode, setViewMode] = useState<'tabela' | 'calendario'>('tabela');
  const [activeTab, setActiveTab] = useState<FilterTab>('todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [originFilter, setOriginFilter] = useState<string>('todos');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // Modals state
  const [isCommitmentModalOpen, setIsCommitmentModalOpen] = useState(false);
  const [editingCommitment, setEditingCommitment] = useState<ManualCommitmentEntry | null>(null);

  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [selectedForSettlement, setSelectedForSettlement] = useState<PendingAccountItem | null>(null);

  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
  const [selectedForInstallment, setSelectedForInstallment] = useState<PendingAccountItem | null>(null);

  const [detailsItem, setDetailsItem] = useState<PendingAccountItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<PendingAccountItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Helper para calcular a urgência e dias de atraso
  const calculateUrgency = (
    amountPending: number,
    dueDate?: string
  ): { urgency: PendingAccountUrgency; diasAtraso: number; daysDiff: number } => {
    if (amountPending <= 0.001) {
      return { urgency: 'quitado', diasAtraso: 0, daysDiff: 0 };
    }

    if (!dueDate) {
      return { urgency: 'sem_vencimento', diasAtraso: 0, daysDiff: 9999 };
    }

    // Comparar no fuso local sem problemas de timezone
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [y, m, d] = dueDate.split('-').map(Number);
    const due = new Date(y, m - 1, d);
    due.setHours(0, 0, 0, 0);

    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { urgency: 'vencido', diasAtraso: Math.abs(diffDays), daysDiff: diffDays };
    }
    if (diffDays === 0) {
      return { urgency: 'vence_hoje', diasAtraso: 0, daysDiff: 0 };
    }
    if (diffDays <= 7) {
      return { urgency: 'vence_breve', diasAtraso: 0, daysDiff: diffDays };
    }
    return { urgency: 'em_aberto', diasAtraso: 0, daysDiff: diffDays };
  };

  // 1. UNIFICAÇÃO DINÂMICA DE TODAS AS CONTAS PENDENTES (SINGLE SOURCE OF TRUTH)
  const allAccounts = useMemo(() => {
    const list: PendingAccountItem[] = [];

    // A) VENDAS MANUAIS (A RECEBER)
    // Exclui vendas canceladas
    manualSales.forEach((sale) => {
      if (sale.orderStatus === 'cancelado') return;
      const pending = sale.amountPending ?? Math.max(0, (sale.netTotal || 0) - (sale.amountReceived || 0));
      const { urgency, diasAtraso } = calculateUrgency(pending, sale.dueDate);

      list.push({
        id: `venda-${sale.id}`,
        originId: sale.id,
        originType: 'venda',
        type: 'a_receber',
        description: `Venda #${sale.id.slice(0, 6)} - ${sale.items?.map((i) => i.productName).join(', ') || 'Produtos Diversos'}`,
        counterpartyName: sale.customerName || 'Cliente Balcão',
        counterpartyContact: sale.customerPhone,
        issueDate: sale.saleDate,
        dueDate: sale.dueDate,
        totalAmount: sale.netTotal || sale.grossTotal || 0,
        amountPaid: sale.amountReceived || 0,
        amountPending: pending,
        paymentMethod: sale.paymentMethod,
        urgency,
        diasAtraso,
        installments: sale.installments,
        notes: sale.notes,
        createdAt: sale.createdAt,
      });
    });

    // B) DESPESAS OPERACIONAIS (A PAGAR)
    manualExpenses.forEach((exp) => {
      const pending = exp.amountPending ?? Math.max(0, (exp.amount || 0) - (exp.amountPaid || 0));
      const { urgency, diasAtraso } = calculateUrgency(pending, exp.dueDate);

      list.push({
        id: `despesa-${exp.id}`,
        originId: exp.id,
        originType: 'despesa',
        type: 'a_pagar',
        description: exp.description || 'Despesa Operacional',
        counterpartyName: exp.category || 'Fornecedor / Prestador',
        issueDate: exp.expenseDate,
        dueDate: exp.dueDate,
        totalAmount: exp.amount || 0,
        amountPaid: exp.amountPaid || 0,
        amountPending: pending,
        paymentMethod: exp.paymentMethod,
        urgency,
        diasAtraso,
        installments: exp.installments,
        notes: exp.notes,
        createdAt: exp.createdAt,
      });
    });

    // C) COMPRAS DE MERCADORIAS (ESTOQUE - A PAGAR)
    merchandisePurchases.forEach((purch) => {
      const pending = purch.amountPending ?? Math.max(0, (purch.totalCost || 0) - (purch.amountPaid || 0));
      const { urgency, diasAtraso } = calculateUrgency(pending, purch.dueDate);

      list.push({
        id: `compra-${purch.id}`,
        originId: purch.id,
        originType: 'compra_estoque',
        type: 'a_pagar',
        description: `Compra Mercadorias #${purch.id.slice(0, 6)} - ${purch.items?.map((i) => i.name).join(', ') || 'Itens p/ Revenda'}`,
        counterpartyName: purch.supplierName || 'Fornecedor de Mercadorias',
        counterpartyContact: purch.supplierContact,
        issueDate: purch.purchaseDate,
        dueDate: purch.dueDate,
        totalAmount: purch.totalCost || 0,
        amountPaid: purch.amountPaid || 0,
        amountPending: pending,
        paymentMethod: purch.paymentMethod,
        urgency,
        diasAtraso,
        installments: purch.installments,
        notes: purch.notes,
        createdAt: purch.createdAt,
      });
    });

    // D) COMPROMISSOS AVULSOS (A PAGAR OU A RECEBER)
    manualCommitments.forEach((comm) => {
      if (comm.paymentStatus === 'cancelado') return;
      const pending = comm.amountPending ?? Math.max(0, (comm.totalAmount || 0) - (comm.amountPaid || 0));
      const { urgency, diasAtraso } = calculateUrgency(pending, comm.dueDate);

      list.push({
        id: `avulso-${comm.id}`,
        originId: comm.id,
        originType: 'avulso',
        type: comm.type,
        description: comm.description,
        counterpartyName: comm.counterpartyName,
        counterpartyContact: comm.counterpartyContact,
        issueDate: comm.issueDate,
        dueDate: comm.dueDate,
        totalAmount: comm.totalAmount,
        amountPaid: comm.amountPaid || 0,
        amountPending: pending,
        paymentMethod: comm.paymentMethod,
        accountChannel: comm.accountChannel,
        urgency,
        diasAtraso,
        installments: comm.installments,
        notes: comm.notes,
        createdAt: comm.createdAt,
      });
    });

    // Ordenar: Primeiro as que possuem maior urgência (vencidas com maior atraso, depois vence hoje, depois proximas)
    return list.sort((a, b) => {
      // Prioridade de urgência: vencido > vence_hoje > vence_breve > em_aberto > sem_vencimento > quitado
      const order: Record<PendingAccountUrgency, number> = {
        vencido: 1,
        vence_hoje: 2,
        vence_breve: 3,
        em_aberto: 4,
        sem_vencimento: 5,
        quitado: 6,
      };

      const diff = order[a.urgency] - order[b.urgency];
      if (diff !== 0) return diff;

      // Se ambos vencidos, maior diasAtraso primeiro
      if (a.urgency === 'vencido' && b.urgency === 'vencido') {
        return (b.diasAtraso || 0) - (a.diasAtraso || 0);
      }

      // Senão por dueDate mais próximo
      if (a.dueDate && b.dueDate) {
        return a.dueDate.localeCompare(b.dueDate);
      }
      return 0;
    });
  }, [manualSales, manualExpenses, merchandisePurchases, manualCommitments, todayStr]);

  // 2. CÁLCULO DOS CARDS KPI (INDICADORES DE PENDÊNCIAS)
  const kpiData = useMemo(() => {
    let totalReceivable = 0;
    let countReceivable = 0;

    let totalPayable = 0;
    let countPayable = 0;

    let totalOverdue = 0;
    let countOverdue = 0;

    let totalNext7Days = 0;
    let countNext7Days = 0;

    let totalNext30Days = 0;
    let countNext30Days = 0;

    let totalOpenPending = 0;

    allAccounts.forEach((acc) => {
      if (acc.amountPending <= 0.001) return;

      totalOpenPending += acc.amountPending;

      if (acc.type === 'a_receber') {
        totalReceivable += acc.amountPending;
        countReceivable += 1;
      } else {
        totalPayable += acc.amountPending;
        countPayable += 1;
      }

      if (acc.urgency === 'vencido') {
        totalOverdue += acc.amountPending;
        countOverdue += 1;
      }

      if (acc.dueDate) {
        const { daysDiff } = calculateUrgency(acc.amountPending, acc.dueDate);
        if (daysDiff >= 0 && daysDiff <= 7) {
          totalNext7Days += acc.amountPending;
          countNext7Days += 1;
        }
        if (daysDiff >= 0 && daysDiff <= 30) {
          totalNext30Days += acc.amountPending;
          countNext30Days += 1;
        }
      }
    });

    const netBalance = totalReceivable - totalPayable;

    return {
      totalReceivable,
      countReceivable,
      totalPayable,
      countPayable,
      netBalance,
      totalOverdue,
      countOverdue,
      totalNext7Days,
      countNext7Days,
      totalNext30Days,
      countNext30Days,
      totalOpenPending,
    };
  }, [allAccounts]);

  // 3. FILTRAGEM DOS REGISTROS
  const filteredAccounts = useMemo(() => {
    return allAccounts.filter((item) => {
      // Filtro por Tab
      if (activeTab === 'a_receber' && item.type !== 'a_receber') return false;
      if (activeTab === 'a_pagar' && item.type !== 'a_pagar') return false;
      if (activeTab === 'vencidas' && item.urgency !== 'vencido') return false;
      if (activeTab === 'vence_hoje' && item.urgency !== 'vence_hoje') return false;
      if (activeTab === '7_dias' && item.urgency !== 'vence_breve' && item.urgency !== 'vence_hoje') return false;
      if (activeTab === 'quitadas' && item.urgency !== 'quitado') return false;
      // Tab 'todas' oculta quitadas por padrão para manter foco operacional, exceto se pesquisado
      if (activeTab === 'todas' && item.urgency === 'quitado' && !searchTerm) return false;

      // Filtro por Origem
      if (originFilter !== 'todos' && item.originType !== originFilter) return false;

      // Filtro por Período de Vencimento
      if (startDateFilter && (!item.dueDate || item.dueDate < startDateFilter)) return false;
      if (endDateFilter && (!item.dueDate || item.dueDate > endDateFilter)) return false;

      // Filtro por Texto / Busca
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchDesc = item.description?.toLowerCase().includes(term);
        const matchCounterparty = item.counterpartyName?.toLowerCase().includes(term);
        const matchContact = item.counterpartyContact?.toLowerCase().includes(term);
        const matchNotes = item.notes?.toLowerCase().includes(term);
        return matchDesc || matchCounterparty || matchContact || matchNotes;
      }

      return true;
    });
  }, [allAccounts, activeTab, originFilter, startDateFilter, endDateFilter, searchTerm]);

  // Paginação
  const totalPages = Math.ceil(filteredAccounts.length / itemsPerPage) || 1;
  const paginatedAccounts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAccounts.slice(start, start + itemsPerPage);
  }, [filteredAccounts, currentPage, itemsPerPage]);

  // Exclusão de compromisso avulso
  const handleDeleteCommitment = async (item: PendingAccountItem) => {
    if (item.originType !== 'avulso') return;
    setDeleteError('');
    setDeletingItem(item);
  };

  const confirmDeleteCommitment = async () => {
    if (!deletingItem || isDeleting) return;
    setIsDeleting(true);
    try {
      const res = await removeManualCommitment(deletingItem.originId);
      if (res.success) setDeletingItem(null);
      else setDeleteError(res.error || 'Não foi possível excluir. O registro foi preservado.');
    } catch {
      setDeleteError('Não foi possível excluir. Confira a conexão e tente novamente.');
    } finally { setIsDeleting(false); }
  };

  // Edição de compromisso avulso
  const handleEditCommitment = (item: PendingAccountItem) => {
    if (item.originType !== 'avulso') return;
    const comm = manualCommitments.find((c) => c.id === item.originId);
    if (comm) {
      setEditingCommitment(comm);
      setIsCommitmentModalOpen(true);
    }
  };

  // Exportação CSV formatado em PT-BR com separador ';' e BOM UTF-8
  const handleExportCSV = () => {
    if (filteredAccounts.length === 0) {
      alert('Não há dados filtrados para exportar.');
      return;
    }

    const headers = [
      'Tipo',
      'Descrição',
      'Contraparte (Cliente/Fornecedor)',
      'Contato',
      'Origem',
      'Data Emissão',
      'Data Vencimento',
      'Valor Original (R$)',
      'Valor Quitado (R$)',
      'Saldo Pendente (R$)',
      'Forma Pagamento',
      'Status / Urgência',
      'Dias em Atraso',
      'Observações',
    ];

    const rows = filteredAccounts.map((acc) => [
      acc.type === 'a_receber' ? 'A Receber' : 'A Pagar',
      `"${acc.description.replace(/"/g, '""')}"`,
      `"${acc.counterpartyName.replace(/"/g, '""')}"`,
      `"${(acc.counterpartyContact || '').replace(/"/g, '""')}"`,
      acc.originType === 'venda'
        ? 'Venda'
        : acc.originType === 'despesa'
        ? 'Despesa'
        : acc.originType === 'compra_estoque'
        ? 'Compra Estoque'
        : 'Avulso',
      acc.issueDate ? acc.issueDate.split('-').reverse().join('/') : '',
      acc.dueDate ? acc.dueDate.split('-').reverse().join('/') : 'Sem vencimento',
      acc.totalAmount.toFixed(2).replace('.', ','),
      acc.amountPaid.toFixed(2).replace('.', ','),
      acc.amountPending.toFixed(2).replace('.', ','),
      `"${(acc.paymentMethod || '').replace(/"/g, '""')}"`,
      acc.urgency === 'vencido'
        ? 'Vencido'
        : acc.urgency === 'vence_hoje'
        ? 'Vence Hoje'
        : acc.urgency === 'vence_breve'
        ? 'Vence em Breve'
        : acc.urgency === 'quitado'
        ? 'Quitado'
        : 'Em Aberto',
      acc.diasAtraso || 0,
      `"${(acc.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(';'), ...rows.map((row) => row.join(';'))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `contas-pendentes-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper para badge de urgência
  const renderUrgencyBadge = (urgency: PendingAccountUrgency, diasAtraso?: number) => {
    switch (urgency) {
      case 'vencido':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-500/20 border border-rose-500/40 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.2)]">
            <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
            Vencido ({diasAtraso}d atraso)
          </span>
        );
      case 'vence_hoje':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/20 border border-amber-500/40 text-amber-300 animate-pulse">
            <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
            Vence Hoje!
          </span>
        );
      case 'vence_breve':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#00DFFF]/15 border border-[#00DFFF]/30 text-[#00DFFF]">
            <Clock className="w-3 h-3 text-[#00DFFF] shrink-0" />
            Próximos 7 dias
          </span>
        );
      case 'quitado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981]">
            <CheckCircle2 className="w-3 h-3 text-[#10B981] shrink-0" />
            Quitado
          </span>
        );
      case 'sem_vencimento':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-500/15 border border-gray-500/20 text-gray-400">
            Sem Vencimento
          </span>
        );
      case 'em_aberto':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/15 border border-blue-500/20 text-blue-300">
            A Vencer
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. HEADER DO MÓDULO COM BOTÃO DE AÇÃO */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[#0D1022] border border-[#8423DA]/25 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00DFFF] via-[#8423DA] to-[#E53CF3] p-0.5 flex items-center justify-center shadow-[0_0_20px_rgba(0,223,255,0.3)] shrink-0">
            <div className="w-full h-full bg-[#080811] rounded-[14px] flex items-center justify-center">
              <Clock className="w-6 h-6 text-[#00DFFF]" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-xl sm:text-2xl font-black text-white tracking-tight">
                Contas Pendentes
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-[#00DFFF]/10 border border-[#00DFFF]/30 text-[10px] font-extrabold uppercase tracking-wider text-[#00DFFF]">
                A Pagar & A Receber
              </span>
            </div>
            <p className="text-xs text-[#A5A5B8] mt-0.5">
              Superplanilha inteligente e consolidação de clientes fiados, parcelas de compras e despesas avulsas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setEditingCommitment(null);
              setIsCommitmentModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00DFFF] to-[#007BFF] text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-[#00DFFF]/20 hover:brightness-110 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Novo Compromisso Avulso</span>
          </button>
        </div>
      </div>

      {/* 2. KPI DASHBOARD CARDS: INDICADORES EM TEMPO REAL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total a Receber */}
        <div className="p-4 rounded-2xl bg-[#0D1022] border border-[#10B981]/30 space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span className="font-semibold">Total a Receber (Clientes/Fiado)</span>
            <ArrowDownLeft className="w-4 h-4 text-[#10B981]" />
          </div>
          <div className="font-heading text-2xl font-black text-[#10B981]">
            {formatBRL(kpiData.totalReceivable)}
          </div>
          <div className="text-[11px] text-gray-400 flex items-center justify-between">
            <span>{kpiData.countReceivable} {kpiData.countReceivable === 1 ? 'recebimento pendente' : 'recebimentos pendentes'}</span>
            <span className="text-[#10B981] font-bold">Ativo Líquido</span>
          </div>
        </div>

        {/* Total a Pagar */}
        <div className="p-4 rounded-2xl bg-[#0D1022] border border-rose-500/30 space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span className="font-semibold">Total a Pagar (Contas/Fornecedores)</span>
            <ArrowUpRight className="w-4 h-4 text-rose-400" />
          </div>
          <div className="font-heading text-2xl font-black text-rose-400">
            {formatBRL(kpiData.totalPayable)}
          </div>
          <div className="text-[11px] text-gray-400 flex items-center justify-between">
            <span>{kpiData.countPayable} {kpiData.countPayable === 1 ? 'conta a pagar' : 'contas a pagar'}</span>
            <span className="text-rose-400 font-bold">Passivo Futuro</span>
          </div>
        </div>

        {/* Saldo Líquido de Pendências */}
        <div
          className={`p-4 rounded-2xl bg-[#0D1022] border space-y-2 ${
            kpiData.netBalance >= 0 ? 'border-[#00DFFF]/30' : 'border-amber-500/30'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span className="font-semibold">Saldo Líquido Pendente</span>
            {kpiData.netBalance >= 0 ? (
              <TrendingUp className="w-4 h-4 text-[#00DFFF]" />
            ) : (
              <TrendingDown className="w-4 h-4 text-amber-400" />
            )}
          </div>
          <div
            className={`font-heading text-2xl font-black ${
              kpiData.netBalance >= 0 ? 'text-white' : 'text-amber-400'
            }`}
          >
            {formatBRL(kpiData.netBalance)}
          </div>
          <div className="text-[11px] text-gray-400 flex items-center justify-between">
            <span>Receber menos Pagar</span>
            <span className={kpiData.netBalance >= 0 ? 'text-[#00DFFF] font-bold' : 'text-amber-400 font-bold'}>
              {kpiData.netBalance >= 0 ? 'Superávit Previsto' : 'Déficit Previsto'}
            </span>
          </div>
        </div>

        {/* Contas Vencidas (Alerta de Inadimplência) */}
        <div
          className={`p-4 rounded-2xl bg-[#0D1022] border space-y-2 ${
            kpiData.countOverdue > 0
              ? 'border-rose-500/50 bg-rose-950/10 shadow-[0_0_20px_rgba(244,63,94,0.15)]'
              : 'border-[#8423DA]/20'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span className="font-semibold">Contas Vencidas</span>
            <AlertCircle
              className={`w-4 h-4 ${kpiData.countOverdue > 0 ? 'text-rose-400 animate-pulse' : 'text-gray-500'}`}
            />
          </div>
          <div
            className={`font-heading text-2xl font-black ${
              kpiData.countOverdue > 0 ? 'text-rose-400' : 'text-gray-300'
            }`}
          >
            {formatBRL(kpiData.totalOverdue)}
          </div>
          <div className="text-[11px] text-gray-400 flex items-center justify-between">
            <span>
              {kpiData.countOverdue}{' '}
              {kpiData.countOverdue === 1 ? 'pendência em atraso' : 'pendências em atraso'}
            </span>
            <span className="text-amber-400 text-[10px]">
              {kpiData.countNext7Days > 0 ? `+${kpiData.countNext7Days} em 7 dias` : 'Em dia'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. BARRA DE CONTROLE: ALTERNADOR DE VISÃO (TABELA / CALENDÁRIO) + TABS RÁPIDAS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Tabs de Filtro Rápido */}
        <div className="overflow-x-auto no-scrollbar pb-1">
          <div className="flex items-center gap-1.5 min-w-max p-1 rounded-2xl bg-[#0D1022] border border-[#8423DA]/20">
            <button
              onClick={() => {
                setActiveTab('todas');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'todas'
                  ? 'bg-gradient-to-r from-[#00DFFF] to-[#007BFF] text-black font-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Todas em Aberto
            </button>

            <button
              onClick={() => {
                setActiveTab('a_receber');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'a_receber'
                  ? 'bg-[#10B981] text-black font-black'
                  : 'text-[#10B981] hover:bg-[#10B981]/10'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>A Receber ({kpiData.countReceivable})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('a_pagar');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'a_pagar'
                  ? 'bg-rose-500 text-white font-black'
                  : 'text-rose-400 hover:bg-rose-500/10'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>A Pagar ({kpiData.countPayable})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('vencidas');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'vencidas'
                  ? 'bg-rose-600 text-white font-black shadow-lg shadow-rose-600/30'
                  : 'text-rose-300 hover:bg-rose-600/10'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Vencidas ({kpiData.countOverdue})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('vence_hoje');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'vence_hoje'
                  ? 'bg-amber-400 text-black font-black'
                  : 'text-amber-400 hover:bg-amber-400/10'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Vence Hoje</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('7_dias');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === '7_dias'
                  ? 'bg-[#00DFFF] text-black font-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Próximos 7 Dias ({kpiData.countNext7Days})
            </button>

            <button
              onClick={() => {
                setActiveTab('quitadas');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'quitadas'
                  ? 'bg-white/20 text-white font-black'
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              Histórico Quitado
            </button>
          </div>
        </div>

        {/* Alternador de Modo de Exibição */}
        <div className="flex items-center gap-2 self-start lg:self-auto">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0D1022] border border-[#8423DA]/20">
            <button
              onClick={() => setViewMode('tabela')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'tabela'
                  ? 'bg-[#141838] text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#00DFFF]" />
              <span>Superplanilha</span>
            </button>

            <button
              onClick={() => setViewMode('calendario')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'calendario'
                  ? 'bg-[#141838] text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-[#00DFFF]" />
              <span>Calendário</span>
            </button>
          </div>

          {/* Exportar Excel / CSV */}
          <button
            onClick={handleExportCSV}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-[#141838] hover:bg-[#8423DA]/40 text-gray-300 hover:text-white text-xs font-bold border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Exportar planilha Excel (CSV)"
          >
            <Download className="w-4 h-4 text-[#00DFFF]" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* 4. MODO CALENDÁRIO */}
      {viewMode === 'calendario' && (
        <PendingAccountsCalendar
          accounts={allAccounts}
          onSelectAccount={(acc) => setDetailsItem(acc)}
          onSettleAccount={(acc) => {
            setSelectedForSettlement(acc);
            setIsSettlementModalOpen(true);
          }}
        />
      )}

      {/* 5. MODO TABELA SUPERPLANILHA */}
      {viewMode === 'tabela' && (
        <div className="space-y-4">
          {/* Barra de Filtros e Busca Instantânea */}
          <div className="p-4 rounded-2xl bg-[#0D1022] border border-[#8423DA]/20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Campo de Busca */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por cliente, fornecedor ou descrição..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#080811] border border-white/10 text-white text-xs placeholder:text-gray-500 focus:outline-none focus:border-[#00DFFF]"
              />
            </div>

            {/* Filtro por Origem */}
            <div>
              <select
                value={originFilter}
                onChange={(e) => {
                  setOriginFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl bg-[#080811] border border-white/10 text-white text-xs focus:outline-none focus:border-[#00DFFF]"
              >
                <option value="todos">Todas as Origens</option>
                <option value="venda">Vendas (Fiados de Clientes)</option>
                <option value="despesa">Despesas Operacionais</option>
                <option value="compra_estoque">Compras de Mercadorias (Estoque)</option>
                <option value="avulso">Compromissos Avulsos (Boletos/Notas)</option>
              </select>
            </div>

            {/* Data Início */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-gray-400 shrink-0">De:</span>
              <input
                type="date"
                value={startDateFilter}
                onChange={(e) => {
                  setStartDateFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-2.5 py-1.5 rounded-xl bg-[#080811] border border-white/10 text-white text-xs focus:outline-none focus:border-[#00DFFF]"
              />
            </div>

            {/* Data Fim */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-gray-400 shrink-0">Até:</span>
              <input
                type="date"
                value={endDateFilter}
                onChange={(e) => {
                  setEndDateFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-2.5 py-1.5 rounded-xl bg-[#080811] border border-white/10 text-white text-xs focus:outline-none focus:border-[#00DFFF]"
              />
              {(startDateFilter || endDateFilter) && (
                <button
                  onClick={() => {
                    setStartDateFilter('');
                    setEndDateFilter('');
                  }}
                  className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                  title="Limpar filtro de datas"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Tabela de Alta Densidade */}
          <div className="rounded-3xl bg-[#0D1022] border border-[#8423DA]/25 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#141838]/80 border-b border-[#8423DA]/20 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Descrição / Origem</th>
                    <th className="py-3 px-4">Contraparte</th>
                    <th className="py-3 px-4">Vencimento</th>
                    <th className="py-3 px-4 text-right">Valor Total</th>
                    <th className="py-3 px-4 text-right">Já Quitado</th>
                    <th className="py-3 px-4 text-right">Saldo Pendente</th>
                    <th className="py-3 px-4 text-center">Status / Urgência</th>
                    <th className="py-3 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs text-gray-300">
                  {paginatedAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-gray-500">
                        <Clock className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#00DFFF]" />
                        <p className="font-semibold text-gray-400">Nenhuma conta pendente encontrada.</p>
                        <p className="text-[11px] mt-0.5">
                          Tudo que for lançado com valor em aberto nas vendas, gastos, compras ou compromissos avulsos aparecerá aqui.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedAccounts.map((item) => {
                      const isReceivable = item.type === 'a_receber';

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-white/[0.02] transition-colors group"
                        >
                          {/* Tipo */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                isReceivable
                                  ? 'bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981]'
                                  : 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
                              }`}
                            >
                              {isReceivable ? (
                                <ArrowDownLeft className="w-3 h-3" />
                              ) : (
                                <ArrowUpRight className="w-3 h-3" />
                              )}
                              <span>{isReceivable ? 'A Receber' : 'A Pagar'}</span>
                            </span>
                          </td>

                          {/* Descrição / Origem */}
                          <td className="py-3.5 px-4 min-w-[200px]">
                            <div className="font-bold text-white line-clamp-1">{item.description}</div>
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mt-0.5">
                              <span className="capitalize px-1.5 py-0.2 rounded bg-white/5 text-gray-300">
                                {item.originType === 'venda'
                                  ? 'Venda de Balcão'
                                  : item.originType === 'despesa'
                                  ? 'Despesa Operacional'
                                  : item.originType === 'compra_estoque'
                                  ? 'Mercadoria / Fornecedor'
                                  : 'Compromisso Avulso'}
                              </span>
                              {item.paymentMethod && <span>• {item.paymentMethod}</span>}
                            </div>
                          </td>

                          {/* Contraparte (Cliente / Fornecedor) */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-semibold text-gray-200">{item.counterpartyName}</div>
                            {item.counterpartyContact && (
                              <div className="text-[10px] text-gray-500">{item.counterpartyContact}</div>
                            )}
                          </td>

                          {/* Data de Vencimento */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {item.dueDate ? (
                              <div className="text-gray-200 font-semibold flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-gray-500" />
                                <span>{item.dueDate.split('-').reverse().join('/')}</span>
                              </div>
                            ) : (
                              <span className="text-gray-500 italic text-[11px]">Sem data</span>
                            )}
                          </td>

                          {/* Valor Total */}
                          <td className="py-3.5 px-4 text-right font-medium text-gray-300 whitespace-nowrap">
                            {formatBRL(item.totalAmount)}
                          </td>

                          {/* Já Quitado */}
                          <td className="py-3.5 px-4 text-right font-medium text-emerald-400 whitespace-nowrap">
                            {formatBRL(item.amountPaid)}
                          </td>

                          {/* Saldo Pendente */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <span
                              className={`font-black text-sm ${
                                isReceivable ? 'text-[#10B981]' : 'text-rose-400'
                              }`}
                            >
                              {formatBRL(item.amountPending)}
                            </span>
                          </td>

                          {/* Status / Urgência */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            {renderUrgencyBadge(item.urgency, item.diasAtraso)}
                          </td>

                          {/* Ações */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Botão de Quitar / Baixar */}
                              {item.amountPending > 0.001 ? (
                                <button
                                  onClick={() => {
                                    setSelectedForSettlement(item);
                                    setIsSettlementModalOpen(true);
                                  }}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-black text-white shadow-md transition-all cursor-pointer flex items-center gap-1 ${
                                    isReceivable
                                      ? 'bg-gradient-to-r from-[#10B981] to-[#00DFFF] hover:brightness-110 shadow-[#10B981]/20'
                                      : 'bg-gradient-to-r from-rose-500 to-[#8423DA] hover:brightness-110 shadow-rose-500/20'
                                  }`}
                                  title="Registrar recebimento ou pagamento"
                                >
                                  <CreditCard className="w-3 h-3" />
                                  <span>{isReceivable ? 'Receber' : 'Pagar'}</span>
                                </button>
                              ) : (
                                <span className="text-[10px] text-emerald-400 font-bold px-2 py-1">
                                  Liquidada
                                </span>
                              )}

                              {/* Botão de Parcelamento */}
                              <button
                                onClick={() => {
                                  setSelectedForInstallment(item);
                                  setIsInstallmentModalOpen(true);
                                }}
                                className="p-1.5 rounded-xl bg-white/5 hover:bg-[#8423DA]/30 text-gray-300 hover:text-white transition-colors"
                                title="Programar ou ajustar parcelas"
                              >
                                <Layers className="w-3.5 h-3.5" />
                              </button>

                              {/* Ver Detalhes */}
                              <button
                                onClick={() => setDetailsItem(item)}
                                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                                title="Ver detalhes completos"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {/* Se for Avulso, permite Editar e Excluir */}
                              {item.originType === 'avulso' && (
                                <>
                                  <button
                                    onClick={() => handleEditCommitment(item)}
                                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                                    title="Editar compromisso avulso"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => handleDeleteCommitment(item)}
                                    className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                                    title="Excluir compromisso avulso"
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

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="p-4 bg-[#141838]/60 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
                <div>
                  Mostrando página <strong>{currentPage}</strong> de <strong>{totalPages}</strong> ({filteredAccounts.length} itens)
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. MODAL DE NOVO COMPROMISSO AVULSO */}
      <ManualCommitmentModal
        isOpen={isCommitmentModalOpen}
        onClose={() => {
          setIsCommitmentModalOpen(false);
          setEditingCommitment(null);
        }}
        commitmentToEdit={editingCommitment}
      />

      {/* 7. MODAL DE QUITAÇÃO RÁPIDA / PAGAMENTO PARCIAL */}
      <PendingSettlementModal
        isOpen={isSettlementModalOpen}
        onClose={() => {
          setIsSettlementModalOpen(false);
          setSelectedForSettlement(null);
        }}
        pendingItem={selectedForSettlement}
        onSuccess={() => fetchBusinessData()}
      />

      {/* 8. MODAL DE PROGRAMAÇÃO DE PARCELAS */}
      <InstallmentConfigModal
        isOpen={isInstallmentModalOpen}
        onClose={() => {
          setIsInstallmentModalOpen(false);
          setSelectedForInstallment(null);
        }}
        pendingItem={selectedForInstallment}
        onSuccess={() => fetchBusinessData()}
      />

      {/* 9. MODAL DE DETALHES COMPLETOS DA CONTA */}
      {detailsItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#0B0D1B] border border-[#8423DA]/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 bg-gradient-to-r from-[#0D1022] via-[#141838] to-[#0D1022] border-b border-[#8423DA]/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    detailsItem.type === 'a_receber'
                      ? 'bg-[#10B981]/20 text-[#10B981]'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {detailsItem.type === 'a_receber' ? (
                    <ArrowDownLeft className="w-5 h-5" />
                  ) : (
                    <ArrowUpRight className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-heading text-base font-black text-white">
                    Detalhes da Pendência
                  </h3>
                  <span className="text-xs text-gray-400">
                    {detailsItem.type === 'a_receber' ? 'Conta a Receber' : 'Conta a Pagar'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setDetailsItem(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="p-4 rounded-2xl bg-[#080811] border border-white/5 space-y-2">
                <div className="text-xs text-gray-400">Descrição:</div>
                <div className="text-sm font-bold text-white">{detailsItem.description}</div>
                <div className="text-xs text-gray-400 pt-1">
                  Contraparte:{' '}
                  <strong className="text-gray-200">{detailsItem.counterpartyName}</strong>
                  {detailsItem.counterpartyContact && (
                    <span className="ml-1 text-gray-500">({detailsItem.counterpartyContact})</span>
                  )}
                </div>
              </div>

              {/* Indicadores Financeiros */}
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-[10px] text-gray-400">Total Original</div>
                  <div className="text-xs font-bold text-white mt-1">
                    {formatBRL(detailsItem.totalAmount)}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-[10px] text-gray-400">Total Quitado</div>
                  <div className="text-xs font-bold text-emerald-400 mt-1">
                    {formatBRL(detailsItem.amountPaid)}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-[10px] text-gray-400">Saldo Pendente</div>
                  <div
                    className={`text-xs font-bold mt-1 ${
                      detailsItem.type === 'a_receber' ? 'text-[#10B981]' : 'text-rose-400'
                    }`}
                  >
                    {formatBRL(detailsItem.amountPending)}
                  </div>
                </div>
              </div>

              {/* Datas & Urgência */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs">
                <div>
                  <span className="text-gray-400">Data de Vencimento:</span>{' '}
                  <strong className="text-white">
                    {detailsItem.dueDate ? detailsItem.dueDate.split('-').reverse().join('/') : 'Sem data definida'}
                  </strong>
                </div>
                <div>{renderUrgencyBadge(detailsItem.urgency, detailsItem.diasAtraso)}</div>
              </div>

              {/* Parcelas se existirem */}
              {detailsItem.installments && detailsItem.installments.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#00DFFF]" />
                    Parcelamento ({detailsItem.installments.length})
                  </h4>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {detailsItem.installments.map((inst) => (
                      <div
                        key={inst.id}
                        className="p-2.5 rounded-xl bg-[#080811] border border-white/5 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-gray-200">
                            Parcela {inst.installmentNumber}/{inst.totalInstallments}
                          </span>
                          <span className="text-[10px] text-gray-500 ml-2">Venc: {inst.dueDate}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-white">{formatBRL(inst.amount)}</div>
                          <div
                            className={`text-[10px] font-semibold ${
                              inst.amountPending <= 0.001 ? 'text-emerald-400' : 'text-amber-400'
                            }`}
                          >
                            {inst.amountPending <= 0.001 ? 'Paga' : `Resta ${formatBRL(inst.amountPending)}`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Observações */}
              {detailsItem.notes && (
                <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-gray-400">
                  <div className="text-[10px] uppercase font-bold text-gray-500 mb-0.5">Observações</div>
                  <p>{detailsItem.notes}</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-[#080811] border-t border-white/10 flex items-center justify-between">
              <button
                onClick={() => setDetailsItem(null)}
                className="px-4 py-2 rounded-xl border border-white/10 text-gray-300 text-xs font-semibold"
              >
                Fechar
              </button>
              {detailsItem.amountPending > 0.001 && (
                <button
                  onClick={() => {
                    const item = detailsItem;
                    setDetailsItem(null);
                    setSelectedForSettlement(item);
                    setIsSettlementModalOpen(true);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-black text-white shadow-md cursor-pointer ${
                    detailsItem.type === 'a_receber'
                      ? 'bg-gradient-to-r from-[#10B981] to-[#00DFFF]'
                      : 'bg-gradient-to-r from-rose-500 to-[#8423DA]'
                  }`}
                >
                  {detailsItem.type === 'a_receber' ? 'Quitar / Receber' : 'Quitar / Pagar'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {deletingItem && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
          <div role="alertdialog" aria-modal="true" aria-labelledby="delete-commitment-title" className="w-full max-w-md rounded-2xl bg-[#11152A] border border-rose-500/30 p-6 space-y-4">
            <h3 id="delete-commitment-title" className="text-lg font-bold text-white">Excluir conta pendente?</h3>
            <p className="text-sm text-gray-300">Excluir “{deletingItem.description}”, de {formatBRL(deletingItem.totalAmount)}? Esta ação não registra pagamento nem recebimento.</p>
            {deleteError && <p role="alert" className="text-sm text-rose-300">{deleteError}</p>}
            <div className="flex justify-end gap-3">
              <button autoFocus disabled={isDeleting} onClick={() => setDeletingItem(null)} className="px-4 py-2 rounded-xl border border-white/20 text-white">Cancelar</button>
              <button disabled={isDeleting} onClick={confirmDeleteCommitment} className="px-4 py-2 rounded-xl bg-rose-600 text-white disabled:opacity-50">{isDeleting ? 'Excluindo...' : 'Excluir conta'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
