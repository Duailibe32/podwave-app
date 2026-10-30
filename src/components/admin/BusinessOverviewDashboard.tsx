import React, { useState, useMemo } from 'react';
import { useCatalog } from '../../context/CatalogContext';
import { PeriodPreset, DateRange, CashAccountChannel } from '../../types/catalog';
import {
  formatBRL,
  formatDateBR,
  formatPercent,
  calculateVariation,
  getDateRangesForPreset,
  calculateBusinessMetrics,
  getFortalezaToday,
} from '../../utils/businessMetrics';
import {
  CashFlowComparisonChart,
  SalesEvolutionChart,
  CashBalanceEvolutionChart,
  ExpenseCategoryDistributionChart,
  PaymentMethodsDistributionChart,
  PurchasesComparisonChart,
  PendingAccountsComparisonChart,
  DailyCashFlowDataPoint,
  DailySalesDataPoint,
  DailyCashBalancePoint,
} from './BusinessCharts';
import {
  LayoutDashboard,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Receipt,
  Package,
  ArrowLeftRight,
  Clock,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  ChevronRight,
  Filter,
  BarChart3,
  PieChart as PieIcon,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  Users,
  Percent,
  FileSpreadsheet,
  Info,
} from 'lucide-react';

interface BusinessOverviewDashboardProps {
  onNavigateSection: (section: any) => void;
}

