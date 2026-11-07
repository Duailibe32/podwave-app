import {
  ManualSaleEntry,
  ManualExpenseEntry,
  MerchandisePurchaseEntry,
  CashMovementEntry,
  ManualCommitmentEntry,
  InitialCashBalanceConfig,
  CashAccountChannel,
  PeriodPreset,
  DateRange,
} from '../types/catalog';

// ============================================================================
// 1. MANIPULAÇÃO DE DATAS & FUSO HORÁRIO BRASILEIRO (America/Fortaleza - UTC-3)
// ============================================================================

/**
 * Retorna a data atual de hoje no fuso de Fortaleza (YYYY-MM-DD)
 */
export function getFortalezaToday(): string {
  // Obter data no fuso de Fortaleza / UTC-3
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Fortaleza',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now);
}

/**
 * Converte string YYYY-MM-DD para objeto Date em horário local neutro (meio-dia)
 */
export function parseDateLocal(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

/**
 * Formata um objeto Date em YYYY-MM-DD
 */
export function formatDateISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formata data YYYY-MM-DD para o padrão brasileiro DD/MM/AAAA
 */
export function formatDateBR(dateStr?: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/**
 * Formata valor numérico para Moeda Brasileira (R$)
 */
export function formatBRL(val: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val || 0);
}

/**
 * Formata percentual
 */
export function formatPercent(val: number): string {
  const sign = val > 0 ? '+' : '';
  return `${sign}${val.toFixed(1).replace('.', ',')}%`;
}

/**
 * Converte valor em reais para centavos inteiros (inteiro seguro),
 * eliminando imprecisões de arredondamento IEEE 754 em adições e subtrações repetidas.
 * Ex: 10.05 -> 1005
 */
export function toCents(val: number | string | undefined | null): number {
  if (val === undefined || val === null || val === '') return 0;
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  if (isNaN(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100);
}

/**
 * Converte centavos inteiros de volta para reais decimais com precisão bancária.
 * Ex: 1005 -> 10.05
 */
export function fromCents(cents: number): number {
  return Math.round(cents) / 100;
}

/**
 * Arredondamento monetário bancário exato com 2 casas decimais.
 */
export function roundBRL(val: number | string | undefined | null): number {
  return fromCents(toCents(val));
}

/**
 * Calcula variação absoluta e percentual entre período atual e anterior
 */
export function calculateVariation(
  current: number,
  previous: number | null | undefined
): {
  diff: number;
  percent: number | null;
  hasPrevious: boolean;
  isPositive: boolean;
  isNeutral: boolean;
} {
  if (previous === null || previous === undefined) {
    return { diff: 0, percent: null, hasPrevious: false, isPositive: false, isNeutral: true };
  }

  const diff = Number((current - previous).toFixed(2));

  if (previous === 0) {
    if (current === 0) {
      return { diff: 0, percent: 0, hasPrevious: true, isPositive: false, isNeutral: true };
    }
    return { diff, percent: null, hasPrevious: true, isPositive: current > 0, isNeutral: false };
  }

  const percent = Number(((diff / Math.abs(previous)) * 100).toFixed(1));
  return {
    diff,
    percent,
    hasPrevious: true,
    isPositive: diff > 0,
    isNeutral: diff === 0,
  };
}

/**
 * Calcula intervalo de datas atual e anterior correspondente a um Preset de Período
 */
export function getDateRangesForPreset(
  preset: PeriodPreset,
  customStart?: string,
  customEnd?: string
): {
  current: DateRange;
  previous: DateRange | null;
  label: string;
} {
  const todayStr = getFortalezaToday();
  const today = parseDateLocal(todayStr);

  switch (preset) {
    case 'hoje': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = formatDateISO(yesterday);
      return {
        current: { startDate: todayStr, endDate: todayStr },
        previous: { startDate: yesterdayStr, endDate: yesterdayStr },
        label: 'Hoje vs. Ontem',
      };
    }
    case 'ontem': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const dayBefore = new Date(today);
      dayBefore.setDate(dayBefore.getDate() - 2);
      const yesterdayStr = formatDateISO(yesterday);
      const dayBeforeStr = formatDateISO(dayBefore);
      return {
        current: { startDate: yesterdayStr, endDate: yesterdayStr },
        previous: { startDate: dayBeforeStr, endDate: dayBeforeStr },
        label: 'Ontem vs. Anteontem',
      };
    }
    case 'ultimos_7_dias': {
      const startCurrent = new Date(today);
      startCurrent.setDate(startCurrent.getDate() - 6);

      const endPrev = new Date(today);
      endPrev.setDate(endPrev.getDate() - 7);
      const startPrev = new Date(today);
      startPrev.setDate(startPrev.getDate() - 13);

      return {
        current: { startDate: formatDateISO(startCurrent), endDate: todayStr },
        previous: { startDate: formatDateISO(startPrev), endDate: formatDateISO(endPrev) },
        label: 'Últimos 7 dias vs. 7 dias anteriores',
      };
    }
    case 'ultimos_30_dias': {
      const startCurrent = new Date(today);
      startCurrent.setDate(startCurrent.getDate() - 29);

      const endPrev = new Date(today);
      endPrev.setDate(endPrev.getDate() - 30);
      const startPrev = new Date(today);
      startPrev.setDate(startPrev.getDate() - 59);

      return {
        current: { startDate: formatDateISO(startCurrent), endDate: todayStr },
        previous: { startDate: formatDateISO(startPrev), endDate: formatDateISO(endPrev) },
        label: 'Últimos 30 dias vs. 30 dias anteriores',
      };
    }
    case 'este_mes': {
      const year = today.getFullYear();
      const month = today.getMonth(); // 0-11
      const startCurrent = new Date(year, month, 1, 12, 0, 0);
      const endCurrent = new Date(year, month + 1, 0, 12, 0, 0);

      const startPrev = new Date(year, month - 1, 1, 12, 0, 0);
      const endPrev = new Date(year, month, 0, 12, 0, 0);

      return {
        current: { startDate: formatDateISO(startCurrent), endDate: formatDateISO(endCurrent) },
        previous: { startDate: formatDateISO(startPrev), endDate: formatDateISO(endPrev) },
        label: 'Este mês vs. Mês anterior',
      };
    }
    case 'mes_anterior': {
      const year = today.getFullYear();
      const month = today.getMonth(); // 0-11
      const startCurrent = new Date(year, month - 1, 1, 12, 0, 0);
      const endCurrent = new Date(year, month, 0, 12, 0, 0);

      const startPrev = new Date(year, month - 2, 1, 12, 0, 0);
      const endPrev = new Date(year, month - 1, 0, 12, 0, 0);

      return {
        current: { startDate: formatDateISO(startCurrent), endDate: formatDateISO(endCurrent) },
        previous: { startDate: formatDateISO(startPrev), endDate: formatDateISO(endPrev) },
        label: 'Mês anterior vs. Mês precedente',
      };
    }
    case 'este_ano': {
      const year = today.getFullYear();
      const startCurrent = new Date(year, 0, 1, 12, 0, 0);
      const endCurrent = new Date(year, 11, 31, 12, 0, 0);

      const startPrev = new Date(year - 1, 0, 1, 12, 0, 0);
      const endPrev = new Date(year - 1, 11, 31, 12, 0, 0);

      return {
        current: { startDate: formatDateISO(startCurrent), endDate: formatDateISO(endCurrent) },
        previous: { startDate: formatDateISO(startPrev), endDate: formatDateISO(endPrev) },
        label: 'Este ano vs. Ano anterior',
      };
    }
    case 'personalizado': {
      const startStr = customStart || todayStr;
      const endStr = customEnd || todayStr;
      const startD = parseDateLocal(startStr);
      const endD = parseDateLocal(endStr);
      const diffDays = Math.max(1, Math.round((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1);

      const prevEnd = new Date(startD);
      prevEnd.setDate(prevEnd.getDate() - 1);
      const prevStart = new Date(prevEnd);
      prevStart.setDate(prevStart.getDate() - diffDays + 1);

      return {
        current: { startDate: startStr, endDate: endStr },
        previous: { startDate: formatDateISO(prevStart), endDate: formatDateISO(prevEnd) },
        label: `Período selecionado vs. ${diffDays} dias anteriores`,
      };
    }
    case 'todo_historico':
    default: {
      return {
        current: { startDate: '1970-01-01', endDate: '2099-12-31' },
        previous: null,
        label: 'Todo o Histórico',
      };
    }
  }
}

// ============================================================================
// 2. CONSOLIDAÇÃO & CÁLCULOS FINANCEIROS GERENCIAIS
// ============================================================================

export interface CalculatedFinancialMetrics {
  // Vendas (Competência)
  validSalesCount: number;
  totalGrossSales: number;
  totalNetSales: number;
  totalDiscountSales: number;
  totalDeliveryFees: number;
  salesTicketMedio: number;
  salesPendingAmount: number; // pendente de receber originado das vendas do período
  salesPaymentStatusDistribution: { pago: number; parcial: number; pendente: number };

  // Custos & CMV Estimado
  knownCostOfGoodsSold: number;
  itemsSoldCount: number;
  itemsWithKnownCostCount: number;
  costCoveragePercent: number; // Cobertura de custo cadastrado nos produtos
  estimatedGrossProfit: number;
  estimatedGrossMarginPercent: number;

  // Recebimentos Efetivos (Regime de Caixa)
  effectiveReceiptsTotal: number;
  receiptsByMethod: Record<string, number>;
  receiptsByChannel: Record<CashAccountChannel, number>;

  // Despesas Operacionais (Competência & Caixa)
  operationalExpensesCount: number;
  operationalExpensesTotalContracted: number;
  operationalExpensesPaidTotal: number;
  operationalExpensesPendingTotal: number;
  expensesByCategory: Record<string, number>;

  // Compras de Mercadorias (Ativo de Revenda)
  purchasesCount: number;
  purchasesTotalCost: number;
  purchasesUnitsCount: number;
  purchasesPaidToSuppliers: number;
  purchasesPendingToSuppliers: number;
  purchasesShippingTotal: number;

  // Fluxo de Caixa Real
  cashOpeningBalance: number;
  cashPeriodInflows: number;
  cashPeriodOutflows: number;
  cashClosingBalance: number;
  cashNetResult: number; // Inflows - Outflows

  // DRE / Resultado Operacional Estimado (Competência)
  // Receita Líquida - CMV Conhecido - Despesas Operacionais
  estimatedOperatingResult: number;
  operatingResultCriteriaNotes: string[];

  // Contas Pendentes Globais (Status Atual)
  globalReceivablesTotal: number;
  globalPayablesTotal: number;
  globalOverdueTotal: number;
  globalOverdueCount: number;
  globalNext7DaysDueTotal: number;
  globalNext7DaysDueCount: number;

  // Rankings
  topProducts: {
    productId?: string;
    productName: string;
    quantity: number;
    revenue: number;
    knownCost: number;
    estimatedMargin: number;
    hasUnknownCost: boolean;
  }[];
  topCustomers: {
    customerName: string;
    salesCount: number;
    totalSpent: number;
    phone?: string;
  }[];
}

/**
 * Função centralizada para processar métricas de qualquer intervalo de datas
 */
export function calculateBusinessMetrics(
  sales: ManualSaleEntry[],
  expenses: ManualExpenseEntry[],
  purchases: MerchandisePurchaseEntry[],
  cashMovements: CashMovementEntry[],
  commitments: ManualCommitmentEntry[],
  initialCashBalances: InitialCashBalanceConfig | any[] | null,
  dateRange: DateRange
): CalculatedFinancialMetrics {
  const { startDate, endDate } = dateRange;

  // -------------------------------------------------------------
  // A) VENDAS (REGIME DE COMPETÊNCIA: DATA DA VENDA)
  // -------------------------------------------------------------
  const validSales = sales.filter((s) => {
    if (s.orderStatus === 'cancelado') return false;
    const saleD = s.saleDate?.split('T')[0] || '';
    return saleD >= startDate && saleD <= endDate;
  });

  const validSalesCount = validSales.length;
  let totalGrossSalesCents = 0;
  let totalNetSalesCents = 0;
  let totalDiscountSalesCents = 0;
  let totalDeliveryFeesCents = 0;
  let salesPendingAmountCents = 0;
  let knownCostOfGoodsSoldCents = 0;
  let itemsSoldCount = 0;
  let itemsWithKnownCostCount = 0;

  const salesStatusDist = { pago: 0, parcial: 0, pendente: 0 };
  const productsMap = new Map<
    string,
    {
      productId?: string;
      productName: string;
      quantity: number;
      revenue: number;
      knownCost: number;
      hasUnknownCost: boolean;
    }
  >();

  const customersMap = new Map<
    string,
    { customerName: string; salesCount: number; totalSpent: number; phone?: string }
  >();

  validSales.forEach((s) => {
    const net = s.netTotal || s.grossTotal || 0;
    const gross = s.grossTotal || net;
    const discount = s.discount || 0;
    const delivery = s.deliveryFee || 0;
    const pending = s.amountPending ?? Math.max(0, net - (s.amountReceived || 0));

    totalGrossSalesCents += toCents(gross);
    totalNetSalesCents += toCents(net);
    totalDiscountSalesCents += toCents(discount);
    totalDeliveryFeesCents += toCents(delivery);
    salesPendingAmountCents += toCents(pending);

    if (s.paymentStatus === 'pago') salesStatusDist.pago += 1;
    else if (s.paymentStatus === 'parcial') salesStatusDist.parcial += 1;
    else salesStatusDist.pendente += 1;

    // Itens da venda para CMV e Ranking
    if (s.items && s.items.length > 0) {
      s.items.forEach((item) => {
        const qty = item.quantity || 1;
        const sub = item.subtotal || item.unitPrice * qty;
        itemsSoldCount += qty;

        const pName =
          item.productName ||
          (item.modelName ? `${item.brandName ? item.brandName + ' ' : ''}${item.modelName}`.trim() : 'Produto');
        const key = item.productId || pName.toLowerCase();
        const existing = productsMap.get(key) || {
          productId: item.productId,
          productName: pName,
          quantity: 0,
          revenue: 0,
          knownCost: 0,
          hasUnknownCost: false,
        };

        existing.quantity += qty;
        existing.revenue = fromCents(toCents(existing.revenue) + toCents(sub));

        if (item.unitCost && item.unitCost > 0) {
          const itemCostCents = toCents(item.unitCost) * qty;
          knownCostOfGoodsSoldCents += itemCostCents;
          itemsWithKnownCostCount += qty;
          existing.knownCost = fromCents(toCents(existing.knownCost) + itemCostCents);
        } else {
          existing.hasUnknownCost = true;
        }

        productsMap.set(key, existing);
      });
    }

    // Cliente
    if (s.customerName && s.customerName.trim()) {
      const custKey = s.customerName.trim().toLowerCase();
      const existingCust = customersMap.get(custKey) || {
        customerName: s.customerName.trim(),
        salesCount: 0,
        totalSpent: 0,
        phone: s.customerPhone,
      };
      existingCust.salesCount += 1;
      existingCust.totalSpent = fromCents(toCents(existingCust.totalSpent) + toCents(net));
      if (s.customerPhone && !existingCust.phone) existingCust.phone = s.customerPhone;
      customersMap.set(custKey, existingCust);
    }
  });

  const totalGrossSales = fromCents(totalGrossSalesCents);
  const totalNetSales = fromCents(totalNetSalesCents);
  const totalDiscountSales = fromCents(totalDiscountSalesCents);
  const totalDeliveryFees = fromCents(totalDeliveryFeesCents);
  const salesPendingAmount = fromCents(salesPendingAmountCents);
  const knownCostOfGoodsSold = fromCents(knownCostOfGoodsSoldCents);

  const salesTicketMedio = validSalesCount > 0 ? Number((totalNetSales / validSalesCount).toFixed(2)) : 0;
  const costCoveragePercent =
    itemsSoldCount > 0 ? Number(((itemsWithKnownCostCount / itemsSoldCount) * 100).toFixed(1)) : 0;
  const estimatedGrossProfit = Number((totalNetSales - knownCostOfGoodsSold).toFixed(2));
  const estimatedGrossMarginPercent =
    totalNetSales > 0 && knownCostOfGoodsSold > 0
      ? Number(((estimatedGrossProfit / totalNetSales) * 100).toFixed(1))
      : 0;

  // -------------------------------------------------------------
  // B) RECEBIMENTOS EFETIVOS (REGIME DE CAIXA: DATA DO RECEBIMENTO)
  // -------------------------------------------------------------
  let effectiveReceiptsTotalCents = 0;
  const receiptsByMethodCents: Record<string, number> = {};
  const receiptsByChannelCents: Record<CashAccountChannel, number> = {
    pix_banco: 0,
    dinheiro_caixa: 0,
    cartao_maquininha: 0,
    outro: 0,
  };

  const addReceipt = (amt: number, method: string, channel: CashAccountChannel) => {
    const cents = toCents(amt);
    if (cents <= 0) return;
    effectiveReceiptsTotalCents += cents;
    const mKey = method || 'Outro';
    receiptsByMethodCents[mKey] = (receiptsByMethodCents[mKey] || 0) + cents;
    receiptsByChannelCents[channel] = (receiptsByChannelCents[channel] || 0) + cents;
  };

  // 1. Recebimentos de vendas manuais
  sales.forEach((s) => {
    if (s.orderStatus === 'cancelado') return;
    const saleReceipts = s.receipts || (s as any).paymentHistory;
    if (saleReceipts && saleReceipts.length > 0) {
      saleReceipts.forEach((r: any) => {
        const rawDate = r.receiptDate || r.paymentDate || r.date || '';
        const rDate = String(rawDate).split('T')[0] || '';
        if (rDate >= startDate && rDate <= endDate) {
          const method = r.paymentMethod || s.paymentMethod || 'Pix';
          const chan = r.accountChannel || mapPaymentMethodToChannel(method);
          addReceipt(r.amount, method, chan);
        }
      });
    } else if (s.amountReceived > 0) {
      const effDate = s.receivedDate || s.saleDate;
      const d = effDate?.split('T')[0] || '';
      if (d >= startDate && d <= endDate) {
        const method = s.paymentMethod || 'Pix';
        const chan = mapPaymentMethodToChannel(method);
        addReceipt(s.amountReceived, method, chan);
      }
    }
  });

  // 2. Recebimentos de compromissos avulsos a receber
  commitments.forEach((c) => {
    if (c.type === 'a_receber' && c.paymentStatus !== 'cancelado') {
      if (c.payments && c.payments.length > 0) {
        c.payments.forEach((p) => {
          const pDate = p.paymentDate?.split('T')[0] || '';
          if (pDate >= startDate && pDate <= endDate) {
            const method = p.paymentMethod || c.paymentMethod || 'Pix';
            const chan = p.accountChannel || c.accountChannel || 'pix_banco';
            addReceipt(p.amount, method, chan);
          }
        });
      } else if (c.amountPaid > 0) {
        const d = c.issueDate?.split('T')[0] || '';
        if (d >= startDate && d <= endDate) {
          const method = c.paymentMethod || 'Pix';
          const chan = c.accountChannel || 'pix_banco';
          addReceipt(c.amountPaid, method, chan);
        }
      }
    }
  });

  // 3. Entradas manuais do Livro Caixa (aportes / ajustes)
  cashMovements.forEach((m) => {
    if (m.type === 'entrada' && m.originType !== 'venda') {
      const mDate = m.movementDate?.split('T')[0] || '';
      if (mDate >= startDate && mDate <= endDate) {
        addReceipt(m.amount, m.category || 'Entrada Avulsa', m.accountChannel);
      }
    }
  });

  const effectiveReceiptsTotal = fromCents(effectiveReceiptsTotalCents);
  const receiptsByMethod: Record<string, number> = {};
  Object.keys(receiptsByMethodCents).forEach((k) => {
    receiptsByMethod[k] = fromCents(receiptsByMethodCents[k]);
  });
  const receiptsByChannel: Record<CashAccountChannel, number> = {
    pix_banco: fromCents(receiptsByChannelCents.pix_banco),
    dinheiro_caixa: fromCents(receiptsByChannelCents.dinheiro_caixa),
    cartao_maquininha: fromCents(receiptsByChannelCents.cartao_maquininha),
    outro: fromCents(receiptsByChannelCents.outro),
  };

  // -------------------------------------------------------------
  // C) DESPESAS OPERACIONAIS (COMPETÊNCIA & DESEMBOLSOS)
  // -------------------------------------------------------------
  const periodExpenses = expenses.filter((e) => {
    const d = e.expenseDate?.split('T')[0] || '';
    return d >= startDate && d <= endDate;
  });

  const operationalExpensesCount = periodExpenses.length;
  let operationalExpensesTotalContractedCents = 0;
  let operationalExpensesPendingTotalCents = 0;
  const expensesByCategoryCents: Record<string, number> = {};

  periodExpenses.forEach((e) => {
    const amt = e.amount || 0;
    const pending = e.amountPending ?? Math.max(0, amt - (e.amountPaid || 0));
    operationalExpensesTotalContractedCents += toCents(amt);
    operationalExpensesPendingTotalCents += toCents(pending);

    const cat = e.category || 'Outros Gastos';
    expensesByCategoryCents[cat] = (expensesByCategoryCents[cat] || 0) + toCents(amt);
  });

  const operationalExpensesTotalContracted = fromCents(operationalExpensesTotalContractedCents);
  const operationalExpensesPendingTotal = fromCents(operationalExpensesPendingTotalCents);
  const expensesByCategory: Record<string, number> = {};
  Object.keys(expensesByCategoryCents).forEach((k) => {
    expensesByCategory[k] = fromCents(expensesByCategoryCents[k]);
  });

  // Desembolsos efetivos de despesas operacionais no período
  let operationalExpensesPaidTotalCents = 0;
  expenses.forEach((e) => {
    const expensePayments = e.payments || (e as any).paymentHistory;
    if (expensePayments && expensePayments.length > 0) {
      expensePayments.forEach((p: any) => {
        const rawDate = p.paymentDate || p.date || '';
        const pDate = String(rawDate).split('T')[0] || '';
        if (pDate >= startDate && pDate <= endDate) {
          operationalExpensesPaidTotalCents += toCents(p.amount);
        }
      });
    } else if (e.amountPaid > 0) {
      const d = e.expenseDate?.split('T')[0] || '';
      if (d >= startDate && d <= endDate) {
        operationalExpensesPaidTotalCents += toCents(e.amountPaid);
      }
    }
  });

  // Desembolsos de compromissos avulsos a pagar
  commitments.forEach((c) => {
    if (c.type === 'a_pagar' && c.paymentStatus !== 'cancelado') {
      if (c.payments && c.payments.length > 0) {
        c.payments.forEach((p) => {
          const pDate = p.paymentDate?.split('T')[0] || '';
          if (pDate >= startDate && pDate <= endDate) {
            operationalExpensesPaidTotalCents += toCents(p.amount);
            const cat = c.category || 'Outras Obrigações';
            expensesByCategory[cat] = fromCents(toCents(expensesByCategory[cat] || 0) + toCents(p.amount));
          }
        });
      } else if (c.amountPaid > 0) {
        const d = c.issueDate?.split('T')[0] || '';
        if (d >= startDate && d <= endDate) {
          operationalExpensesPaidTotalCents += toCents(c.amountPaid);
        }
      }
    }
  });

  const operationalExpensesPaidTotal = fromCents(operationalExpensesPaidTotalCents);

  // -------------------------------------------------------------
  // D) COMPRAS DE MERCADORIAS (ESTOQUE - ATIVO DE REVENDA)
  // -------------------------------------------------------------
  const periodPurchases = purchases.filter((p) => {
    const d = p.purchaseDate?.split('T')[0] || '';
    return d >= startDate && d <= endDate;
  });

  const purchasesCount = periodPurchases.length;
  let purchasesTotalCostCents = 0;
  let purchasesUnitsCount = 0;
  let purchasesShippingTotalCents = 0;
  let purchasesPendingToSuppliersCents = 0;

  periodPurchases.forEach((p) => {
    const cost = p.totalCost || 0;
    const pending = p.amountPending ?? Math.max(0, cost - (p.amountPaid || 0));
    purchasesTotalCostCents += toCents(cost);
    purchasesShippingTotalCents += toCents(p.shippingCost || 0);
    purchasesPendingToSuppliersCents += toCents(pending);

    if (p.items && p.items.length > 0) {
      p.items.forEach((item) => {
        purchasesUnitsCount += item.quantity || 1;
      });
    }
  });

  const purchasesTotalCost = fromCents(purchasesTotalCostCents);
  const purchasesShippingTotal = fromCents(purchasesShippingTotalCents);
  const purchasesPendingToSuppliers = fromCents(purchasesPendingToSuppliersCents);

  // Desembolsos efetivos a fornecedores no período
  let purchasesPaidToSuppliersCents = 0;
  purchases.forEach((p) => {
    const purchasePayments = p.payments || (p as any).paymentHistory;
    if (purchasePayments && purchasePayments.length > 0) {
      purchasePayments.forEach((pay: any) => {
        const rawDate = pay.paymentDate || pay.date || '';
        const payDate = String(rawDate).split('T')[0] || '';
        if (payDate >= startDate && payDate <= endDate) {
          purchasesPaidToSuppliersCents += toCents(pay.amount);
        }
      });
    } else if (p.amountPaid > 0) {
      const d = p.purchaseDate?.split('T')[0] || '';
      if (d >= startDate && d <= endDate) {
        purchasesPaidToSuppliersCents += toCents(p.amountPaid);
      }
    }
  });

  const purchasesPaidToSuppliers = fromCents(purchasesPaidToSuppliersCents);

  // Saídas avulsas do Livro Caixa (retirada pró-labore, ajuste)
  let extraCashOutflowsCents = 0;
  cashMovements.forEach((m) => {
    if (m.type === 'saida' && m.originType !== 'despesa' && m.originType !== 'compra_estoque') {
      const mDate = m.movementDate?.split('T')[0] || '';
      if (mDate >= startDate && mDate <= endDate) {
        extraCashOutflowsCents += toCents(m.amount);
      }
    }
  });

  // -------------------------------------------------------------
  // E) FLUXO DE CAIXA: SALDO DE ABERTURA E SALDO DE FECHAMENTO
  // -------------------------------------------------------------
  const allHistoricalMovements: { date: string; type: 'entrada' | 'saida'; amountCents: number }[] = [];

  // Vendas
  sales.forEach((s) => {
    if (s.orderStatus === 'cancelado') return;
    if (s.receipts && s.receipts.length > 0) {
      s.receipts.forEach((r) => {
        const d = r.receiptDate?.split('T')[0] || '';
        if (d) allHistoricalMovements.push({ date: d, type: 'entrada', amountCents: toCents(r.amount) });
      });
    } else if (s.amountReceived > 0) {
      const d = (s.receivedDate || s.saleDate)?.split('T')[0] || '';
      if (d) allHistoricalMovements.push({ date: d, type: 'entrada', amountCents: toCents(s.amountReceived) });
    }
  });

  // Despesas
  expenses.forEach((e) => {
    if (e.payments && e.payments.length > 0) {
      e.payments.forEach((p) => {
        const d = p.paymentDate?.split('T')[0] || '';
        if (d) allHistoricalMovements.push({ date: d, type: 'saida', amountCents: toCents(p.amount) });
      });
    } else if (e.amountPaid > 0) {
      const d = e.expenseDate?.split('T')[0] || '';
      if (d) allHistoricalMovements.push({ date: d, type: 'saida', amountCents: toCents(e.amountPaid) });
    }
  });

  // Compras
  purchases.forEach((p) => {
    if (p.payments && p.payments.length > 0) {
      p.payments.forEach((pay) => {
        const d = pay.paymentDate?.split('T')[0] || '';
        if (d) allHistoricalMovements.push({ date: d, type: 'saida', amountCents: toCents(pay.amount) });
      });
    } else if (p.amountPaid > 0) {
      const d = p.purchaseDate?.split('T')[0] || '';
      if (d) allHistoricalMovements.push({ date: d, type: 'saida', amountCents: toCents(p.amountPaid) });
    }
  });

  // Compromissos avulsos
  commitments.forEach((c) => {
    if (c.paymentStatus === 'cancelado') return;
    const isReceivable = c.type === 'a_receber';
    if (c.payments && c.payments.length > 0) {
      c.payments.forEach((p) => {
        const d = p.paymentDate?.split('T')[0] || '';
        if (d)
          allHistoricalMovements.push({
            date: d,
            type: isReceivable ? 'entrada' : 'saida',
            amountCents: toCents(p.amount),
          });
      });
    } else if (c.amountPaid > 0) {
      const d = c.issueDate?.split('T')[0] || '';
      if (d)
        allHistoricalMovements.push({
          date: d,
          type: isReceivable ? 'entrada' : 'saida',
          amountCents: toCents(c.amountPaid),
        });
    }
  });

  // Movimentações avulsas
  cashMovements.forEach((m) => {
    if (m.originType !== 'venda' && m.originType !== 'despesa' && m.originType !== 'compra_estoque') {
      const d = m.movementDate?.split('T')[0] || '';
      if (d) allHistoricalMovements.push({ date: d, type: m.type, amountCents: toCents(m.amount) });
    }
  });

  // Soma dos saldos iniciais configurados
  let baseInitialBalanceCents = 0;
  if (Array.isArray(initialCashBalances)) {
    baseInitialBalanceCents = initialCashBalances.reduce((acc, r) => acc + toCents(r.amount), 0);
  } else if (initialCashBalances) {
    baseInitialBalanceCents =
      toCents(initialCashBalances.pix_banco) +
      toCents(initialCashBalances.dinheiro_caixa) +
      toCents(initialCashBalances.cartao_maquininha) +
      toCents(initialCashBalances.outro);
  }

  // Saldo de abertura em centavos
  let pastInflowsCents = 0;
  let pastOutflowsCents = 0;
  allHistoricalMovements.forEach((mov) => {
    if (mov.date < startDate) {
      if (mov.type === 'entrada') pastInflowsCents += mov.amountCents;
      else pastOutflowsCents += mov.amountCents;
    }
  });

  const cashOpeningBalanceCents = baseInitialBalanceCents + pastInflowsCents - pastOutflowsCents;
  const cashPeriodInflowsCents = effectiveReceiptsTotalCents;
  const cashPeriodOutflowsCents =
    operationalExpensesPaidTotalCents + purchasesPaidToSuppliersCents + extraCashOutflowsCents;
  const cashClosingBalanceCents =
    cashOpeningBalanceCents + cashPeriodInflowsCents - cashPeriodOutflowsCents;
  const cashNetResultCents = cashPeriodInflowsCents - cashPeriodOutflowsCents;

  const cashOpeningBalance = fromCents(cashOpeningBalanceCents);
  const cashPeriodInflows = fromCents(cashPeriodInflowsCents);
  const cashPeriodOutflows = fromCents(cashPeriodOutflowsCents);
  const cashClosingBalance = fromCents(cashClosingBalanceCents);
  const cashNetResult = fromCents(cashNetResultCents);

  // -------------------------------------------------------------
  // F) DRE / RESULTADO OPERACIONAL ESTIMADO (REGIME DE COMPETÊNCIA)
  // -------------------------------------------------------------
  const estimatedOperatingResultCents =
    totalNetSalesCents - knownCostOfGoodsSoldCents - operationalExpensesTotalContractedCents;
  const estimatedOperatingResult = fromCents(estimatedOperatingResultCents);

  const operatingResultCriteriaNotes: string[] = [];
  if (costCoveragePercent < 100) {
    operatingResultCriteriaNotes.push(
      `Cobertura de custos em ${costCoveragePercent}%. Custos não informados foram omitidos do CMV para evitar distorções.`
    );
  }
  operatingResultCriteriaNotes.push(
    'Compras de mercadorias constituem ativo de estoque e não foram subtraídas integralmente como despesa do mês.'
  );

  // -------------------------------------------------------------
  // G) CONTAS PENDENTES GLOBAIS (ESTADO ATUAL DO NEGÓCIO)
  // -------------------------------------------------------------
  const todayStr = getFortalezaToday();
  let globalReceivablesTotalCents = 0;
  let globalPayablesTotalCents = 0;
  let globalOverdueTotalCents = 0;
  let globalOverdueCount = 0;
  let globalNext7DaysDueTotalCents = 0;
  let globalNext7DaysDueCount = 0;

  // Clientes pendentes
  sales.forEach((s) => {
    if (s.orderStatus === 'cancelado') return;
    const pCents = toCents(s.amountPending ?? Math.max(0, (s.netTotal || 0) - (s.amountReceived || 0)));
    if (pCents > 0) {
      globalReceivablesTotalCents += pCents;
      if (s.dueDate) {
        if (s.dueDate < todayStr) {
          globalOverdueTotalCents += pCents;
          globalOverdueCount += 1;
        } else if (s.dueDate <= addDaysISO(todayStr, 7)) {
          globalNext7DaysDueTotalCents += pCents;
          globalNext7DaysDueCount += 1;
        }
      }
    }
  });

  // Compromissos a receber
  commitments.forEach((c) => {
    if (c.type === 'a_receber' && c.paymentStatus !== 'cancelado') {
      const pCents = toCents(c.amountPending ?? Math.max(0, c.totalAmount - (c.amountPaid || 0)));
      if (pCents > 0) {
        globalReceivablesTotalCents += pCents;
        if (c.dueDate) {
          if (c.dueDate < todayStr) {
            globalOverdueTotalCents += pCents;
            globalOverdueCount += 1;
          } else if (c.dueDate <= addDaysISO(todayStr, 7)) {
            globalNext7DaysDueTotalCents += pCents;
            globalNext7DaysDueCount += 1;
          }
        }
      }
    }
  });

  // Despesas pendentes
  expenses.forEach((e) => {
    const pCents = toCents(e.amountPending ?? Math.max(0, (e.amount || 0) - (e.amountPaid || 0)));
    if (pCents > 0) {
      globalPayablesTotalCents += pCents;
      if (e.dueDate) {
        if (e.dueDate < todayStr) {
          globalOverdueTotalCents += pCents;
          globalOverdueCount += 1;
        } else if (e.dueDate <= addDaysISO(todayStr, 7)) {
          globalNext7DaysDueTotalCents += pCents;
          globalNext7DaysDueCount += 1;
        }
      }
    }
  });

  // Fornecedores de estoque pendentes
  purchases.forEach((purch) => {
    const pCents = toCents(purch.amountPending ?? Math.max(0, (purch.totalCost || 0) - (purch.amountPaid || 0)));
    if (pCents > 0) {
      globalPayablesTotalCents += pCents;
      if (purch.dueDate) {
        if (purch.dueDate < todayStr) {
          globalOverdueTotalCents += pCents;
          globalOverdueCount += 1;
        } else if (purch.dueDate <= addDaysISO(todayStr, 7)) {
          globalNext7DaysDueTotalCents += pCents;
          globalNext7DaysDueCount += 1;
        }
      }
    }
  });

  // Compromissos a pagar
  commitments.forEach((c) => {
    if (c.type === 'a_pagar' && c.paymentStatus !== 'cancelado') {
      const pCents = toCents(c.amountPending ?? Math.max(0, c.totalAmount - (c.amountPaid || 0)));
      if (pCents > 0) {
        globalPayablesTotalCents += pCents;
        if (c.dueDate) {
          if (c.dueDate < todayStr) {
            globalOverdueTotalCents += pCents;
            globalOverdueCount += 1;
          } else if (c.dueDate <= addDaysISO(todayStr, 7)) {
            globalNext7DaysDueTotalCents += pCents;
            globalNext7DaysDueCount += 1;
          }
        }
      }
    }
  });

  const globalReceivablesTotal = fromCents(globalReceivablesTotalCents);
  const globalPayablesTotal = fromCents(globalPayablesTotalCents);
  const globalOverdueTotal = fromCents(globalOverdueTotalCents);
  const globalNext7DaysDueTotal = fromCents(globalNext7DaysDueTotalCents);

  // Top Produtos ordenados por quantidade e receita
  const topProducts = Array.from(productsMap.values())
    .map((p) => ({
      ...p,
      estimatedMargin:
        p.revenue > 0 && p.knownCost > 0
          ? Number((((p.revenue - p.knownCost) / p.revenue) * 100).toFixed(1))
          : 0,
    }))
    .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue);

  // Top Clientes
  const topCustomers = Array.from(customersMap.values()).sort(
    (a, b) => b.totalSpent - a.totalSpent || b.salesCount - a.salesCount
  );

  return {
    validSalesCount,
    totalGrossSales: Number(totalGrossSales.toFixed(2)),
    totalNetSales: Number(totalNetSales.toFixed(2)),
    totalDiscountSales: Number(totalDiscountSales.toFixed(2)),
    totalDeliveryFees: Number(totalDeliveryFees.toFixed(2)),
    salesTicketMedio,
    salesPendingAmount: Number(salesPendingAmount.toFixed(2)),
    salesPaymentStatusDistribution: salesStatusDist,

    knownCostOfGoodsSold: Number(knownCostOfGoodsSold.toFixed(2)),
    itemsSoldCount,
    itemsWithKnownCostCount,
    costCoveragePercent,
    estimatedGrossProfit,
    estimatedGrossMarginPercent,

    effectiveReceiptsTotal,
    receiptsByMethod,
    receiptsByChannel,

    operationalExpensesCount,
    operationalExpensesTotalContracted: Number(operationalExpensesTotalContracted.toFixed(2)),
    operationalExpensesPaidTotal,
    operationalExpensesPendingTotal: Number(operationalExpensesPendingTotal.toFixed(2)),
    expensesByCategory,

    purchasesCount,
    purchasesTotalCost: Number(purchasesTotalCost.toFixed(2)),
    purchasesUnitsCount,
    purchasesPaidToSuppliers,
    purchasesPendingToSuppliers: Number(purchasesPendingToSuppliers.toFixed(2)),
    purchasesShippingTotal: Number(purchasesShippingTotal.toFixed(2)),

    cashOpeningBalance,
    cashPeriodInflows,
    cashPeriodOutflows,
    cashClosingBalance,
    cashNetResult,

    estimatedOperatingResult,
    operatingResultCriteriaNotes,

    globalReceivablesTotal: Number(globalReceivablesTotal.toFixed(2)),
    globalPayablesTotal: Number(globalPayablesTotal.toFixed(2)),
    globalOverdueTotal: Number(globalOverdueTotal.toFixed(2)),
    globalOverdueCount,
    globalNext7DaysDueTotal: Number(globalNext7DaysDueTotal.toFixed(2)),
    globalNext7DaysDueCount,

    topProducts,
    topCustomers,
  };
}

/**
 * Mapeia forma de pagamento para canal financeiro padrão
 */
function mapPaymentMethodToChannel(method: string): CashAccountChannel {
  const m = method.toLowerCase();
  if (m.includes('pix') || m.includes('ted') || m.includes('doc') || m.includes('banco') || m.includes('transfer')) {
    return 'pix_banco';
  }
  if (m.includes('dinheiro') || m.includes('especie') || m.includes('caixa')) {
    return 'dinheiro_caixa';
  }
  if (m.includes('cartao') || m.includes('debito') || m.includes('credito') || m.includes('maquininha')) {
    return 'cartao_maquininha';
  }
  return 'outro';
}

function addDaysISO(dateStr: string, days: number): string {
  const d = parseDateLocal(dateStr);
  d.setDate(d.getDate() + days);
  return formatDateISO(d);
}

// ============================================================================
// 3. EXPORTAÇÃO PROFISSIONAL PARA EXCEL (.xlsx) E CSV
// ============================================================================

export interface ExportColumnDefinition {
  header: string;
  key: string;
  width?: number;
  type?: 'string' | 'number' | 'currency' | 'date';
}

/**
 * Exporta para arquivo Excel (.xlsx) preservando células numéricas com formato monetário
 */
export async function exportReportToExcel(
  title: string,
  periodSubtitle: string,
  columns: ExportColumnDefinition[],
  data: Record<string, any>[],
  totalsRow?: Record<string, any>,
  sheetName = 'Relatório'
) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  // Cabeçalho institucional e metadados
  const headerRows: any[][] = [
    [title.toUpperCase()],
    [`Período: ${periodSubtitle}`],
    [`Emitido em: ${new Date().toLocaleString('pt-BR')} — PodWave Controle Gerencial`],
    [], // linha em branco
    columns.map((c) => c.header),
  ];

  // Linhas de dados
  const dataRows = data.map((item) => {
    return columns.map((col) => {
      const val = item[col.key];
      if (val === undefined || val === null) return '';
      if (col.type === 'currency' || col.type === 'number') {
        const num = typeof val === 'number' ? val : parseFloat(val);
        return isNaN(num) ? 0 : Number(num.toFixed(2));
      }
      if (col.type === 'date') {
        return formatDateBR(String(val));
      }
      return val;
    });
  });

  // Linha de total opcional
  if (totalsRow) {
    const totalLine = columns.map((col, idx) => {
      if (idx === 0) return totalsRow[col.key] || 'TOTAL GERAL';
      const val = totalsRow[col.key];
      if (val === undefined || val === null) return '';
      if (col.type === 'currency' || col.type === 'number') {
        const num = typeof val === 'number' ? val : parseFloat(val);
        return isNaN(num) ? 0 : Number(num.toFixed(2));
      }
      return val;
    });
    dataRows.push(totalLine);
  }

  const allRows = [...headerRows, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(allRows);

  // Definir larguras de colunas
  ws['!cols'] = columns.map((c) => ({ wch: c.width || Math.max(c.header.length + 4, 15) }));

  // Formatar células numéricas como moeda brasileira no XLSX
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  const startRowData = 4; // 0-indexed: row 5 is headers, row 6+ is data

  for (let R = startRowData + 1; R <= range.e.r; ++R) {
    for (let C = 0; C < columns.length; ++C) {
      const colDef = columns[C];
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[cellAddress];
      if (cell && typeof cell.v === 'number') {
        if (colDef.type === 'currency') {
          cell.z = '"R$" #,##0.00;[Red]-"R$" #,##0.00';
        } else if (colDef.type === 'number') {
          cell.z = '#,##0';
        }
      }
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const cleanFilename = `${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${getFortalezaToday()}.xlsx`;
  XLSX.writeFile(wb, cleanFilename);
}

/**
 * Exporta para arquivo CSV no padrão brasileiro (BOM UTF-8, ponto e vírgula)
 */
export function exportReportToCSV(
  title: string,
  periodSubtitle: string,
  columns: ExportColumnDefinition[],
  data: Record<string, any>[],
  totalsRow?: Record<string, any>
): void {
  const rows: string[][] = [
    [title],
    [`Período: ${periodSubtitle}`],
    [`Gerado em: ${new Date().toLocaleString('pt-BR')}`],
    [],
    columns.map((c) => c.header),
  ];

  data.forEach((item) => {
    const row = columns.map((col) => {
      const val = item[col.key];
      if (val === undefined || val === null) return '';
      if (col.type === 'currency') {
        const num = typeof val === 'number' ? val : parseFloat(val) || 0;
        return `"${num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}"`;
      }
      if (col.type === 'date') {
        return `"${formatDateBR(String(val))}"`;
      }
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    rows.push(row);
  });

  if (totalsRow) {
    const totalLine = columns.map((col, idx) => {
      if (idx === 0) return `"${totalsRow[col.key] || 'TOTAL GERAL'}"`;
      const val = totalsRow[col.key];
      if (val === undefined || val === null) return '""';
      if (col.type === 'currency') {
        const num = typeof val === 'number' ? val : parseFloat(val) || 0;
        return `"${num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}"`;
      }
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    rows.push(totalLine);
  }

  const csvContent =
    '\uFEFF' + rows.map((r) => r.join(';')).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${getFortalezaToday()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
