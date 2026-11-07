import React, { useState, useMemo } from 'react';
import { useToast } from '../../context/ToastContext';
import { useCatalog } from '../../context/CatalogContext';
import { PeriodPreset, DateRange, CashAccountChannel } from '../../types/catalog';
import {
  formatBRL,
  formatDateBR,
  formatPercent,
  getDateRangesForPreset,
  calculateBusinessMetrics,
  getFortalezaToday,
  exportReportToExcel,
  exportReportToCSV,
  ExportColumnDefinition,
} from '../../utils/businessMetrics';
import {
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  Calendar,
  ShoppingBag,
  Receipt,
  Package,
  ArrowLeftRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Layers,
  Sparkles,
  DollarSign,
  FileText,
  CalendarDays,
} from 'lucide-react';

type ReportCategory =
  | 'fechamento_mensal'
  | 'vendas'
  | 'despesas'
  | 'compras'
  | 'fluxo_caixa'
  | 'pendentes'
  | 'resultados';

export const BusinessReportsSection: React.FC = () => {
  const { error: notifyError } = useToast();
  const [exportingExcel, setExportingExcel] = useState(false);
  const {
    manualSales,
    manualExpenses,
    merchandisePurchases,
    cashMovements,
    manualCommitments,
    initialCashBalances,
  } = useCatalog();

  const [activeCategory, setActiveCategory] = useState<ReportCategory>('fechamento_mensal');

  // Filtros de Período para os Relatórios
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('este_mes');
  const [customStartDate, setCustomStartDate] = useState(() => {
    const today = getFortalezaToday();
    return today.slice(0, 8) + '01';
  });
  const [customEndDate, setCustomEndDate] = useState(() => getFortalezaToday());

  // Seletor específico para o Fechamento Mensal Gerencial
  const todayStr = getFortalezaToday();
  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    return parseInt(todayStr.split('-')[1], 10); // 1-12
  });
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    return parseInt(todayStr.split('-')[0], 10);
  });

  // Busca e Paginação
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Intervalo ativo baseado no preset
  const { current: activeRange, label: activePeriodLabel } = useMemo(() => {
    return getDateRangesForPreset(periodPreset, customStartDate, customEndDate);
  }, [periodPreset, customStartDate, customEndDate]);

  // Intervalo do Fechamento Mensal
  const monthRange: DateRange = useMemo(() => {
    const y = selectedYear;
    const m = selectedMonth;
    const start = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { startDate: start, endDate: end };
  }, [selectedYear, selectedMonth]);

  // Métricas do Fechamento Mensal
  const monthMetrics = useMemo(() => {
    return calculateBusinessMetrics(
      manualSales,
      manualExpenses,
      merchandisePurchases,
      cashMovements,
      manualCommitments,
      initialCashBalances,
      monthRange
    );
  }, [
    manualSales,
    manualExpenses,
    merchandisePurchases,
    cashMovements,
    manualCommitments,
    initialCashBalances,
    monthRange,
  ]);

  // Métricas do Mês Imediatamente Anterior (para comparação)
  const prevMonthMetrics = useMemo(() => {
    const prevM = selectedMonth === 1 ? 12 : selectedMonth - 1;
    const prevY = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
    const start = `${prevY}-${String(prevM).padStart(2, '0')}-01`;
    const lastDay = new Date(prevY, prevM, 0).getDate();
    const end = `${prevY}-${String(prevM).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return calculateBusinessMetrics(
      manualSales,
      manualExpenses,
      merchandisePurchases,
      cashMovements,
      manualCommitments,
      initialCashBalances,
      { startDate: start, endDate: end }
    );
  }, [
    selectedMonth,
    selectedYear,
    manualSales,
    manualExpenses,
    merchandisePurchases,
    cashMovements,
    manualCommitments,
    initialCashBalances,
  ]);

  // Métricas do relatório ativo filtrado
  const activeMetrics = useMemo(() => {
    return calculateBusinessMetrics(
      manualSales,
      manualExpenses,
      merchandisePurchases,
      cashMovements,
      manualCommitments,
      initialCashBalances,
      activeRange
    );
  }, [
    manualSales,
    manualExpenses,
    merchandisePurchases,
    cashMovements,
    manualCommitments,
    initialCashBalances,
    activeRange,
  ]);

  const monthNames = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];

  // --------------------------------------------------------------------------
  // LISTAS FILTRADAS POR RELATÓRIO
  // --------------------------------------------------------------------------

  // 1. Vendas
  const filteredSales = useMemo(() => {
    return manualSales
      .filter((s) => {
        if (s.orderStatus === 'cancelado') return false;
        const d = s.saleDate?.split('T')[0] || '';
        if (d < activeRange.startDate || d > activeRange.endDate) return false;
        if (searchTerm.trim()) {
          const t = searchTerm.toLowerCase();
          const matchCustomer = s.customerName?.toLowerCase().includes(t);
          const matchId = s.id.toLowerCase().includes(t);
          const matchItems = s.items?.some((i) => i.productName.toLowerCase().includes(t));
          return matchCustomer || matchId || matchItems;
        }
        return true;
      })
      .sort((a, b) => (b.saleDate || '').localeCompare(a.saleDate || ''));
  }, [manualSales, activeRange, searchTerm]);

  // 2. Despesas
  const filteredExpenses = useMemo(() => {
    return manualExpenses
      .filter((e) => {
        const d = e.expenseDate?.split('T')[0] || '';
        if (d < activeRange.startDate || d > activeRange.endDate) return false;
        if (searchTerm.trim()) {
          const t = searchTerm.toLowerCase();
          const matchDesc = e.description?.toLowerCase().includes(t);
          const matchCat = e.category?.toLowerCase().includes(t);
          return matchDesc || matchCat;
        }
        return true;
      })
      .sort((a, b) => (b.expenseDate || '').localeCompare(a.expenseDate || ''));
  }, [manualExpenses, activeRange, searchTerm]);

  // 3. Compras
  const filteredPurchases = useMemo(() => {
    return merchandisePurchases
      .filter((p) => {
        const d = p.purchaseDate?.split('T')[0] || '';
        if (d < activeRange.startDate || d > activeRange.endDate) return false;
        if (searchTerm.trim()) {
          const t = searchTerm.toLowerCase();
          const matchSup = p.supplierName?.toLowerCase().includes(t);
          const matchInv = p.invoiceOrRef?.toLowerCase().includes(t);
          const matchItems = p.items?.some((i) => i.name.toLowerCase().includes(t));
          return matchSup || matchInv || matchItems;
        }
        return true;
      })
      .sort((a, b) => (b.purchaseDate || '').localeCompare(a.purchaseDate || ''));
  }, [merchandisePurchases, activeRange, searchTerm]);

  // 4. Fluxo de Caixa (Movimentações e Pagamentos no período)
  const filteredCashFlowEvents = useMemo(() => {
    const list: {
      id: string;
      date: string;
      type: 'entrada' | 'saida';
      origin: string;
      description: string;
      channel: CashAccountChannel;
      amount: number;
    }[] = [];

    // Vendas recebidas
    manualSales.forEach((s) => {
      if (s.orderStatus === 'cancelado') return;
      if (s.receipts && s.receipts.length > 0) {
        s.receipts.forEach((r) => {
          const d = r.receiptDate?.split('T')[0] || '';
          if (d >= activeRange.startDate && d <= activeRange.endDate) {
            list.push({
              id: `rec-${r.id}`,
              date: d,
              type: 'entrada',
              origin: 'Venda',
              description: `Recebimento Venda #${s.id.slice(0, 6)} (${s.customerName || 'Balcão'})`,
              channel: 'pix_banco',
              amount: r.amount,
            });
          }
        });
      } else if (s.amountReceived > 0) {
        const d = (s.receivedDate || s.saleDate)?.split('T')[0] || '';
        if (d >= activeRange.startDate && d <= activeRange.endDate) {
          list.push({
            id: `sale-pay-${s.id}`,
            date: d,
            type: 'entrada',
            origin: 'Venda',
            description: `Recebimento Venda #${s.id.slice(0, 6)} (${s.customerName || 'Balcão'})`,
            channel: 'pix_banco',
            amount: s.amountReceived,
          });
        }
      }
    });

    // Despesas pagas
    manualExpenses.forEach((e) => {
      if (e.payments && e.payments.length > 0) {
        e.payments.forEach((p) => {
          const d = p.paymentDate?.split('T')[0] || '';
          if (d >= activeRange.startDate && d <= activeRange.endDate) {
            list.push({
              id: `exp-pay-${p.id}`,
              date: d,
              type: 'saida',
              origin: 'Despesa',
              description: `Pagamento Despesa: ${e.description} (${e.category})`,
              channel: 'pix_banco',
              amount: p.amount,
            });
          }
        });
      } else if (e.amountPaid > 0) {
        const d = e.expenseDate?.split('T')[0] || '';
        if (d >= activeRange.startDate && d <= activeRange.endDate) {
          list.push({
            id: `exp-full-${e.id}`,
            date: d,
            type: 'saida',
            origin: 'Despesa',
            description: `Pagamento Despesa: ${e.description} (${e.category})`,
            channel: 'pix_banco',
            amount: e.amountPaid,
          });
        }
      }
    });

    // Compras pagas
    merchandisePurchases.forEach((purch) => {
      if (purch.payments && purch.payments.length > 0) {
        purch.payments.forEach((p) => {
          const d = p.paymentDate?.split('T')[0] || '';
          if (d >= activeRange.startDate && d <= activeRange.endDate) {
            list.push({
              id: `purch-pay-${p.id}`,
              date: d,
              type: 'saida',
              origin: 'Compra Estoque',
              description: `Pagamento Fornecedor: ${purch.supplierName}`,
              channel: 'pix_banco',
              amount: p.amount,
            });
          }
        });
      } else if (purch.amountPaid > 0) {
        const d = purch.purchaseDate?.split('T')[0] || '';
        if (d >= activeRange.startDate && d <= activeRange.endDate) {
          list.push({
            id: `purch-full-${purch.id}`,
            date: d,
            type: 'saida',
            origin: 'Compra Estoque',
            description: `Pagamento Fornecedor: ${purch.supplierName}`,
            channel: 'pix_banco',
            amount: purch.amountPaid,
          });
        }
      }
    });

    // Compromissos avulsos
    manualCommitments.forEach((c) => {
      if (c.paymentStatus === 'cancelado') return;
      const isReceivable = c.type === 'a_receber';
      if (c.payments && c.payments.length > 0) {
        c.payments.forEach((p) => {
          const d = p.paymentDate?.split('T')[0] || '';
          if (d >= activeRange.startDate && d <= activeRange.endDate) {
            list.push({
              id: `comm-pay-${p.id}`,
              date: d,
              type: isReceivable ? 'entrada' : 'saida',
              origin: 'Avulso',
              description: `${isReceivable ? 'Recebimento' : 'Pagamento'}: ${c.description} (${c.counterpartyName})`,
              channel: p.accountChannel || c.accountChannel || 'pix_banco',
              amount: p.amount,
            });
          }
        });
      } else if (c.amountPaid > 0) {
        const d = c.issueDate?.split('T')[0] || '';
        if (d >= activeRange.startDate && d <= activeRange.endDate) {
          list.push({
            id: `comm-full-${c.id}`,
            date: d,
            type: isReceivable ? 'entrada' : 'saida',
            origin: 'Avulso',
            description: `${isReceivable ? 'Recebimento' : 'Pagamento'}: ${c.description} (${c.counterpartyName})`,
            channel: c.accountChannel || 'pix_banco',
            amount: c.amountPaid,
          });
        }
      }
    });

    // Movimentações avulsas
    cashMovements.forEach((m) => {
      const d = m.movementDate?.split('T')[0] || '';
      if (d >= activeRange.startDate && d <= activeRange.endDate) {
        list.push({
          id: `mov-${m.id}`,
          date: d,
          type: m.type,
          origin: 'Caixa Avulso',
          description: m.description,
          channel: m.accountChannel,
          amount: m.amount,
        });
      }
    });

    if (searchTerm.trim()) {
      const t = searchTerm.toLowerCase();
      return list.filter((i) => i.description.toLowerCase().includes(t) || i.origin.toLowerCase().includes(t));
    }

    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [manualSales, manualExpenses, merchandisePurchases, manualCommitments, cashMovements, activeRange, searchTerm]);

  // 5. Contas Pendentes
  const filteredPendingAccounts = useMemo(() => {
    const list: {
      id: string;
      type: 'a_receber' | 'a_pagar';
      description: string;
      counterparty: string;
      dueDate?: string;
      totalAmount: number;
      amountPaid: number;
      amountPending: number;
      diasAtraso: number;
    }[] = [];

    const today = getFortalezaToday();

    // Vendas pendentes
    manualSales.forEach((s) => {
      if (s.orderStatus === 'cancelado') return;
      const pending = s.amountPending ?? Math.max(0, (s.netTotal || 0) - (s.amountReceived || 0));
      if (pending > 0.001) {
        let atraso = 0;
        if (s.dueDate && s.dueDate < today) {
          const diff = (new Date(today).getTime() - new Date(s.dueDate).getTime()) / (1000 * 60 * 60 * 24);
          atraso = Math.max(0, Math.round(diff));
        }
        list.push({
          id: `venda-${s.id}`,
          type: 'a_receber',
          description: `Venda #${s.id.slice(0, 6)}`,
          counterparty: s.customerName || 'Cliente Balcão',
          dueDate: s.dueDate,
          totalAmount: s.netTotal || s.grossTotal || 0,
          amountPaid: s.amountReceived || 0,
          amountPending: pending,
          diasAtraso: atraso,
        });
      }
    });

    // Despesas pendentes
    manualExpenses.forEach((e) => {
      const pending = e.amountPending ?? Math.max(0, (e.amount || 0) - (e.amountPaid || 0));
      if (pending > 0.001) {
        let atraso = 0;
        if (e.dueDate && e.dueDate < today) {
          const diff = (new Date(today).getTime() - new Date(e.dueDate).getTime()) / (1000 * 60 * 60 * 24);
          atraso = Math.max(0, Math.round(diff));
        }
        list.push({
          id: `exp-${e.id}`,
          type: 'a_pagar',
          description: e.description,
          counterparty: e.category,
          dueDate: e.dueDate,
          totalAmount: e.amount || 0,
          amountPaid: e.amountPaid || 0,
          amountPending: pending,
          diasAtraso: atraso,
        });
      }
    });

    // Compras pendentes
    merchandisePurchases.forEach((p) => {
      const pending = p.amountPending ?? Math.max(0, (p.totalCost || 0) - (p.amountPaid || 0));
      if (pending > 0.001) {
        let atraso = 0;
        if (p.dueDate && p.dueDate < today) {
          const diff = (new Date(today).getTime() - new Date(p.dueDate).getTime()) / (1000 * 60 * 60 * 24);
          atraso = Math.max(0, Math.round(diff));
        }
        list.push({
          id: `purch-${p.id}`,
          type: 'a_pagar',
          description: `Compra Estoque #${p.id.slice(0, 6)}`,
          counterparty: p.supplierName || 'Fornecedor',
          dueDate: p.dueDate,
          totalAmount: p.totalCost || 0,
          amountPaid: p.amountPaid || 0,
          amountPending: pending,
          diasAtraso: atraso,
        });
      }
    });

    // Compromissos avulsos
    manualCommitments.forEach((c) => {
      if (c.paymentStatus === 'cancelado') return;
      const pending = c.amountPending ?? Math.max(0, c.totalAmount - (c.amountPaid || 0));
      if (pending > 0.001) {
        let atraso = 0;
        if (c.dueDate && c.dueDate < today) {
          const diff = (new Date(today).getTime() - new Date(c.dueDate).getTime()) / (1000 * 60 * 60 * 24);
          atraso = Math.max(0, Math.round(diff));
        }
        list.push({
          id: `comm-${c.id}`,
          type: c.type,
          description: c.description,
          counterparty: c.counterpartyName,
          dueDate: c.dueDate,
          totalAmount: c.totalAmount,
          amountPaid: c.amountPaid || 0,
          amountPending: pending,
          diasAtraso: atraso,
        });
      }
    });

    if (searchTerm.trim()) {
      const t = searchTerm.toLowerCase();
      return list.filter((i) => i.description.toLowerCase().includes(t) || i.counterparty.toLowerCase().includes(t));
    }

    return list.sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));
  }, [manualSales, manualExpenses, merchandisePurchases, manualCommitments, searchTerm]);

  // --------------------------------------------------------------------------
  // ROTINAS DE EXPORTAÇÃO EXCEL E CSV
  // --------------------------------------------------------------------------

  const handleExportCurrentReport = async (format: 'xlsx' | 'csv') => {
    // 1. FECHAMENTO MENSAL GERENCIAL
    if (activeCategory === 'fechamento_mensal') {
      const columns: ExportColumnDefinition[] = [
        { header: 'Indicador Gerencial', key: 'indicador', width: 40, type: 'string' },
        { header: `Mês Atual (${monthNames[selectedMonth - 1]}/${selectedYear})`, key: 'atual', width: 25, type: 'currency' },
        { header: 'Mês Anterior', key: 'anterior', width: 25, type: 'currency' },
        { header: 'Tipo de Regime', key: 'regime', width: 20, type: 'string' },
      ];

      const data = [
        { indicador: 'Faturamento Líquido de Vendas', atual: monthMetrics.totalNetSales, anterior: prevMonthMetrics.totalNetSales, regime: 'Competência' },
        { indicador: '(-) CMV Histórico Conhecido', atual: monthMetrics.knownCostOfGoodsSold, anterior: prevMonthMetrics.knownCostOfGoodsSold, regime: 'Competência' },
        { indicador: '(=) Lucro Bruto Estimado', atual: monthMetrics.estimatedGrossProfit, anterior: prevMonthMetrics.estimatedGrossProfit, regime: 'Competência' },
        { indicador: '(-) Despesas Operacionais Contratadas', atual: monthMetrics.operationalExpensesTotalContracted, anterior: prevMonthMetrics.operationalExpensesTotalContracted, regime: 'Competência' },
        { indicador: '(=) Resultado Operacional Estimado', atual: monthMetrics.estimatedOperatingResult, anterior: prevMonthMetrics.estimatedOperatingResult, regime: 'Competência' },
        { indicador: '--- MOVIMENTAÇÃO DE CAIXA ---', atual: '', anterior: '', regime: '---' },
        { indicador: 'Saldo de Abertura do Caixa', atual: monthMetrics.cashOpeningBalance, anterior: prevMonthMetrics.cashOpeningBalance, regime: 'Caixa Real' },
        { indicador: '(+) Recebimentos Efetivos de Clientes', atual: monthMetrics.effectiveReceiptsTotal, anterior: prevMonthMetrics.effectiveReceiptsTotal, regime: 'Caixa Real' },
        { indicador: '(-) Despesas Operacionais Pagas', atual: monthMetrics.operationalExpensesPaidTotal, anterior: prevMonthMetrics.operationalExpensesPaidTotal, regime: 'Caixa Real' },
        { indicador: '(-) Desembolsos a Fornecedores (Estoque)', atual: monthMetrics.purchasesPaidToSuppliers, anterior: prevMonthMetrics.purchasesPaidToSuppliers, regime: 'Caixa Real' },
        { indicador: '(=) Saldo Final de Fechamento', atual: monthMetrics.cashClosingBalance, anterior: prevMonthMetrics.cashClosingBalance, regime: 'Caixa Real' },
        { indicador: '--- PATRIMÔNIO & PENDÊNCIAS ---', atual: '', anterior: '', regime: '---' },
        { indicador: 'Mercadorias Adquiridas no Mês (Estoque)', atual: monthMetrics.purchasesTotalCost, anterior: prevMonthMetrics.purchasesTotalCost, regime: 'Ativo' },
        { indicador: 'Contas a Receber em Aberto (Global)', atual: monthMetrics.globalReceivablesTotal, anterior: prevMonthMetrics.globalReceivablesTotal, regime: 'Direitos' },
        { indicador: 'Contas a Pagar em Aberto (Global)', atual: monthMetrics.globalPayablesTotal, anterior: prevMonthMetrics.globalPayablesTotal, regime: 'Obrigações' },
      ];

      const title = `Fechamento Mensal Gerencial — ${monthNames[selectedMonth - 1]} de ${selectedYear}`;
      const subtitle = `${formatDateBR(monthRange.startDate)} até ${formatDateBR(monthRange.endDate)}`;

      if (format === 'xlsx') {
        await exportReportToExcel(title, subtitle, columns, data, undefined, 'Fechamento Mensal');
      } else {
        exportReportToCSV(title, subtitle, columns, data);
      }
      return;
    }

    // 2. RELATÓRIO DE VENDAS
    if (activeCategory === 'vendas') {
      const columns: ExportColumnDefinition[] = [
        { header: 'Código', key: 'id', width: 14, type: 'string' },
        { header: 'Data da Venda', key: 'saleDate', width: 14, type: 'date' },
        { header: 'Cliente', key: 'customerName', width: 25, type: 'string' },
        { header: 'Produtos Vendidos', key: 'produtos', width: 35, type: 'string' },
        { header: 'Qtd Itens', key: 'totalQty', width: 10, type: 'number' },
        { header: 'Total Bruto (R$)', key: 'grossTotal', width: 16, type: 'currency' },
        { header: 'Desconto (R$)', key: 'discount', width: 14, type: 'currency' },
        { header: 'Taxa Entrega (R$)', key: 'deliveryFee', width: 16, type: 'currency' },
        { header: 'Total Líquido (R$)', key: 'netTotal', width: 16, type: 'currency' },
        { header: 'Valor Recebido (R$)', key: 'amountReceived', width: 18, type: 'currency' },
        { header: 'Saldo Pendente (R$)', key: 'amountPending', width: 18, type: 'currency' },
        { header: 'Forma Pagamento', key: 'paymentMethod', width: 16, type: 'string' },
        { header: 'Status Pagamento', key: 'paymentStatus', width: 16, type: 'string' },
      ];

      const data = filteredSales.map((s) => ({
        id: `#${s.id.slice(0, 6)}`,
        saleDate: s.saleDate,
        customerName: s.customerName || 'Cliente Balcão',
        produtos: s.items?.map((i) => `${i.quantity}x ${i.productName}`).join('; ') || '',
        totalQty: s.items?.reduce((acc, i) => acc + (i.quantity || 1), 0) || 1,
        grossTotal: s.grossTotal || s.netTotal,
        discount: s.discount || 0,
        deliveryFee: s.deliveryFee || 0,
        netTotal: s.netTotal || s.grossTotal,
        amountReceived: s.amountReceived || 0,
        amountPending: s.amountPending || 0,
        paymentMethod: s.paymentMethod || 'Pix',
        paymentStatus: s.paymentStatus || 'pendente',
      }));

      const totalsRow = {
        id: 'TOTAL GERAL',
        grossTotal: data.reduce((acc, i) => acc + i.grossTotal, 0),
        discount: data.reduce((acc, i) => acc + i.discount, 0),
        deliveryFee: data.reduce((acc, i) => acc + i.deliveryFee, 0),
        netTotal: data.reduce((acc, i) => acc + i.netTotal, 0),
        amountReceived: data.reduce((acc, i) => acc + i.amountReceived, 0),
        amountPending: data.reduce((acc, i) => acc + i.amountPending, 0),
      };

      const title = 'Relatório Gerencial de Vendas';
      const subtitle = activePeriodLabel;

      if (format === 'xlsx') {
        await exportReportToExcel(title, subtitle, columns, data, totalsRow, 'Vendas');
      } else {
        exportReportToCSV(title, subtitle, columns, data, totalsRow);
      }
      return;
    }

    // 3. RELATÓRIO DE DESPESAS
    if (activeCategory === 'despesas') {
      const columns: ExportColumnDefinition[] = [
        { header: 'Código', key: 'id', width: 14, type: 'string' },
        { header: 'Data Despesa', key: 'expenseDate', width: 14, type: 'date' },
        { header: 'Descrição', key: 'description', width: 30, type: 'string' },
        { header: 'Categoria', key: 'category', width: 22, type: 'string' },
        { header: 'Valor Contratado (R$)', key: 'amount', width: 20, type: 'currency' },
        { header: 'Valor Pago (R$)', key: 'amountPaid', width: 18, type: 'currency' },
        { header: 'Valor Pendente (R$)', key: 'amountPending', width: 18, type: 'currency' },
        { header: 'Data Vencimento', key: 'dueDate', width: 16, type: 'date' },
        { header: 'Forma Pagamento', key: 'paymentMethod', width: 18, type: 'string' },
        { header: 'Status', key: 'paymentStatus', width: 14, type: 'string' },
      ];

      const data = filteredExpenses.map((e) => ({
        id: `#${e.id.slice(0, 6)}`,
        expenseDate: e.expenseDate,
        description: e.description,
        category: e.category,
        amount: e.amount || 0,
        amountPaid: e.amountPaid || 0,
        amountPending: e.amountPending || 0,
        dueDate: e.dueDate || '',
        paymentMethod: e.paymentMethod || 'Pix',
        paymentStatus: e.paymentStatus || 'a_pagar',
      }));

      const totalsRow = {
        id: 'TOTAL GERAL',
        amount: data.reduce((acc, i) => acc + i.amount, 0),
        amountPaid: data.reduce((acc, i) => acc + i.amountPaid, 0),
        amountPending: data.reduce((acc, i) => acc + i.amountPending, 0),
      };

      const title = 'Relatório de Despesas Operacionais';
      if (format === 'xlsx') {
        await exportReportToExcel(title, activePeriodLabel, columns, data, totalsRow, 'Despesas');
      } else {
        exportReportToCSV(title, activePeriodLabel, columns, data, totalsRow);
      }
      return;
    }

    // 4. RELATÓRIO DE COMPRAS DE MERCADORIAS
    if (activeCategory === 'compras') {
      const columns: ExportColumnDefinition[] = [
        { header: 'Código', key: 'id', width: 14, type: 'string' },
        { header: 'Data da Compra', key: 'purchaseDate', width: 14, type: 'date' },
        { header: 'Fornecedor', key: 'supplierName', width: 25, type: 'string' },
        { header: 'Itens Comprados', key: 'itens', width: 35, type: 'string' },
        { header: 'Total Itens', key: 'itemsSubtotal', width: 16, type: 'currency' },
        { header: 'Frete (R$)', key: 'shippingCost', width: 14, type: 'currency' },
        { header: 'Desconto (R$)', key: 'discount', width: 14, type: 'currency' },
        { header: 'Custo Total (R$)', key: 'totalCost', width: 18, type: 'currency' },
        { header: 'Valor Pago (R$)', key: 'amountPaid', width: 16, type: 'currency' },
        { header: 'Valor Pendente (R$)', key: 'amountPending', width: 16, type: 'currency' },
        { header: 'Recebimento', key: 'receivingStatus', width: 16, type: 'string' },
      ];

      const data = filteredPurchases.map((p) => ({
        id: `#${p.id.slice(0, 6)}`,
        purchaseDate: p.purchaseDate,
        supplierName: p.supplierName,
        itens: p.items?.map((i) => `${i.quantity}x ${i.name} (R$ ${i.unitCost})`).join('; ') || '',
        itemsSubtotal: p.itemsSubtotal || 0,
        shippingCost: p.shippingCost || 0,
        discount: p.discount || 0,
        totalCost: p.totalCost || 0,
        amountPaid: p.amountPaid || 0,
        amountPending: p.amountPending || 0,
        receivingStatus: p.receivingStatus || 'recebido',
      }));

      const totalsRow = {
        id: 'TOTAL GERAL',
        itemsSubtotal: data.reduce((acc, i) => acc + i.itemsSubtotal, 0),
        shippingCost: data.reduce((acc, i) => acc + i.shippingCost, 0),
        discount: data.reduce((acc, i) => acc + i.discount, 0),
        totalCost: data.reduce((acc, i) => acc + i.totalCost, 0),
        amountPaid: data.reduce((acc, i) => acc + i.amountPaid, 0),
        amountPending: data.reduce((acc, i) => acc + i.amountPending, 0),
      };

      const title = 'Relatório de Compras de Mercadorias (Estoque)';
      if (format === 'xlsx') {
        await exportReportToExcel(title, activePeriodLabel, columns, data, totalsRow, 'Compras');
      } else {
        exportReportToCSV(title, activePeriodLabel, columns, data, totalsRow);
      }
      return;
    }

    // 5. RELATÓRIO DE FLUXO DE CAIXA
    if (activeCategory === 'fluxo_caixa') {
      const columns: ExportColumnDefinition[] = [
        { header: 'Data Efetiva', key: 'date', width: 14, type: 'date' },
        { header: 'Tipo', key: 'type', width: 12, type: 'string' },
        { header: 'Origem', key: 'origin', width: 16, type: 'string' },
        { header: 'Descrição da Movimentação', key: 'description', width: 40, type: 'string' },
        { header: 'Canal Financeiro', key: 'channel', width: 18, type: 'string' },
        { header: 'Entrada (R$)', key: 'entrada', width: 16, type: 'currency' },
        { header: 'Saída (R$)', key: 'saida', width: 16, type: 'currency' },
      ];

      const data = filteredCashFlowEvents.map((m) => ({
        date: m.date,
        type: m.type === 'entrada' ? 'Entrada (+)' : 'Saída (-)',
        origin: m.origin,
        description: m.description,
        channel: m.channel,
        entrada: m.type === 'entrada' ? m.amount : 0,
        saida: m.type === 'saida' ? m.amount : 0,
      }));

      const totalsRow = {
        date: 'TOTAL',
        description: `Saldo Inicial: ${formatBRL(activeMetrics.cashOpeningBalance)} | Saldo Final: ${formatBRL(activeMetrics.cashClosingBalance)}`,
        entrada: data.reduce((acc, i) => acc + i.entrada, 0),
        saida: data.reduce((acc, i) => acc + i.saida, 0),
      };

      const title = 'Relatório de Fluxo de Caixa Real';
      if (format === 'xlsx') {
        await exportReportToExcel(title, activePeriodLabel, columns, data, totalsRow, 'Fluxo de Caixa');
      } else {
        exportReportToCSV(title, activePeriodLabel, columns, data, totalsRow);
      }
      return;
    }

    // 6. RELATÓRIO DE CONTAS PENDENTES
    if (activeCategory === 'pendentes') {
      const columns: ExportColumnDefinition[] = [
        { header: 'Tipo', key: 'type', width: 14, type: 'string' },
        { header: 'Descrição', key: 'description', width: 30, type: 'string' },
        { header: 'Cliente / Fornecedor', key: 'counterparty', width: 25, type: 'string' },
        { header: 'Vencimento', key: 'dueDate', width: 14, type: 'date' },
        { header: 'Dias Atraso', key: 'diasAtraso', width: 14, type: 'number' },
        { header: 'Valor Original (R$)', key: 'totalAmount', width: 18, type: 'currency' },
        { header: 'Valor Quitado (R$)', key: 'amountPaid', width: 18, type: 'currency' },
        { header: 'Saldo Pendente (R$)', key: 'amountPending', width: 18, type: 'currency' },
      ];

      const data = filteredPendingAccounts.map((p) => ({
        type: p.type === 'a_receber' ? 'A Receber' : 'A Pagar',
        description: p.description,
        counterparty: p.counterparty,
        dueDate: p.dueDate || 'Sem data',
        diasAtraso: p.diasAtraso,
        totalAmount: p.totalAmount,
        amountPaid: p.amountPaid,
        amountPending: p.amountPending,
      }));

      const totalsRow = {
        type: 'TOTAL GERAL',
        totalAmount: data.reduce((acc, i) => acc + i.totalAmount, 0),
        amountPaid: data.reduce((acc, i) => acc + i.amountPaid, 0),
        amountPending: data.reduce((acc, i) => acc + i.amountPending, 0),
      };

      const title = 'Relatório de Contas Pendentes e Inadimplência';
      if (format === 'xlsx') {
        await exportReportToExcel(title, 'Posição Global de Pendências', columns, data, totalsRow, 'Pendências');
      } else {
        exportReportToCSV(title, 'Posição Global de Pendências', columns, data, totalsRow);
      }
      return;
    }

    // 7. DEMONSTRATIVO DE RESULTADOS (DRE)
    if (activeCategory === 'resultados') {
      const columns: ExportColumnDefinition[] = [
        { header: 'Item Demonstrativo', key: 'item', width: 40, type: 'string' },
        { header: 'Valor (R$)', key: 'valor', width: 22, type: 'currency' },
        { header: 'Percentual s/ Venda', key: 'percentual', width: 20, type: 'string' },
        { header: 'Critério Contábil', key: 'criterio', width: 35, type: 'string' },
      ];

      const netSales = activeMetrics.totalNetSales;
      const getPct = (val: number) => (netSales > 0 ? `${((val / netSales) * 100).toFixed(1)}%` : '0%');

      const data = [
        { item: '(+) Faturamento Bruto de Vendas', valor: activeMetrics.totalGrossSales, percentual: getPct(activeMetrics.totalGrossSales), criterio: 'Vendas registradas no período' },
        { item: '(-) Descontos Concedidos aos Clientes', valor: -activeMetrics.totalDiscountSales, percentual: getPct(activeMetrics.totalDiscountSales), criterio: 'Dedução da receita bruta' },
        { item: '(+) Taxas de Entrega Cobradas', valor: activeMetrics.totalDeliveryFees, percentual: getPct(activeMetrics.totalDeliveryFees), criterio: 'Adicional de frete' },
        { item: '(=) Receita Líquida de Vendas', valor: activeMetrics.totalNetSales, percentual: '100.0%', criterio: 'Base de cálculo operacional' },
        { item: '(-) CMV Histórico Conhecido', valor: -activeMetrics.knownCostOfGoodsSold, percentual: getPct(activeMetrics.knownCostOfGoodsSold), criterio: `Cobertura de ${activeMetrics.costCoveragePercent}% dos itens` },
        { item: '(=) Lucro Bruto Estimado', valor: activeMetrics.estimatedGrossProfit, percentual: getPct(activeMetrics.estimatedGrossProfit), criterio: 'Margem bruta de mercadorias' },
        { item: '(-) Despesas Operacionais Registradas', valor: -activeMetrics.operationalExpensesTotalContracted, percentual: getPct(activeMetrics.operationalExpensesTotalContracted), criterio: 'Gastos fixos e variáveis do negócio' },
        { item: '(=) Resultado Operacional Estimado', valor: activeMetrics.estimatedOperatingResult, percentual: getPct(activeMetrics.estimatedOperatingResult), criterio: 'Lucro ou prejuízo operacional estimado' },
      ];

      const title = 'Demonstrativo de Resultados Operacionais (DRE Estimado)';
      if (format === 'xlsx') {
        await exportReportToExcel(title, activePeriodLabel, columns, data, undefined, 'DRE');
      } else {
        exportReportToCSV(title, activePeriodLabel, columns, data);
      }
    }
  };

  const handleExcel = async () => {
    if (exportingExcel) return;
    setExportingExcel(true);
    try {
      await handleExportCurrentReport('xlsx');
    } catch {
      notifyError('Falha ao exportar Excel', 'Confira a conexão e tente novamente.');
    } finally {
      setExportingExcel(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* 1. HEADER DA SEÇÃO DE RELATÓRIOS COM BOTÕES DE EXPORTAÇÃO */}
      {/* ========================================================================= */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[#0D1022] border border-[#8423DA]/25 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00DFFF] via-[#8423DA] to-[#10B981] p-0.5 flex items-center justify-center shadow-[0_0_20px_rgba(0,223,255,0.3)] shrink-0">
            <div className="w-full h-full bg-[#080811] rounded-[14px] flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6 text-[#00DFFF]" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-xl sm:text-2xl font-black text-white tracking-tight">
                Central de Relatórios & Fechamentos
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-[#10B981]/15 border border-[#10B981]/30 text-[10px] font-extrabold uppercase tracking-wider text-[#10B981]">
                Excel & CSV
              </span>
            </div>
            <p className="text-xs text-[#A5A5B8] mt-0.5">
              Consultas analíticas consolidadas, fechamento mensal e exportação completa no padrão brasileiro
            </p>
          </div>
        </div>

        {/* Botões de Ação para Exportação */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExcel}
            disabled={exportingExcel}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#10B981] to-[#00DFFF] hover:brightness-110 text-black text-xs font-black shadow-lg shadow-[#10B981]/20 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Exportar para planilha Excel (.xlsx)"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>{exportingExcel ? 'Exportando…' : 'Exportar Excel (.xlsx)'}</span>
          </button>

          <button
            onClick={() => handleExportCurrentReport('csv')}
            className="px-3 py-2 rounded-xl bg-[#141838] hover:bg-white/10 text-gray-200 text-xs font-bold border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Exportar no formato CSV formatado"
          >
            <FileText className="w-4 h-4 text-gray-400" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SUB-NAVEGAÇÃO: CATEGORIAS DE RELATÓRIO */}
      {/* ========================================================================= */}
      <div className="overflow-x-auto no-scrollbar pb-1">
        <div className="flex items-center gap-2 min-w-max p-1.5 rounded-2xl bg-[#0D1022] border border-[#8423DA]/20">
          {[
            { id: 'fechamento_mensal', label: 'Fechamento Mensal Gerencial', icon: <CalendarDays className="w-4 h-4" /> },
            { id: 'vendas', label: 'Relatório de Vendas', icon: <ShoppingBag className="w-4 h-4" /> },
            { id: 'despesas', label: 'Relatório de Despesas', icon: <Receipt className="w-4 h-4" /> },
            { id: 'compras', label: 'Compras de Mercadorias', icon: <Package className="w-4 h-4" /> },
            { id: 'fluxo_caixa', label: 'Fluxo de Caixa Real', icon: <ArrowLeftRight className="w-4 h-4" /> },
            { id: 'pendentes', label: 'Contas Pendentes', icon: <Clock className="w-4 h-4" /> },
            { id: 'resultados', label: 'Demonstrativo DRE', icon: <FileSpreadsheet className="w-4 h-4" /> },
          ].map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id as ReportCategory);
                  setCurrentPage(1);
                  setSearchTerm('');
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
                  isActive
                    ? 'bg-gradient-to-r from-[#00DFFF] to-[#007BFF] text-black shadow-md shadow-[#00DFFF]/20 font-black'
                    : 'text-gray-300 hover:text-white hover:bg-[#141838]'
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. CONTEÚDO DO RELATÓRIO SELECIONADO */}
      {/* ========================================================================= */}

      {/* A) FECHAMENTO MENSAL GERENCIAL */}
      {activeCategory === 'fechamento_mensal' && (
        <div className="space-y-5">
          {/* Barra de Seleção de Mês e Ano */}
          <div className="p-4 sm:p-5 rounded-3xl bg-[#0D1022] border border-[#8423DA]/25 shadow-xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#00DFFF]/10 border border-[#00DFFF]/30 flex items-center justify-center text-[#00DFFF]">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading text-base font-black text-white">
                  Fechamento do Mês: {monthNames[selectedMonth - 1]} de {selectedYear}
                </h3>
                <p className="text-xs text-[#A5A5B8]">
                  Consolidação completa de vendas, compras, desembolsos e resultado operacional estimado
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                className="px-3 py-2 rounded-xl bg-[#141838] border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-[#00DFFF]"
              >
                {monthNames.map((m, idx) => (
                  <option key={m} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="px-3 py-2 rounded-xl bg-[#141838] border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-[#00DFFF]"
              >
                {[2024, 2025, 2026, 2027, 2028].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cards de Resumo Executivo do Mês */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[#0D1022] border border-[#00DFFF]/30 space-y-1.5">
              <span className="text-xs text-gray-400 font-semibold">Total Vendido no Mês</span>
              <div className="font-heading text-2xl font-black text-white">
                {formatBRL(monthMetrics.totalNetSales)}
              </div>
              <div className="text-[11px] text-gray-500">
                {monthMetrics.validSalesCount} vendas registradas
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0D1022] border border-[#10B981]/30 space-y-1.5">
              <span className="text-xs text-gray-400 font-semibold">Recebido Efetivamente</span>
              <div className="font-heading text-2xl font-black text-[#10B981]">
                {formatBRL(monthMetrics.effectiveReceiptsTotal)}
              </div>
              <div className="text-[11px] text-gray-500">Dinheiro real que entrou</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0D1022] border border-rose-500/30 space-y-1.5">
              <span className="text-xs text-gray-400 font-semibold">Total de Saídas de Caixa</span>
              <div className="font-heading text-2xl font-black text-rose-400">
                {formatBRL(monthMetrics.cashPeriodOutflows)}
              </div>
              <div className="text-[11px] text-gray-500">Despesas + Fornecedores pagos</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0D1022] border border-[#8423DA]/30 space-y-1.5">
              <span className="text-xs text-gray-400 font-semibold">Saldo Final de Fechamento</span>
              <div className="font-heading text-2xl font-black text-[#00DFFF]">
                {formatBRL(monthMetrics.cashClosingBalance)}
              </div>
              <div className="text-[11px] text-gray-500">
                Abertura: {formatBRL(monthMetrics.cashOpeningBalance)}
              </div>
            </div>
          </div>

          {/* Tabela do Fechamento Mensal */}
          <div className="rounded-3xl bg-[#0D1022] border border-[#8423DA]/25 shadow-xl overflow-hidden">
            <div className="p-4 bg-[#141838]/80 border-b border-[#8423DA]/20 flex items-center justify-between">
              <h4 className="font-heading text-sm font-black text-white">
                Quadro Demonstrativo Gerencial: {monthNames[selectedMonth - 1]} / {selectedYear}
              </h4>
              <span className="text-xs text-gray-400">
                Comparativo com {selectedMonth === 1 ? 'Dezembro' : monthNames[selectedMonth - 2]}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs tabular-nums">
                <thead>
                  <tr className="bg-[#121633] text-[#C4C6D8] font-extrabold text-[10px] uppercase tracking-wider border-b border-[#8423DA]/25 select-none">
                    <th className="py-3.5 px-4">Indicador Gerencial</th>
                    <th className="py-3.5 px-4 text-right">Mês Selecionado</th>
                    <th className="py-3.5 px-4 text-right">Mês Anterior</th>
                    <th className="py-3.5 px-4 text-right">Variação (R$)</th>
                    <th className="py-3.5 px-4 text-center">Regime</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#8423DA]/15 text-gray-200">
                  {/* Vendas */}
                  <tr className="hover:bg-[#141838]/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white">Faturamento Líquido de Vendas</td>
                    <td className="py-3.5 px-4 text-right font-black text-white">{formatBRL(monthMetrics.totalNetSales)}</td>
                    <td className="py-3.5 px-4 text-right text-[#C4C6D8]">{formatBRL(prevMonthMetrics.totalNetSales)}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-cyan-300">
                      {formatBRL(monthMetrics.totalNetSales - prevMonthMetrics.totalNetSales)}
                    </td>
                    <td className="py-3.5 px-4 text-center text-[10px] font-bold text-cyan-400">Competência</td>
                  </tr>

                  {/* CMV */}
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-3 px-4 text-purple-300">(-) CMV Histórico Conhecido</td>
                    <td className="py-3 px-4 text-right font-bold text-purple-300">{formatBRL(monthMetrics.knownCostOfGoodsSold)}</td>
                    <td className="py-3 px-4 text-right text-gray-400">{formatBRL(prevMonthMetrics.knownCostOfGoodsSold)}</td>
                    <td className="py-3 px-4 text-right text-gray-400">
                      {formatBRL(monthMetrics.knownCostOfGoodsSold - prevMonthMetrics.knownCostOfGoodsSold)}
                    </td>
                    <td className="py-3 px-4 text-center text-[10px] text-purple-400">Competência</td>
                  </tr>

                  {/* Lucro Bruto */}
                  <tr className="hover:bg-white/[0.02] bg-white/[0.01]">
                    <td className="py-3 px-4 font-bold text-emerald-400">(=) Lucro Bruto Estimado</td>
                    <td className="py-3 px-4 text-right font-black text-emerald-400">{formatBRL(monthMetrics.estimatedGrossProfit)}</td>
                    <td className="py-3 px-4 text-right text-gray-400">{formatBRL(prevMonthMetrics.estimatedGrossProfit)}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-400">
                      {formatBRL(monthMetrics.estimatedGrossProfit - prevMonthMetrics.estimatedGrossProfit)}
                    </td>
                    <td className="py-3 px-4 text-center text-[10px] text-emerald-400">Margem</td>
                  </tr>

                  {/* Despesas Contratadas */}
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-3 px-4 text-rose-300">(-) Despesas Operacionais Contratadas</td>
                    <td className="py-3 px-4 text-right font-bold text-rose-300">{formatBRL(monthMetrics.operationalExpensesTotalContracted)}</td>
                    <td className="py-3 px-4 text-right text-gray-400">{formatBRL(prevMonthMetrics.operationalExpensesTotalContracted)}</td>
                    <td className="py-3 px-4 text-right text-gray-400">
                      {formatBRL(monthMetrics.operationalExpensesTotalContracted - prevMonthMetrics.operationalExpensesTotalContracted)}
                    </td>
                    <td className="py-3 px-4 text-center text-[10px] text-rose-400">Competência</td>
                  </tr>

                  {/* Resultado Operacional */}
                  <tr className="hover:bg-white/[0.02] bg-[#141838]/40 border-t border-b border-white/10">
                    <td className="py-3.5 px-4 font-black text-white text-sm">Resultado Operacional Estimado</td>
                    <td className="py-3.5 px-4 text-right font-black text-sm text-[#00DFFF]">{formatBRL(monthMetrics.estimatedOperatingResult)}</td>
                    <td className="py-3.5 px-4 text-right text-gray-400">{formatBRL(prevMonthMetrics.estimatedOperatingResult)}</td>
                    <td className="py-3.5 px-4 text-right font-black text-white">
                      {formatBRL(monthMetrics.estimatedOperatingResult - prevMonthMetrics.estimatedOperatingResult)}
                    </td>
                    <td className="py-3.5 px-4 text-center text-[10px] font-bold text-[#00DFFF]">Resultado</td>
                  </tr>

                  {/* Caixa: Entradas */}
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-3 px-4 text-emerald-300">(+) Recebimentos Efetivos de Caixa</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-300">{formatBRL(monthMetrics.effectiveReceiptsTotal)}</td>
                    <td className="py-3 px-4 text-right text-gray-400">{formatBRL(prevMonthMetrics.effectiveReceiptsTotal)}</td>
                    <td className="py-3 px-4 text-right text-emerald-300">
                      {formatBRL(monthMetrics.effectiveReceiptsTotal - prevMonthMetrics.effectiveReceiptsTotal)}
                    </td>
                    <td className="py-3 px-4 text-center text-[10px] text-emerald-400">Caixa Real</td>
                  </tr>

                  {/* Caixa: Despesas Pagas */}
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-3 px-4 text-rose-400">(-) Despesas Operacionais Pagas</td>
                    <td className="py-3 px-4 text-right font-bold text-rose-400">{formatBRL(monthMetrics.operationalExpensesPaidTotal)}</td>
                    <td className="py-3 px-4 text-right text-gray-400">{formatBRL(prevMonthMetrics.operationalExpensesPaidTotal)}</td>
                    <td className="py-3 px-4 text-right text-gray-400">
                      {formatBRL(monthMetrics.operationalExpensesPaidTotal - prevMonthMetrics.operationalExpensesPaidTotal)}
                    </td>
                    <td className="py-3 px-4 text-center text-[10px] text-rose-400">Caixa Real</td>
                  </tr>

                  {/* Caixa: Fornecedores Pagos */}
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-3 px-4 text-purple-300">(-) Desembolsos a Fornecedores (Estoque)</td>
                    <td className="py-3 px-4 text-right font-bold text-purple-300">{formatBRL(monthMetrics.purchasesPaidToSuppliers)}</td>
                    <td className="py-3 px-4 text-right text-gray-400">{formatBRL(prevMonthMetrics.purchasesPaidToSuppliers)}</td>
                    <td className="py-3 px-4 text-right text-gray-400">
                      {formatBRL(monthMetrics.purchasesPaidToSuppliers - prevMonthMetrics.purchasesPaidToSuppliers)}
                    </td>
                    <td className="py-3 px-4 text-center text-[10px] text-purple-400">Caixa Real</td>
                  </tr>

                  {/* Caixa: Saldo Final */}
                  <tr className="hover:bg-white/[0.02] bg-[#141838]/40">
                    <td className="py-3.5 px-4 font-black text-white text-sm">Saldo Final de Fechamento do Caixa</td>
                    <td className="py-3.5 px-4 text-right font-black text-sm text-[#10B981]">{formatBRL(monthMetrics.cashClosingBalance)}</td>
                    <td className="py-3.5 px-4 text-right text-gray-400">{formatBRL(prevMonthMetrics.cashClosingBalance)}</td>
                    <td className="py-3.5 px-4 text-right font-black text-[#10B981]">
                      {formatBRL(monthMetrics.cashClosingBalance - prevMonthMetrics.cashClosingBalance)}
                    </td>
                    <td className="py-3.5 px-4 text-center text-[10px] font-bold text-[#10B981]">Disponível</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* B) OUTROS RELATÓRIOS (VENDAS, DESPESAS, COMPRAS, FLUXO, PENDENTES, RESULTADOS) */}
      {activeCategory !== 'fechamento_mensal' && (
        <div className="space-y-4">
          {/* Barra de Filtros de Período e Busca do Relatório */}
          <div className="p-4 rounded-2xl bg-[#0D1022] border border-[#8423DA]/20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Presets */}
            <div>
              <select
                value={periodPreset}
                onChange={(e) => setPeriodPreset(e.target.value as PeriodPreset)}
                className="w-full px-3 py-2 rounded-xl bg-[#080811] border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-[#00DFFF]"
              >
                <option value="hoje">Hoje</option>
                <option value="ontem">Ontem</option>
                <option value="ultimos_7_dias">Últimos 7 dias</option>
                <option value="ultimos_30_dias">Últimos 30 dias</option>
                <option value="este_mes">Este Mês</option>
                <option value="mes_anterior">Mês Anterior</option>
                <option value="este_ano">Este Ano</option>
                <option value="todo_historico">Todo o Histórico</option>
                <option value="personalizado">Personalizado</option>
              </select>
            </div>

            {/* Campo de Busca */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrar dados da consulta..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#080811] border border-white/10 text-white text-xs placeholder:text-gray-500 focus:outline-none focus:border-[#00DFFF]"
              />
            </div>

            {/* Início */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-gray-400 shrink-0">De:</span>
              <input
                type="date"
                value={activeRange.startDate}
                onChange={(e) => {
                  setCustomStartDate(e.target.value);
                  setPeriodPreset('personalizado');
                }}
                className="w-full px-2.5 py-1.5 rounded-xl bg-[#080811] border border-white/10 text-white text-xs focus:outline-none focus:border-[#00DFFF]"
              />
            </div>

            {/* Fim */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-gray-400 shrink-0">Até:</span>
              <input
                type="date"
                value={activeRange.endDate}
                onChange={(e) => {
                  setCustomEndDate(e.target.value);
                  setPeriodPreset('personalizado');
                }}
                className="w-full px-2.5 py-1.5 rounded-xl bg-[#080811] border border-white/10 text-white text-xs focus:outline-none focus:border-[#00DFFF]"
              />
            </div>
          </div>

          {/* TABELA DO RELATÓRIO DE VENDAS */}
          {activeCategory === 'vendas' && (
            <div className="rounded-3xl bg-[#0D1022] border border-[#8423DA]/25 shadow-xl overflow-hidden">
              <div className="p-4 bg-[#141838]/80 border-b border-[#8423DA]/20 flex items-center justify-between text-xs">
                <span className="font-bold text-white">
                  {filteredSales.length} {filteredSales.length === 1 ? 'venda encontrada' : 'vendas encontradas'}
                </span>
                <span className="text-gray-400">
                  Total Líquido: <strong className="text-white">{formatBRL(activeMetrics.totalNetSales)}</strong> | Recebido:{' '}
                  <strong className="text-emerald-400">{formatBRL(activeMetrics.effectiveReceiptsTotal)}</strong>
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs tabular-nums">
                  <thead>
                    <tr className="bg-[#121633] text-[#C4C6D8] font-extrabold text-[10px] uppercase tracking-wider border-b border-[#8423DA]/25 select-none">
                      <th className="py-3.5 px-4">Código / Data</th>
                      <th className="py-3.5 px-4">Cliente</th>
                      <th className="py-3.5 px-4">Itens</th>
                      <th className="py-3.5 px-4 text-right">Líquido</th>
                      <th className="py-3.5 px-4 text-right">Recebido</th>
                      <th className="py-3.5 px-4 text-right">Pendente</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#8423DA]/15 text-gray-200">
                    {filteredSales.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((s) => (
                      <tr key={s.id} className="hover:bg-[#141838]/50 transition-colors">
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-mono text-cyan-400 font-bold">#{s.id.slice(0, 6)}</span>
                          <div className="text-[10px] text-[#A5A5B8]">{formatDateBR(s.saleDate)}</div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-white">{s.customerName || 'Cliente Balcão'}</td>
                        <td className="py-3.5 px-4 text-gray-200 max-w-xs truncate">
                          {s.items?.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-white whitespace-nowrap">{formatBRL(s.netTotal || s.grossTotal)}</td>
                        <td className="py-3.5 px-4 text-right text-emerald-400 font-bold whitespace-nowrap">{formatBRL(s.amountReceived || 0)}</td>
                        <td className="py-3.5 px-4 text-right text-rose-400 font-bold whitespace-nowrap">{formatBRL(s.amountPending || 0)}</td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              s.paymentStatus === 'pago'
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : s.paymentStatus === 'parcial'
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {s.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TABELA DO RELATÓRIO DE DESPESAS */}
          {activeCategory === 'despesas' && (
            <div className="rounded-3xl bg-[#0D1022] border border-[#8423DA]/25 shadow-xl overflow-hidden">
              <div className="p-4 bg-[#141838]/80 border-b border-[#8423DA]/20 flex items-center justify-between text-xs">
                <span className="font-bold text-white">
                  {filteredExpenses.length} {filteredExpenses.length === 1 ? 'despesa encontrada' : 'despesas encontradas'}
                </span>
                <span className="text-gray-300 tabular-nums">
                  Total Contratado: <strong className="text-white">{formatBRL(activeMetrics.operationalExpensesTotalContracted)}</strong> | Pago:{' '}
                  <strong className="text-rose-400">{formatBRL(activeMetrics.operationalExpensesPaidTotal)}</strong>
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs tabular-nums">
                  <thead>
                    <tr className="bg-[#121633] text-[#C4C6D8] font-extrabold text-[10px] uppercase tracking-wider border-b border-[#8423DA]/25 select-none">
                      <th className="py-3.5 px-4">Código / Data</th>
                      <th className="py-3.5 px-4">Descrição</th>
                      <th className="py-3.5 px-4">Categoria</th>
                      <th className="py-3.5 px-4 text-right">Valor</th>
                      <th className="py-3.5 px-4 text-right">Valor Pago</th>
                      <th className="py-3.5 px-4 text-right">Pendente</th>
                      <th className="py-3.5 px-4 text-center">Vencimento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#8423DA]/15 text-gray-200">
                    {filteredExpenses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((e) => (
                      <tr key={e.id} className="hover:bg-[#141838]/50 transition-colors">
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-mono text-rose-400 font-bold">#{e.id.slice(0, 6)}</span>
                          <div className="text-[10px] text-[#A5A5B8]">{formatDateBR(e.expenseDate)}</div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-white">{e.description}</td>
                        <td className="py-3.5 px-4 text-[#C4C6D8]">{e.category}</td>
                        <td className="py-3.5 px-4 text-right font-bold text-white whitespace-nowrap">{formatBRL(e.amount)}</td>
                        <td className="py-3.5 px-4 text-right text-emerald-400 font-bold whitespace-nowrap">{formatBRL(e.amountPaid || 0)}</td>
                        <td className="py-3.5 px-4 text-right text-rose-400 font-bold whitespace-nowrap">{formatBRL(e.amountPending || 0)}</td>
                        <td className="py-3.5 px-4 text-center text-[#C4C6D8] whitespace-nowrap">
                          {e.dueDate ? formatDateBR(e.dueDate) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TABELA DO RELATÓRIO DE COMPRAS */}
          {activeCategory === 'compras' && (
            <div className="rounded-3xl bg-[#0D1022] border border-[#8423DA]/25 shadow-xl overflow-hidden">
              <div className="p-4 bg-[#141838]/80 border-b border-[#8423DA]/20 flex items-center justify-between text-xs">
                <span className="font-bold text-white">
                  {filteredPurchases.length} {filteredPurchases.length === 1 ? 'compra encontrada' : 'compras encontradas'}
                </span>
                <span className="text-gray-300 tabular-nums">
                  Total Adquirido: <strong className="text-white">{formatBRL(activeMetrics.purchasesTotalCost)}</strong> | Pago aos Fornecedores:{' '}
                  <strong className="text-purple-300">{formatBRL(activeMetrics.purchasesPaidToSuppliers)}</strong>
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs tabular-nums">
                  <thead>
                    <tr className="bg-[#121633] text-[#C4C6D8] font-extrabold text-[10px] uppercase tracking-wider border-b border-[#8423DA]/25 select-none">
                      <th className="py-3.5 px-4">Código / Data</th>
                      <th className="py-3.5 px-4">Fornecedor</th>
                      <th className="py-3.5 px-4">Itens</th>
                      <th className="py-3.5 px-4 text-right">Custo Total</th>
                      <th className="py-3.5 px-4 text-right">Pago</th>
                      <th className="py-3.5 px-4 text-right">Pendente</th>
                      <th className="py-3.5 px-4 text-center">Recebimento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#8423DA]/15 text-gray-200">
                    {filteredPurchases.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((p) => (
                      <tr key={p.id} className="hover:bg-[#141838]/50 transition-colors">
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-mono text-purple-400 font-bold">#{p.id.slice(0, 6)}</span>
                          <div className="text-[10px] text-[#A5A5B8]">{formatDateBR(p.purchaseDate)}</div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-white">{p.supplierName}</td>
                        <td className="py-3.5 px-4 text-gray-200 max-w-xs truncate">
                          {p.items?.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-white whitespace-nowrap">{formatBRL(p.totalCost)}</td>
                        <td className="py-3.5 px-4 text-right text-emerald-400 font-bold whitespace-nowrap">{formatBRL(p.amountPaid || 0)}</td>
                        <td className="py-3.5 px-4 text-right text-rose-400 font-bold whitespace-nowrap">{formatBRL(p.amountPending || 0)}</td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-500/15 border border-purple-500/30 text-purple-300">
                            {p.receivingStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TABELA DO RELATÓRIO DE FLUXO DE CAIXA */}
          {activeCategory === 'fluxo_caixa' && (
            <div className="rounded-3xl bg-[#0D1022] border border-[#8423DA]/25 shadow-xl overflow-hidden">
              <div className="p-4 bg-[#141838]/80 border-b border-[#8423DA]/20 flex items-center justify-between text-xs tabular-nums">
                <span className="font-bold text-white">
                  Saldo de Abertura: <strong className="text-white">{formatBRL(activeMetrics.cashOpeningBalance)}</strong>
                </span>
                <span className="text-gray-300">
                  Entradas: <strong className="text-emerald-400">+{formatBRL(activeMetrics.cashPeriodInflows)}</strong> | Saídas:{' '}
                  <strong className="text-rose-400">-{formatBRL(activeMetrics.cashPeriodOutflows)}</strong> | Saldo Final:{' '}
                  <strong className="text-[#00DFFF]">{formatBRL(activeMetrics.cashClosingBalance)}</strong>
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs tabular-nums">
                  <thead>
                    <tr className="bg-[#121633] text-[#C4C6D8] font-extrabold text-[10px] uppercase tracking-wider border-b border-[#8423DA]/25 select-none">
                      <th className="py-3.5 px-4">Data Efetiva</th>
                      <th className="py-3.5 px-4">Tipo</th>
                      <th className="py-3.5 px-4">Origem</th>
                      <th className="py-3.5 px-4">Descrição</th>
                      <th className="py-3.5 px-4 text-right">Valor Movimentado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#8423DA]/15 text-gray-200">
                    {filteredCashFlowEvents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((m) => (
                      <tr key={m.id} className="hover:bg-[#141838]/50 transition-colors">
                        <td className="py-3.5 px-4 text-gray-200 font-mono whitespace-nowrap">{formatDateBR(m.date)}</td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              m.type === 'entrada'
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                                : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                            }`}
                          >
                            {m.type === 'entrada' ? 'Entrada (+)' : 'Saída (-)'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-[#C4C6D8]">{m.origin}</td>
                        <td className="py-3.5 px-4 font-semibold text-white">{m.description}</td>
                        <td
                          className={`py-3.5 px-4 text-right font-black whitespace-nowrap ${
                            m.type === 'entrada' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {m.type === 'entrada' ? '+' : '-'}
                          {formatBRL(m.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TABELA DO RELATÓRIO DE CONTAS PENDENTES */}
          {activeCategory === 'pendentes' && (
            <div className="rounded-3xl bg-[#0D1022] border border-[#8423DA]/25 shadow-xl overflow-hidden">
              <div className="p-4 bg-[#141838]/80 border-b border-[#8423DA]/20 flex items-center justify-between text-xs tabular-nums">
                <span className="font-bold text-white">
                  Posição Global: <strong className="text-emerald-400">+{formatBRL(activeMetrics.globalReceivablesTotal)}</strong> a receber vs{' '}
                  <strong className="text-rose-400">-{formatBRL(activeMetrics.globalPayablesTotal)}</strong> a pagar
                </span>
                <span className="text-amber-400 font-bold">
                  {activeMetrics.globalOverdueCount} conta(s) em atraso ({formatBRL(activeMetrics.globalOverdueTotal)})
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs tabular-nums">
                  <thead>
                    <tr className="bg-[#121633] text-[#C4C6D8] font-extrabold text-[10px] uppercase tracking-wider border-b border-[#8423DA]/25 select-none">
                      <th className="py-3.5 px-4">Tipo</th>
                      <th className="py-3.5 px-4">Descrição</th>
                      <th className="py-3.5 px-4">Cliente / Fornecedor</th>
                      <th className="py-3.5 px-4">Vencimento</th>
                      <th className="py-3.5 px-4 text-right">Total</th>
                      <th className="py-3.5 px-4 text-right">Saldo Pendente</th>
                      <th className="py-3.5 px-4 text-center">Situação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#8423DA]/15 text-gray-200">
                    {filteredPendingAccounts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((p) => (
                      <tr key={p.id} className="hover:bg-[#141838]/50 transition-colors">
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              p.type === 'a_receber'
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                                : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                            }`}
                          >
                            {p.type === 'a_receber' ? 'A Receber' : 'A Pagar'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-white">{p.description}</td>
                        <td className="py-3.5 px-4 text-gray-200">{p.counterparty}</td>
                        <td className="py-3.5 px-4 text-[#C4C6D8] font-mono whitespace-nowrap">
                          {p.dueDate ? formatDateBR(p.dueDate) : 'Sem data'}
                        </td>
                        <td className="py-3.5 px-4 text-right text-gray-200 whitespace-nowrap">{formatBRL(p.totalAmount)}</td>
                        <td
                          className={`py-3.5 px-4 text-right font-black whitespace-nowrap ${
                            p.type === 'a_receber' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {formatBRL(p.amountPending)}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {p.diasAtraso > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 border border-rose-500/30 text-rose-300">
                              Atraso {p.diasAtraso}d
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 border border-blue-500/30 text-blue-300">
                              Em dia
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TABELA DO DEMONSTRATIVO DRE */}
          {activeCategory === 'resultados' && (
            <div className="rounded-3xl bg-[#0D1022] border border-[#8423DA]/25 shadow-xl overflow-hidden">
              <div className="p-4 bg-[#141838]/80 border-b border-[#8423DA]/20 flex items-center justify-between text-xs">
                <span className="font-bold text-white">Demonstrativo de Resultados Operacionais Estimados</span>
                <span className="text-[#00DFFF] font-bold">
                  Margem Bruta Estimada: {activeMetrics.estimatedGrossMarginPercent}%
                </span>
              </div>

              <div className="p-5 space-y-3">
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-2 border-b border-white/5 text-gray-300">
                    <span>(+) Faturamento Bruto de Vendas:</span>
                    <strong className="text-white">{formatBRL(activeMetrics.totalGrossSales)}</strong>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/5 text-rose-400">
                    <span>(-) Descontos Concedidos aos Clientes:</span>
                    <strong>-{formatBRL(activeMetrics.totalDiscountSales)}</strong>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/5 text-gray-300">
                    <span>(+) Taxas de Entrega Cobradas:</span>
                    <strong className="text-white">+{formatBRL(activeMetrics.totalDeliveryFees)}</strong>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/10 text-white font-bold bg-white/[0.02] px-2 rounded-lg">
                    <span>(=) Receita Líquida de Vendas:</span>
                    <span className="font-black text-cyan-300">{formatBRL(activeMetrics.totalNetSales)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/5 text-purple-300">
                    <span>(-) Custo das Mercadorias Vendidas (CMV Conhecido):</span>
                    <strong>-{formatBRL(activeMetrics.knownCostOfGoodsSold)}</strong>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/10 text-emerald-400 font-bold bg-white/[0.02] px-2 rounded-lg">
                    <span>(=) Lucro Bruto Estimado:</span>
                    <span className="font-black">{formatBRL(activeMetrics.estimatedGrossProfit)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/5 text-rose-400">
                    <span>(-) Despesas Operacionais Registradas:</span>
                    <strong>-{formatBRL(activeMetrics.operationalExpensesTotalContracted)}</strong>
                  </div>
                  <div className="flex justify-between py-3 text-base font-black bg-[#141838] px-3 rounded-xl border border-white/10">
                    <span className="text-white">Resultado Operacional Estimado:</span>
                    <span className={activeMetrics.estimatedOperatingResult >= 0 ? 'text-[#10B981]' : 'text-rose-400'}>
                      {formatBRL(activeMetrics.estimatedOperatingResult)}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 text-[11px] text-gray-400 space-y-1">
                  <div className="font-bold text-gray-300">Critérios Contábeis Adotados:</div>
                  <p>&bull; Cobertura de custos unitários: {activeMetrics.costCoveragePercent}%. Custos não informados foram omitidos do CMV para evitar distorções.</p>
                  <p>&bull; Compras de mercadorias constituem ativo de estoque e não foram subtraídas integralmente como despesa imediata.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
