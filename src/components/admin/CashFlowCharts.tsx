import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';

export interface CashFlowChartItem {
  id: string;
  date: string; // YYYY-MM-DD
  type: 'entrada' | 'saida' | 'transferencia';
  amount: number;
  category: string;
  description: string;
}

interface CashFlowChartsProps {
  movements: CashFlowChartItem[];
  initialBalance: number;
}

type PeriodFilter = '7d' | '30d' | 'this_month' | 'last_month' | 'all';

export const CashFlowCharts: React.FC<CashFlowChartsProps> = ({
  movements,
  initialBalance,
}) => {
  const [period, setPeriod] = useState<PeriodFilter>('30d');
  const [activeTab, setActiveTab] = useState<'bars' | 'evolution' | 'categories'>('bars');

  // Filter movements by period
  const filteredMovements = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    return movements.filter((m) => {
      if (period === 'all') return true;

      const mDate = new Date(m.date);
      if (period === '7d') {
        const d7 = new Date();
        d7.setDate(now.getDate() - 7);
        return mDate >= d7;
      }
      if (period === '30d') {
        const d30 = new Date();
        d30.setDate(now.getDate() - 30);
        return mDate >= d30;
      }
      if (period === 'this_month') {
        return (
          mDate.getFullYear() === now.getFullYear() &&
          mDate.getMonth() === now.getMonth()
        );
      }
      if (period === 'last_month') {
        const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        return mDate.getFullYear() === year && mDate.getMonth() === lastMonth;
      }
      return true;
    });
  }, [movements, period]);

  // Aggregate daily entries & exits for Bar Chart
  const dailyData = useMemo(() => {
    const map = new Map<string, { date: string; entradas: number; saidas: number }>();

    filteredMovements.forEach((m) => {
      const d = m.date.slice(0, 10);
      if (!map.has(d)) {
        map.set(d, { date: d, entradas: 0, saidas: 0 });
      }
      const item = map.get(d)!;
      if (m.type === 'entrada') {
        item.entradas += m.amount;
      } else if (m.type === 'saida') {
        item.saidas += m.amount;
      }
      // Note: Internal transfers don't affect global entrada/saida
    });

    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredMovements]);

  // Cumulative balance timeline data
  const timelineData = useMemo(() => {
    let current = initialBalance;
    const sorted = [...movements].sort((a, b) => a.date.localeCompare(b.date));
    const points: { date: string; balance: number }[] = [];

    // Filter to selected period for rendering, but preserve cumulative balance up to that point
    let periodStarted = false;
    const now = new Date();

    sorted.forEach((m) => {
      if (m.type === 'entrada') current += m.amount;
      else if (m.type === 'saida') current -= m.amount;

      const mDate = new Date(m.date);
      let inPeriod = true;
      if (period === '7d') {
        const d7 = new Date();
        d7.setDate(now.getDate() - 7);
        inPeriod = mDate >= d7;
      } else if (period === '30d') {
        const d30 = new Date();
        d30.setDate(now.getDate() - 30);
        inPeriod = mDate >= d30;
      } else if (period === 'this_month') {
        inPeriod =
          mDate.getFullYear() === now.getFullYear() &&
          mDate.getMonth() === now.getMonth();
      } else if (period === 'last_month') {
        const lm = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        const ly = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        inPeriod = mDate.getFullYear() === ly && mDate.getMonth() === lm;
      }

      if (inPeriod) {
        points.push({ date: m.date.slice(0, 10), balance: current });
      }
    });

    return points;
  }, [movements, initialBalance, period]);

  // Outflows Category Breakdown
  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    let totalSaidas = 0;

    filteredMovements.forEach((m) => {
      if (m.type === 'saida') {
        const cat = m.category || 'Outras Saídas';
        map.set(cat, (map.get(cat) || 0) + m.amount);
        totalSaidas += m.amount;
      }
    });

    const list = Array.from(map.entries())
      .map(([cat, amt]) => ({
        category: cat,
        amount: amt,
        percentage: totalSaidas > 0 ? (amt / totalSaidas) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return { list, totalSaidas };
  }, [filteredMovements]);

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Totals for selected period
  const periodTotals = useMemo(() => {
    let entradas = 0;
    let saidas = 0;
    filteredMovements.forEach((m) => {
      if (m.type === 'entrada') entradas += m.amount;
      if (m.type === 'saida') saidas += m.amount;
    });
    return { entradas, saidas, liquido: entradas - saidas };
  }, [filteredMovements]);

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-[#0D1022] border border-[#8423DA]/25 shadow-xl space-y-6">
      {/* Top Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#00DFFF]" />
            <h3 className="font-heading text-lg font-black text-white">
              Análise Visual de Fluxo de Caixa
            </h3>
          </div>
          <p className="text-xs text-[#A5A5B8] mt-0.5">
            Entradas x Saídas, linha de tendência do saldo e categorização
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center gap-1 p-1 bg-[#080811] rounded-2xl border border-white/5 overflow-x-auto max-w-full">
          {(
            [
              { id: '7d', label: '7 dias' },
              { id: '30d', label: '30 dias' },
              { id: 'this_month', label: 'Este Mês' },
              { id: 'last_month', label: 'Mês Anterior' },
              { id: 'all', label: 'Todo Período' },
            ] as const
          ).map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                period === p.id
                  ? 'bg-gradient-to-r from-[#00DFFF]/20 to-[#8423DA]/20 text-[#00DFFF] border border-[#00DFFF]/40 shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mini KPI row for the selected period */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl bg-[#080811] border border-[#10B981]/25 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-gray-400 block font-medium">Entradas do Período</span>
            <span className="text-base font-black text-[#10B981]">{formatBRL(periodTotals.entradas)}</span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-[#10B981]/10 flex items-center justify-center text-[#10B981]">
            <ArrowDownLeft className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#080811] border border-[#EF4444]/25 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-gray-400 block font-medium">Saídas do Período</span>
            <span className="text-base font-black text-[#EF4444]">{formatBRL(periodTotals.saidas)}</span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-[#EF4444]/10 flex items-center justify-center text-[#EF4444]">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#080811] border border-[#8423DA]/25 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-gray-400 block font-medium">Resultado Operacional</span>
            <span
              className={`text-base font-black ${
                periodTotals.liquido >= 0 ? 'text-[#00DFFF]' : 'text-rose-400'
              }`}
            >
              {formatBRL(periodTotals.liquido)}
            </span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-[#00DFFF]/10 flex items-center justify-center text-[#00DFFF]">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Chart View Selector Buttons */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-3">
        <button
          onClick={() => setActiveTab('bars')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'bars'
              ? 'bg-[#141838] text-white border border-[#00DFFF]/40'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 text-[#00DFFF]" />
          Entradas vs Saídas
        </button>

        <button
          onClick={() => setActiveTab('evolution')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'evolution'
              ? 'bg-[#141838] text-white border border-[#00DFFF]/40'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 text-[#10B981]" />
          Evolução do Saldo
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'categories'
              ? 'bg-[#141838] text-white border border-[#00DFFF]/40'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <PieChartIcon className="w-3.5 h-3.5 text-[#8423DA]" />
          Saídas por Categoria
        </button>
      </div>

      {/* Chart Canvas Area */}
      {dailyData.length === 0 && activeTab !== 'categories' ? (
        <div className="py-12 text-center text-xs text-gray-500 bg-[#080811] rounded-2xl border border-white/5">
          Nenhuma movimentação financeira encontrada para o período selecionado.
        </div>
      ) : (
        <>
          {/* 1. Bar Chart: Entradas vs Saídas */}
          {activeTab === 'bars' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-gray-400 px-2">
                <span className="font-semibold text-gray-300">Movimentações por Dia</span>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 text-xs text-[#10B981]">
                    <span className="w-3 h-3 rounded-sm bg-[#10B981] inline-block" /> Entradas
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-[#EF4444]">
                    <span className="w-3 h-3 rounded-sm bg-[#EF4444] inline-block" /> Saídas
                  </span>
                </div>
              </div>

              <div className="relative h-64 w-full bg-[#080811] rounded-2xl border border-white/5 p-4 flex items-end justify-between gap-2 overflow-x-auto">
                {dailyData.map((day) => {
                  const maxVal = Math.max(
                    ...dailyData.map((d) => Math.max(d.entradas, d.saidas, 100))
                  );
                  const entradaHeight = (day.entradas / maxVal) * 180;
                  const saidaHeight = (day.saidas / maxVal) * 180;
                  const dateLabel = day.date.slice(5).replace('-', '/');

                  return (
                    <div
                      key={day.date}
                      className="flex-1 min-w-[36px] max-w-[60px] flex flex-col items-center justify-end h-full group relative"
                    >
                      {/* Tooltip on hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-2 bg-[#0B0D1B] border border-[#8423DA]/50 rounded-xl p-2.5 text-[11px] shadow-xl z-20 pointer-events-none whitespace-nowrap">
                        <div className="font-bold text-white mb-1">{day.date}</div>
                        <div className="text-[#10B981]">Entradas: {formatBRL(day.entradas)}</div>
                        <div className="text-[#EF4444]">Saídas: {formatBRL(day.saidas)}</div>
                        <div className="text-gray-400 border-t border-white/10 pt-0.5 mt-0.5">
                          Saldo Dia: {formatBRL(day.entradas - day.saidas)}
                        </div>
                      </div>

                      {/* Bars */}
                      <div className="w-full flex items-end justify-center gap-1">
                        {/* Entrada Bar */}
                        <div
                          style={{ height: `${Math.max(entradaHeight, 4)}px` }}
                          className={`w-1/2 rounded-t-sm transition-all ${
                            day.entradas > 0
                              ? 'bg-gradient-to-t from-[#10B981]/50 to-[#10B981] group-hover:brightness-125'
                              : 'bg-white/5'
                          }`}
                        />
                        {/* Saída Bar */}
                        <div
                          style={{ height: `${Math.max(saidaHeight, 4)}px` }}
                          className={`w-1/2 rounded-t-sm transition-all ${
                            day.saidas > 0
                              ? 'bg-gradient-to-t from-[#EF4444]/50 to-[#EF4444] group-hover:brightness-125'
                              : 'bg-white/5'
                          }`}
                        />
                      </div>

                      {/* Date label */}
                      <span className="text-[10px] text-gray-500 font-medium mt-2 truncate w-full text-center">
                        {dateLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Cumulative Balance Line Chart */}
          {activeTab === 'evolution' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-gray-400 px-2">
                <span className="font-semibold text-gray-300">Linha de Tendência do Saldo Líquido</span>
                <span className="text-xs text-[#00DFFF] font-medium">Progressivo acumulado</span>
              </div>

              {timelineData.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-500 bg-[#080811] rounded-2xl border border-white/5">
                  Sem dados suficientes no período para traçar a evolução.
                </div>
              ) : (
                <div className="relative h-64 w-full bg-[#080811] rounded-2xl border border-white/5 p-4 flex flex-col justify-between">
                  {/* SVG Line / Area */}
                  {(() => {
                    const minBalance = Math.min(...timelineData.map((d) => d.balance), 0);
                    const maxBalance = Math.max(...timelineData.map((d) => d.balance), 100);
                    const range = maxBalance - minBalance || 1;
                    const width = 600;
                    const height = 180;
                    const padX = 20;
                    const padY = 20;

                    const points = timelineData.map((pt, idx) => {
                      const x = padX + (idx / Math.max(timelineData.length - 1, 1)) * (width - 2 * padX);
                      const y = height - padY - ((pt.balance - minBalance) / range) * (height - 2 * padY);
                      return `${x},${y}`;
                    });

                    const pathString = points.join(' L ');
                    const areaString = `M ${padX},${height - padY} L ${pathString} L ${
                      padX + (timelineData.length > 1 ? width - 2 * padX : 0)
                    },${height - padY} Z`;

                    return (
                      <div className="relative w-full h-full flex flex-col justify-between">
                        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44 overflow-visible">
                          <defs>
                            <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#00DFFF" stopOpacity="0.3" />
                              <stop offset="100%" stopColor="#00DFFF" stopOpacity="0" />
                            </linearGradient>
                          </defs>

                          {/* Zero Line if applicable */}
                          {minBalance < 0 && maxBalance > 0 && (
                            <line
                              x1={padX}
                              y1={height - padY - ((0 - minBalance) / range) * (height - 2 * padY)}
                              x2={width - padX}
                              y2={height - padY - ((0 - minBalance) / range) * (height - 2 * padY)}
                              stroke="rgba(255,255,255,0.15)"
                              strokeDasharray="4"
                            />
                          )}

                          {/* Gradient Area Fill */}
                          <path d={areaString} fill="url(#balanceGrad)" />

                          {/* Stroke Line */}
                          <path
                            d={`M ${pathString}`}
                            fill="none"
                            stroke="#00DFFF"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          {/* Node Dots */}
                          {timelineData.map((pt, idx) => {
                            const x = padX + (idx / Math.max(timelineData.length - 1, 1)) * (width - 2 * padX);
                            const y = height - padY - ((pt.balance - minBalance) / range) * (height - 2 * padY);
                            return (
                              <circle
                                key={idx}
                                cx={x}
                                cy={y}
                                r={timelineData.length > 20 ? 2 : 4}
                                fill="#00DFFF"
                                stroke="#080811"
                                strokeWidth="2"
                              />
                            );
                          })}
                        </svg>

                        {/* Date axis labels */}
                        <div className="flex items-center justify-between text-[10px] text-gray-500 pt-2 border-t border-white/5">
                          <span>{timelineData[0]?.date}</span>
                          {timelineData.length > 2 && (
                            <span>{timelineData[Math.floor(timelineData.length / 2)]?.date}</span>
                          )}
                          <span>{timelineData[timelineData.length - 1]?.date}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* 3. Category Outflows Breakdown */}
          {activeTab === 'categories' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-gray-400 px-2">
                <span className="font-semibold text-gray-300">Distribuição das Saídas de Caixa</span>
                <span className="text-xs text-[#EF4444] font-bold">
                  Total: {formatBRL(categoryData.totalSaidas)}
                </span>
              </div>

              {categoryData.list.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-500 bg-[#080811] rounded-2xl border border-white/5">
                  Nenhuma saída registrada neste período.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Segmented bar view */}
                  <div className="p-4 rounded-2xl bg-[#080811] border border-white/5 space-y-3">
                    <span className="text-xs font-bold text-gray-300 block">Participação Percentual</span>
                    {/* Visual stacked bar */}
                    <div className="h-4 w-full bg-[#141838] rounded-full overflow-hidden flex">
                      {categoryData.list.map((c, i) => {
                        const colors = ['#EF4444', '#8423DA', '#00DFFF', '#FACC15', '#10B981', '#EC4899'];
                        const color = colors[i % colors.length];
                        return (
                          <div
                            key={c.category}
                            style={{ width: `${c.percentage}%`, backgroundColor: color }}
                            title={`${c.category}: ${formatBRL(c.amount)} (${c.percentage.toFixed(1)}%)`}
                            className="h-full transition-all"
                          />
                        );
                      })}
                    </div>

                    <div className="space-y-2 pt-2">
                      {categoryData.list.map((c, i) => {
                        const colors = ['#EF4444', '#8423DA', '#00DFFF', '#FACC15', '#10B981', '#EC4899'];
                        const color = colors[i % colors.length];
                        return (
                          <div key={c.category} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: color }}
                              />
                              <span className="text-gray-300 truncate max-w-[200px]">{c.category}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white">{formatBRL(c.amount)}</span>
                              <span className="text-[11px] text-gray-500 w-12 text-right">
                                {c.percentage.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Top Spending Categories List */}
                  <div className="p-4 rounded-2xl bg-[#080811] border border-white/5 space-y-3">
                    <span className="text-xs font-bold text-gray-300 block">Detalhamento dos Gastos</span>
                    <div className="space-y-2 overflow-y-auto max-h-56 custom-scrollbar pr-1">
                      {categoryData.list.map((c, i) => (
                        <div
                          key={c.category}
                          className="p-2.5 rounded-xl bg-[#0D1022] border border-white/5 flex items-center justify-between"
                        >
                          <div>
                            <span className="text-xs font-bold text-white block">{c.category}</span>
                            <span className="text-[11px] text-gray-500">
                              {c.percentage.toFixed(1)}% do total desembolsado
                            </span>
                          </div>
                          <span className="font-heading font-black text-xs text-[#EF4444]">
                            {formatBRL(c.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
