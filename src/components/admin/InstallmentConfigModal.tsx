import React, { useState, useEffect } from 'react';
import { useCatalog } from '../../context/CatalogContext';
import {
  PendingAccountItem,
  CommitmentInstallmentItem,
} from '../../types/catalog';
import {
  X,
  Calendar,
  Layers,
  Sparkles,
  AlertCircle,
  Check,
  RotateCcw,
  Plus,
  Trash2,
} from 'lucide-react';

interface InstallmentConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingItem: PendingAccountItem | null;
  onSuccess?: () => void;
}

export const InstallmentConfigModal: React.FC<InstallmentConfigModalProps> = ({
  isOpen,
  onClose,
  pendingItem,
  onSuccess,
}) => {
  const {
    manualSales,
    manualExpenses,
    merchandisePurchases,
    manualCommitments,
    saveManualSale,
    saveManualExpense,
    saveMerchandisePurchase,
    saveManualCommitment,
  } = useCatalog();

  const [installmentsCount, setInstallmentsCount] = useState<number>(2);
  const [frequencyDays, setFrequencyDays] = useState<number>(30);
  const [firstDueDate, setFirstDueDate] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );

  const [installmentItems, setInstallmentItems] = useState<CommitmentInstallmentItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  useEffect(() => {
    if (isOpen && pendingItem) {
      setErrorMsg('');

      // If the item already has installments defined, populate them
      if (pendingItem.installments && pendingItem.installments.length > 0) {
        setInstallmentItems([...pendingItem.installments]);
        setInstallmentsCount(pendingItem.installments.length);
        if (pendingItem.installments[0]?.dueDate) {
          setFirstDueDate(pendingItem.installments[0].dueDate);
        }
      } else {
        // Generate initial installment draft based on pending balance
        generateInitialInstallments(2, 30, pendingItem.dueDate || new Date().toISOString().slice(0, 10));
      }
    }
  }, [isOpen, pendingItem]);

  const generateInitialInstallments = (count: number, intervalDays: number, startDateStr: string) => {
    if (!pendingItem) return;
    const targetAmount = pendingItem.totalAmount;
    const validCount = Math.max(1, count);

    const baseVal = Math.floor((targetAmount / validCount) * 100) / 100;
    const diff = Number((targetAmount - baseVal * validCount).toFixed(2));

    const startDate = new Date(startDateStr);
    const validStartDate = isNaN(startDate.getTime()) ? new Date() : startDate;

    const generated: CommitmentInstallmentItem[] = [];
    let remainingPaidDistribution = pendingItem.amountPaid;

    for (let i = 1; i <= validCount; i++) {
      const d = new Date(validStartDate);
      d.setDate(d.getDate() + (i - 1) * intervalDays);
      const dueDateStr = d.toISOString().slice(0, 10);

      // Add difference cents to the first installment
      const installmentAmount = i === 1 ? Number((baseVal + diff).toFixed(2)) : baseVal;

      // Distribute any already paid amount across installments sequentially
      let paidForThis = 0;
      if (remainingPaidDistribution > 0) {
        paidForThis = Math.min(installmentAmount, remainingPaidDistribution);
        remainingPaidDistribution = Number((remainingPaidDistribution - paidForThis).toFixed(2));
      }

      const pendingForThis = Math.max(0, Number((installmentAmount - paidForThis).toFixed(2)));

      generated.push({
        id: `inst-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 5)}`,
        installmentNumber: i,
        totalInstallments: validCount,
        dueDate: dueDateStr,
        amount: installmentAmount,
        amountPaid: paidForThis,
        amountPending: pendingForThis,
        status: pendingForThis <= 0.001 ? 'pago' : paidForThis > 0 ? 'parcial' : 'pendente',
      });
    }

    setInstallmentItems(generated);
  };

  const handleApplyPreset = () => {
    if (!pendingItem) return;
    generateInitialInstallments(installmentsCount, frequencyDays, firstDueDate);
  };

  const handleUpdateItem = (index: number, field: 'dueDate' | 'amount', value: any) => {
    const updated = [...installmentItems];
    if (field === 'dueDate') {
      updated[index].dueDate = value;
    } else if (field === 'amount') {
      const numVal = parseFloat(value) || 0;
      updated[index].amount = numVal;
      const paid = updated[index].amountPaid || 0;
      const pending = Math.max(0, Number((numVal - paid).toFixed(2)));
      updated[index].amountPending = pending;
      updated[index].status = pending <= 0.001 ? 'pago' : paid > 0 ? 'parcial' : 'pendente';
    }
    setInstallmentItems(updated);
  };

  const handleAddInstallment = () => {
    if (!pendingItem) return;
    const nextNumber = installmentItems.length + 1;
    const lastDate = installmentItems.length > 0
      ? new Date(installmentItems[installmentItems.length - 1].dueDate)
      : new Date();
    lastDate.setDate(lastDate.getDate() + 30);

    const newItem: CommitmentInstallmentItem = {
      id: `inst-${Date.now()}-${nextNumber}-${Math.random().toString(36).slice(2, 5)}`,
      installmentNumber: nextNumber,
      totalInstallments: nextNumber,
      dueDate: lastDate.toISOString().slice(0, 10),
      amount: 0,
      amountPaid: 0,
      amountPending: 0,
      status: 'pendente',
    };

    const newItems = [...installmentItems, newItem].map((item, idx, arr) => ({
      ...item,
      installmentNumber: idx + 1,
      totalInstallments: arr.length,
    }));

    setInstallmentItems(newItems);
  };

  const handleRemoveInstallment = (index: number) => {
    if (installmentItems.length <= 1) return;
    const updated = installmentItems
      .filter((_, idx) => idx !== index)
      .map((item, idx, arr) => ({
        ...item,
        installmentNumber: idx + 1,
        totalInstallments: arr.length,
      }));
    setInstallmentItems(updated);
  };

  if (!isOpen || !pendingItem) return null;

  const currentSum = installmentItems.reduce((acc, i) => acc + (i.amount || 0), 0);
  const diffFromTotal = Number((currentSum - pendingItem.totalAmount).toFixed(2));
  const isSumValid = Math.abs(diffFromTotal) < 0.01;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (installmentItems.length === 0) {
      setErrorMsg('Adicione pelo menos 1 parcela.');
      return;
    }

    if (!isSumValid) {
      setErrorMsg(
        `A soma das parcelas (${formatBRL(currentSum)}) deve ser exatamente igual ao valor total do compromisso (${formatBRL(
          pendingItem.totalAmount
        )}). Diferença: ${formatBRL(diffFromTotal)}.`
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // Find earliest pending due date to synchronize parent's dueDate
      const pendingDates = installmentItems
        .filter((i) => i.amountPending > 0)
        .map((i) => i.dueDate)
        .sort();
      const nextDueDate = pendingDates.length > 0 ? pendingDates[0] : installmentItems[0].dueDate;

      // 1. ORIGEM: VENDA
      if (pendingItem.originType === 'venda') {
        const sale = manualSales.find((s) => s.id === pendingItem.originId);
        if (!sale) throw new Error('Venda não encontrada.');
        const res = await saveManualSale({
          ...sale,
          dueDate: nextDueDate,
          installments: installmentItems,
        });
        if (!res.success) throw new Error(res.error || 'Erro ao salvar parcelas da venda.');
      }
      // 2. ORIGEM: DESPESA
      else if (pendingItem.originType === 'despesa') {
        const expense = manualExpenses.find((e) => e.id === pendingItem.originId);
        if (!expense) throw new Error('Despesa não encontrada.');
        const res = await saveManualExpense({
          ...expense,
          dueDate: nextDueDate,
          installments: installmentItems,
        });
        if (!res.success) throw new Error(res.error || 'Erro ao salvar parcelas da despesa.');
      }
      // 3. ORIGEM: COMPRA DE MERCADORIAS
      else if (pendingItem.originType === 'compra_estoque') {
        const purchase = merchandisePurchases.find((p) => p.id === pendingItem.originId);
        if (!purchase) throw new Error('Compra não encontrada.');
        const res = await saveMerchandisePurchase({
          ...purchase,
          dueDate: nextDueDate,
          installments: installmentItems,
        });
        if (!res.success) throw new Error(res.error || 'Erro ao salvar parcelas da compra.');
      }
      // 4. ORIGEM: COMPROMISSO AVULSO
      else if (pendingItem.originType === 'avulso') {
        const commitment = manualCommitments.find((c) => c.id === pendingItem.originId);
        if (!commitment) throw new Error('Compromisso não encontrado.');
        const res = await saveManualCommitment({
          ...commitment,
          dueDate: nextDueDate,
          installments: installmentItems,
        });
        if (!res.success) throw new Error(res.error || 'Erro ao salvar parcelas do compromisso.');
      }

      setIsSubmitting(false);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err.message || 'Falha ao salvar configuração de parcelamento.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0B0D1B] border border-[#8423DA]/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#0D1022] via-[#141838] to-[#0D1022] border-b border-[#8423DA]/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#8423DA]/20 border border-[#8423DA]/40 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5 text-[#00DFFF]" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-black text-white">
                Programação de Parcelas (Controle Manual)
              </h3>
              <p className="text-xs text-[#A5A5B8]">
                {pendingItem.description} ({pendingItem.counterpartyName})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 overflow-y-auto custom-scrollbar">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Gerador Rápido de Parcelas */}
          <div className="p-4 rounded-2xl bg-[#141838]/40 border border-[#8423DA]/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#00DFFF]" />
                Gerador Rápido de Divisão Automática
              </span>
              <span className="text-xs text-gray-400 font-bold">
                Valor Total: <span className="text-white">{formatBRL(pendingItem.totalAmount)}</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Qtd de Parcelas</label>
                <select
                  value={installmentsCount}
                  onChange={(e) => setInstallmentsCount(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 rounded-xl bg-[#080811] border border-white/10 text-white text-xs"
                >
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24].map((n) => (
                    <option key={n} value={n}>
                      {n} parcelas
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 mb-1">Intervalo entre parcelas</label>
                <select
                  value={frequencyDays}
                  onChange={(e) => setFrequencyDays(parseInt(e.target.value) || 30)}
                  className="w-full px-3 py-2 rounded-xl bg-[#080811] border border-white/10 text-white text-xs"
                >
                  <option value={7}>Semanal (7 em 7 dias)</option>
                  <option value={15}>Quinzenal (15 em 15 dias)</option>
                  <option value={30}>Mensal (30 em 30 dias)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 mb-1">1º Vencimento</label>
                <input
                  type="date"
                  value={firstDueDate}
                  onChange={(e) => setFirstDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#080811] border border-white/10 text-white text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleApplyPreset}
                className="px-3.5 py-1.5 rounded-xl bg-[#8423DA]/30 hover:bg-[#8423DA]/50 text-white text-xs font-bold border border-[#8423DA]/40 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#00DFFF]" />
                Gerar / Recalcular Divisão
              </button>
            </div>
          </div>

          {/* Lista de Parcelas Editáveis */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#00DFFF]" />
                Cronograma de Vencimento e Valores Individuais ({installmentItems.length})
              </h4>
              <button
                type="button"
                onClick={handleAddInstallment}
                className="text-xs text-[#00DFFF] hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar Parcela
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {installmentItems.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl bg-[#080811] border border-white/10 flex flex-wrap sm:flex-nowrap items-center gap-3"
                >
                  <div className="w-20 shrink-0 text-xs font-bold text-gray-300">
                    Parcela {item.installmentNumber}/{installmentItems.length}
                  </div>

                  <div className="flex-1 min-w-[130px]">
                    <label className="block text-[10px] text-gray-500 mb-0.5">Data Vencimento</label>
                    <input
                      type="date"
                      value={item.dueDate}
                      onChange={(e) => handleUpdateItem(idx, 'dueDate', e.target.value)}
                      required
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#141838] border border-white/10 text-white text-xs"
                    />
                  </div>

                  <div className="w-32 shrink-0">
                    <label className="block text-[10px] text-gray-500 mb-0.5">Valor (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={item.amount}
                      onChange={(e) => handleUpdateItem(idx, 'amount', e.target.value)}
                      required
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#141838] border border-white/10 text-white text-xs font-bold"
                    />
                  </div>

                  <div className="w-28 shrink-0 text-right">
                    <div className="text-[10px] text-gray-500">Saldo Pendente</div>
                    <div
                      className={`text-xs font-bold ${
                        item.amountPending <= 0.001
                          ? 'text-emerald-400'
                          : item.amountPaid > 0
                          ? 'text-amber-400'
                          : 'text-gray-300'
                      }`}
                    >
                      {item.amountPending <= 0.001 ? 'Quitada' : formatBRL(item.amountPending)}
                    </div>
                  </div>

                  {installmentItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveInstallment(idx)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Excluir parcela"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Validação de Soma */}
          <div
            className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs ${
              isSumValid
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {isSumValid ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400" />
              )}
              <span>
                Soma das parcelas: <strong>{formatBRL(currentSum)}</strong> de{' '}
                <strong>{formatBRL(pendingItem.totalAmount)}</strong>
              </span>
            </div>
            {!isSumValid && (
              <span className="font-bold">
                {diffFromTotal > 0 ? `+${formatBRL(diffFromTotal)} a mais` : `${formatBRL(diffFromTotal)} a menos`}
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isSumValid}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00DFFF] to-[#007BFF] text-black text-xs font-black shadow-lg shadow-[#00DFFF]/20 flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              {isSubmitting ? 'Salvando...' : 'Salvar Cronograma de Parcelas'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
