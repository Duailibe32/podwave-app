import React, { useState } from 'react';
import {
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  DollarSign,
  PieChart as PieIcon,
  BarChart3,
  Calendar,
  AlertCircle,
  Package,
  Layers,
} from 'lucide-react';
import { formatBRL, formatDateBR } from '../../utils/businessMetrics';

// ============================================================================
// 1. GRÁFICO ENTRADAS VS. SAÍDAS (COMPARAÇÃO POR DIA/PERÍODO)
// ============================================================================

export interface DailyCashFlowDataPoint {
  date: string;
  inflows: number;
  outflows: number;
  net: number;
}

interface CashFlowComparisonChartProps {
  data: DailyCashFlowDataPoint[];
}

export const CashFlowComparisonChart: React.FC<CashFlowComparisonChartProps> = ({ data }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500 text-xs">
        Nenhuma movimentação de entradas ou saídas no período selecionado.
      </div>
    );
  }

  const maxVal = Math.max(
    1,
    ...data.map((d) => Math.max(d.inflows, d.outflows))
  );

  return (
    <div className="space-y-4">
      {/* Legenda & Resumo do Gráfico */}
      <div className="flex flex-wrap items-center justify-between text-xs text-gray-400 gap-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-[#10B981]" />
            <span className="text-gray-300 font-bold">Entradas Efetivas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-rose-500" />
            <span className="text-gray-300 font-bold">Saídas Efetivas</span>
          </div>
        </div>
        <span className="text-[11px] text-gray-500">
          {data.length} {data.length === 1 ? 'dia analisado' : 'dias analisados'}
        </span>
      </div>

      {/* Área dos Gráficos em Barras Agrupadas */}
      <div className="relative pt-6 pb-2">
        <div className="h-48 flex items-end gap-1.5 sm:gap-2.5 overflow-x-auto no-scrollbar pb-2">
          {data.map((item, idx) => {
            const inHeight = Math.max(4, Math.round((item.inflows / maxVal) * 160));
            const outHeight = Math.max(4, Math.round((item.outflows / maxVal) * 160));
            const isHovered = hoveredIndex === idx;

            return (
              <div
                key={item.date}
                className="flex-1 min-w-[28px] sm:min-w-[36px] flex flex-col items-center gap-1 group relative cursor-pointer"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Tooltip flutuante no hover */}
                {isHovered && (
                  <div className="absolute -top-20 z-30 bg-[#080811] border border-[#8423DA]/40 rounded-xl p-2.5 shadow-2xl min-w-[150px] pointer-events-none text-left">
                    <div className="text-[10px] text-gray-400 font-bold border-b border-white/10 pb-1 mb-1">
                      {formatDateBR(item.date)}
                    </div>
                    <div className="text-[11px] text-[#10B981] flex justify-between">
                      <span>Entradas:</span>
                      <strong>{formatBRL(item.inflows)}</strong>
                    </div>
                    <div className="text-[11px] text-rose-400 flex justify-between">
                      <span>Saídas:</span>
                      <strong>{formatBRL(item.outflows)}</strong>
                    </div>
                    <div className="text-[10px] text-gray-300 flex justify-between pt-1 border-t border-white/5 mt-1">
                      <span>Líquido:</span>
                      <strong className={item.net >= 0 ? 'text-[#00DFFF]' : 'text-amber-400'}>
                        {formatBRL(item.net)}
                      </strong>
                    </div>
                  </div>
                )}

                {/* Barras Lado a Lado */}
                <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1 h-44">
                  {/* Barra Entrada */}
                  <div
                    style={{ height: `${item.inflows > 0 ? inHeight : 4}px` }}
                    className={`w-1/2 rounded-t-md transition-all ${
                      item.inflows > 0
                        ? 'bg-gradient-to-t from-[#10B981]/70 to-[#10B981] group-hover:brightness-125'
                        : 'bg-white/5'
                    }`}
                  />
                  {/* Barra Saída */}
                  <div
                    style={{ height: `${item.outflows > 0 ? outHeight : 4}px` }}
                    className={`w-1/2 rounded-t-md transition-all ${
                      item.outflows > 0
                        ? 'bg-gradient-to-t from-rose-500/70 to-rose-500 group-hover:brightness-125'
                        : 'bg-white/5'
                    }`}
                  />
                </div>

                {/* Data formatada na base */}
                <span className="text-[9px] text-gray-400 font-mono truncate max-w-full">
                  {item.date.split('-')[2]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. GRÁFICO DE EVOLUÇÃO DAS VENDAS (LINHA / ÁREA SVG)
// ============================================================================

export interface DailySalesDataPoint {
  date: string;
  totalSales: number;
  count: number;
}

interface SalesEvolutionChartProps {
  data: DailySalesDataPoint[];
}

export const SalesEvolutionChart: React.FC<SalesEvolutionChartProps> = ({ data }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500 text-xs">
        Nenhuma venda registrada no período selecionado.
      </div>
    );
  }

  const maxVal = Math.max(1, ...data.map((d) => d.totalSales));
  const totalPeriodSales = data.reduce((acc, d) => acc + d.totalSales, 0);

  // Criar path SVG
  const width = 600;
  const height = 180;
  const paddingX = 20;
  const paddingY = 25;

  const points = data.map((d, idx) => {
    const x =
      data.length === 1
        ? width / 2
        : paddingX + (idx / (data.length - 1)) * (width - 2 * paddingX);
    const y = height - paddingY - (d.totalSales / maxVal) * (height - 2 * paddingY);
    return { x, y, ...d };
  });

  const linePath = points.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${
          height - paddingY
        } Z`
      : '';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">
          Faturamento do Período:{' '}
          <strong className="text-white font-bold">{formatBRL(totalPeriodSales)}</strong>
        </span>
        <span className="text-[#00DFFF] text-[11px] font-bold">Volume Diário</span>
      </div>

      <div className="relative bg-[#080811] rounded-2xl p-2 border border-white/5">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-44 overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00DFFF" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#00DFFF" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1={paddingX}
            y1={paddingY}
            x2={width - paddingX}
            y2={paddingY}
            stroke="rgba(255,255,255,0.05)"
            strokeDasharray="4"
          />
          <line
            x1={paddingX}
            y1={height / 2}
            x2={width - paddingX}
            y2={height / 2}
            stroke="rgba(255,255,255,0.05)"
            strokeDasharray="4"
          />
          <line
            x1={paddingX}
            y1={height - paddingY}
            x2={width - paddingX}
            y2={height - paddingY}
            stroke="rgba(255,255,255,0.1)"
          />

          {/* Área preenchida */}
          <path d={areaPath} fill="url(#salesGradient)" />

          {/* Linha principal */}
          <path
            d={linePath}
            fill="none"
            stroke="#00DFFF"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Pontos de dados */}
          {points.map((pt, idx) => (
            <circle
              key={pt.date}
              cx={pt.x}
              cy={pt.y}
              r={hoveredIndex === idx ? 6 : 4}
              fill="#080811"
              stroke="#00DFFF"
              strokeWidth="2.5"
              className="cursor-pointer transition-all hover:r-6"
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          ))}
        </svg>

        {/* Tooltip flutuante */}
        {hoveredIndex !== null && points[hoveredIndex] && (
          <div
            className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#0D1022] border border-[#00DFFF]/40 rounded-xl px-3 py-1.5 shadow-xl text-center pointer-events-none"
          >
            <div className="text-[10px] text-gray-400">
              {formatDateBR(points[hoveredIndex].date)} ({points[hoveredIndex].count} vendas)
            </div>
            <div className="text-xs font-black text-white">
              {formatBRL(points[hoveredIndex].totalSales)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 3. GRÁFICO DE EVOLUÇÃO DO SALDO DE CAIXA
// ============================================================================

export interface DailyCashBalancePoint {
  date: string;
  balance: number;
}

interface CashBalanceEvolutionChartProps {
  data: DailyCashBalancePoint[];
}

export const CashBalanceEvolutionChart: React.FC<CashBalanceEvolutionChartProps> = ({ data }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500 text-xs">
        Nenhum registro para calcular a evolução do saldo.
      </div>
    );
  }

  const values = data.map((d) => d.balance);
  const minVal = Math.min(0, ...values);
  const maxVal = Math.max(1, ...values);
  const range = maxVal - minVal || 1;

  const width = 600;
  const height = 180;
  const paddingX = 20;
  const paddingY = 25;

  const points = data.map((d, idx) => {
    const x =
      data.length === 1
        ? width / 2
        : paddingX + (idx / (data.length - 1)) * (width - 2 * paddingX);
    const y = height - paddingY - ((d.balance - minVal) / range) * (height - 2 * paddingY);
    return { x, y, ...d };
  });

  const linePath = points.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${
          height - paddingY
        } Z`
      : '';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">
          Saldo Atual de Fechamento:{' '}
          <strong className="text-[#10B981] font-bold">
            {formatBRL(data[data.length - 1]?.balance || 0)}
          </strong>
        </span>
        <span className="text-emerald-400 text-[11px] font-bold">Saldo Disponível Real</span>
      </div>

      <div className="relative bg-[#080811] rounded-2xl p-2 border border-white/5">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-44 overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1={paddingX}
            y1={paddingY}
            x2={width - paddingX}
            y2={paddingY}
            stroke="rgba(255,255,255,0.05)"
            strokeDasharray="4"
          />
          <line
            x1={paddingX}
            y1={height - paddingY}
            x2={width - paddingX}
            y2={height - paddingY}
            stroke="rgba(255,255,255,0.1)"
          />

          <path d={areaPath} fill="url(#balanceGradient)" />
          <path
            d={linePath}
            fill="none"
            stroke="#10B981"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {points.map((pt, idx) => (
            <circle
              key={pt.date}
              cx={pt.x}
              cy={pt.y}
              r={hoveredIndex === idx ? 6 : 4}
              fill="#080811"
              stroke="#10B981"
              strokeWidth="2.5"
              className="cursor-pointer transition-all"
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          ))}
        </svg>

        {hoveredIndex !== null && points[hoveredIndex] && (
          <div
            className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#0D1022] border border-[#10B981]/40 rounded-xl px-3 py-1.5 shadow-xl text-center pointer-events-none"
          >
            <div className="text-[10px] text-gray-400">{formatDateBR(points[hoveredIndex].date)}</div>
            <div className="text-xs font-black text-[#10B981]">
              Saldo: {formatBRL(points[hoveredIndex].balance)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 4. GRÁFICO DE DESPESAS POR CATEGORIA (BARRAS PROPORCIONAIS & DISTRIBUIÇÃO)
// ============================================================================

interface ExpenseCategoryDistributionChartProps {
  categories: Record<string, number>;
}

export const ExpenseCategoryDistributionChart: React.FC<ExpenseCategoryDistributionChartProps> = ({
  categories,
}) => {
  const entries = Object.entries(categories)
    .filter(([_, val]) => val > 0)
    .sort((a, b) => b[1] - a[1]);

  const total = entries.reduce((acc, [_, val]) => acc + val, 0);

  if (entries.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500 text-xs">
        Nenhuma despesa operacional registrada no período.
      </div>
    );
  }

  const colors = [
    '#EF4444', // Red
    '#F97316', // Orange
    '#FACC15', // Yellow
    '#8423DA', // Purple
    '#00DFFF', // Cyan
    '#EC4899', // Pink
    '#10B981', // Emerald
    '#6366F1', // Indigo
  ];

  return (
    <div className="space-y-3">
      {/* Barra Multissegmentada Proporcional */}
      <div className="w-full h-4 rounded-full overflow-hidden flex bg-white/5 border border-white/10">
        {entries.map(([cat, val], idx) => {
          const pct = (val / total) * 100;
          return (
            <div
              key={cat}
              style={{
                width: `${pct}%`,
                backgroundColor: colors[idx % colors.length],
              }}
              title={`${cat}: ${formatBRL(val)} (${pct.toFixed(1)}%)`}
              className="h-full transition-all hover:opacity-80"
            />
          );
        })}
      </div>

      {/* Lista de Categorias com Valores */}
      <div className="space-y-2 pt-1 max-h-56 overflow-y-auto pr-1">
        {entries.map(([cat, val], idx) => {
          const pct = (val / total) * 100;
          const color = colors[idx % colors.length];

          return (
            <div key={cat} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-gray-300 truncate">{cat}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-bold text-white">{formatBRL(val)}</span>
                <span className="text-[10px] text-gray-500 w-12 text-right">
                  {pct.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// 5. GRÁFICO DE FORMAS DE RECEBIMENTO
// ============================================================================

interface PaymentMethodsDistributionChartProps {
  methods: Record<string, number>;
}

export const PaymentMethodsDistributionChart: React.FC<PaymentMethodsDistributionChartProps> = ({
  methods,
}) => {
  const entries = Object.entries(methods)
    .filter(([_, val]) => val > 0)
    .sort((a, b) => b[1] - a[1]);

  const total = entries.reduce((acc, [_, val]) => acc + val, 0);

  if (entries.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500 text-xs">
        Nenhum recebimento efetivo registrado no período.
      </div>
    );
  }

  const colors = ['#00DFFF', '#10B981', '#8423DA', '#FACC15', '#EC4899', '#3B82F6'];

  return (
    <div className="space-y-3">
      {/* Barra Proporcional */}
      <div className="w-full h-4 rounded-full overflow-hidden flex bg-white/5 border border-white/10">
        {entries.map(([method, val], idx) => {
          const pct = (val / total) * 100;
          return (
            <div
              key={method}
              style={{
                width: `${pct}%`,
                backgroundColor: colors[idx % colors.length],
              }}
              title={`${method}: ${formatBRL(val)} (${pct.toFixed(1)}%)`}
              className="h-full transition-all hover:opacity-80"
            />
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
        {entries.map(([method, val], idx) => {
          const pct = (val / total) * 100;
          const color = colors[idx % colors.length];

          return (
            <div
              key={method}
              className="p-2 rounded-xl bg-[#080811] border border-white/5 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-gray-300 truncate font-semibold">{method}</span>
              </div>
              <div className="text-right shrink-0">
                <div className="font-black text-white">{formatBRL(val)}</div>
                <div className="text-[10px] text-gray-500">{pct.toFixed(1)}%</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// 6. GRÁFICO DE COMPRAS DE MERCADORIAS (ESTOQUE)
// ============================================================================

interface PurchasesComparisonChartProps {
  totalAcquired: number;
  totalPaid: number;
  totalPending: number;
}

export const PurchasesComparisonChart: React.FC<PurchasesComparisonChartProps> = ({
  totalAcquired,
  totalPaid,
  totalPending,
}) => {
  if (totalAcquired === 0 && totalPaid === 0) {
    return (
      <div className="py-12 text-center text-gray-500 text-xs">
        Nenhuma compra de mercadorias registrada no período.
      </div>
    );
  }

  const maxVal = Math.max(totalAcquired, totalPaid, totalPending, 1);
  const paidPct = (totalPaid / maxVal) * 100;
  const pendingPct = (totalPending / maxVal) * 100;
  const acquiredPct = (totalAcquired / maxVal) * 100;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {/* Total Adquirido */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-gray-300 font-bold flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-[#00DFFF]" />
              Total Adquirido (Custo de Entrada)
            </span>
            <span className="font-black text-white">{formatBRL(totalAcquired)}</span>
          </div>
          <div className="w-full h-3 rounded-full bg-white/5 overflow-hidden">
            <div
              style={{ width: `${acquiredPct}%` }}
              className="h-full bg-gradient-to-r from-[#00DFFF] to-[#007BFF] rounded-full"
            />
          </div>
        </div>

        {/* Total Pago aos Fornecedores */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-gray-300 font-bold flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5 text-[#10B981]" />
              Efetivamente Pago aos Fornecedores
            </span>
            <span className="font-black text-emerald-400">{formatBRL(totalPaid)}</span>
          </div>
          <div className="w-full h-3 rounded-full bg-white/5 overflow-hidden">
            <div
              style={{ width: `${paidPct}%` }}
              className="h-full bg-emerald-500 rounded-full"
            />
          </div>
        </div>

        {/* Saldo a Pagar aos Fornecedores */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-gray-300 font-bold flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              Saldo Pendente a Pagar
            </span>
            <span className="font-black text-rose-400">{formatBRL(totalPending)}</span>
          </div>
          <div className="w-full h-3 rounded-full bg-white/5 overflow-hidden">
            <div
              style={{ width: `${pendingPct}%` }}
              className="h-full bg-rose-500 rounded-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 7. GRÁFICO DE CONTAS PENDENTES (A RECEBER VS A PAGAR VS VENCIDAS)
// ============================================================================

interface PendingAccountsComparisonChartProps {
  totalReceivable: number;
  totalPayable: number;
  totalOverdue: number;
}

export const PendingAccountsComparisonChart: React.FC<PendingAccountsComparisonChartProps> = ({
  totalReceivable,
  totalPayable,
  totalOverdue,
}) => {
  const maxVal = Math.max(totalReceivable, totalPayable, totalOverdue, 1);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {/* A Receber */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-emerald-400 font-bold flex items-center gap-1.5">
              <ArrowDownLeft className="w-3.5 h-3.5" />
              Contas a Receber (Ativo)
            </span>
            <span className="font-black text-emerald-400">{formatBRL(totalReceivable)}</span>
          </div>
          <div className="w-full h-3.5 rounded-full bg-white/5 overflow-hidden">
            <div
              style={{ width: `${(totalReceivable / maxVal) * 100}%` }}
              className="h-full bg-gradient-to-r from-[#10B981] to-[#00DFFF] rounded-full"
            />
          </div>
        </div>

        {/* A Pagar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-rose-400 font-bold flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5" />
              Contas a Pagar (Passivo)
            </span>
            <span className="font-black text-rose-400">{formatBRL(totalPayable)}</span>
          </div>
          <div className="w-full h-3.5 rounded-full bg-white/5 overflow-hidden">
            <div
              style={{ width: `${(totalPayable / maxVal) * 100}%` }}
              className="h-full bg-gradient-to-r from-rose-600 to-rose-400 rounded-full"
            />
          </div>
        </div>

        {/* Vencidas */}
        {totalOverdue > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-amber-400 font-bold flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                Vencidas em Atraso (Alerta)
              </span>
              <span className="font-black text-amber-400">{formatBRL(totalOverdue)}</span>
            </div>
            <div className="w-full h-3.5 rounded-full bg-white/5 overflow-hidden">
              <div
                style={{ width: `${(totalOverdue / maxVal) * 100}%` }}
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
