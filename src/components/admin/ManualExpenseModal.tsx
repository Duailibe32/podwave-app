import React, { useState, useEffect } from 'react';
import { useCatalog } from '../../context/CatalogContext';
import { ManualExpenseEntry, ExpenseCategory } from '../../types/catalog';
import {
  X,
  Calendar,
  Receipt,
  DollarSign,
  CreditCard,
  FileText,
  AlertCircle,
  Check,
  Tag,
  Clock,
} from 'lucide-react';

interface ManualExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenseToEdit?: ManualExpenseEntry | null;
  onSaveSuccess?: () => void;
}

const PRESET_CATEGORIES: ExpenseCategory[] = [
  'Combustível / Entregas',
  'Embalagens / Sacolas',
  'Aluguel / Ponto Físico',
  'Alimentação',
  'Manutenção / Moto',
  'Marketing / Divulgação',
  'Software / Telefonia',
  'Outros',
];

const PAYMENT_METHODS = [
  'Pix',
  'Dinheiro',
  'Cartão',
  'Boleto',
  'Transferência',
  'Outro',
] as const;

export const ManualExpenseModal: React.FC<ManualExpenseModalProps> = ({
  isOpen,
  onClose,
  expenseToEdit,
  onSaveSuccess,
}) => {
  const { saveManualExpense } = useCatalog();

  const getTodayDate = () => new Date().toISOString().split('T')[0];

  // Form states
  const [expenseDate, setExpenseDate] = useState<string>(getTodayDate());
  const [category, setCategory] = useState<string>('Combustível / Entregas');
  const [customCategory, setCustomCategory] = useState<string>('');
  const [isCustomCategory, setIsCustomCategory] = useState<boolean>(false);
  const [description, setDescription] = useState<string>('');
  const [amount, setAmount] = useState<number | ''>('');
  const [amountPaid, setAmountPaid] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Pix');
  const [dueDate, setDueDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (expenseToEdit) {
      setExpenseDate(expenseToEdit.expenseDate || getTodayDate());
      if (PRESET_CATEGORIES.includes(expenseToEdit.category as ExpenseCategory)) {
        setCategory(expenseToEdit.category);
        setIsCustomCategory(false);
        setCustomCategory('');
      } else {
        setCategory('Outros');
        setIsCustomCategory(true);
        setCustomCategory(expenseToEdit.category);
      }
      setDescription(expenseToEdit.description || '');
      setAmount(expenseToEdit.amount || 0);
      setAmountPaid(expenseToEdit.amountPaid !== undefined ? expenseToEdit.amountPaid : 0);
      setPaymentMethod(expenseToEdit.paymentMethod || 'Pix');
      setDueDate(expenseToEdit.dueDate || '');
      setNotes(expenseToEdit.notes || '');
    } else {
      // New expense defaults
      setExpenseDate(getTodayDate());
      setCategory('Combustível / Entregas');
      setIsCustomCategory(false);
      setCustomCategory('');
      setDescription('');
      setAmount('');
      setAmountPaid('');
      setPaymentMethod('Pix');
      setDueDate('');
      setNotes('');
    }
    setFormError(null);
  }, [isOpen, expenseToEdit]);

  if (!isOpen) return null;

  const numAmount = Number(amount) || 0;
  const numPaid = Number(amountPaid) || 0;
  const amountPending = Math.max(0, numAmount - numPaid);

  const calculatedPaymentStatus: ManualExpenseEntry['paymentStatus'] =
    numPaid >= numAmount && numAmount > 0
      ? 'pago'
      : numPaid > 0 && numPaid < numAmount
      ? 'parcial'
      : 'a_pagar';

  const handleFullPayment = () => {
    setAmountPaid(numAmount);
  };

  const handleZeroPayment = () => {
    setAmountPaid(0);
  };

  const handleHalfPayment = () => {
    setAmountPaid(Math.round((numAmount / 2) * 100) / 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const finalCategory = isCustomCategory ? customCategory.trim() : category;

    if (!finalCategory) {
      setFormError('Por favor, informe a categoria da despesa.');
      return;
    }
    if (!description.trim()) {
      setFormError('Por favor, informe a descrição detalhada do gasto.');
      return;
    }
    if (numAmount <= 0) {
      setFormError('O valor total do gasto deve ser maior que zero.');
      return;
    }
    if (numPaid < 0) {
      setFormError('O valor pago não pode ser negativo.');
      return;
    }

    const payload: ManualExpenseEntry = {
      id: expenseToEdit?.id || `exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      expenseDate,
      category: finalCategory,
      description: description.trim(),
      amount: numAmount,
      amountPaid: numPaid,
      amountPending,
      paymentStatus: calculatedPaymentStatus,
      paymentMethod,
      dueDate: amountPending > 0 && dueDate ? dueDate : undefined,
      notes: notes.trim() || undefined,
      createdAt: expenseToEdit?.createdAt || new Date().toISOString(),
    };

    setIsSaving(true);
    const result = await saveManualExpense(payload);
    setIsSaving(false);

    if (result.success) {
      if (onSaveSuccess) onSaveSuccess();
      onClose();
    } else {
      setFormError(
        result.error ||
          'Erro ao salvar despesa no Supabase. Os dados foram preservados neste formulário para você tentar novamente.'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-[#090C19] border border-rose-500/30 rounded-3xl shadow-2xl shadow-rose-500/10 overflow-hidden text-white my-auto">
        {/* HEADER DO MODAL */}
        <div className="p-5 sm:p-6 border-b border-rose-500/20 bg-gradient-to-r from-[#0D1022] via-[#1A1224] to-[#0D1022] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-[#8423DA] p-0.5 flex items-center justify-center shadow-lg shadow-rose-500/20">
              <div className="w-full h-full bg-[#080811] rounded-[14px] flex items-center justify-center">
                <Receipt className="w-5 h-5 text-rose-400" />
              </div>
            </div>
            <div>
              <h3 className="font-heading text-lg sm:text-xl font-black text-white flex items-center gap-2">
                {expenseToEdit ? 'Editar Gasto Operacional' : 'Lançar Novo Gasto'}
              </h3>
              <p className="text-xs text-[#A5A5B8]">
                Controle de saídas do dia a dia da loja (combustível, motoboys, embalagens, aluguel)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-[#141838] hover:bg-rose-500/20 text-gray-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ALERTA DE ERRO COM PRESERVAÇÃO */}
        {formError && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-xs shrink-0 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1 font-medium">{formError}</div>
          </div>
        )}

        {/* CORPO DO FORMULÁRIO COM SCROLL */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* SEÇÃO 1: DATA E CATEGORIA */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0D1022] border border-[#8423DA]/20 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-400 uppercase tracking-wider">
              <Tag className="w-4 h-4" />
              <span>1. Identificação do Gasto</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Data da Despesa */}
              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1.5">
                  Data da Despesa *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-xs text-white focus:outline-none focus:border-rose-400 transition-all font-bold"
                  />
                </div>
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1.5">
                  Categoria da Despesa *
                </label>
                <select
                  value={isCustomCategory ? 'custom' : category}
                  onChange={(e) => {
                    if (e.target.value === 'custom') {
                      setIsCustomCategory(true);
                    } else {
                      setIsCustomCategory(false);
                      setCategory(e.target.value);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-xs text-white focus:outline-none focus:border-rose-400 transition-all cursor-pointer font-bold"
                >
                  {PRESET_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} className="bg-[#090C19]">
                      {cat}
                    </option>
                  ))}
                  <option value="custom" className="bg-[#090C19] text-[#00DFFF]">
                    + Digitar outra categoria personalizada...
                  </option>
                </select>
              </div>
            </div>

            {/* Campo para Categoria Personalizada */}
            {isCustomCategory && (
              <div>
                <label className="block text-[11px] font-bold text-[#00DFFF] mb-1.5">
                  Nome da Categoria Personalizada *
                </label>
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Ex: Impostos MEI, Contador, Manutenção Ar Condicionado..."
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#141838] border border-[#00DFFF]/40 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00DFFF]"
                />
              </div>
            )}

            {/* Descrição Detalhada */}
            <div>
              <label className="block text-[11px] font-bold text-gray-300 mb-1.5">
                Descrição do Gasto *
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Gasolina moto para entregas do final de semana"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-rose-400"
              />
            </div>
          </div>

          {/* SEÇÃO 2: VALORES E PAGAMENTO */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0D1022] border border-[#8423DA]/20 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-400 uppercase tracking-wider">
              <DollarSign className="w-4 h-4" />
              <span>2. Valores & Quitação</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Valor Total */}
              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1.5">
                  Valor Total do Gasto (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#141838] border border-rose-500/30 text-xs text-rose-300 font-black text-right focus:outline-none focus:border-rose-400"
                />
              </div>

              {/* Valor Efetivamente Pago */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-emerald-400">
                    Valor Já Pago (R$) *
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleFullPayment}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors cursor-pointer"
                      title="100% quitado"
                    >
                      100% Pago
                    </button>
                    <button
                      type="button"
                      onClick={handleHalfPayment}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors cursor-pointer"
                      title="50% entrada"
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      onClick={handleZeroPayment}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition-colors cursor-pointer"
                      title="A pagar (0%)"
                    >
                      A Pagar (0%)
                    </button>
                  </div>
                </div>

                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#141838] border border-emerald-500/40 text-xs text-emerald-300 font-extrabold text-right focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Forma de Pagamento */}
              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1.5">
                  Forma de Pagamento
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-xs text-white focus:outline-none focus:border-rose-400 cursor-pointer font-bold"
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm} value={pm} className="bg-[#090C19]">
                      {pm}
                    </option>
                  ))}
                </select>
              </div>

              {/* Data de Vencimento (se houver valor pendente) */}
              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1.5 flex items-center justify-between">
                  <span>Data de Vencimento</span>
                  <span className="text-[10px] text-gray-500 font-normal">
                    {amountPending > 0 ? '(Para conta a pagar)' : '(Opcional)'}
                  </span>
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-xs text-white focus:outline-none focus:border-rose-400 font-bold"
                />
              </div>
            </div>

            {/* Painel de Situação Financeira do Gasto */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-[#141838] border border-emerald-500/25 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    Saída Efetiva do Caixa
                  </span>
                  <div className="font-heading text-lg font-black text-emerald-300 mt-0.5">
                    R$ {numPaid.toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                      calculatedPaymentStatus === 'pago'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : calculatedPaymentStatus === 'parcial'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {calculatedPaymentStatus === 'pago' && 'Pago'}
                    {calculatedPaymentStatus === 'parcial' && 'Parcial'}
                    {calculatedPaymentStatus === 'a_pagar' && 'A Pagar'}
                  </span>
                </div>
              </div>

              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  amountPending > 0
                    ? 'bg-rose-500/10 border-rose-500/30'
                    : 'bg-[#141838] border-[#8423DA]/25'
                }`}
              >
                <div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      amountPending > 0 ? 'text-rose-400' : 'text-gray-400'
                    }`}
                  >
                    Valor Pendente (A Pagar)
                  </span>
                  <div
                    className={`font-heading text-lg font-black mt-0.5 ${
                      amountPending > 0 ? 'text-rose-300' : 'text-gray-400'
                    }`}
                  >
                    R$ {amountPending.toFixed(2)}
                  </div>
                </div>
                {amountPending > 0 ? (
                  <span className="text-[11px] text-rose-300 font-semibold px-2 py-0.5 rounded bg-rose-500/20">
                    Consta em Contas a Pagar
                  </span>
                ) : (
                  <span className="text-[11px] text-gray-500 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-emerald-400" /> Sem pendência
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* SEÇÃO 3: OBSERVAÇÕES ADICIONAIS */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0D1022] border border-[#8423DA]/20 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-400 uppercase tracking-wider">
              <FileText className="w-4 h-4" />
              <span>3. Observações / Comprovante</span>
            </div>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Pago com Pix do CNPJ; comprovante guardado no envelope; vence todo dia 10..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-rose-400 resize-none"
            />
          </div>

          {/* BOTÕES DE AÇÃO */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#141838] hover:bg-[#8423DA]/30 text-gray-300 hover:text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 via-[#8423DA] to-[#00DFFF] text-white font-black text-xs shadow-lg shadow-rose-500/20 hover:brightness-110 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Salvando no Supabase...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{expenseToEdit ? 'Atualizar Gasto' : 'Salvar Gasto Operacional'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
