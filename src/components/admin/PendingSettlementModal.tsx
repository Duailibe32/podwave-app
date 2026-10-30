import React, { useState, useEffect } from 'react';
import { useCatalog } from '../../context/CatalogContext';
import {
  PendingAccountItem,
  CashAccountChannel,
  SaleReceiptItem,
  ExpensePaymentItem,
  PurchasePaymentItem,
  CommitmentPaymentItem,
  CommitmentInstallmentItem,
  ManualSaleEntry,
  ManualExpenseEntry,
  MerchandisePurchaseEntry,
  ManualCommitmentEntry,
} from '../../types/catalog';
import {
  X,
  Calendar,
  DollarSign,
  AlertCircle,
  Check,
  Building,
  CreditCard,
  Banknote,
  Wallet,
  Sparkles,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
} from 'lucide-react';

interface PendingSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingItem: PendingAccountItem | null;
  onSuccess?: () => void;
}

export const PendingSettlementModal: React.FC<PendingSettlementModalProps> = ({
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

  const [settlementAmount, setSettlementAmount] = useState<number | ''>('');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('Pix');
  const [accountChannel, setAccountChannel] = useState<CashAccountChannel>('pix_banco');
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<string>('');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen && pendingItem) {
      setErrorMsg('');
      setSettlementAmount(pendingItem.amountPending);
      setEffectiveDate(new Date().toISOString().slice(0, 10));
      setPaymentMethod(pendingItem.paymentMethod || 'Pix');
      setAccountChannel(pendingItem.accountChannel || 'pix_banco');
      setNotes('');

      // Se possuir parcelas, pré-seleciona a primeira pendente
      if (pendingItem.installments && pendingItem.installments.length > 0) {
        const firstPending = pendingItem.installments.find((i) => i.amountPending > 0);
        if (firstPending) {
          setSelectedInstallmentId(firstPending.id);
          setSettlementAmount(firstPending.amountPending);
        } else {
          setSelectedInstallmentId('');
        }
      } else {
        setSelectedInstallmentId('');
      }
    }
  }, [isOpen, pendingItem]);

  if (!isOpen || !pendingItem) return null;

  const isReceivable = pendingItem.type === 'a_receber';
  const remainingPending = pendingItem.amountPending;
  const numAmount = typeof settlementAmount === 'number' ? settlementAmount : 0;

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Quitar valor total restante
  const handleSetFullAmount = () => {
    if (selectedInstallmentId && pendingItem.installments) {
      const inst = pendingItem.installments.find((i) => i.id === selectedInstallmentId);
      if (inst) {
        setSettlementAmount(inst.amountPending);
        return;
      }
    }
    setSettlementAmount(remainingPending);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (numAmount <= 0) {
      setErrorMsg('Informe um valor de quitação válido maior que zero.');
      return;
    }

    if (numAmount > remainingPending + 0.01) {
      setErrorMsg(
        `O valor informado (${formatBRL(numAmount)}) é maior que o saldo pendente restante (${formatBRL(remainingPending)}).`
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const uniquePaymentId = `pay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      // 1. ORIGEM: VENDA MANUAL
      if (pendingItem.originType === 'venda') {
        const sale = manualSales.find((s) => s.id === pendingItem.originId);
        if (!sale) throw new Error('Venda original não encontrada.');

        const newReceipt: SaleReceiptItem = {
          id: uniquePaymentId,
          amount: numAmount,
          receiptDate: effectiveDate,
          paymentMethod,
          notes: notes.trim() || undefined,
          createdAt: new Date().toISOString(),
        };

        const currentReceipts = sale.receipts || [];
        const updatedReceipts = [...currentReceipts, newReceipt];
        const newTotalReceived = Number((sale.amountReceived + numAmount).toFixed(2));
        const newPending = Math.max(0, Number((sale.netTotal - newTotalReceived).toFixed(2)));
        const newStatus: 'pago' | 'parcial' | 'pendente' =
          newPending <= 0.001 ? 'pago' : 'parcial';

        // Atualizar parcelas se houver
        let updatedInstallments = sale.installments;
        if (updatedInstallments && updatedInstallments.length > 0) {
          updatedInstallments = updateInstallmentsWithPayment(
            updatedInstallments,
            selectedInstallmentId,
            numAmount
          );
        }

        const res = await saveManualSale({
          ...sale,
          receipts: updatedReceipts,
          amountReceived: newTotalReceived,
          amountPending: newPending,
          paymentStatus: newStatus,
          receivedDate: effectiveDate,
          installments: updatedInstallments,
        });

        if (!res.success) throw new Error(res.error || 'Erro ao registrar quitação na venda.');
      }

      // 2. ORIGEM: DESPESA OPERACIONAL
      else if (pendingItem.originType === 'despesa') {
        const expense = manualExpenses.find((e) => e.id === pendingItem.originId);
        if (!expense) throw new Error('Despesa original não encontrada.');

        const newPayment: ExpensePaymentItem = {
          id: uniquePaymentId,
          amount: numAmount,
          paymentDate: effectiveDate,
          paymentMethod,
          notes: notes.trim() || undefined,
          createdAt: new Date().toISOString(),
        };

        const currentPayments = expense.payments || [];
        const updatedPayments = [...currentPayments, newPayment];
        const newTotalPaid = Number((expense.amountPaid + numAmount).toFixed(2));
        const newPending = Math.max(0, Number((expense.amount - newTotalPaid).toFixed(2)));
        const newStatus: 'pago' | 'parcial' | 'a_pagar' =
          newPending <= 0.001 ? 'pago' : 'parcial';

        let updatedInstallments = expense.installments;
        if (updatedInstallments && updatedInstallments.length > 0) {
          updatedInstallments = updateInstallmentsWithPayment(
            updatedInstallments,
            selectedInstallmentId,
            numAmount
          );
        }

        const res = await saveManualExpense({
          ...expense,
          payments: updatedPayments,
          amountPaid: newTotalPaid,
          amountPending: newPending,
          paymentStatus: newStatus,
          installments: updatedInstallments,
        });

        if (!res.success) throw new Error(res.error || 'Erro ao registrar quitação na despesa.');
      }

      // 3. ORIGEM: COMPRA DE MERCADORIAS (ESTOQUE)
      else if (pendingItem.originType === 'compra_estoque') {
        const purchase = merchandisePurchases.find((p) => p.id === pendingItem.originId);
        if (!purchase) throw new Error('Compra original não encontrada.');

        const newPayment: PurchasePaymentItem = {
          id: uniquePaymentId,
          amount: numAmount,
          paymentDate: effectiveDate,
          paymentMethod,
          notes: notes.trim() || undefined,
          createdAt: new Date().toISOString(),
        };

        const currentPayments = purchase.payments || [];
        const updatedPayments = [...currentPayments, newPayment];
        const newTotalPaid = Number((purchase.amountPaid + numAmount).toFixed(2));
        const newPending = Math.max(0, Number((purchase.totalCost - newTotalPaid).toFixed(2)));
        const newStatus: 'pago' | 'parcial' | 'pendente' =
          newPending <= 0.001 ? 'pago' : 'parcial';

        let updatedInstallments = purchase.installments;
        if (updatedInstallments && updatedInstallments.length > 0) {
          updatedInstallments = updateInstallmentsWithPayment(
            updatedInstallments,
            selectedInstallmentId,
            numAmount
          );
        }

        const res = await saveMerchandisePurchase({
          ...purchase,
          payments: updatedPayments,
          amountPaid: newTotalPaid,
          amountPending: newPending,
          paymentStatus: newStatus,
          installments: updatedInstallments,
        });

        if (!res.success) throw new Error(res.error || 'Erro ao registrar quitação na compra.');
      }

      // 4. ORIGEM: COMPROMISSO AVULSO
      else if (pendingItem.originType === 'avulso') {
        const commitment = manualCommitments.find((c) => c.id === pendingItem.originId);
        if (!commitment) throw new Error('Compromisso avulso não encontrado.');

        const newPayment: CommitmentPaymentItem = {
          id: uniquePaymentId,
          amount: numAmount,
          paymentDate: effectiveDate,
          paymentMethod,
          accountChannel,
          notes: notes.trim() || undefined,
          createdAt: new Date().toISOString(),
        };

        const currentPayments = commitment.payments || [];
        const updatedPayments = [...currentPayments, newPayment];
        const newTotalPaid = Number((commitment.amountPaid + numAmount).toFixed(2));
        const newPending = Math.max(0, Number((commitment.totalAmount - newTotalPaid).toFixed(2)));
        const newStatus: 'pago' | 'parcial' | 'pendente' | 'cancelado' =
          newPending <= 0.001 ? 'pago' : 'parcial';

        let updatedInstallments = commitment.installments;
        if (updatedInstallments && updatedInstallments.length > 0) {
          updatedInstallments = updateInstallmentsWithPayment(
            updatedInstallments,
            selectedInstallmentId,
            numAmount
          );
        }

        const res = await saveManualCommitment({
          ...commitment,
          payments: updatedPayments,
          amountPaid: newTotalPaid,
          amountPending: newPending,
          paymentStatus: newStatus,
          installments: updatedInstallments,
          accountChannel,
        });

        if (!res.success) throw new Error(res.error || 'Erro ao registrar quitação no compromisso.');
      }

      setIsSubmitting(false);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err.message || 'Falha ao registrar quitação.');
    }
  };

  // Helper para abater pagamento na lista de parcelas
  const updateInstallmentsWithPayment = (
    installments: CommitmentInstallmentItem[],
    targetInstallmentId: string | undefined,
    paidAmount: number
  ): CommitmentInstallmentItem[] => {
    let remainingToDistribute = paidAmount;

    return installments.map((inst) => {
      // Se tiver uma parcela alvo selecionada e for ela
      if (targetInstallmentId && inst.id === targetInstallmentId) {
        const canPay = Math.min(inst.amountPending, remainingToDistribute);
        const newPaid = Number((inst.amountPaid + canPay).toFixed(2));
        const newPending = Math.max(0, Number((inst.amount - newPaid).toFixed(2)));
        remainingToDistribute -= canPay;
        return {
          ...inst,
          amountPaid: newPaid,
          amountPending: newPending,
          status: newPending <= 0.001 ? 'pago' : 'parcial',
        };
      }

      // Se não tiver parcela específica, distribui sequencialmente na primeira pendente
      if (!targetInstallmentId && remainingToDistribute > 0 && inst.amountPending > 0) {
        const canPay = Math.min(inst.amountPending, remainingToDistribute);
        const newPaid = Number((inst.amountPaid + canPay).toFixed(2));
        const newPending = Math.max(0, Number((inst.amount - newPaid).toFixed(2)));
        remainingToDistribute -= canPay;
        return {
          ...inst,
          amountPaid: newPaid,
          amountPending: newPending,
          status: newPending <= 0.001 ? 'pago' : 'parcial',
        };
      }

      return inst;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0B0D1B] border border-[#8423DA]/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#0D1022] via-[#141838] to-[#0D1022] border-b border-[#8423DA]/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl p-0.5 flex items-center justify-center shrink-0 ${
                isReceivable
                  ? 'bg-gradient-to-br from-[#10B981] to-[#00DFFF]'
                  : 'bg-gradient-to-br from-rose-500 to-[#8423DA]'
              }`}
            >
              <div className="w-full h-full bg-[#080811] rounded-[14px] flex items-center justify-center">
                {isReceivable ? (
                  <ArrowDownLeft className="w-5 h-5 text-[#10B981]" />
                ) : (
                  <ArrowUpRight className="w-5 h-5 text-rose-400" />
                )}
              </div>
            </div>
            <div>
              <h3 className="font-heading text-lg font-black text-white">
                {isReceivable ? 'Registrar Recebimento de Cliente' : 'Registrar Pagamento de Conta'}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 overflow-y-auto custom-scrollbar">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Resumo da Conta & Saldo Devedor */}
          <div className="p-4 rounded-2xl bg-[#080811] border border-white/5 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Valor Total Original:</span>
              <span className="font-bold text-white">{formatBRL(pendingItem.totalAmount)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Total Já Quitado:</span>
              <span className="font-bold text-emerald-400">{formatBRL(pendingItem.amountPaid)}</span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
              <span className="text-gray-300 font-bold">Saldo Pendente Restante:</span>
              <span
                className={`font-heading text-base font-black ${
                  isReceivable ? 'text-[#10B981]' : 'text-rose-400'
                }`}
              >
                {formatBRL(remainingPending)}
              </span>
            </div>
          </div>

          {/* Seleção de Parcela Específica (se houver) */}
          {pendingItem.installments && pendingItem.installments.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#00DFFF]" />
                Vincular a uma Parcela Específica
              </label>
              <select
                value={selectedInstallmentId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedInstallmentId(id);
                  if (id) {
                    const inst = pendingItem.installments?.find((i) => i.id === id);
                    if (inst) setSettlementAmount(inst.amountPending);
                  } else {
                    setSettlementAmount(remainingPending);
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#080811] border border-white/10 text-white text-xs focus:outline-none focus:border-[#00DFFF]"
              >
                <option value="">Abater no saldo geral sequencial</option>
                {pendingItem.installments.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    Parcela {inst.installmentNumber}/{inst.totalInstallments} — Venc: {inst.dueDate} — Saldo: {formatBRL(inst.amountPending)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Campo de Valor & Botão Quitar Tudo */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                Valor Efetivamente {isReceivable ? 'Recebido' : 'Pago'} (R$) *
              </label>
              <button
                type="button"
                onClick={handleSetFullAmount}
                className="text-[11px] text-[#00DFFF] hover:underline flex items-center gap-1 font-bold"
              >
                <Sparkles className="w-3 h-3" />
                Quitar Valor Restante Integral
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-bold">R$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={remainingPending}
                placeholder="0,00"
                value={settlementAmount}
                onChange={(e) =>
                  setSettlementAmount(e.target.value === '' ? '' : parseFloat(e.target.value))
                }
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#080811] border border-[#8423DA]/30 text-white text-base font-black focus:outline-none focus:border-[#00DFFF]"
              />
            </div>
          </div>

          {/* Data Efetiva & Forma de Pagamento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#00DFFF]" />
                Data Efetiva da Quitação *
              </label>
              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#080811] border border-white/10 text-white text-sm focus:outline-none focus:border-[#00DFFF]"
              />
              <p className="text-[10px] text-gray-500 mt-1">
                Data em que o dinheiro entrou/saiu do caixa.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                Forma de Pagamento
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#080811] border border-white/10 text-white text-sm focus:outline-none focus:border-[#00DFFF]"
              >
                <option value="Pix">Pix</option>
                <option value="Dinheiro">Dinheiro Físico</option>
                <option value="Cartão de Débito">Cartão de Débito</option>
                <option value="Cartão de Crédito">Cartão de Crédito</option>
                <option value="Boleto">Boleto Bancário</option>
                <option value="Outro">Outro Método</option>
              </select>
            </div>
          </div>

          {/* Canal Financeiro */}
          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-gray-400" />
              Canal / Conta de Liquidação *
            </label>
            <select
              value={accountChannel}
              onChange={(e) => setAccountChannel(e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#080811] border border-white/10 text-white text-sm focus:outline-none focus:border-[#00DFFF]"
            >
              <option value="pix_banco">Pix / Conta Bancária</option>
              <option value="dinheiro_caixa">Dinheiro Físico (Caixa da Loja)</option>
              <option value="cartao_maquininha">Cartão / Maquininha (Em trânsito)</option>
              <option value="outro">Outro Canal</option>
            </select>
          </div>

          {/* Observações / Comprovante */}
          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-gray-400" />
              Observações / Referência do Comprovante
            </label>
            <input
              type="text"
              placeholder="Ex: Comprovante Pix enviado no WhatsApp, recibo nº 12..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-[#080811] border border-white/10 text-white text-xs focus:outline-none focus:border-[#00DFFF]"
            />
          </div>

          {/* Aviso de integração de fluxo de caixa */}
          <div className="p-3 rounded-2xl bg-[#00DFFF]/5 border border-[#00DFFF]/20 flex items-start gap-2 text-[11px] text-[#A5A5B8]">
            <AlertCircle className="w-3.5 h-3.5 text-[#00DFFF] shrink-0 mt-0.5" />
            <p>
              Ao confirmar esta quitação, o saldo pendente será recalculado e a movimentação efetiva de caixa entrará automaticamente no <strong>Fluxo de Caixa</strong> na data {effectiveDate}.
            </p>
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
              disabled={isSubmitting}
              className={`px-5 py-2.5 rounded-xl text-white text-xs font-black shadow-lg flex items-center gap-1.5 transition-all disabled:opacity-50 ${
                isReceivable
                  ? 'bg-gradient-to-r from-[#10B981] to-[#00DFFF] shadow-[#10B981]/20'
                  : 'bg-gradient-to-r from-rose-500 to-[#8423DA] shadow-rose-500/20'
              }`}
            >
              <Check className="w-4 h-4" />
              {isSubmitting
                ? 'Registrando...'
                : isReceivable
                ? `Confirmar Recebimento (${formatBRL(numAmount)})`
                : `Confirmar Pagamento (${formatBRL(numAmount)})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
