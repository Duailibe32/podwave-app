import React, { useState, useMemo } from 'react';
import { useCatalog } from '../../context/CatalogContext';
import { MerchandisePurchaseEntry } from '../../types/catalog';
import { MerchandisePurchaseModal } from './MerchandisePurchaseModal';
import {
  Package,
  Plus,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Edit,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
  Truck,
  RotateCcw,
  Boxes,
  Layers,
  Phone,
  Hash,
  Calendar,
} from 'lucide-react';

const RECEIVING_BADGES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  recebido: { label: 'Recebido', bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  parcialmente_recebido: { label: 'Parcial', bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30' },
  aguardando: { label: 'Aguardando', bg: 'bg-blue-500/15', text: 'text-blue-300', border: 'border-blue-500/30' },
};

export const MyPurchasesSection: React.FC = () => {
  const { merchandisePurchases, removeMerchandisePurchase } = useCatalog();

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [purchaseToEdit, setPurchaseToEdit] = useState<MerchandisePurchaseEntry | null>(null);
  const [purchaseToDelete, setPurchaseToDelete] = useState<MerchandisePurchaseEntry | null>(null);
  const [purchaseDetailToView, setPurchaseDetailToView] = useState<MerchandisePurchaseEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [supplierFilter, setSupplierFilter] = useState<string>('todos');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('todos');
  const [receivingStatusFilter, setReceivingStatusFilter] = useState<string>('todos');
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
  // INDICADORES FINANCEIROS REAIS (KPIS DE COMPRAS)
  // -------------------------------------------------------------
  const kpis = useMemo(() => {
    const totalCount = merchandisePurchases.length;
    const totalCost = merchandisePurchases.reduce((acc, p) => acc + (Number(p.totalCost) || 0), 0);
    const totalPaid = merchandisePurchases.reduce((acc, p) => acc + (Number(p.amountPaid) || 0), 0);
    const totalPending = merchandisePurchases.reduce((acc, p) => acc + (Number(p.amountPending) || 0), 0);

    const totalUnits = merchandisePurchases.reduce((acc, p) => {
      const unitsInPurchase = (p.items || []).reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
      return acc + unitsInPurchase;
    }, 0);

    const averageTicket = totalCount > 0 ? totalCost / totalCount : 0;

    return {
      totalCount,
      totalCost,
      totalPaid,
      totalPending,
      totalUnits,
      averageTicket,
    };
  }, [merchandisePurchases]);

  // Lista única de fornecedores para o filtro
  const availableSuppliers = useMemo(() => {
    const set = new Set<string>();
    merchandisePurchases.forEach((p) => {
      if (p.supplierName) set.add(p.supplierName.trim());
    });
    return Array.from(set);
  }, [merchandisePurchases]);

  // -------------------------------------------------------------
  // FILTRAGEM, BUSCA E ORDENAÇÃO
  // -------------------------------------------------------------
  const filteredPurchases = useMemo(() => {
    let result = [...merchandisePurchases];

    // Busca textual
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((p) => {
        const suppMatch = p.supplierName?.toLowerCase().includes(q);
        const contactMatch = p.supplierContact?.includes(q);
        const invMatch = p.invoiceOrRef?.toLowerCase().includes(q);
        const notesMatch = p.notes?.toLowerCase().includes(q);
        const idMatch = p.id?.toLowerCase().includes(q);
        const itemMatch = p.items?.some(
          (it) =>
            it.name?.toLowerCase().includes(q) ||
            it.flavorName?.toLowerCase().includes(q)
        );
        return suppMatch || contactMatch || invMatch || notesMatch || idMatch || itemMatch;
      });
    }

    // Filtro por Fornecedor
    if (supplierFilter !== 'todos') {
      result = result.filter((p) => p.supplierName.trim() === supplierFilter);
    }

    // Filtro por Status Financeiro
    if (paymentStatusFilter !== 'todos') {
      result = result.filter((p) => p.paymentStatus === paymentStatusFilter);
    }

    // Filtro por Status de Recebimento
    if (receivingStatusFilter !== 'todos') {
      result = result.filter((p) => p.receivingStatus === receivingStatusFilter);
    }

    // Filtro por Período
    if (periodFilter !== 'todos') {
      const now = new Date();
      result = result.filter((p) => {
        const purchaseDate = new Date(p.purchaseDate + 'T12:00:00');
        if (isNaN(purchaseDate.getTime())) return true;

        if (periodFilter === 'hoje') {
          return purchaseDate.toDateString() === now.toDateString();
        }
        if (periodFilter === 'ontem') {
          const yesterday = new Date();
          yesterday.setDate(now.getDate() - 1);
          return purchaseDate.toDateString() === yesterday.toDateString();
        }
        if (periodFilter === '7dias') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(now.getDate() - 7);
          return purchaseDate >= sevenDaysAgo;
        }
        if (periodFilter === 'mes') {
          return (
            purchaseDate.getMonth() === now.getMonth() &&
            purchaseDate.getFullYear() === now.getFullYear()
          );
        }
        return true;
      });
    }

    // Ordenação
    result.sort((a, b) => {
      const dateA = new Date(a.purchaseDate + 'T12:00:00').getTime() || 0;
      const dateB = new Date(b.purchaseDate + 'T12:00:00').getTime() || 0;
      if (sortBy === 'recentes') return dateB - dateA;
      if (sortBy === 'antigas') return dateA - dateB;
      if (sortBy === 'maior_valor') return (b.totalCost || 0) - (a.totalCost || 0);
      if (sortBy === 'menor_valor') return (a.totalCost || 0) - (b.totalCost || 0);
      if (sortBy === 'vencimento') {
        const dueA = a.dueDate ? new Date(a.dueDate + 'T12:00:00').getTime() : Infinity;
        const dueB = b.dueDate ? new Date(b.dueDate + 'T12:00:00').getTime() : Infinity;
        return dueA - dueB;
      }
      return 0;
    });

    return result;
  }, [merchandisePurchases, searchQuery, supplierFilter, paymentStatusFilter, receivingStatusFilter, periodFilter, sortBy]);

  // Paginação
  const totalPages = Math.max(1, Math.ceil(filteredPurchases.length / itemsPerPage));
  const paginatedPurchases = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPurchases.slice(start, start + itemsPerPage);
  }, [filteredPurchases, currentPage, itemsPerPage]);

  const handleOpenCreate = () => {
    setPurchaseToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (purchase: MerchandisePurchaseEntry) => {
    setPurchaseToEdit(purchase);
    setIsModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!purchaseToDelete) return;
    setIsDeleting(true);
    await removeMerchandisePurchase(purchaseToDelete.id);
    setIsDeleting(false);
    setPurchaseToDelete(null);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSupplierFilter('todos');
    setPaymentStatusFilter('todos');
    setReceivingStatusFilter('todos');
    setPeriodFilter('todos');
    setSortBy('recentes');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* 1. INDICADORES FINANCEIROS DE COMPRAS */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        {/* Compras Registradas */}
        <div className="p-4 rounded-2xl bg-[#0D1022] border border-[#00DFFF]/25 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span className="font-semibold">Compras Realizadas</span>
            <Package className="w-4 h-4 text-[#00DFFF]" />
          </div>
          <div className="font-heading text-2xl font-black text-white">
            {kpis.totalCount}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            Reposições de estoque
          </div>
        </div>

        {/* Total Comprado */}
        <div className="p-4 rounded-2xl bg-[#0D1022] border border-[#00DFFF]/30 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span className="font-semibold">Total Comprado</span>
            <TrendingUp className="w-4 h-4 text-[#00DFFF]" />
          </div>
          <div className="font-heading text-2xl font-black text-[#00DFFF]">
            {formatBRL(kpis.totalCost)}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            Ativo de mercadorias
          </div>
        </div>

        {/* Efetivamente Pago */}
        <div className="p-4 rounded-2xl bg-[#0D1022] border border-emerald-500/30 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span className="font-semibold">Valor Já Pago</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-heading text-2xl font-black text-emerald-400">
            {formatBRL(kpis.totalPaid)}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            Saída real do caixa
          </div>
        </div>

        {/* Pendente a Fornecedores */}
        <div className="p-4 rounded-2xl bg-[#0D1022] border border-amber-500/30 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span className="font-semibold">Pendente Fornecedor</span>
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
            {kpis.totalPending > 0 ? 'Boletos e duplicatas' : 'Sem pendências'}
          </div>
        </div>

        {/* Total de Unidades */}
        <div className="p-4 rounded-2xl bg-[#0D1022] border border-[#8423DA]/25 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span className="font-semibold">Unidades Adquiridas</span>
            <Boxes className="w-4 h-4 text-[#8423DA]" />
          </div>
          <div className="font-heading text-2xl font-black text-white">
            {kpis.totalUnits} un
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            Volume total de produtos
          </div>
        </div>

        {/* Ticket Médio */}
        <div className="p-4 rounded-2xl bg-[#0D1022] border border-[#8423DA]/25 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span className="font-semibold">Ticket Médio</span>
            <Layers className="w-4 h-4 text-gray-400" />
          </div>
          <div className="font-heading text-2xl font-black text-white">
            {formatBRL(kpis.averageTicket)}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            Média por pedido
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. BARRA DE CONTROLE & FERRAMENTAS DA SUPERPLANILHA */}
      {/* ------------------------------------------------------------- */}
      <div className="p-4 rounded-2xl bg-[#0D1022] border border-[#8423DA]/20 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-heading text-lg font-black text-white flex items-center gap-2">
              <span>Superplanilha de Compras de Mercadorias</span>
              <span className="px-2 py-0.5 rounded-full bg-[#181C3D] text-[10px] text-gray-300 font-bold border border-[#8423DA]/20">
                {filteredPurchases.length} de {merchandisePurchases.length} compra(s)
              </span>
            </h3>
            <p className="text-xs text-[#A5A5B8]">
              Controle de aquisição com múltiplos produtos, custos históricos e quitações parciais
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00DFFF] via-[#8423DA] to-[#E53CF3] text-black font-extrabold text-xs shadow-lg shadow-[#00DFFF]/20 hover:brightness-110 transition-all cursor-pointer flex items-center justify-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nova Compra de Mercadorias</span>
          </button>
        </div>

        {/* Linha 2: Busca instantânea + Filtros combinados */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 pt-1">
          {/* Busca */}
          <div className="sm:col-span-2 lg:col-span-4 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Buscar por fornecedor, nota fiscal, produto ou ID..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#141838] border border-[#8423DA]/25 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00DFFF] transition-all"
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

          {/* Filtro por Fornecedor */}
          <div className="lg:col-span-2">
            <select
              value={supplierFilter}
              onChange={(e) => {
                setSupplierFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-[#141838] border border-[#8423DA]/25 text-xs text-white focus:outline-none focus:border-[#00DFFF] cursor-pointer"
            >
              <option value="todos" className="bg-[#090C19]">Fornecedor: Todos</option>
              {availableSuppliers.map((s) => (
                <option key={s} value={s} className="bg-[#090C19]">
                  {s}
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
              className="w-full px-3 py-2 rounded-xl bg-[#141838] border border-[#8423DA]/25 text-xs text-white focus:outline-none focus:border-[#00DFFF] cursor-pointer"
            >
              <option value="todos" className="bg-[#090C19]">Período: Todos</option>
              <option value="hoje" className="bg-[#090C19]">Hoje</option>
              <option value="ontem" className="bg-[#090C19]">Ontem</option>
              <option value="7dias" className="bg-[#090C19]">Últimos 7 dias</option>
              <option value="mes" className="bg-[#090C19]">Este Mês</option>
            </select>
          </div>

          {/* Filtro por Status Financeiro */}
          <div className="lg:col-span-2">
            <select
              value={paymentStatusFilter}
              onChange={(e) => {
                setPaymentStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-[#141838] border border-[#8423DA]/25 text-xs text-white focus:outline-none focus:border-[#00DFFF] cursor-pointer"
            >
              <option value="todos" className="bg-[#090C19]">Pagamento: Todos</option>
              <option value="pago" className="bg-[#090C19]">100% Pago</option>
              <option value="parcial" className="bg-[#090C19]">Parcialmente Pago</option>
              <option value="pendente" className="bg-[#090C19]">A Pagar / Pendente</option>
            </select>
          </div>

          {/* Ordenação */}
          <div className="lg:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl bg-[#141838] border border-[#8423DA]/25 text-xs text-white focus:outline-none focus:border-[#00DFFF] cursor-pointer"
            >
              <option value="recentes" className="bg-[#090C19]">Mais Recentes</option>
              <option value="antigas" className="bg-[#090C19]">Mais Antigas</option>
              <option value="maior_valor" className="bg-[#090C19]">Maior Valor</option>
              <option value="menor_valor" className="bg-[#090C19]">Menor Valor</option>
              <option value="vencimento" className="bg-[#090C19]">Vencimento Próximo</option>
            </select>
          </div>
        </div>

        {/* Limpar filtros */}
        {(searchQuery || supplierFilter !== 'todos' || paymentStatusFilter !== 'todos' || periodFilter !== 'todos') && (
          <div className="flex items-center gap-2 pt-1 text-xs">
            <span className="text-gray-400">Filtros ativos:</span>
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#00DFFF] hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Limpar todos os filtros
            </button>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. TABELA INTERATIVA DE COMPRAS DE MERCADORIAS */}
      {/* ------------------------------------------------------------- */}
      <div className="rounded-2xl bg-[#0D1022] border border-[#8423DA]/25 shadow-xl overflow-hidden">
        {merchandisePurchases.length === 0 ? (
          <div className="py-16 text-center px-6 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-[#141838] border border-[#00DFFF]/30 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(0,223,255,0.2)]">
              <Package className="w-8 h-8 text-[#00DFFF]" />
            </div>
            <h4 className="font-heading text-lg font-black text-white">Nenhuma compra de mercadorias registrada</h4>
            <p className="text-xs text-[#A5A5B8] max-w-md mx-auto">
              Registre as compras de produtos para revenda com fornecedores, guardando o histórico de custos de cada produto, fretes pagos e parcelas a quitar.
            </p>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00DFFF] to-[#8423DA] text-black font-extrabold text-xs shadow-lg shadow-[#00DFFF]/20 hover:brightness-110 transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Minha Primeira Compra</span>
            </button>
          </div>
        ) : filteredPurchases.length === 0 ? (
          <div className="py-14 text-center px-6 space-y-3">
            <Filter className="w-10 h-10 text-gray-500 mx-auto" />
            <h4 className="font-heading text-base font-bold text-white">Nenhuma compra encontrada</h4>
            <p className="text-xs text-[#A5A5B8]">Nenhum registro corresponde aos filtros selecionados.</p>
            <button
              type="button"
              onClick={handleClearFilters}
              className="px-4 py-2 rounded-xl bg-[#141838] hover:bg-[#8423DA]/30 text-[#00DFFF] text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar Filtros</span>
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                {/* CABEÇALHO */}
                <thead className="bg-[#121633] text-gray-300 font-extrabold uppercase tracking-wider text-[10px] border-b border-[#8423DA]/25 select-none">
                  <tr>
                    <th className="py-3.5 px-4">Data</th>
                    <th className="py-3.5 px-4">Fornecedor</th>
                    <th className="py-3.5 px-4">Produtos Adquiridos</th>
                    <th className="py-3.5 px-4 text-center">Unidades</th>
                    <th className="py-3.5 px-4 text-right">Valor Total</th>
                    <th className="py-3.5 px-4 text-right">Valor Pago</th>
                    <th className="py-3.5 px-4 text-right">Pendente</th>
                    <th className="py-3.5 px-4 text-center">Entrega</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Ações</th>
                  </tr>
                </thead>

                {/* CORPO */}
                <tbody className="divide-y divide-[#8423DA]/15">
                  {paginatedPurchases.map((purchase) => {
                    const totalUnits = (purchase.items || []).reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
                    const itemsSummary = (purchase.items || [])
                      .map((it) => `${it.quantity}x ${it.name}${it.flavorName ? ` (${it.flavorName})` : ''}`)
                      .join(', ');
                    const recBadge = RECEIVING_BADGES[purchase.receivingStatus || 'recebido'] || RECEIVING_BADGES.recebido;
                    const hasPending = (Number(purchase.amountPending) || 0) > 0;

                    return (
                      <tr key={purchase.id} className="hover:bg-[#141838]/60 transition-colors">
                        {/* Data */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-semibold text-white">
                            {formatDateBR(purchase.purchaseDate)}
                          </div>
                          <div className="text-[10px] text-gray-500 font-mono">
                            ID: {purchase.id.slice(0, 14)}...
                          </div>
                        </td>

                        {/* Fornecedor */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{purchase.supplierName}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400">
                            {purchase.supplierContact && (
                              <span className="font-mono">{purchase.supplierContact}</span>
                            )}
                            {purchase.invoiceOrRef && (
                              <span className="text-[10px] text-[#00DFFF] px-1.5 py-0.2 rounded bg-[#181C3D]">
                                {purchase.invoiceOrRef}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Resumo Produtos */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="truncate text-gray-300 font-medium" title={itemsSummary}>
                            {itemsSummary || '1 produto'}
                          </div>
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            {purchase.items?.length || 1} {purchase.items?.length === 1 ? 'item diferente' : 'itens diferentes'}
                            {purchase.shippingCost > 0 && ` • Frete: R$ ${purchase.shippingCost.toFixed(2)}`}
                          </div>
                        </td>

                        {/* Unidades Totais */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className="inline-block px-2.5 py-1 rounded-lg bg-[#181C3D] border border-[#8423DA]/25 font-black text-white text-xs">
                            {totalUnits} un
                          </span>
                        </td>

                        {/* Valor Total */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="font-heading font-black text-[#00DFFF] text-sm">
                            {formatBRL(purchase.totalCost)}
                          </div>
                        </td>

                        {/* Valor Pago */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="font-heading font-black text-emerald-400 text-sm">
                            {formatBRL(purchase.amountPaid)}
                          </div>
                        </td>

                        {/* Valor Pendente */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {hasPending ? (
                            <div>
                              <span className="inline-block px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold font-mono">
                                {formatBRL(purchase.amountPending)}
                              </span>
                              {purchase.dueDate && (
                                <div className="text-[9px] text-gray-400 mt-0.5">
                                  Vence: {formatDateBR(purchase.dueDate)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-500 font-mono">--</span>
                          )}
                        </td>

                        {/* Status de Entrega */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${recBadge.bg} ${recBadge.text} ${recBadge.border}`}
                          >
                            {recBadge.label}
                          </span>
                        </td>

                        {/* Status Financeiro */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                              purchase.paymentStatus === 'pago'
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : purchase.paymentStatus === 'parcial'
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {purchase.paymentStatus === 'pago' && 'Pago'}
                            {purchase.paymentStatus === 'parcial' && 'Parcial'}
                            {purchase.paymentStatus === 'pendente' && 'Pendente'}
                          </span>
                        </td>

                        {/* Ações */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {/* Ver Detalhes */}
                            <button
                              type="button"
                              onClick={() => setPurchaseDetailToView(purchase)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-[#00DFFF] hover:bg-[#141838] transition-colors cursor-pointer"
                              title="Visualizar detalhes completos da compra"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Editar */}
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(purchase)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#8423DA]/30 transition-colors cursor-pointer"
                              title="Editar compra e parcelas"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            {/* Excluir */}
                            <button
                              type="button"
                              onClick={() => setPurchaseToDelete(purchase)}
                              className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Excluir compra"
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
                  className="px-2 py-1 rounded-lg bg-[#090C19] border border-[#8423DA]/30 text-xs text-white focus:outline-none focus:border-[#00DFFF] cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span>de <strong>{filteredPurchases.length}</strong> compras filtradas</span>
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
      {/* 4. MODAL DE CADASTRO / EDIÇÃO */}
      {/* ------------------------------------------------------------- */}
      <MerchandisePurchaseModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setPurchaseToEdit(null);
        }}
        purchaseToEdit={purchaseToEdit}
        onSaveSuccess={() => {
          setIsModalOpen(false);
          setPurchaseToEdit(null);
        }}
      />

      {/* ------------------------------------------------------------- */}
      {/* 5. MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {/* ------------------------------------------------------------- */}
      {purchaseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#090C19] border border-rose-500/40 rounded-3xl p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-heading text-lg font-black text-white">Excluir Compra de Mercadorias?</h4>
                <p className="text-xs text-[#A5A5B8]">O registro será removido permanentemente.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#141838] border border-[#8423DA]/20 text-xs space-y-1.5">
              <div>
                <span className="text-gray-400">Fornecedor: </span>
                <span className="font-bold text-white">{purchaseToDelete.supplierName}</span>
              </div>
              <div>
                <span className="text-gray-400">Data: </span>
                <span className="font-semibold text-white">{formatDateBR(purchaseToDelete.purchaseDate)}</span>
              </div>
              <div>
                <span className="text-gray-400">Valor Total: </span>
                <span className="font-bold text-[#00DFFF]">{formatBRL(purchaseToDelete.totalCost)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPurchaseToDelete(null)}
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
      {/* 6. MODAL DE VISUALIZAÇÃO DE DETALHES COMPLETOS */}
      {/* ------------------------------------------------------------- */}
      {purchaseDetailToView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-[#090C19] border border-[#00DFFF]/40 rounded-3xl p-6 shadow-2xl text-white space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#00DFFF]/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#00DFFF] to-[#8423DA] p-0.5 flex items-center justify-center">
                  <div className="w-full h-full bg-[#080811] rounded-[14px] flex items-center justify-center">
                    <Package className="w-5 h-5 text-[#00DFFF]" />
                  </div>
                </div>
                <div>
                  <h4 className="font-heading text-lg font-black text-white">Detalhes da Compra</h4>
                  <p className="text-[11px] text-[#A5A5B8] font-mono">ID: {purchaseDetailToView.id}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPurchaseDetailToView(null)}
                className="p-2 rounded-xl bg-[#141838] hover:bg-[#8423DA]/30 text-gray-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Identificação Geral */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-[#0D1022] border border-[#8423DA]/20 text-xs">
              <div>
                <span className="text-[10px] text-gray-400 block font-bold uppercase">Data</span>
                <span className="font-semibold text-white">{formatDateBR(purchaseDetailToView.purchaseDate)}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block font-bold uppercase">Fornecedor</span>
                <span className="font-bold text-white">{purchaseDetailToView.supplierName}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block font-bold uppercase">Entrega</span>
                <span className="font-bold text-[#00DFFF] uppercase text-[11px]">
                  {purchaseDetailToView.receivingStatus || 'recebido'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block font-bold uppercase">Pagamento</span>
                <span className="font-bold text-emerald-400 uppercase text-[11px]">
                  {purchaseDetailToView.paymentStatus}
                </span>
              </div>
            </div>

            {/* Lista dos Produtos Adquiridos com Custos Históricos */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-[#00DFFF] uppercase tracking-wider">
                Produtos Comprados ({purchaseDetailToView.items?.length || 0})
              </h5>
              <div className="divide-y divide-[#8423DA]/15 rounded-xl border border-[#8423DA]/20 bg-[#0D1022] overflow-hidden">
                {purchaseDetailToView.items?.map((it, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between text-xs gap-3">
                    <div>
                      <div className="font-bold text-white">
                        {it.quantity}x {it.name}
                      </div>
                      {it.flavorName && (
                        <div className="text-[11px] text-[#00DFFF]">Variante: {it.flavorName}</div>
                      )}
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        Custo de Aquisição Unitário: <strong>{formatBRL(it.unitCost)}</strong>
                      </div>
                    </div>
                    <div className="font-heading font-black text-white text-sm">
                      {formatBRL(it.totalCost || it.quantity * it.unitCost)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totalização Financeira */}
            <div className="p-4 rounded-2xl bg-[#141838] border border-[#8423DA]/30 space-y-2 text-xs">
              <div className="flex justify-between text-gray-300">
                <span>Subtotal dos Produtos:</span>
                <span className="font-semibold">{formatBRL(purchaseDetailToView.itemsSubtotal || purchaseDetailToView.totalCost)}</span>
              </div>
              {purchaseDetailToView.shippingCost > 0 && (
                <div className="flex justify-between text-gray-300">
                  <span>Frete da Compra:</span>
                  <span className="font-semibold">+{formatBRL(purchaseDetailToView.shippingCost)}</span>
                </div>
              )}
              {purchaseDetailToView.otherCosts > 0 && (
                <div className="flex justify-between text-gray-300">
                  <span>Outros Custos / Taxas:</span>
                  <span className="font-semibold">+{formatBRL(purchaseDetailToView.otherCosts)}</span>
                </div>
              )}
              {purchaseDetailToView.discount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Desconto Obtido:</span>
                  <span className="font-semibold">-{formatBRL(purchaseDetailToView.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-white pt-2 border-t border-white/10">
                <span>Valor Total da Compra:</span>
                <span className="text-[#00DFFF] text-base">{formatBRL(purchaseDetailToView.totalCost)}</span>
              </div>
              <div className="flex justify-between text-xs text-emerald-400 pt-1">
                <span>Valor Efetivamente Pago:</span>
                <span className="font-bold">{formatBRL(purchaseDetailToView.amountPaid)}</span>
              </div>
              {purchaseDetailToView.amountPending > 0 && (
                <div className="flex justify-between text-xs text-amber-400 font-bold">
                  <span>Saldo Devedor ao Fornecedor:</span>
                  <span>{formatBRL(purchaseDetailToView.amountPending)}</span>
                </div>
              )}
            </div>

            {/* Histórico de Parcelas Pagas */}
            {purchaseDetailToView.payments && purchaseDetailToView.payments.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Histórico de Parcelas Quitadas ({purchaseDetailToView.payments.length})
                </h5>
                <div className="divide-y divide-[#8423DA]/15 rounded-xl border border-[#8423DA]/20 bg-[#0D1022] overflow-hidden text-xs">
                  {purchaseDetailToView.payments.map((p, idx) => (
                    <div key={p.id || idx} className="p-3 flex items-center justify-between gap-3">
                      <div>
                        <span className="font-bold text-emerald-300">
                          Parcela #{idx + 1}: {formatBRL(p.amount)}
                        </span>
                        <span className="ml-2 text-[10px] px-2 py-0.5 rounded bg-black/40 text-gray-400">
                          {p.paymentMethod}
                        </span>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          Data: {formatDateBR(p.paymentDate)}
                          {p.notes && <span className="ml-2 italic text-gray-300">• {p.notes}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Observações */}
            {purchaseDetailToView.notes && (
              <div className="p-3.5 rounded-xl bg-[#0D1022] border border-[#8423DA]/20 text-xs">
                <span className="text-[10px] text-gray-400 block font-bold uppercase mb-1">Observações:</span>
                <p className="text-gray-300 italic">{purchaseDetailToView.notes}</p>
              </div>
            )}

            {/* Fechar */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setPurchaseDetailToView(null)}
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
