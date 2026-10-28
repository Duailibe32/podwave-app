import React, { useState, useMemo } from 'react';
import { useCatalog } from '../../context/CatalogContext';
import { ActivityLogEntry, ActivityActionType } from '../../types/catalog';
import {
  History,
  Search,
  Filter,
  Trash2,
  RefreshCw,
  PlusCircle,
  Edit,
  Trash,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Download,
  Package,
  Layers,
  Sparkles,
  User,
  Clock,
  Database,
  Info
} from 'lucide-react';

export const ActivityLogsSection: React.FC = () => {
  const {
    activityLogs,
    clearActivityLogs,
    refreshActivityLogs,
    variantHistory,
    clearVariantHistory,
  } = useCatalog();

  const [viewMode, setViewMode] = useState<'catalog_logs' | 'variant_stock'>('catalog_logs');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'sucesso' | 'erro' | 'alerta'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshActivityLogs();
      showToast('Logs de atividade sincronizados com o Supabase!');
    } catch {
      showToast('Aviso: Não foi possível atualizar os logs do servidor no momento.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // KPIs
  const totalEvents = activityLogs.length;
  const productsAdded = activityLogs.filter((l) => l.action === 'PRODUTO_ADICIONADO').length;
  const productsEdited = activityLogs.filter((l) => l.action === 'PRODUTO_EDITADO').length;
  const productsRemoved = activityLogs.filter((l) => l.action === 'PRODUTO_REMOVIDO').length;
  const permissionErrors = activityLogs.filter((l) => l.action === 'ERRO_PERMISSAO' || l.status === 'erro').length;

  // Filtered Activity Logs
  const filteredLogs = useMemo(() => {
    return activityLogs.filter((log) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = log.entityName.toLowerCase().includes(q);
        const matchDetails = log.details.toLowerCase().includes(q);
        const matchAuthor = log.author.toLowerCase().includes(q);
        const matchAction = log.actionLabel.toLowerCase().includes(q);
        if (!matchName && !matchDetails && !matchAuthor && !matchAction) return false;
      }

      // Action Filter
      if (selectedActionFilter !== 'all') {
        if (selectedActionFilter === 'produtos') {
          if (!['PRODUTO_ADICIONADO', 'PRODUTO_EDITADO', 'PRODUTO_REMOVIDO'].includes(log.action)) {
            return false;
          }
        } else if (selectedActionFilter === 'sabores') {
          if (!['SABOR_ADICIONADO', 'SABOR_EDITADO', 'SABOR_REMOVIDO'].includes(log.action)) {
            return false;
          }
        } else if (selectedActionFilter === 'erros') {
          if (log.action !== 'ERRO_PERMISSAO' && log.status !== 'erro') {
            return false;
          }
        } else if (log.action !== selectedActionFilter) {
          return false;
        }
      }

      // Status Filter
      if (selectedStatusFilter !== 'all' && log.status !== selectedStatusFilter) {
        return false;
      }

      return true;
    });
  }, [activityLogs, searchQuery, selectedActionFilter, selectedStatusFilter]);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      alert('Nenhum registro para exportar com os filtros atuais.');
      return;
    }

    const headers = ['Data & Horário', 'Ação', 'Entidade', 'Item / Produto', 'Detalhes', 'Responsável', 'Status'];
    const rows = filteredLogs.map((l) => [
      `"${new Date(l.timestamp).toLocaleString('pt-BR')}"`,
      `"${l.actionLabel}"`,
      `"${l.entity}"`,
      `"${l.entityName.replace(/"/g, '""')}"`,
      `"${l.details.replace(/"/g, '""')}"`,
      `"${l.author}"`,
      `"${l.status.toUpperCase()}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `auditoria_podwave_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActionBadge = (action: ActivityActionType, status: string) => {
    if (status === 'erro' || action === 'ERRO_PERMISSAO') {
      return {
        bg: 'bg-rose-500/20 border-rose-500/50 text-rose-300',
        icon: <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />,
      };
    }
    switch (action) {
      case 'PRODUTO_ADICIONADO':
        return {
          bg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
          icon: <PlusCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />,
        };
      case 'PRODUTO_EDITADO':
        return {
          bg: 'bg-[#00DFFF]/15 border-[#00DFFF]/40 text-[#00DFFF]',
          icon: <Edit className="w-3.5 h-3.5 text-[#00DFFF] shrink-0" />,
        };
      case 'PRODUTO_REMOVIDO':
        return {
          bg: 'bg-rose-500/15 border-rose-500/40 text-rose-300',
          icon: <Trash className="w-3.5 h-3.5 text-rose-400 shrink-0" />,
        };
      case 'SABOR_ADICIONADO':
        return {
          bg: 'bg-purple-500/20 border-purple-500/40 text-purple-300',
          icon: <PlusCircle className="w-3.5 h-3.5 text-purple-400 shrink-0" />,
        };
      case 'SABOR_EDITADO':
        return {
          bg: 'bg-blue-500/20 border-blue-500/40 text-blue-300',
          icon: <Edit className="w-3.5 h-3.5 text-blue-400 shrink-0" />,
        };
      case 'SABOR_REMOVIDO':
        return {
          bg: 'bg-orange-500/20 border-orange-500/40 text-orange-300',
          icon: <Trash className="w-3.5 h-3.5 text-orange-400 shrink-0" />,
        };
      default:
        return {
          bg: 'bg-[#8423DA]/20 border-[#8423DA]/40 text-gray-300',
          icon: <Info className="w-3.5 h-3.5 text-gray-400 shrink-0" />,
        };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-[#11152A] border border-[#00DFFF] text-white shadow-[0_0_20px_rgba(0,223,255,0.4)] animate-in slide-in-from-bottom-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-[#00DFFF]" />
          <span className="text-xs font-bold">{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#0D1022] border-2 border-[#8423DA]/30 shadow-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#8423DA] to-[#007BFF] p-0.5 shadow-md shadow-[#8423DA]/30 flex items-center justify-center">
              <History className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-heading text-xl font-black text-white flex items-center gap-2">
                Central de Auditoria & Logs de Atividade
              </h2>
              <p className="text-xs text-[#A5A5B8] mt-0.5">
                Rastreamento completo de adições, edições, exclusões e verificação de permissões do banco de dados.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3.5 py-2 rounded-xl bg-[#141838] hover:bg-[#181D3D] text-xs font-bold text-gray-200 border border-[#8423DA]/40 hover:border-[#00DFFF]/50 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            title="Recarregar logs salvos no Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#00DFFF] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Carregando...' : 'Atualizar Logs'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-[#141838] hover:bg-[#181D3D] text-xs font-bold text-gray-200 border border-[#8423DA]/40 hover:border-[#00DFFF]/50 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
            title="Exportar registros filtrados em planilha CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#00DFFF]" />
            <span>Exportar CSV</span>
          </button>

          {activityLogs.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (confirm('Deseja limpar os registros de log de atividade armazenados localmente? (Os registros no Supabase permanecerão intactos).')) {
                  clearActivityLogs();
                  showToast('Logs locais limpos com sucesso!');
                }
              }}
              className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-xs font-bold text-rose-300 transition-all cursor-pointer flex items-center gap-1.5"
              title="Limpar histórico local"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-[#0D1022] border border-[#8423DA]/25 shadow-md">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total de Eventos</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="font-heading text-2xl font-black text-white">{totalEvents}</span>
            <span className="text-xs text-[#00DFFF] font-semibold">Geral</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0D1022] border border-emerald-500/25 shadow-md">
          <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Produtos Criados</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="font-heading text-2xl font-black text-emerald-300">{productsAdded}</span>
            <span className="text-xs text-emerald-400 font-semibold">+ Inclusões</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0D1022] border border-[#00DFFF]/25 shadow-md">
          <p className="text-[11px] font-bold text-[#00DFFF] uppercase tracking-wider">Produtos Editados</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="font-heading text-2xl font-black text-white">{productsEdited}</span>
            <span className="text-xs text-[#00DFFF] font-semibold">Alterações</span>
          </div>
        </div>

        <div className={`p-4 rounded-2xl bg-[#0D1022] border shadow-md ${permissionErrors > 0 ? 'border-rose-500/50 bg-rose-500/5' : 'border-[#8423DA]/25'}`}>
          <p className={`text-[11px] font-bold uppercase tracking-wider ${permissionErrors > 0 ? 'text-rose-400' : 'text-gray-400'}`}>
            Erros / Permissões
          </p>
          <div className="flex items-baseline justify-between mt-1">
            <span className={`font-heading text-2xl font-black ${permissionErrors > 0 ? 'text-rose-400' : 'text-gray-300'}`}>
              {permissionErrors}
            </span>
            <span className={`text-xs font-semibold ${permissionErrors > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {permissionErrors > 0 ? 'Atenção' : '0 Falhas'}
            </span>
          </div>
        </div>
      </div>

      {/* Sub-tabs: Log de Atividades vs Histórico de Estoque */}
      <div className="flex items-center gap-2 border-b border-[#8423DA]/20 pb-3">
        <button
          type="button"
          onClick={() => setViewMode('catalog_logs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
            viewMode === 'catalog_logs'
              ? 'bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white border-[#00DFFF]/50 shadow-md'
              : 'bg-[#11152A] text-gray-300 border-transparent hover:border-[#8423DA]/40'
          }`}
        >
          <Package className="w-3.5 h-3.5 text-[#00DFFF]" />
          <span>Atividades do Catálogo ({activityLogs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('variant_stock')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
            viewMode === 'variant_stock'
              ? 'bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white border-[#00DFFF]/50 shadow-md'
              : 'bg-[#11152A] text-gray-300 border-transparent hover:border-[#8423DA]/40'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Histórico de Estoque & Sabores ({variantHistory.length})</span>
        </button>
      </div>

      {/* VIEW 1: CATALOG ACTIVITY LOGS */}
      {viewMode === 'catalog_logs' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="p-4 rounded-2xl bg-[#0D1022] border border-[#8423DA]/25 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
            {/* Search Input */}
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Buscar por produto, detalhes, autor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#141838] border border-[#8423DA]/30 focus:border-[#00DFFF] text-white placeholder-gray-500 text-xs focus:outline-none transition-all"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Filter by Action */}
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-[#00DFFF] shrink-0" />
              <select
                value={selectedActionFilter}
                onChange={(e) => setSelectedActionFilter(e.target.value)}
                className="py-2 px-3 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-gray-200 text-xs focus:outline-none focus:border-[#00DFFF] cursor-pointer"
              >
                <option value="all">Todas as Ações</option>
                <option value="produtos">Apenas Produtos (Criar/Editar/Excluir)</option>
                <option value="PRODUTO_ADICIONADO">Adições de Produtos</option>
                <option value="PRODUTO_EDITADO">Edições de Produtos</option>
                <option value="PRODUTO_REMOVIDO">Exclusões de Produtos</option>
                <option value="sabores">Sabores & Variantes</option>
                <option value="erros">Erros de Permissão / Banco</option>
              </select>

              {/* Filter by Status */}
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
                className="py-2 px-3 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-gray-200 text-xs focus:outline-none focus:border-[#00DFFF] cursor-pointer"
              >
                <option value="all">Todos os Status</option>
                <option value="sucesso">Apenas Sucesso</option>
                <option value="alerta">Apenas Alertas (Exclusões)</option>
                <option value="erro">Apenas Erros</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="rounded-3xl bg-[#0D1022] border border-[#8423DA]/25 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#8423DA]/20 text-[#A5A5B8] bg-[#11152A]/80 font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-3.5">Data & Horário</th>
                    <th className="p-3.5">Tipo de Ação</th>
                    <th className="p-3.5">Produto / Item</th>
                    <th className="p-3.5">Detalhes da Alteração</th>
                    <th className="p-3.5">Responsável</th>
                    <th className="p-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#8423DA]/10">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-gray-400">
                        <History className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-gray-300">
                          Nenhum registro de atividade encontrado.
                        </p>
                        <p className="text-[11px] text-gray-500 mt-1">
                          Ao adicionar, editar ou excluir produtos no painel, os eventos serão registrados aqui automaticamente.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      const badge = getActionBadge(log.action, log.status);
                      return (
                        <tr key={log.id} className="hover:bg-[#141838]/60 transition-colors">
                          {/* Timestamp */}
                          <td className="p-3.5 text-gray-300 font-mono text-[11px] whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-gray-500" />
                              <span>
                                {new Date(log.timestamp).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                })}
                              </span>
                              <span className="text-gray-500">às</span>
                              <span className="font-semibold text-gray-200">
                                {new Date(log.timestamp).toLocaleTimeString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          </td>

                          {/* Action Badge */}
                          <td className="p-3.5 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold ${badge.bg}`}>
                              {badge.icon}
                              <span>{log.actionLabel}</span>
                            </span>
                          </td>

                          {/* Entity Name */}
                          <td className="p-3.5 font-bold text-white text-xs max-w-[200px] truncate">
                            <span className="flex items-center gap-1.5">
                              <Package className="w-3.5 h-3.5 text-[#00DFFF] shrink-0" />
                              <span className="truncate">{log.entityName}</span>
                            </span>
                          </td>

                          {/* Details */}
                          <td className="p-3.5 text-gray-300 text-[11px] max-w-[320px]">
                            <p className="leading-relaxed line-clamp-2" title={log.details}>
                              {log.details}
                            </p>
                            {log.errorMessage && (
                              <p className="text-[10px] text-rose-400 font-mono mt-0.5 truncate" title={log.errorMessage}>
                                Causa: {log.errorMessage}
                              </p>
                            )}
                          </td>

                          {/* Author */}
                          <td className="p-3.5 text-gray-300 text-[11px] whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <User className="w-3 h-3 text-gray-400" />
                              <span className="font-semibold text-gray-200">{log.author}</span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="p-3.5 whitespace-nowrap">
                            {log.status === 'sucesso' ? (
                              <span className="inline-flex items-center gap-1 text-emerald-400 text-[10px] font-bold">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                <span>Sucesso</span>
                              </span>
                            ) : log.status === 'alerta' ? (
                              <span className="inline-flex items-center gap-1 text-amber-400 text-[10px] font-bold">
                                <AlertTriangle className="w-3 h-3 text-amber-400" />
                                <span>Aviso / Exclusão</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-rose-400 text-[10px] font-bold">
                                <ShieldAlert className="w-3 h-3 text-rose-400" />
                                <span>Erro RLS / Banco</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: VARIANT STOCK HISTORY (Original Tab) */}
      {viewMode === 'variant_stock' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#0D1022] border border-[#8423DA]/25 flex items-center justify-between text-xs">
            <span className="text-[#A5A5B8]">
              Registros detalhados de estoque individual por sabor e alterações de limite de alerta.
            </span>
            {variantHistory.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Deseja limpar o histórico de alterações de sabor local?')) {
                    clearVariantHistory();
                    showToast('Histórico de variantes limpo!');
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-xs font-bold text-rose-300 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar Histórico de Sabores</span>
              </button>
            )}
          </div>

          <div className="rounded-3xl bg-[#0D1022] border border-[#8423DA]/25 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#8423DA]/20 text-[#A5A5B8] bg-[#11152A]/80 font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-3.5">Data & Horário</th>
                    <th className="p-3.5">Modelo / Produto</th>
                    <th className="p-3.5">Variante / Sabor</th>
                    <th className="p-3.5">Qtd Anterior</th>
                    <th className="p-3.5">Nova Quantidade</th>
                    <th className="p-3.5">Tipo de Ação</th>
                    <th className="p-3.5">Responsável</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#8423DA]/10">
                  {variantHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-gray-400">
                        <History className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-gray-300">
                          Nenhum registro de alteração de variante ainda.
                        </p>
                        <p className="text-[11px] text-gray-500 mt-1">
                          Ao editar a quantidade de um sabor pelo painel, a auditoria registrará o evento automaticamente.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    variantHistory.map((h) => (
                      <tr key={h.id} className="hover:bg-[#141838]/60 transition-colors">
                        <td className="p-3.5 text-gray-300 font-mono text-[11px]">
                          {new Date(h.timestamp).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="p-3.5 font-bold text-white text-xs">{h.modelName}</td>
                        <td className="p-3.5">
                          <span className="flex items-center gap-1.5 font-semibold text-gray-200">
                            <span>{h.flavorEmoji}</span>
                            <span>{h.flavorName}</span>
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-gray-400">
                          {h.previousQuantity === null || h.previousQuantity === undefined ? 'Não informado' : `${h.previousQuantity} un`}
                        </td>
                        <td className="p-3.5 font-mono font-bold text-[#00DFFF]">
                          {h.newQuantity === null || h.newQuantity === undefined ? 'Não informado' : `${h.newQuantity} un`}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-md bg-[#8423DA]/30 border border-[#8423DA]/50 text-[#00DFFF] text-[10px] font-bold">
                            {h.changeType === 'quick_edit' ? 'Edição Rápida' : h.changeType === 'bulk_edit' ? 'Edição em Lote' : 'Ajuste'}
                          </span>
                        </td>
                        <td className="p-3.5 text-gray-300 text-[11px]">{h.updatedBy}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
