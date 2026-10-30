import React, { useState } from 'react';
import { useCatalog } from '../../context/CatalogContext';
import { BusinessSection } from '../../types/catalog';
import {
  Briefcase,
  LayoutDashboard,
  ShoppingBag,
  Receipt,
  Package,
  ArrowLeftRight,
  Clock,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  Wallet,
  CheckCircle2,
  DollarSign,
  Calendar,
  Layers,
  ChevronRight,
  ExternalLink,
  Info,
} from 'lucide-react';

import { MySalesSection } from './MySalesSection';
import { MyExpensesSection } from './MyExpensesSection';
import { MyPurchasesSection } from './MyPurchasesSection';
import { MyCashFlowSection } from './MyCashFlowSection';
import { MyPendingAccountsSection } from './MyPendingAccountsSection';
import { BusinessOverviewDashboard } from './BusinessOverviewDashboard';
import { BusinessReportsSection } from './BusinessReportsSection';

export const MyBusinessModule: React.FC = () => {
  const {
    manualSales,
    manualExpenses,
    merchandisePurchases,
    manualCommitments,
    cashMovements,
    isLoadingBusinessData,
    fetchBusinessData,
    supabaseStatus,
  } = useCatalog();

  const [activeSection, setActiveSection] = useState<BusinessSection>('visao_geral');

  // Real calculated totals from actual entries (NO mock or fictitious data)
  // Regra obrigatória: Vendas canceladas são excluídas de faturamento e recebimento válido
  const validSales = manualSales.filter((s) => s.orderStatus !== 'cancelado');
  const totalSalesCount = validSales.length;
  const totalGrossSales = validSales.reduce((acc, s) => acc + (s.grossTotal || s.netTotal || 0), 0);
  const totalReceivedSales = validSales.reduce((acc, s) => acc + (s.amountReceived || 0), 0);
  const totalPendingSales = validSales.reduce((acc, s) => acc + (s.amountPending || 0), 0);

  const totalExpensesCount = manualExpenses.length;
  const totalPaidExpenses = manualExpenses.reduce((acc, e) => acc + (e.amountPaid || 0), 0);
  const totalPendingExpenses = manualExpenses.reduce((acc, e) => acc + (e.amountPending || 0), 0);

  const totalPurchasesCount = merchandisePurchases.length;
  const totalMerchandiseCost = merchandisePurchases.reduce((acc, p) => acc + (p.totalCost || 0), 0);
  const totalPurchasesPending = merchandisePurchases.reduce((acc, p) => acc + (p.amountPending || 0), 0);

  const totalCommitmentsReceivablePending = (manualCommitments || [])
    .filter((c) => c.type === 'a_receber' && c.paymentStatus !== 'cancelado')
    .reduce((acc, c) => acc + (c.amountPending || 0), 0);
  const totalCommitmentsPayablePending = (manualCommitments || [])
    .filter((c) => c.type === 'a_pagar' && c.paymentStatus !== 'cancelado')
    .reduce((acc, c) => acc + (c.amountPending || 0), 0);

  const totalAllPendingReceivable = totalPendingSales + totalCommitmentsReceivablePending;
  const totalAllPendingPayable = totalPendingExpenses + totalPurchasesPending + totalCommitmentsPayablePending;

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const sectionsList: { id: BusinessSection; label: string; icon: React.ReactNode; badgeCount?: number }[] = [
    {
      id: 'visao_geral',
      label: 'Visão Geral',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'vendas',
      label: 'Minhas Vendas',
      icon: <ShoppingBag className="w-4 h-4" />,
      badgeCount: totalSalesCount > 0 ? totalSalesCount : undefined,
    },
    {
      id: 'gastos',
      label: 'Meus Gastos',
      icon: <Receipt className="w-4 h-4" />,
      badgeCount: totalExpensesCount > 0 ? totalExpensesCount : undefined,
    },
    {
      id: 'compras',
      label: 'Compras de Mercadorias',
      icon: <Package className="w-4 h-4" />,
      badgeCount: totalPurchasesCount > 0 ? totalPurchasesCount : undefined,
    },
    {
      id: 'fluxo_caixa',
      label: 'Fluxo de Caixa',
      icon: <ArrowLeftRight className="w-4 h-4" />,
    },
    {
      id: 'pendentes',
      label: 'Contas Pendentes',
      icon: <Clock className="w-4 h-4" />,
      badgeCount: (totalAllPendingReceivable > 0 || totalAllPendingPayable > 0) ? '!' as any : undefined,
    },
    {
      id: 'relatorios',
      label: 'Relatórios',
      icon: <FileSpreadsheet className="w-4 h-4" />,
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* HEADER DO MÓDULO */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[#0D1022] border border-[#8423DA]/25 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00DFFF] via-[#8423DA] to-[#E53CF3] p-0.5 flex items-center justify-center shadow-[0_0_20px_rgba(0,223,255,0.3)] shrink-0">
            <div className="w-full h-full bg-[#080811] rounded-[14px] flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-[#00DFFF]" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-xl sm:text-2xl font-black text-white tracking-tight">
                Meu Negócio
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-[#00DFFF]/10 border border-[#00DFFF]/30 text-[10px] font-extrabold uppercase tracking-wider text-[#00DFFF]">
                Controle Manual
              </span>
            </div>
            <p className="text-xs text-[#A5A5B8] mt-0.5">
              Gestão comercial, entradas, saídas, mercadorias e livro caixa integrado ao Supabase
            </p>
          </div>
        </div>

        {/* Status de Sincronização & Botão de Atualizar */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141838] border border-[#8423DA]/20 text-[11px] text-gray-300">
            <span
              className={`w-2 h-2 rounded-full ${
                supabaseStatus === 'connected' ? 'bg-[#10B981] shadow-[0_0_6px_#10B981]' : 'bg-[#FACC15]'
              }`}
            />
            <span>{supabaseStatus === 'connected' ? 'Supabase Sincronizado' : 'Aguardando Banco'}</span>
          </div>

          <button
            onClick={() => fetchBusinessData()}
            disabled={isLoadingBusinessData}
            className="p-2 rounded-xl bg-[#141838] hover:bg-[#8423DA]/40 text-gray-300 hover:text-white border border-[#8423DA]/20 transition-all cursor-pointer disabled:opacity-50"
            title="Recarregar dados do banco"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingBusinessData ? 'animate-spin text-[#00DFFF]' : ''}`} />
          </button>
        </div>
      </div>

      {/* SUB-NAVEGAÇÃO: 7 SEÇÕES (RESPONSIVA & HORIZONTAL COM SCROLL) */}
      <div className="overflow-x-auto no-scrollbar pb-1">
        <div className="flex items-center gap-2 min-w-max p-1.5 rounded-2xl bg-[#0D1022] border border-[#8423DA]/20">
          {sectionsList.map((sec) => {
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
                  isActive
                    ? 'bg-gradient-to-r from-[#00DFFF] to-[#007BFF] text-black shadow-md shadow-[#00DFFF]/20 font-black'
                    : 'text-gray-300 hover:text-white hover:bg-[#141838]'
                }`}
              >
                {sec.icon}
                <span>{sec.label}</span>
                {sec.badgeCount !== undefined && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      isActive ? 'bg-black text-[#00DFFF]' : 'bg-[#8423DA] text-white'
                    }`}
                  >
                    {sec.badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* CONTEÚDO DA SEÇÃO ATIVA */}
      <div className="min-h-[380px]">
        {/* ========================================================================= */}
        {/* 1. VISÃO GERAL */}
        {/* ========================================================================= */}
        {activeSection === 'visao_geral' && (
          <BusinessOverviewDashboard onNavigateSection={(sec) => setActiveSection(sec)} />
        )}

        {/* ========================================================================= */}
        {/* 2. MINHAS VENDAS */}
        {/* ========================================================================= */}
        {activeSection === 'vendas' && <MySalesSection />}

        {/* ========================================================================= */}
        {/* 3. MEUS GASTOS */}
        {/* ========================================================================= */}
        {activeSection === 'gastos' && <MyExpensesSection />}

        {/* ========================================================================= */}
        {/* 4. COMPRAS DE MERCADORIAS */}
        {/* ========================================================================= */}
        {activeSection === 'compras' && <MyPurchasesSection />}

        {/* ========================================================================= */}
        {/* 5. FLUXO DE CAIXA */}
        {/* ========================================================================= */}
        {activeSection === 'fluxo_caixa' && <MyCashFlowSection />}

        {/* ========================================================================= */}
        {/* 6. CONTAS PENDENTES */}
        {/* ========================================================================= */}
        {activeSection === 'pendentes' && <MyPendingAccountsSection />}

        {/* ========================================================================= */}
        {/* 7. RELATÓRIOS */}
        {/* ========================================================================= */}
        {activeSection === 'relatorios' && <BusinessReportsSection />}
      </div>
    </div>
  );
};
