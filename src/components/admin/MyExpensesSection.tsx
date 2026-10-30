import React, { useState, useMemo } from 'react';
import { useCatalog } from '../../context/CatalogContext';
import { ManualExpenseEntry, ExpenseCategory } from '../../types/catalog';
import { ManualExpenseModal } from './ManualExpenseModal';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  DollarSign,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Edit,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
  Calendar,
  Layers,
  RotateCcw,
  Tag,
  AlertCircle,
} from 'lucide-react';

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Combustível / Entregas': { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30' },
  'Embalagens / Sacolas': { bg: 'bg-cyan-500/15', text: 'text-cyan-300', border: 'border-cyan-500/30' },
  'Aluguel / Ponto Físico': { bg: 'bg-purple-500/15', text: 'text-purple-300', border: 'border-purple-500/30' },
  'Alimentação': { bg: 'bg-orange-500/15', text: 'text-orange-300', border: 'border-orange-500/30' },
  'Manutenção / Moto': { bg: 'bg-blue-500/15', text: 'text-blue-300', border: 'border-blue-500/30' },
  'Marketing / Divulgação': { bg: 'bg-pink-500/15', text: 'text-pink-300', border: 'border-pink-500/30' },
  'Software / Telefonia': { bg: 'bg-indigo-500/15', text: 'text-indigo-300', border: 'border-indigo-500/30' },
  'Outros': { bg: 'bg-gray-500/15', text: 'text-gray-300', border: 'border-gray-500/30' },
};