export const BusinessOverviewDashboard: React.FC<BusinessOverviewDashboardProps> = ({
  onNavigateSection,
}) => {
  const {
    manualSales,
    manualExpenses,
    merchandisePurchases,
    cashMovements,
    manualCommitments,
    initialCashBalances,
  } = useCatalog();

  // Filtros Globais de Período
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('este_mes');
  const [customStartDate, setCustomStartDate] = useState(() => {
    const today = getFortalezaToday();
    return today.slice(0, 8) + '01';
  });
  const [customEndDate, setCustomEndDate] = useState(() => getFortalezaToday());

  // Aba ativa de visualização de gráficos na dashboard
  const [activeChartTab, setActiveChartTab] = useState<
    'fluxo' | 'vendas' | 'saldo' | 'categorias' | 'metodos' | 'compras' | 'pendentes'
  >('fluxo');

  // Intervalos de data atual e anterior calculados
  const { current: currentRange, previous: previousRange, label: periodComparisonLabel } = useMemo(() => {
    return getDateRangesForPreset(periodPreset, customStartDate, customEndDate);
  }, [periodPreset, customStartDate, customEndDate]);

  // Métricas do período atual
  const currentMetrics = useMemo(() => {
    return calculateBusinessMetrics(
      manualSales,
      manualExpenses,
      merchandisePurchases,
      cashMovements,
      manualCommitments,
      initialCashBalances,
      currentRange
    );
  }, [
    manualSales,
    manualExpenses,
    merchandisePurchases,
    cashMovements,
    manualCommitments,
    initialCashBalances,
    currentRange,
  ]);

  // Métricas do período anterior (para comparação)
  const previousMetrics = useMemo(() => {
    if (!previousRange) return null;
    return calculateBusinessMetrics(
      manualSales,
      manualExpenses,
      merchandisePurchases,
      cashMovements,
      manualCommitments,
      initialCashBalances,
      previousRange
    );
  }, [
    manualSales,
    manualExpenses,
    merchandisePurchases,
    cashMovements,
    manualCommitments,
    initialCashBalances,
    previousRange,
  ]);

  // Variações calculadas
  const salesVar = calculateVariation(
    currentMetrics.totalNetSales,
    previousMetrics?.totalNetSales
  );
  const receiptsVar = calculateVariation(
    currentMetrics.effectiveReceiptsTotal,
    previousMetrics?.effectiveReceiptsTotal
  );
  const expensesVar = calculateVariation(
    currentMetrics.operationalExpensesPaidTotal,
    previousMetrics?.operationalExpensesPaidTotal
  );
  const purchasesVar = calculateVariation(
    currentMetrics.purchasesPaidToSuppliers,
    previousMetrics?.purchasesPaidToSuppliers
  );
  const closingBalanceVar = calculateVariation(
    currentMetrics.cashClosingBalance,
    previousMetrics?.cashClosingBalance
  );

  // --------------------------------------------------------------------------
  // SÉRIES DE DADOS PARA OS GRÁFICOS DIÁRIOS
  // --------------------------------------------------------------------------
  const { dailyCashFlow, dailySales, dailyBalances } = useMemo(() => {
    const cashFlowMap = new Map<string, { inflows: number; outflows: number }>();
    const salesMap = new Map<string, { total: number; count: number }>();

    // Determinar lista de dias no período para ordenação temporal
    const daysList: string[] = [];
    const curStart = new Date(currentRange.startDate + 'T12:00:00');
    const curEnd = new Date(currentRange.endDate + 'T12:00:00');

    // Se o período for razoável (até 60 dias), preenche todos os dias para continuidade
    const diffDays = Math.round((curEnd.getTime() - curStart.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays <= 60) {
      for (let d = new Date(curStart); d <= curEnd; d.setDate(d.getDate() + 1)) {
        const dStr = d.toISOString().slice(0, 10);
        daysList.push(dStr);
        cashFlowMap.set(dStr, { inflows: 0, outflows: 0 });
        salesMap.set(dStr, { total: 0, count: 0 });
      }
    }

    // 1. Vendas
    manualSales.forEach((s) => {
      if (s.orderStatus === 'cancelado') return;
      const d = s.saleDate?.split('T')[0] || '';
      if (d >= currentRange.startDate && d <= currentRange.endDate) {
        const net = s.netTotal || s.grossTotal || 0;
        const cur = salesMap.get(d) || { total: 0, count: 0 };
        cur.total += net;
        cur.count += 1;
        salesMap.set(d, cur);
        if (!daysList.includes(d)) daysList.push(d);
      }
      // Entradas de venda
      if (s.receipts && s.receipts.length > 0) {
        s.receipts.forEach((r) => {
          const rd = r.receiptDate?.split('T')[0] || '';
          if (rd >= currentRange.startDate && rd <= currentRange.endDate) {
            const cur = cashFlowMap.get(rd) || { inflows: 0, outflows: 0 };
            cur.inflows += r.amount;
            cashFlowMap.set(rd, cur);
            if (!daysList.includes(rd)) daysList.push(rd);
          }
        });
      } else if (s.amountReceived > 0) {
        const rd = (s.receivedDate || s.saleDate)?.split('T')[0] || '';
        if (rd >= currentRange.startDate && rd <= currentRange.endDate) {
          const cur = cashFlowMap.get(rd) || { inflows: 0, outflows: 0 };
          cur.inflows += s.amountReceived;
          cashFlowMap.set(rd, cur);
          if (!daysList.includes(rd)) daysList.push(rd);
        }
      }
    });

    // 2. Despesas
    manualExpenses.forEach((e) => {
      if (e.payments && e.payments.length > 0) {
        e.payments.forEach((p) => {
          const pd = p.paymentDate?.split('T')[0] || '';
          if (pd >= currentRange.startDate && pd <= currentRange.endDate) {
            const cur = cashFlowMap.get(pd) || { inflows: 0, outflows: 0 };
            cur.outflows += p.amount;
            cashFlowMap.set(pd, cur);
            if (!daysList.includes(pd)) daysList.push(pd);
          }
        });
      } else if (e.amountPaid > 0) {
        const pd = e.expenseDate?.split('T')[0] || '';
        if (pd >= currentRange.startDate && pd <= currentRange.endDate) {
          const cur = cashFlowMap.get(pd) || { inflows: 0, outflows: 0 };
          cur.outflows += e.amountPaid;
          cashFlowMap.set(pd, cur);
          if (!daysList.includes(pd)) daysList.push(pd);
        }
      }
    });

    // 3. Compras
    merchandisePurchases.forEach((p) => {
      if (p.payments && p.payments.length > 0) {
        p.payments.forEach((pay) => {
          const pd = pay.paymentDate?.split('T')[0] || '';
          if (pd >= currentRange.startDate && pd <= currentRange.endDate) {
            const cur = cashFlowMap.get(pd) || { inflows: 0, outflows: 0 };
            cur.outflows += pay.amount;
            cashFlowMap.set(pd, cur);
            if (!daysList.includes(pd)) daysList.push(pd);
          }
        });
      } else if (p.amountPaid > 0) {
        const pd = p.purchaseDate?.split('T')[0] || '';
        if (pd >= currentRange.startDate && pd <= currentRange.endDate) {
          const cur = cashFlowMap.get(pd) || { inflows: 0, outflows: 0 };
          cur.outflows += p.amountPaid;
          cashFlowMap.set(pd, cur);
          if (!daysList.includes(pd)) daysList.push(pd);
        }
      }
    });

    // 4. Compromissos avulsos
    manualCommitments.forEach((c) => {
      if (c.paymentStatus === 'cancelado') return;
      const isReceivable = c.type === 'a_receber';
      if (c.payments && c.payments.length > 0) {
        c.payments.forEach((p) => {
          const pd = p.paymentDate?.split('T')[0] || '';
          if (pd >= currentRange.startDate && pd <= currentRange.endDate) {
            const cur = cashFlowMap.get(pd) || { inflows: 0, outflows: 0 };
            if (isReceivable) cur.inflows += p.amount;
            else cur.outflows += p.amount;
            cashFlowMap.set(pd, cur);
            if (!daysList.includes(pd)) daysList.push(pd);
          }
        });
      } else if (c.amountPaid > 0) {
        const pd = c.issueDate?.split('T')[0] || '';
        if (pd >= currentRange.startDate && pd <= currentRange.endDate) {
          const cur = cashFlowMap.get(pd) || { inflows: 0, outflows: 0 };
          if (isReceivable) cur.inflows += c.amountPaid;
          else cur.outflows += c.amountPaid;
          cashFlowMap.set(pd, cur);
          if (!daysList.includes(pd)) daysList.push(pd);
        }
      }
    });

    daysList.sort();

    const dailyCashFlowData: DailyCashFlowDataPoint[] = [];
    const dailySalesData: DailySalesDataPoint[] = [];
    const dailyBalancesData: DailyCashBalancePoint[] = [];

    let runningBalance = currentMetrics.cashOpeningBalance;

    daysList.forEach((d) => {
      const flow = cashFlowMap.get(d) || { inflows: 0, outflows: 0 };
      const sale = salesMap.get(d) || { total: 0, count: 0 };

      runningBalance = Number((runningBalance + flow.inflows - flow.outflows).toFixed(2));

      dailyCashFlowData.push({
        date: d,
        inflows: flow.inflows,
        outflows: flow.outflows,
        net: Number((flow.inflows - flow.outflows).toFixed(2)),
      });

      dailySalesData.push({
        date: d,
        totalSales: sale.total,
        count: sale.count,
      });

      dailyBalancesData.push({
        date: d,
        balance: runningBalance,
      });
    });

    return {
      dailyCashFlow: dailyCashFlowData,
      dailySales: dailySalesData,
      dailyBalances: dailyBalancesData,
    };
  }, [
    manualSales,
    manualExpenses,
    merchandisePurchases,
    manualCommitments,
    currentRange,
    currentMetrics.cashOpeningBalance,
  ]);

  // Alertas inteligentes baseados em regras e registros reais
  const administrativeAlerts = useMemo(() => {
    const list: { id: string; type: 'danger' | 'warning' | 'info'; title: string; message: string; actionSection?: string }[] = [];

    // 1. Contas vencidas
    if (currentMetrics.globalOverdueCount > 0) {
      list.push({
        id: 'overdue-alert',
        type: 'danger',
        title: `${currentMetrics.globalOverdueCount} conta(s) vencida(s) em atraso`,
        message: `Total de ${formatBRL(currentMetrics.globalOverdueTotal)} com data de vencimento ultrapassada exigindo cobrança ou liquidação.`,
        actionSection: 'pendentes',
      });
    }

    // 2. Contas próximas do vencimento
    if (currentMetrics.globalNext7DaysDueCount > 0) {
      list.push({
        id: 'next7days-alert',
        type: 'warning',
        title: `${currentMetrics.globalNext7DaysDueCount} conta(s) a vencer nos próximos 7 dias`,
        message: `Compromissos somando ${formatBRL(currentMetrics.globalNext7DaysDueTotal)} com vencimento imediato programado.`,
        actionSection: 'pendentes',
      });
    }

    // 3. Vendas com custo desconhecido
    if (currentMetrics.costCoveragePercent < 100 && currentMetrics.validSalesCount > 0) {
      list.push({
        id: 'unknown-cost-alert',
        type: 'info',
        title: `Cobertura de custos em ${currentMetrics.costCoveragePercent}%`,
        message: `Existem itens vendidos sem custo unitário cadastrado na venda. A margem bruta é estimada apenas sobre os itens com custo informado.`,
        actionSection: 'vendas',
      });
    }

    // 4. Despesas elevadas em relação ao período anterior
    if (expensesVar.hasPrevious && expensesVar.percent !== null && expensesVar.percent > 20) {
      list.push({
        id: 'expenses-spike-alert',
        type: 'warning',
        title: `Aumento de ${expensesVar.percent}% nos desembolsos operacionais`,
        message: `Foram desembolsados ${formatBRL(currentMetrics.operationalExpensesPaidTotal)} no período atual contra ${formatBRL(previousMetrics?.operationalExpensesPaidTotal || 0)} no período anterior.`,
        actionSection: 'gastos',
      });
    }

    // 5. Valores importantes a receber de clientes
    if (currentMetrics.salesPendingAmount > 0) {
      list.push({
        id: 'sales-pending-alert',
        type: 'info',
        title: `${formatBRL(currentMetrics.salesPendingAmount)} a receber de vendas do período`,
        message: `Vendas a prazo ou fiados ainda não liquidados integralmente pelos clientes.`,
        actionSection: 'pendentes',
      });
    }

    return list;
  }, [currentMetrics, previousMetrics, expensesVar]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* 1. SELETOR DE FILTROS GLOBAIS DE PERÍODO */}
      {/* ========================================================================= */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[#0D1022] border border-[#8423DA]/25 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#8423DA]/20 border border-[#8423DA]/30 flex items-center justify-center text-[#00DFFF]">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading text-sm font-black text-white">
                Período de Análise Gerencial
              </h3>
              <p className="text-[11px] text-[#A5A5B8]">
                Filtro global com base no fuso horário brasileiro (America/Fortaleza)
              </p>
            </div>
          </div>

          <div className="text-xs text-gray-400 font-medium">
            <span className="text-[#00DFFF] font-bold">
              {formatDateBR(currentRange.startDate)}
            </span>{' '}
            até{' '}
            <span className="text-[#00DFFF] font-bold">
              {formatDateBR(currentRange.endDate)}
            </span>
          </div>
        </div>

        {/* Botoes de Presets Rápidos */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {[
            { id: 'hoje', label: 'Hoje' },
            { id: 'ontem', label: 'Ontem' },
            { id: 'ultimos_7_dias', label: 'Últimos 7 dias' },
            { id: 'ultimos_30_dias', label: 'Últimos 30 dias' },
            { id: 'este_mes', label: 'Este Mês' },
            { id: 'mes_anterior', label: 'Mês Anterior' },
            { id: 'este_ano', label: 'Este Ano' },
            { id: 'todo_historico', label: 'Todo o Histórico' },
            { id: 'personalizado', label: 'Personalizado' },
          ].map((preset) => {
            const isActive = periodPreset === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => setPeriodPreset(preset.id as PeriodPreset)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
                  isActive
                    ? 'bg-gradient-to-r from-[#00DFFF] to-[#007BFF] text-black font-black shadow-md shadow-[#00DFFF]/20'
                    : 'bg-[#141838] text-gray-300 hover:text-white hover:bg-[#8423DA]/30 border border-white/5'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Inputs para intervalo personalizado */}
        {periodPreset === 'personalizado' && (
          <div className="pt-2 flex flex-wrap items-center gap-3 border-t border-white/5 text-xs text-gray-300">
            <div className="flex items-center gap-2">
              <span>Data Início:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[#080811] border border-white/10 text-white text-xs focus:outline-none focus:border-[#00DFFF]"
              />
            </div>
            <div className="flex items-center gap-2">
              <span>Data Fim:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[#080811] border border-white/10 text-white text-xs focus:outline-none focus:border-[#00DFFF]"
              />
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. ALERTAS ADMINISTRATIVOS GERENCIAIS EM TEMPO REAL */}
      {/* ========================================================================= */}
      {administrativeAlerts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {administrativeAlerts.map((alt) => (
            <div
              key={alt.id}
              className={`p-3.5 rounded-2xl border flex items-start gap-3 transition-all ${
                alt.type === 'danger'
                  ? 'bg-rose-950/20 border-rose-500/40 text-rose-300'
                  : alt.type === 'warning'
                  ? 'bg-amber-950/20 border-amber-500/40 text-amber-300'
                  : 'bg-[#00DFFF]/10 border-[#00DFFF]/30 text-cyan-200'
              }`}
            >
              {alt.type === 'danger' ? (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              ) : alt.type === 'warning' ? (
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <Info className="w-5 h-5 text-[#00DFFF] shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5 min-w-0 flex-1">
                <h4 className="font-bold text-xs text-white">{alt.title}</h4>
                <p className="text-[11px] leading-relaxed opacity-90">{alt.message}</p>
                {alt.actionSection && (
                  <button
                    onClick={() => onNavigateSection(alt.actionSection)}
                    className="text-[10px] font-bold underline mt-1 block opacity-95 hover:opacity-100 cursor-pointer"
                  >
                    Ver detalhes no módulo &rarr;
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. CARDS DE INDICADORES: ORGANIZADOS POR PILARES */}
      {/* ========================================================================= */}

      {/* BLOCO A: VENDAS (REGIME DE COMPETÊNCIA) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
            <ShoppingBag className="w-4 h-4 text-[#00DFFF]" />
            <span>Desempenho Comercial & Vendas</span>
          </div>
          <span className="text-[11px] text-gray-500">Regime de Competência</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Faturamento Líquido */}
          <div className="p-4 rounded-2xl bg-[#0D1022] border border-[#00DFFF]/30 space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span className="font-semibold">Valor Vendido no Período</span>
              <DollarSign className="w-4 h-4 text-[#00DFFF]" />
            </div>
            <div className="font-heading text-2xl font-black text-white">
              {formatBRL(currentMetrics.totalNetSales)}
            </div>
            <div className="text-[11px] text-gray-400 flex items-center justify-between">
              <span>{currentMetrics.validSalesCount} vendas realizadas</span>
              {salesVar.hasPrevious && salesVar.percent !== null ? (
                <span
                  className={`font-bold flex items-center gap-0.5 ${
                    salesVar.isPositive ? 'text-[#10B981]' : salesVar.isNeutral ? 'text-gray-400' : 'text-rose-400'
                  }`}
                >
                  {salesVar.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {formatPercent(salesVar.percent)}
                </span>
              ) : (
                <span className="text-gray-500 text-[10px]">Sem dados ant.</span>
              )}
            </div>
          </div>

          {/* Ticket Médio */}
          <div className="p-4 rounded-2xl bg-[#0D1022] border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span className="font-semibold">Ticket Médio por Venda</span>
              <Receipt className="w-4 h-4 text-purple-400" />
            </div>
            <div className="font-heading text-2xl font-black text-purple-300">
              {formatBRL(currentMetrics.salesTicketMedio)}
            </div>
            <div className="text-[11px] text-gray-400 flex items-center justify-between">
              <span>Valor Médio / Pedido</span>
              <span className="text-gray-400 text-[10px]">
                Bruto: {formatBRL(currentMetrics.totalGrossSales)}
              </span>
            </div>
          </div>

          {/* Valores Ainda Não Recebidos (Fiados da Venda) */}
          <div className="p-4 rounded-2xl bg-[#0D1022] border border-amber-500/30 space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span className="font-semibold">A Receber das Vendas do Período</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="font-heading text-2xl font-black text-amber-400">
              {formatBRL(currentMetrics.salesPendingAmount)}
            </div>
            <div className="text-[11px] text-gray-400 flex items-center justify-between">
              <span>Vendas a Prazo / Fiado</span>
              <span className="text-amber-300 text-[10px] font-bold">
                {currentMetrics.totalNetSales > 0
                  ? `${((currentMetrics.salesPendingAmount / currentMetrics.totalNetSales) * 100).toFixed(1)}% pendente`
                  : '0%'}
              </span>
            </div>
          </div>

          {/* Margem Bruta Estimada */}
          <div className="p-4 rounded-2xl bg-[#0D1022] border border-[#10B981]/30 space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span className="font-semibold">Margem Bruta Estimada</span>
              <Percent className="w-4 h-4 text-[#10B981]" />
            </div>
            <div className="font-heading text-2xl font-black text-[#10B981]">
              {currentMetrics.knownCostOfGoodsSold > 0
                ? `${currentMetrics.estimatedGrossMarginPercent}%`
                : 'Não Calculável'}
            </div>
            <div className="text-[11px] text-gray-400 flex items-center justify-between">
              <span>
                {currentMetrics.knownCostOfGoodsSold > 0
                  ? `Lucro: ${formatBRL(currentMetrics.estimatedGrossProfit)}`
                  : 'Custos não informados'}
              </span>
              <span className="text-[10px] text-gray-400" title="Percentual de itens com custo conhecido">
                Cob: {currentMetrics.costCoveragePercent}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* BLOCO B: FINANCEIRO & FLUXO DE CAIXA (REGIME DE CAIXA EFETIVO) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
            <ArrowLeftRight className="w-4 h-4 text-[#10B981]" />
            <span>Movimentação Financeira Efetiva</span>
          </div>
          <span className="text-[11px] text-gray-500">Regime de Caixa</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Recebimentos Efetivos */}
          <div className="p-4 rounded-2xl bg-[#0D1022] border border-[#10B981]/40 space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span className="font-semibold">Recebimentos Efetivos</span>
              <ArrowDownLeft className="w-4 h-4 text-[#10B981]" />
            </div>
            <div className="font-heading text-2xl font-black text-[#10B981]">
              {formatBRL(currentMetrics.effectiveReceiptsTotal)}
            </div>
            <div className="text-[11px] text-gray-400 flex items-center justify-between">
              <span>Dinheiro que entrou</span>
              {receiptsVar.hasPrevious && receiptsVar.percent !== null && (
                <span className={`font-bold ${receiptsVar.isPositive ? 'text-[#10B981]' : 'text-rose-400'}`}>
                  {formatPercent(receiptsVar.percent)}
                </span>
              )}
            </div>
          </div>

          {/* Despesas Operacionais Pagas */}
          <div className="p-4 rounded-2xl bg-[#0D1022] border border-rose-500/30 space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span className="font-semibold">Despesas Operacionais Pagas</span>
              <Receipt className="w-4 h-4 text-rose-400" />
            </div>
            <div className="font-heading text-2xl font-black text-rose-400">
              {formatBRL(currentMetrics.operationalExpensesPaidTotal)}
            </div>
            <div className="text-[11px] text-gray-400 flex items-center justify-between">
              <span>Contratadas: {formatBRL(currentMetrics.operationalExpensesTotalContracted)}</span>
              {expensesVar.hasPrevious && expensesVar.percent !== null && (
                <span className="text-gray-400 font-bold">{formatPercent(expensesVar.percent)}</span>
              )}
            </div>
          </div>

          {/* Pagamentos de Fornecedores de Estoque */}
          <div className="p-4 rounded-2xl bg-[#0D1022] border border-purple-500/30 space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span className="font-semibold">Pago a Fornecedores (Estoque)</span>
              <Package className="w-4 h-4 text-purple-400" />
            </div>
            <div className="font-heading text-2xl font-black text-purple-300">
              {formatBRL(currentMetrics.purchasesPaidToSuppliers)}
            </div>
            <div className="text-[11px] text-gray-400 flex items-center justify-between">
              <span>Compras: {formatBRL(currentMetrics.purchasesTotalCost)}</span>
              <span className="text-purple-400 text-[10px] font-bold">Ativo Revenda</span>
            </div>
          </div>

          {/* Saldo de Fechamento */}
          <div className="p-4 rounded-2xl bg-[#0D1022] border border-[#00DFFF]/40 space-y-2 shadow-lg shadow-[#00DFFF]/5">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span className="font-semibold">Saldo Final de Fechamento</span>
              <DollarSign className="w-4 h-4 text-[#00DFFF]" />
            </div>
            <div className="font-heading text-2xl font-black text-white">
              {formatBRL(currentMetrics.cashClosingBalance)}
            </div>
            <div className="text-[11px] text-gray-400 flex items-center justify-between">
              <span>Abertura: {formatBRL(currentMetrics.cashOpeningBalance)}</span>
              <span
                className={`font-bold ${
                  currentMetrics.cashNetResult >= 0 ? 'text-[#10B981]' : 'text-rose-400'
                }`}
              >
                {currentMetrics.cashNetResult >= 0 ? '+' : ''}
                {formatBRL(currentMetrics.cashNetResult)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* BLOCO C: INDICADORES PATRIMONIAIS & PENDÊNCIAS GLOBAIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total a Receber Global */}
        <div className="p-4 rounded-2xl bg-[#0D1022] border border-[#10B981]/20 space-y-2">
          <div className="text-xs text-gray-400 font-semibold">Total a Receber (Global)</div>
          <div className="font-heading text-xl font-black text-[#10B981]">
            {formatBRL(currentMetrics.globalReceivablesTotal)}
          </div>
          <div className="text-[11px] text-gray-500">Clientes e fiados em aberto</div>
        </div>

        {/* Total a Pagar Global */}
        <div className="p-4 rounded-2xl bg-[#0D1022] border border-rose-500/20 space-y-2">
          <div className="text-xs text-gray-400 font-semibold">Total a Pagar (Global)</div>
          <div className="font-heading text-xl font-black text-rose-400">
            {formatBRL(currentMetrics.globalPayablesTotal)}
          </div>
          <div className="text-[11px] text-gray-500">Fornecedores e contas a liquidar</div>
        </div>

        {/* Mercadorias Adquiridas */}
        <div className="p-4 rounded-2xl bg-[#0D1022] border border-white/10 space-y-2">
          <div className="text-xs text-gray-400 font-semibold">Mercadorias Adquiridas</div>
          <div className="font-heading text-xl font-black text-white">
            {currentMetrics.purchasesUnitsCount} unidades
          </div>
          <div className="text-[11px] text-gray-400">
            Custo total: {formatBRL(currentMetrics.purchasesTotalCost)}
          </div>
        </div>

        {/* Resultado Operacional Estimado */}
        <div className="p-4 rounded-2xl bg-[#0D1022] border border-amber-500/20 space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-400 font-semibold">
            <span>Resultado Operacional Est.</span>
            <span title="Receita Líquida - CMV Conhecido - Despesas Operacionais Registradas">
              <HelpCircle className="w-3.5 h-3.5 text-gray-500" />
            </span>
          </div>
          <div
            className={`font-heading text-xl font-black ${
              currentMetrics.estimatedOperatingResult >= 0 ? 'text-[#10B981]' : 'text-rose-400'
            }`}
          >
            {formatBRL(currentMetrics.estimatedOperatingResult)}
          </div>
          <div className="text-[10px] text-gray-400 truncate">
            {currentMetrics.operatingResultCriteriaNotes[0] || 'Critério de competência'}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. CENTRAL DE GRÁFICOS INTERATIVOS COM ABAS */}
      {/* ========================================================================= */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[#0D1022] border border-[#8423DA]/25 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#00DFFF] to-[#8423DA] p-0.5 flex items-center justify-center">
              <div className="w-full h-full bg-[#080811] rounded-[14px] flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-[#00DFFF]" />
              </div>
            </div>
            <div>
              <h3 className="font-heading text-base font-black text-white">
                Gráficos & Visualizações Financeiras
              </h3>
              <p className="text-xs text-[#A5A5B8]">
                Comparativos dinâmicos de entradas, saídas, receitas e composição de despesas
              </p>
            </div>
          </div>

          {/* Abas de Navegação entre os 7 Gráficos */}
          <div className="overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1 bg-[#141838] p-1 rounded-2xl border border-white/10 min-w-max">
              {[
                { id: 'fluxo', label: 'Entradas vs. Saídas' },
                { id: 'vendas', label: 'Evolução Vendas' },
                { id: 'saldo', label: 'Saldo de Caixa' },
                { id: 'categorias', label: 'Categorias de Gastos' },
                { id: 'metodos', label: 'Formas de Recebimento' },
                { id: 'compras', label: 'Compras Mercadorias' },
                { id: 'pendentes', label: 'Contas Pendentes' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveChartTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeChartTab === tab.id
                      ? 'bg-[#00DFFF] text-black font-black shadow-md shadow-[#00DFFF]/20'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Gráfico Ativo */}
        <div className="min-h-[220px]">
          {activeChartTab === 'fluxo' && (
            <CashFlowComparisonChart data={dailyCashFlow} />
          )}

          {activeChartTab === 'vendas' && (
            <SalesEvolutionChart data={dailySales} />
          )}

          {activeChartTab === 'saldo' && (
            <CashBalanceEvolutionChart data={dailyBalances} />
          )}

          {activeChartTab === 'categorias' && (
            <ExpenseCategoryDistributionChart categories={currentMetrics.expensesByCategory} />
          )}

          {activeChartTab === 'metodos' && (
            <PaymentMethodsDistributionChart methods={currentMetrics.receiptsByMethod} />
          )}

          {activeChartTab === 'compras' && (
            <PurchasesComparisonChart
              totalAcquired={currentMetrics.purchasesTotalCost}
              totalPaid={currentMetrics.purchasesPaidToSuppliers}
              totalPending={currentMetrics.purchasesPendingToSuppliers}
            />
          )}

          {activeChartTab === 'pendentes' && (
            <PendingAccountsComparisonChart
              totalReceivable={currentMetrics.globalReceivablesTotal}
              totalPayable={currentMetrics.globalPayablesTotal}
              totalOverdue={currentMetrics.globalOverdueTotal}
            />
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. ANÁLISE DE PRODUTOS E CLIENTES (RANKINGS) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Produtos */}
        <div className="p-5 rounded-3xl bg-[#0D1022] border border-[#8423DA]/25 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-[#00DFFF]" />
              <h4 className="font-heading text-sm font-black text-white">
                Produtos Mais Vendidos no Período
              </h4>
            </div>
            <button
              onClick={() => onNavigateSection('vendas')}
              className="text-xs text-[#00DFFF] hover:underline flex items-center gap-1 font-bold"
            >
              Ver Vendas &rarr;
            </button>
          </div>

          {currentMetrics.topProducts.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-xs">
              Nenhum produto vendido no período selecionado.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {currentMetrics.topProducts.slice(0, 6).map((prod, idx) => (
                <div
                  key={prod.productId || prod.productName}
                  className="p-3 rounded-2xl bg-[#080811] border border-white/5 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-white/5 text-[#00DFFF] font-black text-[11px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <div className="font-bold text-white truncate">{prod.productName}</div>
                      <div className="text-[10px] text-gray-500">
                        {prod.quantity} {prod.quantity === 1 ? 'unidade' : 'unidades'} vendidas
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-black text-white">{formatBRL(prod.revenue)}</div>
                    {prod.knownCost > 0 ? (
                      <div className="text-[10px] text-emerald-400 font-semibold">
                        Mg: {prod.estimatedMargin}%
                      </div>
                    ) : (
                      <div className="text-[9px] text-gray-500">Custo n/i</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Clientes */}
        <div className="p-5 rounded-3xl bg-[#0D1022] border border-[#8423DA]/25 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              <h4 className="font-heading text-sm font-black text-white">
                Clientes com Maior Volume de Compras
              </h4>
            </div>
            <button
              onClick={() => onNavigateSection('vendas')}
              className="text-xs text-purple-300 hover:underline flex items-center gap-1 font-bold"
            >
              Histórico &rarr;
            </button>
          </div>

          {currentMetrics.topCustomers.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-xs">
              Nenhum cliente identificado nas vendas do período selecionado.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {currentMetrics.topCustomers.slice(0, 6).map((cust, idx) => (
                <div
                  key={cust.customerName}
                  className="p-3 rounded-2xl bg-[#080811] border border-white/5 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-purple-500/10 text-purple-300 font-black text-[11px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <div className="font-bold text-white truncate">{cust.customerName}</div>
                      {cust.phone && <div className="text-[10px] text-gray-500">{cust.phone}</div>}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-black text-white">{formatBRL(cust.totalSpent)}</div>
                    <div className="text-[10px] text-purple-400 font-semibold">
                      {cust.salesCount} {cust.salesCount === 1 ? 'compra' : 'compras'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. DEMONSTRATIVO ESTIMADO: COMPETÊNCIA VS. CAIXA */}
      {/* ========================================================================= */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[#0D1022] border border-[#8423DA]/25 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[#10B981]" />
            <h4 className="font-heading text-sm font-black text-white">
              Demonstrativo Comparativo: Competência Comercial vs. Caixa Efetivo
            </h4>
          </div>
          <button
            onClick={() => onNavigateSection('relatorios')}
            className="text-xs text-[#10B981] hover:underline flex items-center gap-1 font-bold"
          >
            Ver Relatórios Completos &rarr;
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Coluna Competência */}
          <div className="p-4 rounded-2xl bg-[#080811] border border-white/5 space-y-2.5">
            <div className="flex items-center justify-between text-xs border-b border-white/10 pb-2">
              <span className="font-bold text-cyan-300">Regime de Competência (Faturamento)</span>
              <span className="text-[10px] text-gray-400">Data dos Fatos</span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-300">
                <span>(+) Faturamento Bruto de Vendas:</span>
                <span className="font-bold text-white">{formatBRL(currentMetrics.totalGrossSales)}</span>
              </div>
              <div className="flex justify-between text-rose-400">
                <span>(-) Descontos Concedidos:</span>
                <span>-{formatBRL(currentMetrics.totalDiscountSales)}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>(+) Taxas de Entrega Cobradas:</span>
                <span>+{formatBRL(currentMetrics.totalDeliveryFees)}</span>
              </div>
              <div className="flex justify-between text-white font-bold pt-1 border-t border-white/5">
                <span>(=) Faturamento Líquido:</span>
                <span>{formatBRL(currentMetrics.totalNetSales)}</span>
              </div>
              <div className="flex justify-between text-purple-300">
                <span>(-) CMV Histórico Conhecido:</span>
                <span>-{formatBRL(currentMetrics.knownCostOfGoodsSold)}</span>
              </div>
              <div className="flex justify-between text-emerald-400 font-bold">
                <span>(=) Lucro Bruto Estimado:</span>
                <span>{formatBRL(currentMetrics.estimatedGrossProfit)}</span>
              </div>
              <div className="flex justify-between text-rose-400">
                <span>(-) Despesas Operacionais Registradas:</span>
                <span>-{formatBRL(currentMetrics.operationalExpensesTotalContracted)}</span>
              </div>
              <div className="flex justify-between text-base font-black pt-2 border-t border-white/10">
                <span className="text-white">Resultado Operacional Estimado:</span>
                <span className={currentMetrics.estimatedOperatingResult >= 0 ? 'text-[#10B981]' : 'text-rose-400'}>
                  {formatBRL(currentMetrics.estimatedOperatingResult)}
                </span>
              </div>
            </div>
          </div>

          {/* Coluna Caixa */}
          <div className="p-4 rounded-2xl bg-[#080811] border border-white/5 space-y-2.5">
            <div className="flex items-center justify-between text-xs border-b border-white/10 pb-2">
              <span className="font-bold text-emerald-300">Regime de Caixa (Dinheiro Real)</span>
              <span className="text-[10px] text-gray-400">Data dos Desembolsos</span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-300">
                <span>Saldo de Abertura do Período:</span>
                <span className="font-bold text-white">{formatBRL(currentMetrics.cashOpeningBalance)}</span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>(+) Total de Entradas Efetivas:</span>
                <span>+{formatBRL(currentMetrics.cashPeriodInflows)}</span>
              </div>
              <div className="flex justify-between text-rose-400">
                <span>(-) Despesas Operacionais Pagas:</span>
                <span>-{formatBRL(currentMetrics.operationalExpensesPaidTotal)}</span>
              </div>
              <div className="flex justify-between text-purple-300">
                <span>(-) Pagamentos a Fornecedores (Estoque):</span>
                <span>-{formatBRL(currentMetrics.purchasesPaidToSuppliers)}</span>
              </div>
              <div className="flex justify-between text-rose-400 font-bold pt-1 border-t border-white/5">
                <span>(=) Total de Saídas de Caixa:</span>
                <span>-{formatBRL(currentMetrics.cashPeriodOutflows)}</span>
              </div>
              <div className="flex justify-between text-cyan-300 font-bold">
                <span>(=) Resultado Líquido do Caixa:</span>
                <span>
                  {currentMetrics.cashNetResult >= 0 ? '+' : ''}
                  {formatBRL(currentMetrics.cashNetResult)}
                </span>
              </div>
              <div className="flex justify-between text-base font-black pt-2 border-t border-white/10">
                <span className="text-white">Saldo Final de Fechamento:</span>
                <span className="text-[#00DFFF]">{formatBRL(currentMetrics.cashClosingBalance)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
