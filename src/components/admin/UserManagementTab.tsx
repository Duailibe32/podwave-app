import React, { useState, useEffect } from 'react';
import { useCatalog } from '../../context/CatalogContext';
import { UserProfile, UserRole } from '../../types/catalog';
import {
  Users,
  Crown,
  Sparkles,
  ShieldCheck,
  UserCheck,
  UserX,
  Search,
  Filter,
  Plus,
  Trash2,
  Phone,
  Mail,
  KeyRound,
  Percent,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Lock,
  ExternalLink,
  Sliders,
} from 'lucide-react';

export const UserManagementTab: React.FC = () => {
  const {
    currentUser,
    allUsers,
    isLoadingUsers,
    fetchAllUsers,
    updateUserRole,
    createUserWithRole,
    deleteUser,
    settings,
    updateSettings,
    isSupabaseConfigured,
  } = useCatalog();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'vip' | 'customer'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states for creating a new user / role
  const [newEmail, setNewEmail] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('vip');
  const [newVipDiscount, setNewVipDiscount] = useState<number>(settings.vipDiscountPercent || 10);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // VIP Default settings
  const [defaultVipDiscountInput, setDefaultVipDiscountInput] = useState<number>(
    settings.vipDiscountPercent || 10
  );
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // VIP custom edit modal state
  const [vipEditUser, setVipEditUser] = useState<UserProfile | null>(null);
  const [customDiscountVal, setCustomDiscountVal] = useState<number>(10);

  useEffect(() => {
    fetchAllUsers();
  }, []);

  const showToast = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // Filtered users list
  const filteredUsers = allUsers.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.phoneWhatsapp && u.phoneWhatsapp.includes(q));

    if (!matchesSearch) return false;

    if (roleFilter === 'all') return true;
    if (roleFilter === 'admin') return u.role === 'admin' || u.role === 'owner';
    return u.role === roleFilter;
  });

  // Metrics
  const totalUsers = allUsers.length;
  const totalAdmins = allUsers.filter((u) => u.role === 'admin' || u.role === 'owner').length;
  const totalVips = allUsers.filter((u) => u.role === 'vip').length;
  const totalCustomers = allUsers.filter((u) => u.role === 'customer').length;

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newEmail.includes('@')) {
      showToast('error', 'Por favor informe um e-mail válido.');
      return;
    }
    if (!newFullName.trim()) {
      showToast('error', 'Por favor informe o nome completo.');
      return;
    }
    if (newPassword && newPassword.length < 6) {
      showToast('error', 'A senha precisa ter no mínimo 6 caracteres.');
      return;
    }

    setIsSubmitting(true);
    const res = await createUserWithRole({
      email: newEmail.trim().toLowerCase(),
      fullName: newFullName.trim(),
      phoneWhatsapp: newPhone.trim(),
      role: newRole,
      password: newPassword ? newPassword : undefined,
      vipDiscount: newRole === 'vip' ? Number(newVipDiscount) || 10 : undefined,
    });
    setIsSubmitting(false);

    if (res.success) {
      showToast('success', res.message);
      setIsAddModalOpen(false);
      setNewEmail('');
      setNewFullName('');
      setNewPhone('');
      setNewPassword('');
      setNewRole('vip');
      fetchAllUsers();
    } else {
      showToast('error', res.message);
    }
  };

  const handleRoleChange = async (user: UserProfile, targetRole: UserRole) => {
    if (user.id === currentUser?.id && targetRole === 'customer') {
      if (!confirm('Atenção: alterar seu próprio cargo para Cliente removerá seu acesso a este painel administrativo. Deseja prosseguir?')) {
        return;
      }
    }

    if (targetRole === 'vip') {
      setVipEditUser(user);
      setCustomDiscountVal(user.vipDiscountCustom || settings.vipDiscountPercent || 10);
      return;
    }

    const ok = await updateUserRole(user.id, targetRole);
    if (ok) {
      showToast('success', `Cargo de "${user.fullName}" alterado para ${targetRole.toUpperCase()}!`);
    } else {
      showToast('error', 'Falha ao atualizar cargo no Supabase.');
    }
  };

  const handleConfirmVipDiscount = async () => {
    if (!vipEditUser) return;
    const ok = await updateUserRole(vipEditUser.id, 'vip', Number(customDiscountVal) || 10);
    if (ok) {
      showToast('success', `"${vipEditUser.fullName}" promovido a CLIENTE VIP com ${customDiscountVal}% de desconto!`);
    } else {
      showToast('error', 'Falha ao promover para VIP.');
    }
    setVipEditUser(null);
  };

  const handleDeleteUser = async (user: UserProfile) => {
    if (user.id === currentUser?.id) {
      showToast('error', 'Você não pode excluir sua própria conta enquanto estiver conectado.');
      return;
    }

    if (confirm(`Tem certeza que deseja remover o usuário "${user.fullName}" (${user.email})?`)) {
      const ok = await deleteUser(user.id);
      if (ok) {
        showToast('success', `Usuário "${user.fullName}" removido com sucesso.`);
      } else {
        showToast('error', 'Não foi possível remover o usuário.');
      }
    }
  };

  const handleSaveDefaultVipSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    const val = Number(defaultVipDiscountInput) || 10;
    updateSettings({ vipDiscountPercent: val });
    setIsSavingSettings(false);
    showToast('success', `Desconto padrão para Clientes VIP atualizado para ${val}%!`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Toast */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-sm font-bold shadow-xl animate-in slide-in-from-top-2 duration-200 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
              : 'bg-rose-950/80 border-rose-500/50 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-xs opacity-70 hover:opacity-100 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Hero Banner & Security Summary */}
      <div className="relative rounded-3xl bg-gradient-to-r from-[#141838] via-[#0D1022] to-[#1A1838] border-2 border-[#8423DA]/40 p-6 sm:p-8 shadow-2xl overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-gradient-to-br from-[#8423DA]/20 to-[#00DFFF]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8423DA]/20 border border-[#8423DA]/40 text-[#00DFFF] text-xs font-black tracking-wider uppercase">
              <ShieldCheck className="w-4 h-4 text-[#00DFFF]" />
              <span>Controle de Acesso RLS & Níveis de Permissão</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-heading font-black text-white">
              Gestão de Administradores, VIPs & Clientes
            </h2>
            <p className="text-sm text-[#A5A5B8] leading-relaxed">
              Defina quem pode acessar e modificar o catálogo (role <span className="text-[#00DFFF] font-bold">'admin'</span>), quem possui desconto automático exclusivo em compras (role <span className="text-amber-300 font-bold">'vip'</span>), e consulte todos os clientes da loja.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => fetchAllUsers()}
              disabled={isLoadingUsers}
              className="px-4 py-2.5 rounded-xl bg-[#141838] hover:bg-[#8423DA]/30 border border-[#8423DA]/40 text-xs font-bold text-gray-200 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
              title="Recarregar usuários do Supabase"
            >
              <RefreshCw className={`w-4 h-4 text-[#00DFFF] ${isLoadingUsers ? 'animate-spin' : ''}`} />
              <span>{isLoadingUsers ? 'Atualizando...' : 'Recarregar'}</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8423DA] via-[#007BFF] to-[#00DFFF] hover:brightness-110 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-[#8423DA]/30 cursor-pointer flex items-center gap-2 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Usuário / Cargo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="p-5 rounded-2xl bg-[#0D1022] border border-[#8423DA]/30 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400">Total de Usuários</span>
            <div className="w-9 h-9 rounded-xl bg-[#8423DA]/20 border border-[#8423DA]/40 flex items-center justify-center text-[#8423DA]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-heading font-black text-white">{totalUsers}</span>
            <span className="text-xs text-gray-400 ml-2">registrados</span>
          </div>
        </div>

        {/* Admins */}
        <div className="p-5 rounded-2xl bg-[#0D1022] border border-[#00DFFF]/40 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#00DFFF]">Administradores</span>
            <div className="w-9 h-9 rounded-xl bg-[#00DFFF]/20 border border-[#00DFFF]/50 flex items-center justify-center text-[#00DFFF]">
              <Crown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-heading font-black text-white">{totalAdmins}</span>
            <span className="text-xs text-[#00DFFF]/80 ml-2">com acesso total</span>
          </div>
        </div>

        {/* VIP Clients */}
        <div className="p-5 rounded-2xl bg-[#0D1022] border border-amber-400/40 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300">Clientes VIP</span>
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/50 flex items-center justify-center text-amber-300">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-heading font-black text-white">{totalVips}</span>
            <span className="text-xs text-amber-300/80 ml-2">com desconto</span>
          </div>
        </div>

        {/* Standard Customers */}
        <div className="p-5 rounded-2xl bg-[#0D1022] border border-gray-700 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400">Clientes Normais</span>
            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-300">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-heading font-black text-white">{totalCustomers}</span>
            <span className="text-xs text-gray-400 ml-2">compras padrão</span>
          </div>
        </div>
      </div>

      {/* Global VIP Discount Setting Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#11152A] border border-[#8423DA]/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Percent className="w-4 h-4 text-amber-400" />
            <span>Desconto Padrão para Clientes VIP</span>
          </h4>
          <p className="text-xs text-[#A5A5B8]">
            Todos os clientes com cargo <span className="text-amber-300 font-bold">'vip'</span> receberão automaticamente esta porcentagem de desconto no carrinho e no checkout.
          </p>
        </div>

        <form onSubmit={handleSaveDefaultVipSettings} className="flex items-center gap-2.5">
          <div className="relative w-28">
            <input
              type="number"
              min="1"
              max="90"
              value={defaultVipDiscountInput}
              onChange={(e) => setDefaultVipDiscountInput(Number(e.target.value))}
              className="w-full pl-3 pr-8 py-2 rounded-xl bg-[#0D1022] border border-amber-400/40 text-amber-300 font-black text-sm focus:outline-none focus:border-amber-400 text-center"
            />
            <span className="absolute right-3 top-2 text-xs font-black text-amber-400">%</span>
          </div>
          <button
            type="submit"
            disabled={isSavingSettings}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs transition cursor-pointer shadow-md disabled:opacity-50"
          >
            Salvar %
          </button>
        </form>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[#0D1022] border border-[#8423DA]/30">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome, e-mail ou WhatsApp..."
            className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-xs text-white focus:outline-none focus:border-[#00DFFF] transition"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setRoleFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
              roleFilter === 'all'
                ? 'bg-[#8423DA] text-white'
                : 'bg-[#141838] text-gray-400 hover:text-white'
            }`}
          >
            Todos ({totalUsers})
          </button>
          <button
            onClick={() => setRoleFilter('admin')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 flex items-center gap-1 ${
              roleFilter === 'admin'
                ? 'bg-[#00DFFF] text-black font-black'
                : 'bg-[#141838] text-gray-400 hover:text-[#00DFFF]'
            }`}
          >
            <Crown className="w-3 h-3" />
            <span>Admins ({totalAdmins})</span>
          </button>
          <button
            onClick={() => setRoleFilter('vip')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 flex items-center gap-1 ${
              roleFilter === 'vip'
                ? 'bg-amber-400 text-black font-black'
                : 'bg-[#141838] text-gray-400 hover:text-amber-300'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>VIPs ({totalVips})</span>
          </button>
          <button
            onClick={() => setRoleFilter('customer')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
              roleFilter === 'customer'
                ? 'bg-gray-700 text-white'
                : 'bg-[#141838] text-gray-400 hover:text-white'
            }`}
          >
            Clientes ({totalCustomers})
          </button>
        </div>
      </div>

      {/* Users Table / List */}
      <div className="rounded-3xl bg-[#0D1022] border-2 border-[#8423DA]/30 shadow-2xl overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-16 px-4 space-y-3">
            <Users className="w-12 h-12 mx-auto text-gray-600" />
            <h3 className="font-heading text-base font-bold text-gray-300">
              Nenhum usuário localizado
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {searchQuery
                ? `Nenhum resultado para "${searchQuery}". Tente outro termo.`
                : 'Não há usuários cadastrados nesta categoria ainda.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse tabular-nums">
              <thead>
                <tr className="border-b border-[#8423DA]/25 bg-[#121633] text-[10px] uppercase tracking-wider text-[#C4C6D8] font-extrabold select-none">
                  <th className="py-3.5 px-4 sm:px-6">Usuário</th>
                  <th className="py-3.5 px-4">Cargo Atual</th>
                  <th className="py-3.5 px-4">Benefício / Acesso</th>
                  <th className="py-3.5 px-4">WhatsApp</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Alterar Cargo / Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#8423DA]/15 text-xs">
                {filteredUsers.map((user) => {
                  const isCurrent = user.id === currentUser?.id;
                  const isAdminRole = user.role === 'admin' || user.role === 'owner';
                  const isVipRole = user.role === 'vip';
                  const vipDiscount = user.vipDiscountCustom || settings.vipDiscountPercent || 10;

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-[#141838]/50 transition-colors"
                    >
                      {/* User Info */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center font-heading font-black text-sm shrink-0 border ${
                              isAdminRole
                                ? 'bg-gradient-to-br from-[#8423DA] to-[#007BFF] text-white border-[#00DFFF]/50 shadow-md shadow-[#00DFFF]/20'
                                : isVipRole
                                ? 'bg-gradient-to-br from-amber-500/30 to-amber-600/30 text-amber-300 border-amber-400/50 shadow-md shadow-amber-500/10'
                                : 'bg-white/5 text-gray-300 border-white/10'
                            }`}
                          >
                            {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-sm">
                                {user.fullName || 'Sem nome'}
                              </span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.2 rounded bg-[#00DFFF]/20 text-[#00DFFF] text-[9px] font-black uppercase">
                                  Você
                                </span>
                              )}
                            </div>
                            <span className="text-[#A5A5B8] flex items-center gap-1 mt-0.5 text-xs">
                              <Mail className="w-3 h-3 text-gray-500" />
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-4 px-4">
                        {user.role === 'owner' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-400/20 to-orange-400/20 border border-amber-400/50 text-amber-300 font-black text-[10px] tracking-wide">
                            <Crown className="w-3 h-3 text-amber-400" />
                            PROPRIETÁRIO
                          </span>
                        ) : user.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#00DFFF]/15 border border-[#00DFFF]/50 text-[#00DFFF] font-black text-[10px] tracking-wide">
                            <Crown className="w-3 h-3 text-[#00DFFF]" />
                            ADMINISTRADOR
                          </span>
                        ) : user.role === 'vip' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-400/50 text-amber-300 font-black text-[10px] tracking-wide shadow-sm">
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            CLIENTE VIP
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-800 border border-gray-700 text-gray-300 font-semibold text-[10px]">
                            <UserCheck className="w-3 h-3 text-gray-400" />
                            CLIENTE NORMAL
                          </span>
                        )}
                      </td>

                      {/* Benefits */}
                      <td className="py-4 px-4 text-gray-300">
                        {isAdminRole ? (
                          <span className="text-[#00DFFF] font-semibold text-xs flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Acesso ao Painel & Edição do Catálogo
                          </span>
                        ) : isVipRole ? (
                          <span className="text-amber-300 font-black text-xs flex items-center gap-1">
                            <Percent className="w-3.5 h-3.5" />
                            {vipDiscount}% de Desconto Automático
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">Preços normais do catálogo</span>
                        )}
                      </td>

                      {/* WhatsApp */}
                      <td className="py-4 px-4">
                        {user.phoneWhatsapp ? (
                          <a
                            href={`https://wa.me/${user.phoneWhatsapp.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold hover:underline"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{user.phoneWhatsapp}</span>
                          </a>
                        ) : (
                          <span className="text-gray-500 italic">Não informado</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Role Action Buttons */}
                          {user.role !== 'admin' && user.role !== 'owner' && (
                            <button
                              onClick={() => handleRoleChange(user, 'admin')}
                              className="px-2.5 py-1 rounded-lg bg-[#00DFFF]/15 hover:bg-[#00DFFF]/30 border border-[#00DFFF]/40 text-[#00DFFF] font-bold text-[10px] transition cursor-pointer flex items-center gap-1"
                              title="Promover para Administrador"
                            >
                              <Crown className="w-3 h-3" />
                              <span>Tornar Admin</span>
                            </button>
                          )}

                          {user.role !== 'vip' && (
                            <button
                              onClick={() => handleRoleChange(user, 'vip')}
                              className="px-2.5 py-1 rounded-lg bg-amber-400/15 hover:bg-amber-400/30 border border-amber-400/40 text-amber-300 font-bold text-[10px] transition cursor-pointer flex items-center gap-1"
                              title="Definir como Cliente VIP (com desconto)"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>Tornar VIP</span>
                            </button>
                          )}

                          {isVipRole && (
                            <button
                              onClick={() => {
                                setVipEditUser(user);
                                setCustomDiscountVal(user.vipDiscountCustom || settings.vipDiscountPercent || 10);
                              }}
                              className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 font-bold text-[10px] transition cursor-pointer"
                              title="Ajustar % de desconto deste VIP"
                            >
                              Editar %
                            </button>
                          )}

                          {user.role !== 'customer' && (
                            <button
                              onClick={() => handleRoleChange(user, 'customer')}
                              className="px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 font-semibold text-[10px] transition cursor-pointer"
                              title="Definir como Cliente Normal"
                            >
                              Cliente Normal
                            </button>
                          )}

                          {/* Delete User */}
                          {!isCurrent && (
                            <button
                              onClick={() => handleDeleteUser(user)}
                              className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 transition cursor-pointer"
                              title="Remover usuário"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===================== MODAL: NOVO USUÁRIO COM CARGO ===================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl bg-[#0D1022] border-2 border-[#8423DA]/50 shadow-2xl overflow-hidden my-auto">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-[#141838] to-[#181D3D] border-b border-[#8423DA]/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8423DA] to-[#00DFFF] p-0.5 flex items-center justify-center shadow-md">
                  <div className="w-full h-full rounded-[10px] bg-[#0D1022] flex items-center justify-center text-[#00DFFF]">
                    <Plus className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <h3 className="font-heading text-lg font-black text-white">
                    Adicionar Novo Usuário / Cargo
                  </h3>
                  <p className="text-xs text-[#A5A5B8]">
                    Cadastre novos administradores, clientes VIPs ou normais
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 rounded-xl bg-[#141838] text-gray-400 hover:text-white transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              {/* E-mail */}
              <div>
                <label className="block text-xs font-bold text-gray-200 mb-1">
                  E-mail do Usuário *
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="exemplo@podwave.com"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-white text-xs focus:outline-none focus:border-[#00DFFF]"
                />
              </div>

              {/* Nome Completo */}
              <div>
                <label className="block text-xs font-bold text-gray-200 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="Ex: Carlos Eduardo Silva"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-white text-xs focus:outline-none focus:border-[#00DFFF]"
                />
              </div>

              {/* WhatsApp */}
              <div>
                <label className="block text-xs font-bold text-gray-200 mb-1">
                  WhatsApp / Celular (Opcional)
                </label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="(86) 99999-9999"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-white text-xs focus:outline-none focus:border-[#00DFFF]"
                />
              </div>

              {/* Cargo Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-200 mb-2">
                  Selecione o Cargo / Nível de Acesso *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Admin Option */}
                  <label
                    className={`p-3 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                      newRole === 'admin'
                        ? 'bg-[#00DFFF]/15 border-[#00DFFF] text-white shadow-md'
                        : 'bg-[#141838] border-[#8423DA]/30 text-gray-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Crown className={`w-4 h-4 ${newRole === 'admin' ? 'text-[#00DFFF]' : 'text-gray-400'}`} />
                      <input
                        type="radio"
                        name="newRole"
                        value="admin"
                        checked={newRole === 'admin'}
                        onChange={() => setNewRole('admin')}
                        className="text-[#00DFFF]"
                      />
                    </div>
                    <span className="font-bold text-xs">Administrador</span>
                    <span className="text-[10px] text-gray-400 mt-1">Acesso ao Painel & Catálogo</span>
                  </label>

                  {/* VIP Option */}
                  <label
                    className={`p-3 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                      newRole === 'vip'
                        ? 'bg-amber-400/15 border-amber-400 text-white shadow-md'
                        : 'bg-[#141838] border-[#8423DA]/30 text-gray-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Sparkles className={`w-4 h-4 ${newRole === 'vip' ? 'text-amber-400' : 'text-gray-400'}`} />
                      <input
                        type="radio"
                        name="newRole"
                        value="vip"
                        checked={newRole === 'vip'}
                        onChange={() => setNewRole('vip')}
                        className="text-amber-400"
                      />
                    </div>
                    <span className="font-bold text-xs">Cliente VIP</span>
                    <span className="text-[10px] text-gray-400 mt-1">Desconto Automático</span>
                  </label>

                  {/* Customer Option */}
                  <label
                    className={`p-3 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                      newRole === 'customer'
                        ? 'bg-white/10 border-white/40 text-white shadow-md'
                        : 'bg-[#141838] border-[#8423DA]/30 text-gray-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <UserCheck className={`w-4 h-4 ${newRole === 'customer' ? 'text-white' : 'text-gray-400'}`} />
                      <input
                        type="radio"
                        name="newRole"
                        value="customer"
                        checked={newRole === 'customer'}
                        onChange={() => setNewRole('customer')}
                      />
                    </div>
                    <span className="font-bold text-xs">Cliente Normal</span>
                    <span className="text-[10px] text-gray-400 mt-1">Compras e Pedidos</span>
                  </label>
                </div>
              </div>

              {/* Se VIP: campo para definir % de desconto exclusivo */}
              {newRole === 'vip' && (
                <div className="p-3.5 rounded-xl bg-amber-400/10 border border-amber-400/30 space-y-2">
                  <label className="block text-xs font-bold text-amber-300">
                    Desconto VIP para este Usuário (%)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="90"
                      value={newVipDiscount}
                      onChange={(e) => setNewVipDiscount(Number(e.target.value))}
                      className="w-28 px-3 py-2 rounded-xl bg-[#0D1022] border border-amber-400/50 text-amber-300 font-black text-sm text-center"
                    />
                    <span className="text-xs text-[#A5A5B8]">
                      % de desconto aplicado automaticamente no carrinho
                    </span>
                  </div>
                </div>
              )}

              {/* Senha */}
              <div>
                <label className="block text-xs font-bold text-gray-200 mb-1">
                  Senha Inicial de Acesso (Mínimo 6 caracteres)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Defina uma senha para o usuário"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-white text-xs focus:outline-none focus:border-[#00DFFF]"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  O usuário poderá utilizar este e-mail e senha para autenticar via Supabase.
                </p>
              </div>

              {/* Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#8423DA]/20">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#141838] text-gray-300 hover:text-white text-xs font-bold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#8423DA] via-[#007BFF] to-[#00DFFF] hover:brightness-110 text-white font-black text-xs uppercase tracking-wider shadow-lg cursor-pointer transition active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'Cadastrando...' : 'Cadastrar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL: EDITAR % DESCONTO VIP ===================== */}
      {vipEditUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-3xl bg-[#0D1022] border-2 border-amber-400/50 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base font-black text-amber-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Desconto Cliente VIP</span>
              </h3>
              <button
                onClick={() => setVipEditUser(null)}
                className="text-gray-400 hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#A5A5B8]">
              Defina a porcentagem de desconto exclusiva para <strong className="text-white">{vipEditUser.fullName}</strong> ({vipEditUser.email}):
            </p>

            <div className="flex items-center justify-center gap-2 py-2">
              <input
                type="number"
                min="1"
                max="90"
                value={customDiscountVal}
                onChange={(e) => setCustomDiscountVal(Number(e.target.value))}
                className="w-28 px-3 py-2.5 rounded-2xl bg-[#141838] border-2 border-amber-400/60 text-amber-300 font-heading font-black text-xl text-center"
              />
              <span className="font-heading font-black text-amber-400 text-xl">% OFF</span>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVipEditUser(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#141838] text-gray-300 font-bold text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmVipDiscount}
                className="flex-1 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs transition cursor-pointer shadow-md"
              >
                Confirmar VIP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