export const MyExpensesSection: React.FC = () => {
  const { manualExpenses, removeManualExpense } = useCatalog();

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [expenseToEdit, setExpenseToEdit] = useState<ManualExpenseEntry | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<ManualExpenseEntry | null>(null);
  const [expenseDetailToView, setExpenseDetailToView] = useState<ManualExpenseEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('todos');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('todos');
  const [periodFilter, setPeriodFilter] = useState<string>('todos');
  const [sortBy, setSortBy] = useState<'recentes' | 'antigas' | 'maior_valor' | 'menor_valor' | 'vencimento'>('recentes');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDateBR = (dateString?: string) => {
    if (!dateString) return '--';
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('pt-BR');
  };

  // -------------------------------------------------------------
  // INDICADORES FINANCEIROS REAIS (KPIs DE GASTOS)
  // -------------------------------------------------------------
  const kpis = useMemo(() => {
    const totalCount = manualExpenses.length;
    const totalAmount = manualExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const totalPaid = manualExpenses.reduce((acc, e) => acc + (Number(e.amountPaid) || 0), 0);
    const totalPending = manualExpenses.reduce((acc, e) => acc + (Number(e.amountPending) || 0), 0);
    const averageExpense = totalCount > 0 ? totalAmount / totalCount : 0;

    return {
      totalCount,
      totalAmount,
      totalPaid,
      totalPending,
      averageExpense,
    };
  }, [manualExpenses]);

  // Lista única de categorias cadastradas para o filtro
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    manualExpenses.forEach((e) => {
      if (e.category) set.add(e.category);
    });
    return Array.from(set);
  }, [manualExpenses]);

  // -------------------------------------------------------------
  // FILTRAGEM, BUSCA E ORDENAÇÃO
  // -------------------------------------------------------------
  const filteredExpenses = useMemo(() => {
    let result = [...manualExpenses];

    // Busca textual
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((e) => {
        const descMatch = e.description?.toLowerCase().includes(q);
        const catMatch = e.category?.toLowerCase().includes(q);
        const notesMatch = e.notes?.toLowerCase().includes(q);
        const idMatch = e.id?.toLowerCase().includes(q);
        return descMatch || catMatch || notesMatch || idMatch;
      });
    }

    // Filtro por Categoria
    if (categoryFilter !== 'todos') {
      result = result.filter((e) => e.category === categoryFilter);
    }

    // Filtro por Status do Pagamento
    if (paymentStatusFilter !== 'todos') {
      result = result.filter((e) => e.paymentStatus === paymentStatusFilter);
    }

    // Filtro por Período
    if (periodFilter !== 'todos') {
      const now = new Date();
      result = result.filter((e) => {
        const expenseDate = new Date(e.expenseDate + 'T12:00:00');
        if (isNaN(expenseDate.getTime())) return true;

        if (periodFilter === 'hoje') {
          return expenseDate.toDateString() === now.toDateString();
        }
        if (periodFilter === 'ontem') {
          const yesterday = new Date();
          yesterday.setDate(now.getDate() - 1);
          return expenseDate.toDateString() === yesterday.toDateString();
        }
        if (periodFilter === '7dias') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(now.getDate() - 7);
          return expenseDate >= sevenDaysAgo;
        }
        if (periodFilter === 'mes') {
          return (
            expenseDate.getMonth() === now.getMonth() &&
            expenseDate.getFullYear() === now.getFullYear()
          );
        }
        return true;
      });
    }

    // Ordenação
    result.sort((a, b) => {
      const dateA = new Date(a.expenseDate + 'T12:00:00').getTime() || 0;
      const dateB = new Date(b.expenseDate + 'T12:00:00').getTime() || 0;
      if (sortBy === 'recentes') return dateB - dateA;
      if (sortBy === 'antigas') return dateA - dateB;
      if (sortBy === 'maior_valor') return (b.amount || 0) - (a.amount || 0);
      if (sortBy === 'menor_valor') return (a.amount || 0) - (b.amount || 0);
      if (sortBy === 'vencimento') {
        const dueA = a.dueDate ? new Date(a.dueDate + 'T12:00:00').getTime() : Infinity;
        const dueB = b.dueDate ? new Date(b.dueDate + 'T12:00:00').getTime() : Infinity;
        return dueA - dueB;
      }
      return 0;
    });

    return result;
  }, [manualExpenses, searchQuery, categoryFilter, paymentStatusFilter, periodFilter, sortBy]);

  // Paginação
  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / itemsPerPage));
  const paginatedExpenses = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredExpenses.slice(start, start + itemsPerPage);
  }, [filteredExpenses, currentPage, itemsPerPage]);

  const handleOpenCreate = () => {
    setExpenseToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (expense: ManualExpenseEntry) => {
    setExpenseToEdit(expense);
    setIsModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!expenseToDelete) return;
    setIsDeleting(true);
    await removeManualExpense(expenseToDelete.id);
    setIsDeleting(false);
    setExpenseToDelete(null);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('todos');
    setPaymentStatusFilter('todos');
    setPeriodFilter('todos');
    setSortBy('recentes');
    setCurrentPage(1);
  };

  const getCategoryStyle = (cat: string) => {
    return (
      CATEGORY_COLORS[cat] || {
        bg: 'bg-[#181C3D]',
        text: 'text-gray-300',
        border: 'border-[#8423DA]/30',
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* 1. INDICADORES FINANCEIROS DE GASTOS */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total de Gastos */}
        <div className="p-4 rounded-2xl bg-[#0D1022] border border-rose-500/25 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span className="font-semibold">Gastos Lançados</span>
            <Receipt className="w-4 h-4 text-rose-400" />
          </div>
          <div className="font-heading text-2xl font-black text-white">
            {kpis.totalCount}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            Despesas operacionais da loja
          </div>
        </div>

        {/* Total Geral de Despesas */}
        <div className="p-4 rounded-2xl bg-[#0D1022] border border-rose-500/30 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span className="font-semibold">Total em Despesas</span>
            <TrendingDown className="w-4 h-4 text-rose-400" />
          </div>
          <div className="font-heading text-2xl font-black text-rose-400">
            {formatBRL(kpis.totalAmount)}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            Soma de todos os gastos
          </div>
        </div>

        {/* Total Efetivamente Pago (Saída Real de Caixa) */}
        <div className="p-4 rounded-2xl bg-[#0D1022] border border-emerald-500/30 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span className="font-semibold">Total Já Pago</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-heading text-2xl font-black text-emerald-400">
            {formatBRL(kpis.totalPaid)}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            Saída efetiva do caixa
          </div>
        </div>

        {/* Contas a Pagar / Pendente */}
        <div className="p-4 rounded-2xl bg-[#0D1022] border border-amber-500/30 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span className="font-semibold">Contas a Pagar</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div
            className={`font-heading text-2xl font-black ${
              kpis.totalPending > 0 ? 'text-amber-400' : 'text-gray-400'
            }`}
          >
            {formatBRL(kpis.totalPending)}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            {kpis.totalPending > 0 ? 'Boletos e parcelas a quitar' : 'Nenhuma conta pendente'}
          </div>
        </div>

        {/* Média por Despesa */}
        <div className="p-4 rounded-2xl bg-[#0D1022] border border-[#8423DA]/25 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span className="font-semibold">Média por Gasto</span>
            <Layers className="w-4 h-4 text-[#8423DA]" />
          </div>
          <div className="font-heading text-2xl font-black text-white">
            {formatBRL(kpis.averageExpense)}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            Custo médio operacional
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. BARRA DE CONTROLE & FERRAMENTAS DA SUPERPLANILHA */}
      {/* ------------------------------------------------------------- */}
      <div className="p-4 rounded-2xl bg-[#0D1022] border border-[#8423DA]/20 space-y-4">
        {/* Linha 1: Título, contagem e botão Novo Gasto */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-heading text-lg font-black text-white flex items-center gap-2">
              <span>Superplanilha de Gastos Operacionais</span>
              <span className="px-2 py-0.5 rounded-full bg-[#181C3D] text-[10px] text-gray-300 font-bold border border-[#8423DA]/20">
                {filteredExpenses.length} de {manualExpenses.length} registro(s)
              </span>
            </h3>
            <p className="text-xs text-[#A5A5B8]">
              Controle manual de saídas financeiras, contas a pagar e vencimentos
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 via-[#8423DA] to-[#00DFFF] text-white font-extrabold text-xs shadow-lg shadow-rose-500/20 hover:brightness-110 transition-all cursor-pointer flex items-center justify-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>+ Lançar Novo Gasto</span>
          </button>
        </div>

        {/* Linha 2: Busca instantânea + Filtros combinados */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 pt-1">
          {/* Campo de Busca */}
          <div className="sm:col-span-2 lg:col-span-4 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Buscar por descrição, categoria ou ID..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#141838] border border-[#8423DA]/25 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-rose-400 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtro por Categoria */}
          <div className="lg:col-span-2">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-[#141838] border border-[#8423DA]/25 text-xs text-white focus:outline-none focus:border-rose-400 cursor-pointer"
            >
              <option value="todos" className="bg-[#090C19]">Categoria: Todas</option>
              {availableCategories.map((c) => (
                <option key={c} value={c} className="bg-[#090C19]">
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Período */}
          <div className="lg:col-span-2">
            <select
              value={periodFilter}
              onChange={(e) => {
                setPeriodFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-[#141838] border border-[#8423DA]/25 text-xs text-white focus:outline-none focus:border-rose-400 cursor-pointer"
            >
              <option value="todos" className="bg-[#090C19]">Período: Todos</option>
              <option value="hoje" className="bg-[#090C19]">Hoje</option>
              <option value="ontem" className="bg-[#090C19]">Ontem</option>
              <option value="7dias" className="bg-[#090C19]">Últimos 7 dias</option>
              <option value="mes" className="bg-[#090C19]">Este Mês</option>
            </select>
          </div>

          {/* Filtro por Pagamento */}
          <div className="lg:col-span-2">
            <select
              value={paymentStatusFilter}
              onChange={(e) => {
                setPaymentStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-[#141838] border border-[#8423DA]/25 text-xs text-white focus:outline-none focus:border-rose-400 cursor-pointer"
            >
              <option value="todos" className="bg-[#090C19]">Status: Todos</option>
              <option value="pago" className="bg-[#090C19]">100% Pago</option>
              <option value="parcial" className="bg-[#090C19]">Parcialmente Pago</option>
              <option value="a_pagar" className="bg-[#090C19]">A Pagar / Pendente</option>
            </select>
          </div>

          {/* Ordenação */}
          <div className="lg:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl bg-[#141838] border border-[#8423DA]/25 text-xs text-white focus:outline-none focus:border-rose-400 cursor-pointer"
            >
              <option value="recentes" className="bg-[#090C19]">Mais Recentes</option>
              <option value="antigas" className="bg-[#090C19]">Mais Antigas</option>
              <option value="maior_valor" className="bg-[#090C19]">Maior Valor</option>
              <option value="menor_valor" className="bg-[#090C19]">Menor Valor</option>
              <option value="vencimento" className="bg-[#090C19]">Vencimento Próximo</option>
            </select>
          </div>
        </div>

        {/* Limpar Filtros se houver algum ativo */}
        {(searchQuery || categoryFilter !== 'todos' || paymentStatusFilter !== 'todos' || periodFilter !== 'todos') && (
          <div className="flex items-center gap-2 pt-1 text-xs">
            <span className="text-gray-400">Filtros ativos:</span>
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Limpar todos os filtros
            </button>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. TABELA INTERATIVA DE GASTOS (SUPERPLANILHA) */}
      {/* ------------------------------------------------------------- */}
      <div className="rounded-2xl bg-[#0D1022] border border-[#8423DA]/25 shadow-xl overflow-hidden">
        {manualExpenses.length === 0 ? (
          // Estado vazio geral (sem gastos lançados)
          <div className="py-16 text-center px-6 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-[#141838] border border-rose-500/30 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(239,68,68,0.2)]">
              <Receipt className="w-8 h-8 text-rose-400" />
            </div>
            <h4 className="font-heading text-lg font-black text-white">Nenhum gasto operacional lançado ainda</h4>
            <p className="text-xs text-[#A5A5B8] max-w-md mx-auto">
              Controle todas as despesas da sua loja: combustível, entregas com motoboy, sacolas, aluguel e custos fixos.
              O sistema calcula automaticamente valores pagos, contas a pagar e vencimentos.
            </p>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 via-[#8423DA] to-[#00DFFF] text-white font-extrabold text-xs shadow-lg shadow-rose-500/20 hover:brightness-110 transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Lançar Meu Primeiro Gasto</span>
            </button>
          </div>
        ) : filteredExpenses.length === 0 ? (
          // Estado vazio de filtro
          <div className="py-14 text-center px-6 space-y-3">
            <Filter className="w-10 h-10 text-gray-500 mx-auto" />
            <h4 className="font-heading text-base font-bold text-white">Nenhum gasto encontrado</h4>
            <p className="text-xs text-[#A5A5B8]">
              Nenhum registro corresponde aos filtros selecionados.
            </p>
            <button
              type="button"
              onClick={handleClearFilters}
              className="px-4 py-2 rounded-xl bg-[#141838] hover:bg-[#8423DA]/30 text-rose-400 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar Filtros</span>
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                {/* CABEÇALHO DA TABELA */}
                <thead className="bg-[#121633] text-gray-300 font-extrabold uppercase tracking-wider text-[10px] border-b border-[#8423DA]/25 select-none">
                  <tr>
                    <th className="py-3.5 px-4">Data</th>
                    <th className="py-3.5 px-4">Categoria</th>
                    <th className="py-3.5 px-4">Descrição do Gasto</th>
                    <th className="py-3.5 px-4 text-right">Valor Total</th>
                    <th className="py-3.5 px-4 text-right">Valor Pago</th>
                    <th className="py-3.5 px-4 text-right">A Pagar</th>
                    <th className="py-3.5 px-4 text-center">Forma Pag.</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Ações</th>
                  </tr>
                </thead>

                {/* CORPO DA TABELA */}
                <tbody className="divide-y divide-[#8423DA]/15">
                  {paginatedExpenses.map((expense) => {
                    const catStyle = getCategoryStyle(expense.category);
                    const hasPending = (Number(expense.amountPending) || 0) > 0;

                    return (
                      <tr
                        key={expense.id}
                        className="hover:bg-[#141838]/60 transition-colors"
                      >
                        {/* Data */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-semibold text-white">
                            {formatDateBR(expense.expenseDate)}
                          </div>
                          <div className="text-[10px] text-gray-500 font-mono">
                            ID: {expense.id.slice(0, 14)}...
                          </div>
                        </td>

                        {/* Categoria */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                          >
                            {expense.category}
                          </span>
                        </td>

                        {/* Descrição */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="font-medium text-white truncate" title={expense.description}>
                            {expense.description}
                          </div>
                          {expense.notes && (
                            <div className="text-[10px] text-gray-400 truncate mt-0.5" title={expense.notes}>
                              Nota: {expense.notes}
                            </div>
                          )}
                        </td>

                        {/* Valor Total */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="font-heading font-black text-rose-300 text-sm">
                            {formatBRL(expense.amount)}
                          </div>
                        </td>

                        {/* Valor Pago */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="font-heading font-black text-emerald-400 text-sm">
                            {formatBRL(expense.amountPaid)}
                          </div>
                        </td>

                        {/* A Pagar / Pendente */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {hasPending ? (
                            <div>
                              <span className="inline-block px-2 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-300 font-bold font-mono">
                                {formatBRL(expense.amountPending)}
                              </span>
                              {expense.dueDate && (
                                <div className="text-[9px] text-amber-300 mt-0.5">
                                  Vence: {formatDateBR(expense.dueDate)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-500 font-mono">--</span>
                          )}
                        </td>

                        {/* Forma de Pagamento */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className="inline-block px-2.5 py-1 rounded-lg bg-[#141838] border border-[#8423DA]/25 text-[11px] font-bold text-gray-200">
                            {expense.paymentMethod || 'Pix'}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                              expense.paymentStatus === 'pago'
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : expense.paymentStatus === 'parcial'
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {expense.paymentStatus === 'pago' && 'Pago'}
                            {expense.paymentStatus === 'parcial' && 'Parcial'}
                            {expense.paymentStatus === 'a_pagar' && 'A Pagar'}
                          </span>
                        </td>

                        {/* Ações */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {/* Ver Detalhes */}
                            <button
                              type="button"
                              onClick={() => setExpenseDetailToView(expense)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-[#141838] transition-colors cursor-pointer"
                              title="Visualizar detalhes do gasto"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Editar */}
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(expense)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-rose-500/20 transition-colors cursor-pointer"
                              title="Editar gasto"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            {/* Excluir */}
                            <button
                              type="button"
                              onClick={() => setExpenseToDelete(expense)}
                              className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Excluir gasto"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* CONTROLE DE PAGINAÇÃO */}
            <div className="p-4 bg-[#121633] border-t border-[#8423DA]/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-gray-400">
                <span>Exibindo</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 rounded-lg bg-[#090C19] border border-[#8423DA]/30 text-xs text-white focus:outline-none focus:border-rose-400 cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span>de <strong>{filteredExpenses.length}</strong> gastos filtrados</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-xs">
                  Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="p-1.5 rounded-lg bg-[#141838] text-gray-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="p-1.5 rounded-lg bg-[#141838] text-gray-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. MODAL DE CADASTRO / EDIÇÃO DE GASTO */}
      {/* ------------------------------------------------------------- */}
      <ManualExpenseModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setExpenseToEdit(null);
        }}
        expenseToEdit={expenseToEdit}
        onSaveSuccess={() => {
          setIsModalOpen(false);
          setExpenseToEdit(null);
        }}
      />

      {/* ------------------------------------------------------------- */}
      {/* 5. MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {/* ------------------------------------------------------------- */}
      {expenseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#090C19] border border-rose-500/40 rounded-3xl p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-heading text-lg font-black text-white">Excluir Gasto Operacional?</h4>
                <p className="text-xs text-[#A5A5B8]">Esta despesa será removida do banco de dados.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#141838] border border-[#8423DA]/20 text-xs space-y-1.5">
              <div>
                <span className="text-gray-400">Categoria: </span>
                <span className="font-bold text-white">{expenseToDelete.category}</span>
              </div>
              <div>
                <span className="text-gray-400">Descrição: </span>
                <span className="font-semibold text-white">{expenseToDelete.description}</span>
              </div>
              <div>
                <span className="text-gray-400">Data: </span>
                <span className="font-semibold text-white">{formatDateBR(expenseToDelete.expenseDate)}</span>
              </div>
              <div>
                <span className="text-gray-400">Valor Total: </span>
                <span className="font-bold text-rose-300">{formatBRL(expenseToDelete.amount)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setExpenseToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-[#141838] hover:bg-[#8423DA]/30 text-gray-300 text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-lg shadow-rose-600/30 transition-all cursor-pointer flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Sim, Excluir do Supabase</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. MODAL DE DETALHES COMPLETOS DO GASTO */}
      {/* ------------------------------------------------------------- */}
      {expenseDetailToView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#090C19] border border-rose-500/40 rounded-3xl p-6 shadow-2xl text-white space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-rose-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-[#8423DA] p-0.5 flex items-center justify-center">
                  <div className="w-full h-full bg-[#080811] rounded-[14px] flex items-center justify-center">
                    <Receipt className="w-5 h-5 text-rose-400" />
                  </div>
                </div>
                <div>
                  <h4 className="font-heading text-lg font-black text-white">Detalhes do Gasto</h4>
                  <p className="text-[11px] text-[#A5A5B8] font-mono">ID: {expenseDetailToView.id}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setExpenseDetailToView(null)}
                className="p-2 rounded-xl bg-[#141838] hover:bg-rose-500/20 text-gray-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Informações Principais */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-[#0D1022] border border-[#8423DA]/20 text-xs">
              <div>
                <span className="text-[10px] text-gray-400 block font-bold uppercase">Data</span>
                <span className="font-semibold text-white">{formatDateBR(expenseDetailToView.expenseDate)}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block font-bold uppercase">Categoria</span>
                <span className="font-bold text-rose-300">{expenseDetailToView.category}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block font-bold uppercase">Forma Pag.</span>
                <span className="font-semibold text-gray-200">{expenseDetailToView.paymentMethod}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block font-bold uppercase">Status</span>
                <span className="font-bold text-emerald-400 uppercase text-[11px]">{expenseDetailToView.paymentStatus}</span>
              </div>
            </div>

            {/* Descrição */}
            <div className="p-3.5 rounded-2xl bg-[#0D1022] border border-[#8423DA]/20 text-xs space-y-1">
              <span className="text-[10px] text-gray-400 block font-bold uppercase">Descrição</span>
              <p className="text-white font-medium text-sm">{expenseDetailToView.description}</p>
            </div>

            {/* Totalização Financeira */}
            <div className="p-4 rounded-2xl bg-[#141838] border border-rose-500/30 space-y-2 text-xs">
              <div className="flex justify-between text-gray-300 text-sm font-bold">
                <span>Valor Total do Gasto:</span>
                <span className="text-rose-300 text-base font-black">{formatBRL(expenseDetailToView.amount)}</span>
              </div>
              <div className="flex justify-between text-emerald-400 pt-1">
                <span>Valor Efetivamente Pago:</span>
                <span className="font-bold">{formatBRL(expenseDetailToView.amountPaid)}</span>
              </div>
              {expenseDetailToView.amountPending > 0 && (
                <div className="flex justify-between text-amber-400 font-bold pt-1 border-t border-white/10">
                  <span>Valor Pendente (A Pagar):</span>
                  <span>{formatBRL(expenseDetailToView.amountPending)}</span>
                </div>
              )}
              {expenseDetailToView.dueDate && (
                <div className="flex justify-between text-amber-300 text-[11px] pt-0.5">
                  <span>Data de Vencimento:</span>
                  <span>{formatDateBR(expenseDetailToView.dueDate)}</span>
                </div>
              )}
            </div>

            {/* Observações */}
            {expenseDetailToView.notes && (
              <div className="p-3.5 rounded-xl bg-[#0D1022] border border-[#8423DA]/20 text-xs">
                <span className="text-[10px] text-gray-400 block font-bold uppercase mb-1">Observações:</span>
                <p className="text-gray-300 italic">{expenseDetailToView.notes}</p>
              </div>
            )}

            {/* Fechar */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setExpenseDetailToView(null)}
                className="px-5 py-2 rounded-xl bg-[#141838] hover:bg-[#8423DA]/30 text-white text-xs font-bold transition-all cursor-pointer"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
