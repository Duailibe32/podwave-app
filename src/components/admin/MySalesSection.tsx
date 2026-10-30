import React, { useState, useMemo } from 'react';
import { useCatalog } from '../../context/CatalogContext';
import { ManualSaleEntry } from '../../types/catalog';
import { ManualSaleModal } from './ManualSaleModal';
import {
  ShoppingBag,
  Plus,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Edit,
  Trash2,
  Eye,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  X,
  Package,
  Calendar,
  Layers,
  Truck,
  RotateCcw,
} from 'lucide-react';

export const MySalesSection: React.FC = () => {
  const { manualSales, removeManualSale, isLoadingBusinessData, fetchBusinessData } = useCatalog();

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [saleToEdit, setSaleToEdit] = useState<ManualSaleEntry | null>(null);
  const [saleToDelete, setSaleToDelete] = useState<ManualSaleEntry | null>(null);
  const [saleDetailToView, setSaleDetailToView] = useState<ManualSaleEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('todos');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('todos');
  const [periodFilter, setPeriodFilter] = useState<string>('todos');
  const [sortBy, setSortBy] = useState<'recentes' | 'antigas' | 'maior_valor' | 'menor_valor'>('recentes');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDateBR = (isoString?: string) => {
    if (!isoString) return '--';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // -------------------------------------------------------------
  // INDICADORES FINANCEIROS (EXCLUINDO VENDAS CANCELADAS)
  // Regra fundamental: canceladas NÃO são faturamento nem recebimento!
  // -------------------------------------------------------------
  const validSales = useMemo(() => {
    return manualSales.filter((s) => s.orderStatus !== 'cancelado');
  }, [manualSales]);

  const cancelledSalesCount = useMemo(() => {
    return manualSales.filter((s) => s.orderStatus === 'cancelado').length;
  }, [manualSales]);

  const kpis = useMemo(() => {
    const validCount = validSales.length;
    const totalSold = validSales.reduce((acc, s) => acc + (Number(s.netTotal) || 0), 0);
    const totalReceived = validSales.reduce((acc, s) => acc + (Number(s.amountReceived) || 0), 0);
    const totalPending = validSales.reduce((acc, s) => acc + (Number(s.amountPending) || 0), 0);
    const averageTicket = validCount > 0 ? totalSold / validCount : 0;

    return {
      validCount,
      totalSold,
      totalReceived,
      totalPending,
      averageTicket,
    };
  }, [validSales]);

  // -------------------------------------------------------------
  // FILTRAGEM, BUSCA E ORDENAÇÃO
  // -------------------------------------------------------------
  const filteredSales = useMemo(() => {
    let result = [...manualSales];

    // Busca textual
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((s) => {
        const nameMatch = s.customerName?.toLowerCase().includes(q);
        const phoneMatch = s.customerPhone?.includes(q);
        const idMatch = s.id.toLowerCase().includes(q);
        const notesMatch = s.notes?.toLowerCase().includes(q);
        const itemMatch = s.items?.some(
          (it) =>
            it.productName.toLowerCase().includes(q) ||
            it.flavorName?.toLowerCase().includes(q)
        );
        return nameMatch || phoneMatch || idMatch || notesMatch || itemMatch;
      });
    }

    // Filtro por Status do Pedido
    if (orderStatusFilter !== 'todos') {
      result = result.filter((s) => s.orderStatus === orderStatusFilter);
    }

    // Filtro por Status do Pagamento
    if (paymentStatusFilter !== 'todos') {
      result = result.filter((s) => s.paymentStatus === paymentStatusFilter);
    }

    // Filtro por Período
    if (periodFilter !== 'todos') {
      const now = new Date();
      result = result.filter((s) => {
        const saleDate = new Date(s.saleDate);
        if (isNaN(saleDate.getTime())) return true;

        if (periodFilter === 'hoje') {
          return saleDate.toDateString() === now.toDateString();
        }
        if (periodFilter === 'ontem') {
          const yesterday = new Date();
          yesterday.setDate(now.getDate() - 1);
          return saleDate.toDateString() === yesterday.toDateString();
        }
        if (periodFilter === '7dias') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(now.getDate() - 7);
          return saleDate >= sevenDaysAgo;
        }
        if (periodFilter === 'mes') {
          return (
            saleDate.getMonth() === now.getMonth() &&
            saleDate.getFullYear() === now.getFullYear()
          );
        }
        return true;
      });
    }

    // Ordenação
    result.sort((a, b) => {
      const dateA = new Date(a.saleDate).getTime() || 0;
      const dateB = new Date(b.saleDate).getTime() || 0;
      if (sortBy === 'recentes') return dateB - dateA;
      if (sortBy === 'antigas') return dateA - dateB;
      if (sortBy === 'maior_valor') return (b.netTotal || 0) - (a.netTotal || 0);
      if (sortBy === 'menor_valor') return (a.netTotal || 0) - (b.netTotal || 0);
      return 0;
    });

    return result;
  }, [manualSales, searchQuery, orderStatusFilter, paymentStatusFilter, periodFilter, sortBy]);

  // Paginação
  const totalPages = Math.max(1, Math.ceil(filteredSales.length / itemsPerPage));
  const paginatedSales = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSales.slice(start, start + itemsPerPage);
  }, [filteredSales, currentPage, itemsPerPage]);

  const handleOpenCreate = () => {
    setSaleToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sale: ManualSaleEntry) => {
    setSaleToEdit(sale);
    setIsModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!saleToDelete) return;
    setIsDeleting(true);
    const result = await removeManualSale(saleToDelete.id);
    setIsDeleting(false);
    if (result.success) setSaleToDelete(null);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setOrderStatusFilter('todos');
    setPaymentStatusFilter('todos');
    setPeriodFilter('todos');
    setSortBy('recentes');
    setCurrentPage(1);
  };

  // Helper para formatar telefone para o link do WhatsApp
  const formatWhatsappLink = (phone?: string) => {
    if (!phone) return null;
    const clean = phone.replace(/\D/g, '');
    if (!clean) return null;
    const fullNumber = clean.startsWith('55') ? clean : `55${clean}`;
    return `https://wa.me/${fullNumber}`;
  };

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* 1. INDICADORES FINANCEIROS (KPIs REAIS DE VENDAS) */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total Vendas Válidas */}
        <div className="p-4 rounded-2xl bg-[#0D1022] border border-[#8423DA]/25 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span className="font-semibold">Vendas Válidas</span>
            <ShoppingBag className="w-4 h-4 text-[#00DFFF]" />
          </div>
          <div className="font-heading text-2xl font-black text-white">
            {kpis.validCount}
          </div>
          <div className="text-[11px] text-gray-400 mt-1 flex items-center justify-between">
            <span>Registradas</span>
            {cancelledSalesCount > 0 && (
              <span className="text-rose-400 font-semibold" title="Excluídas do faturamento">
                {cancelledSalesCount} cancelada(s)
              </span>
            )}
          </div>
        </div>

        {/* Total Vendido (Faturamento Bruto/Líquido Válido) */}
        <div className="p-4 rounded-2xl bg-[#0D1022] border border-[#00DFFF]/30 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span className="font-semibold">Total Vendido</span>
            <TrendingUp className="w-4 h-4 text-[#00DFFF]" />
          </div>
          <div className="font-heading text-2xl font-black text-[#00DFFF]">
            {formatBRL(kpis.totalSold)}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            Soma de pedidos válidos
          </div>
        </div>

        {/* Valor Efetivamente Recebido */}
        <div className="p-4 rounded-2xl bg-[#0D1022] border border-emerald-500/30 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span className="font-semibold">Valor Recebido</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-heading text-2xl font-black text-emerald-400">
            {formatBRL(kpis.totalReceived)}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            Dinheiro real em caixa/banco
          </div>
        </div>

        {/* Valores Pendentes (A Receber / Fiados) */}
        <div className="p-4 rounded-2xl bg-[#0D1022] border border-amber-500/30 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span className="font-semibold">Valores Pendentes</span>
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
            {kpis.totalPending > 0 ? 'Fiados e saldos parciais' : 'Nenhuma pendência'}
          </div>
        </div>

        {/* Ticket Médio */}
        <div className="p-4 rounded-2xl bg-[#0D1022] border border-[#8423DA]/25 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span className="font-semibold">Ticket Médio</span>
            <Layers className="w-4 h-4 text-[#8423DA]" />
          </div>
          <div className="font-heading text-2xl font-black text-white">
            {formatBRL(kpis.averageTicket)}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            Média por venda válida
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. BARRA DE CONTROLE & FERRAMENTAS DA SUPERPLANILHA */}
      {/* ------------------------------------------------------------- */}
      <div className="p-4 rounded-2xl bg-[#0D1022] border border-[#8423DA]/20 space-y-4">
        {/* Linha 1: Título, contagem e botão Nova Venda */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-heading text-lg font-black text-white flex items-center gap-2">
              <span>Superplanilha de Vendas</span>
              <span className="px-2 py-0.5 rounded-full bg-[#181C3D] text-[10px] text-gray-300 font-bold border border-[#8423DA]/20">
                {filteredSales.length} de {manualSales.length} registro(s)
              </span>
            </h3>
            <p className="text-xs text-[#A5A5B8]">
              Gerenciamento manual, edição em tempo real e acompanhamento de fiados
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00DFFF] via-[#8423DA] to-[#E53CF3] text-black font-extrabold text-xs shadow-lg shadow-[#00DFFF]/20 hover:brightness-110 transition-all cursor-pointer flex items-center justify-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nova Venda Manual</span>
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
              placeholder="Buscar por cliente, WhatsApp, produto ou ID..."
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

          {/* Filtro por Status do Pedido */}
          <div className="lg:col-span-2">
            <select
              value={orderStatusFilter}
              onChange={(e) => {
                setOrderStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-[#141838] border border-[#8423DA]/25 text-xs text-white focus:outline-none focus:border-[#00DFFF] cursor-pointer"
            >
              <option value="todos" className="bg-[#090C19]">Status: Todos</option>
              <option value="confirmado" className="bg-[#090C19]">Confirmados</option>
              <option value="entregue" className="bg-[#090C19]">Entregues</option>
              <option value="pendente" className="bg-[#090C19]">Pendentes</option>
              <option value="cancelado" className="bg-[#090C19]">Cancelados</option>
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
              className="w-full px-3 py-2 rounded-xl bg-[#141838] border border-[#8423DA]/25 text-xs text-white focus:outline-none focus:border-[#00DFFF] cursor-pointer"
            >
              <option value="todos" className="bg-[#090C19]">Pagamento: Todos</option>
              <option value="pago" className="bg-[#090C19]">100% Pago</option>
              <option value="parcial" className="bg-[#090C19]">Parcialmente Pago</option>
              <option value="pendente" className="bg-[#090C19]">Fiado / A Receber</option>
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
            </select>
          </div>
        </div>

        {/* Limpar Filtros se houver algum ativo */}
        {(searchQuery || orderStatusFilter !== 'todos' || paymentStatusFilter !== 'todos' || periodFilter !== 'todos') && (
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
      {/* 3. TABELA INTERATIVA DE VENDAS (SUPERPLANILHA) */}
      {/* ------------------------------------------------------------- */}
      <div className="rounded-2xl bg-[#0D1022] border border-[#8423DA]/25 shadow-xl overflow-hidden">
        {manualSales.length === 0 ? (
          // Estado vazio geral (sem nenhuma venda registrada)
          <div className="py-16 text-center px-6 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-[#141838] border border-[#8423DA]/30 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(0,223,255,0.2)]">
              <ShoppingBag className="w-8 h-8 text-[#00DFFF]" />
            </div>
            <h4 className="font-heading text-lg font-black text-white">Nenhuma venda cadastrada ainda</h4>
            <p className="text-xs text-[#A5A5B8] max-w-md mx-auto">
              Sua planilha está pronta para receber os registros das vendas realizadas pelo WhatsApp.
              Cada lançamento calcula totais, pendências e forma de pagamento automaticamente.
            </p>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00DFFF] to-[#8423DA] text-black font-extrabold text-xs shadow-lg shadow-[#00DFFF]/20 hover:brightness-110 transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Minha Primeira Venda</span>
            </button>
          </div>
        ) : filteredSales.length === 0 ? (
          // Estado vazio de filtro
          <div className="py-14 text-center px-6 space-y-3">
            <Filter className="w-10 h-10 text-gray-500 mx-auto" />
            <h4 className="font-heading text-base font-bold text-white">Nenhuma venda encontrada</h4>
            <p className="text-xs text-[#A5A5B8]">
              Nenhum registro corresponde aos filtros selecionados.
            </p>
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
            {/* Tabela com scroll horizontal suave */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                {/* CABEÇALHO DA TABELA */}
                <thead className="bg-[#121633] text-gray-300 font-extrabold uppercase tracking-wider text-[10px] border-b border-[#8423DA]/25 select-none">
                  <tr>
                    <th className="py-3.5 px-4">Data / Hora</th>
                    <th className="py-3.5 px-4">Cliente</th>
                    <th className="py-3.5 px-4">Produtos (Itens)</th>
                    <th className="py-3.5 px-4 text-right">Valor Total</th>
                    <th className="py-3.5 px-4 text-right">Recebido</th>
                    <th className="py-3.5 px-4 text-right">Pendente</th>
                    <th className="py-3.5 px-4 text-center">Forma Pag.</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Ações</th>
                  </tr>
                </thead>

                {/* CORPO DA TABELA */}
                <tbody className="divide-y divide-[#8423DA]/15">
                  {paginatedSales.map((sale) => {
                    const isCancelled = sale.orderStatus === 'cancelado';
                    const hasPending = (Number(sale.amountPending) || 0) > 0;
                    const whatsappUrl = formatWhatsappLink(sale.customerPhone);

                    // Resumo visual dos produtos
                    const itemsSummary = (sale.items || [])
                      .map((it) => `${it.quantity}x ${it.productName}${it.flavorName ? ` (${it.flavorName})` : ''}`)
                      .join(', ');

                    return (
                      <tr
                        key={sale.id}
                        className={`hover:bg-[#141838]/60 transition-colors ${
                          isCancelled ? 'opacity-50 bg-rose-500/5' : ''
                        }`}
                      >
                        {/* Data / Hora */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-semibold text-white">
                            {formatDateBR(sale.saleDate)}
                          </div>
                          <div className="text-[10px] text-gray-500 font-mono">
                            ID: {sale.id.slice(0, 14)}...
                          </div>
                        </td>

                        {/* Cliente */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{sale.customerName || 'Cliente Balcão'}</span>
                          </div>
                          {sale.customerPhone ? (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[11px] text-gray-400 font-mono">
                                {sale.customerPhone}
                              </span>
                              {whatsappUrl && (
                                <a
                                  href={whatsappUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-400 hover:text-emerald-300 transition-colors"
                                  title="Abrir conversa no WhatsApp"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-500 italic">Sem WhatsApp</span>
                          )}
                        </td>

                        {/* Produtos */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="truncate text-gray-300 font-medium" title={itemsSummary}>
                            {itemsSummary || '1 item'}
                          </div>
                          <div className="text-[10px] text-[#00DFFF] mt-0.5 font-semibold">
                            {sale.items?.length || 1} {sale.items?.length === 1 ? 'item' : 'itens'}{' '}
                            • {sale.deliveryType || 'Entrega Própria'}
                          </div>
                        </td>

                        {/* Valor Total */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="font-heading font-black text-white text-sm">
                            {formatBRL(sale.netTotal)}
                          </div>
                          {sale.discount > 0 && (
                            <div className="text-[10px] text-rose-400">
                              Desc: -{formatBRL(sale.discount)}
                            </div>
                          )}
                        </td>

                        {/* Valor Recebido */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="font-heading font-black text-emerald-400 text-sm">
                            {formatBRL(sale.amountReceived)}
                          </div>
                          {sale.receivedDate && (
                            <div className="text-[9px] text-gray-400 font-mono">
                              {new Date(sale.receivedDate).toLocaleDateString('pt-BR')}
                            </div>
                          )}
                        </td>

                        {/* Valor Pendente */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {hasPending ? (
                            <span className="inline-block px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold font-mono">
                              {formatBRL(sale.amountPending)}
                            </span>
                          ) : (
                            <span className="text-gray-500 font-mono">--</span>
                          )}
                        </td>

                        {/* Forma de Pagamento */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className="inline-block px-2.5 py-1 rounded-lg bg-[#141838] border border-[#8423DA]/25 text-[11px] font-bold text-gray-200">
                            {sale.paymentMethod || 'Pix'}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                              sale.orderStatus === 'confirmado'
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : sale.orderStatus === 'entregue'
                                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                                : sale.orderStatus === 'pendente'
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {sale.orderStatus || 'confirmado'}
                          </span>
                        </td>

                        {/* Ações */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {/* Ver Detalhes */}
                            <button
                              type="button"
                              onClick={() => setSaleDetailToView(sale)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-[#00DFFF] hover:bg-[#141838] transition-colors cursor-pointer"
                              title="Visualizar detalhes da venda"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Editar */}
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(sale)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#8423DA]/30 transition-colors cursor-pointer"
                              title="Editar venda"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            {/* Excluir */}
                            <button
                              type="button"
                              onClick={() => setSaleToDelete(sale)}
                              className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Excluir venda"
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
                <span>de <strong>{filteredSales.length}</strong> vendas filtradas</span>
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
      {/* 4. MODAL DE CADASTRO / EDIÇÃO DE VENDA */}
      {/* ------------------------------------------------------------- */}
      <ManualSaleModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSaleToEdit(null);
        }}
        saleToEdit={saleToEdit}
        onSaveSuccess={() => {
          setIsModalOpen(false);
          setSaleToEdit(null);
        }}
      />

      {/* ------------------------------------------------------------- */}
      {/* 5. MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {/* ------------------------------------------------------------- */}
      {saleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#090C19] border border-rose-500/40 rounded-3xl p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-heading text-lg font-black text-white">Excluir Venda Manual?</h4>
                <p className="text-xs text-[#A5A5B8]">Esta ação não pode ser desfeita.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#141838] border border-[#8423DA]/20 text-xs space-y-1.5">
              <div>
                <span className="text-gray-400">Cliente: </span>
                <span className="font-bold text-white">{saleToDelete.customerName || 'Cliente Balcão'}</span>
              </div>
              <div>
                <span className="text-gray-400">Data: </span>
                <span className="font-semibold text-white">{formatDateBR(saleToDelete.saleDate)}</span>
              </div>
              <div>
                <span className="text-gray-400">Valor da Venda: </span>
                <span className="font-bold text-[#00DFFF]">{formatBRL(saleToDelete.netTotal)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSaleToDelete(null)}
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
      {saleDetailToView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-[#090C19] border border-[#8423DA]/40 rounded-3xl p-6 shadow-2xl text-white space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#8423DA]/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#00DFFF] to-[#8423DA] p-0.5 flex items-center justify-center">
                  <div className="w-full h-full bg-[#080811] rounded-[14px] flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-[#00DFFF]" />
                  </div>
                </div>
                <div>
                  <h4 className="font-heading text-lg font-black text-white">Detalhes da Venda</h4>
                  <p className="text-[11px] text-[#A5A5B8] font-mono">ID: {saleDetailToView.id}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSaleDetailToView(null)}
                className="p-2 rounded-xl bg-[#141838] hover:bg-[#8423DA]/30 text-gray-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cabeçalho do Pedido */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-[#0D1022] border border-[#8423DA]/20 text-xs">
              <div>
                <span className="text-[10px] text-gray-400 block font-bold uppercase">Data</span>
                <span className="font-semibold text-white">{formatDateBR(saleDetailToView.saleDate)}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block font-bold uppercase">Cliente</span>
                <span className="font-semibold text-white">{saleDetailToView.customerName || 'Balcão'}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block font-bold uppercase">Status</span>
                <span className="font-bold text-[#00DFFF] uppercase text-[11px]">{saleDetailToView.orderStatus}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block font-bold uppercase">Pagamento</span>
                <span className="font-bold text-gray-200">{saleDetailToView.paymentMethod}</span>
              </div>
            </div>

            {/* Produtos da Venda */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-[#00DFFF] uppercase tracking-wider">
                Produtos Comprados ({saleDetailToView.items?.length || 0})
              </h5>
              <div className="divide-y divide-[#8423DA]/15 rounded-xl border border-[#8423DA]/20 bg-[#0D1022] overflow-hidden">
                {saleDetailToView.items?.map((it, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between text-xs gap-3">
                    <div>
                      <div className="font-bold text-white">
                        {it.quantity}x {it.productName}
                      </div>
                      {it.flavorName && (
                        <div className="text-[11px] text-[#00DFFF]">Sabor: {it.flavorName}</div>
                      )}
                      <div className="text-[10px] text-gray-400">
                        Preço Unit: {formatBRL(it.unitPrice)}
                        {it.unitCost !== undefined && it.unitCost !== null && (
                          <span className="ml-2 text-gray-500">
                            (Custo: {formatBRL(it.unitCost)})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="font-heading font-black text-white text-sm">
                      {formatBRL(it.subtotal || it.quantity * it.unitPrice)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totalização Financeira */}
            <div className="p-4 rounded-2xl bg-[#141838] border border-[#8423DA]/30 space-y-2 text-xs">
              <div className="flex justify-between text-gray-300">
                <span>Total Bruto dos Produtos:</span>
                <span className="font-semibold">{formatBRL(saleDetailToView.grossTotal)}</span>
              </div>
              {saleDetailToView.deliveryFee > 0 && (
                <div className="flex justify-between text-gray-300">
                  <span>Taxa de Entrega ({saleDetailToView.deliveryType}):</span>
                  <span className="font-semibold">+{formatBRL(saleDetailToView.deliveryFee)}</span>
                </div>
              )}
              {saleDetailToView.discount > 0 && (
                <div className="flex justify-between text-rose-300">
                  <span>Desconto Concedido:</span>
                  <span className="font-semibold">-{formatBRL(saleDetailToView.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-white pt-2 border-t border-white/10">
                <span>Total Líquido da Venda:</span>
                <span className="text-[#00DFFF] text-base">{formatBRL(saleDetailToView.netTotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-emerald-400 pt-1">
                <span>Valor Efetivamente Recebido:</span>
                <span className="font-bold">{formatBRL(saleDetailToView.amountReceived)}</span>
              </div>
              {saleDetailToView.amountPending > 0 && (
                <div className="flex justify-between text-xs text-amber-400 font-bold">
                  <span>Valor Pendente a Receber:</span>
                  <span>{formatBRL(saleDetailToView.amountPending)}</span>
                </div>
              )}
            </div>

            {/* Observações */}
            {saleDetailToView.notes && (
              <div className="p-3.5 rounded-xl bg-[#0D1022] border border-[#8423DA]/20 text-xs">
                <span className="text-[10px] text-gray-400 block font-bold uppercase mb-1">Observações:</span>
                <p className="text-gray-300 italic">{saleDetailToView.notes}</p>
              </div>
            )}

            {/* Botão fechar */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSaleDetailToView(null)}
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
