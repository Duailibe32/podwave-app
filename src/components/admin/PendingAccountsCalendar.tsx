import React, { useState, useMemo } from 'react';
import { PendingAccountItem } from '../../types/catalog';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  DollarSign,
  X,
  Clock,
  Sparkles,
} from 'lucide-react';

interface PendingAccountsCalendarProps {
  accounts: PendingAccountItem[];
  onSelectAccount: (account: PendingAccountItem) => void;
  onSettleAccount: (account: PendingAccountItem) => void;
}

export const PendingAccountsCalendar: React.FC<PendingAccountsCalendarProps> = ({
  accounts,
  onSelectAccount,
  onSettleAccount,
}) => {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDayString, setSelectedDayString] = useState<string | null>(null);

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-11

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

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDayString(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDayString(null);
  };

  const handleCurrentMonth = () => {
    setCurrentDate(new Date());
    setSelectedDayString(null);
  };

  // Group accounts by due date (YYYY-MM-DD)
  // Accounts without due date are grouped into 'sem_data'
  const accountsByDate = useMemo(() => {
    const map = new Map<string, PendingAccountItem[]>();

    accounts.forEach((acc) => {
      // If the account has individual installments, map installments by their specific due dates
      if (acc.installments && acc.installments.length > 0) {
        let hasMappedInst = false;
        acc.installments.forEach((inst) => {
          if (inst.amountPending > 0 && inst.dueDate) {
            hasMappedInst = true;
            // Virtual item for this installment
            const instAcc: PendingAccountItem = {
              ...acc,
              id: `${acc.id}-inst-${inst.installmentNumber}`,
              description: `${acc.description} (Parcela ${inst.installmentNumber}/${inst.totalInstallments})`,
              dueDate: inst.dueDate,
              amountPending: inst.amountPending,
            };
            const list = map.get(inst.dueDate) || [];
            list.push(instAcc);
            map.set(inst.dueDate, list);
          }
        });
        if (!hasMappedInst && acc.amountPending > 0) {
          const key = acc.dueDate || 'sem_data';
          const list = map.get(key) || [];
          list.push(acc);
          map.set(key, list);
        }
      } else {
        const key = acc.dueDate || 'sem_data';
        const list = map.get(key) || [];
        list.push(acc);
        map.set(key, list);
      }
    });

    return map;
  }, [accounts]);

  // Days in month calculation
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const totalDays = lastDayOfMonth.getDate();
    // Monday as first day of week: 0 = Sunday, 1 = Monday, etc.
    let startingDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startingDayOfWeek === -1) startingDayOfWeek = 6;

    const days: {
      dayNumber: number;
      dateString: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      receivables: PendingAccountItem[];
      payables: PendingAccountItem[];
      totalReceivable: number;
      totalPayable: number;
      isOverdue: boolean;
    }[] = [];

    // Previous month padding days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDay = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, prevDay);
      const dateString = prevDate.toISOString().slice(0, 10);
      const dayAccounts = accountsByDate.get(dateString) || [];
      const receivables = dayAccounts.filter((a) => a.type === 'a_receber' && a.amountPending > 0);
      const payables = dayAccounts.filter((a) => a.type === 'a_pagar' && a.amountPending > 0);
      days.push({
        dayNumber: prevDay,
        dateString,
        isCurrentMonth: false,
        isToday: false,
        receivables,
        payables,
        totalReceivable: receivables.reduce((sum, a) => sum + a.amountPending, 0),
        totalPayable: payables.reduce((sum, a) => sum + a.amountPending, 0),
        isOverdue: false,
      });
    }

    const todayStr = new Date().toISOString().slice(0, 10);

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const thisDate = new Date(year, month, d);
      // Format YYYY-MM-DD using local year/month/date
      const yyyy = thisDate.getFullYear();
      const mm = String(thisDate.getMonth() + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      const dateString = `${yyyy}-${mm}-${dd}`;

      const dayAccounts = accountsByDate.get(dateString) || [];
      const receivables = dayAccounts.filter((a) => a.type === 'a_receber' && a.amountPending > 0);
      const payables = dayAccounts.filter((a) => a.type === 'a_pagar' && a.amountPending > 0);
      const isToday = dateString === todayStr;
      const isOverdue = dateString < todayStr && (receivables.length > 0 || payables.length > 0);

      days.push({
        dayNumber: d,
        dateString,
        isCurrentMonth: true,
        isToday,
        receivables,
        payables,
        totalReceivable: receivables.reduce((sum, a) => sum + a.amountPending, 0),
        totalPayable: payables.reduce((sum, a) => sum + a.amountPending, 0),
        isOverdue,
      });
    }

    // Remaining slots to make multiple of 7
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      const dateString = nextDate.toISOString().slice(0, 10);
      const dayAccounts = accountsByDate.get(dateString) || [];
      const receivables = dayAccounts.filter((a) => a.type === 'a_receber' && a.amountPending > 0);
      const payables = dayAccounts.filter((a) => a.type === 'a_pagar' && a.amountPending > 0);
      days.push({
        dayNumber: i,
        dateString,
        isCurrentMonth: false,
        isToday: false,
        receivables,
        payables,
        totalReceivable: receivables.reduce((sum, a) => sum + a.amountPending, 0),
        totalPayable: payables.reduce((sum, a) => sum + a.amountPending, 0),
        isOverdue: false,
      });
    }

    return days;
  }, [year, month, accountsByDate]);

  // Selected day accounts
  const selectedDayAccounts = useMemo(() => {
    if (!selectedDayString) return [];
    return accountsByDate.get(selectedDayString) || [];
  }, [selectedDayString, accountsByDate]);

  // Accounts without due date
  const undatedAccounts = accountsByDate.get('sem_data') || [];

  return (
    <div className="space-y-4">
      {/* Calendar Header Controls */}
      <div className="p-4 rounded-2xl bg-[#0D1022] border border-[#8423DA]/20 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#8423DA]/20 border border-[#8423DA]/30 flex items-center justify-center text-[#00DFFF]">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading text-lg font-black text-white capitalize">
              {monthNames[month]} de {year}
            </h3>
            <p className="text-xs text-[#A5A5B8]">
              Visão cronológica de vencimentos de contas a pagar e a receber
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCurrentMonth}
            className="px-3 py-1.5 rounded-xl bg-[#141838] hover:bg-[#8423DA]/30 text-gray-300 hover:text-white text-xs font-bold border border-white/10 transition-colors"
          >
            Mês Atual
          </button>
          <div className="flex items-center gap-1 bg-[#141838] rounded-xl p-1 border border-white/10">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Mês Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Próximo Mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[#0D1022] border border-[#8423DA]/25 shadow-xl">
        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">
          <div className="py-1 text-gray-400">Seg</div>
          <div className="py-1 text-gray-400">Ter</div>
          <div className="py-1 text-gray-400">Qua</div>
          <div className="py-1 text-gray-400">Qui</div>
          <div className="py-1 text-gray-400">Sex</div>
          <div className="py-1 text-[#00DFFF]">Sáb</div>
          <div className="py-1 text-rose-400">Dom</div>
        </div>

        {/* Calendar days cells */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {calendarDays.map((cell, idx) => {
            const hasData = cell.receivables.length > 0 || cell.payables.length > 0;
            const isSelected = selectedDayString === cell.dateString;

            return (
              <div
                key={idx}
                onClick={() => {
                  if (hasData) {
                    setSelectedDayString(isSelected ? null : cell.dateString);
                  }
                }}
                className={`min-h-[75px] sm:min-h-[90px] p-1.5 sm:p-2 rounded-2xl border transition-all flex flex-col justify-between select-none ${
                  !cell.isCurrentMonth
                    ? 'opacity-30 bg-[#080811]/40 border-transparent'
                    : cell.isToday
                    ? 'bg-[#141838] border-[#00DFFF] shadow-[0_0_15px_rgba(0,223,255,0.2)]'
                    : cell.isOverdue
                    ? 'bg-rose-950/20 border-rose-500/30'
                    : isSelected
                    ? 'bg-[#8423DA]/30 border-[#8423DA]'
                    : 'bg-[#080811] border-white/5 hover:border-white/20'
                } ${hasData ? 'cursor-pointer hover:scale-[1.02]' : 'cursor-default'}`}
              >
                {/* Cell Header: Day number + Badges */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold ${
                      cell.isToday
                        ? 'w-6 h-6 rounded-full bg-[#00DFFF] text-black flex items-center justify-center font-black'
                        : cell.isCurrentMonth
                        ? 'text-gray-300'
                        : 'text-gray-600'
                    }`}
                  >
                    {cell.dayNumber}
                  </span>

                  {cell.isOverdue && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="Vencido!" />
                  )}
                </div>

                {/* Badges / Totais do dia */}
                <div className="space-y-1 mt-1">
                  {cell.receivables.length > 0 && (
                    <div
                      className="px-1.5 py-0.5 rounded-md bg-[#10B981]/15 border border-[#10B981]/30 text-[10px] text-[#10B981] font-bold flex items-center justify-between"
                      title={`${cell.receivables.length} a receber: ${formatBRL(cell.totalReceivable)}`}
                    >
                      <span className="truncate flex items-center gap-0.5">
                        <ArrowDownLeft className="w-2.5 h-2.5 shrink-0" />
                        <span className="hidden sm:inline">Rec:</span>
                      </span>
                      <span>{formatBRL(cell.totalReceivable)}</span>
                    </div>
                  )}

                  {cell.payables.length > 0 && (
                    <div
                      className="px-1.5 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/30 text-[10px] text-rose-400 font-bold flex items-center justify-between"
                      title={`${cell.payables.length} a pagar: ${formatBRL(cell.totalPayable)}`}
                    >
                      <span className="truncate flex items-center gap-0.5">
                        <ArrowUpRight className="w-2.5 h-2.5 shrink-0" />
                        <span className="hidden sm:inline">Pag:</span>
                      </span>
                      <span>{formatBRL(cell.totalPayable)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Drawer / Detalhamento do Dia Selecionado */}
      {selectedDayString && selectedDayAccounts.length > 0 && (
        <div className="p-5 rounded-3xl bg-[#0D1022] border border-[#00DFFF]/40 shadow-2xl animate-in fade-in duration-200 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-[#00DFFF]" />
              <h4 className="font-heading text-base font-black text-white">
                Vencimentos do Dia {selectedDayString.split('-').reverse().join('/')}
              </h4>
              <span className="text-xs text-gray-400">
                ({selectedDayAccounts.length} {selectedDayAccounts.length === 1 ? 'pendência' : 'pendências'})
              </span>
            </div>
            <button
              onClick={() => setSelectedDayString(null)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {selectedDayAccounts.map((item) => {
              const isReceivable = item.type === 'a_receber';
              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                    isReceivable
                      ? 'bg-[#10B981]/5 border-[#10B981]/20'
                      : 'bg-rose-500/5 border-rose-500/20'
                  }`}
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                          isReceivable
                            ? 'bg-[#10B981]/20 text-[#10B981]'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {isReceivable ? 'A Receber' : 'A Pagar'}
                      </span>
                      <span className="text-[10px] text-gray-400 truncate">
                        {item.counterpartyName}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-white truncate">
                      {item.description}
                    </div>
                    <div className="text-[11px] text-gray-400 flex items-center gap-2">
                      <span>Saldo:</span>
                      <strong className={isReceivable ? 'text-[#10B981]' : 'text-rose-400'}>
                        {formatBRL(item.amountPending)}
                      </strong>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      onClick={() => onSettleAccount(item)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-md transition-all cursor-pointer ${
                        isReceivable
                          ? 'bg-[#10B981] hover:brightness-110'
                          : 'bg-rose-600 hover:brightness-110'
                      }`}
                    >
                      {isReceivable ? 'Receber' : 'Pagar'}
                    </button>
                    <button
                      onClick={() => onSelectAccount(item)}
                      className="px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-[11px] transition-colors"
                    >
                      Ver
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Avisos de Contas Sem Data de Vencimento (se houver) */}
      {undatedAccounts.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-[#141838]/60 border border-amber-500/20 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Existe(m) <strong>{undatedAccounts.length}</strong> conta(s) pendente(s) sem data de vencimento cadastrada.
            </span>
          </div>
          <span className="text-[11px] text-gray-400">Acesse a aba Tabela para conferir</span>
        </div>
      )}
    </div>
  );
};
