import React, { useState, useEffect } from 'react';
import { useCatalog } from '../../context/CatalogContext';
import {
  ManualCommitmentEntry,
  CommitmentInstallmentItem,
  CashAccountChannel,
} from '../../types/catalog';
import {
  X,
  Calendar,
  DollarSign,
  FileText,
  AlertCircle,
  Check,
  Building,
  User,
  Phone,
  Tag,
  CreditCard,
  Split,
  Plus,
  Trash2,
  Clock,
} from 'lucide-react';

interface ManualCommitmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  commitmentToEdit?: ManualCommitmentEntry | null;
  initialType?: 'a_pagar' | 'a_receber';
}

const CATEGORIES_A_PAGAR = [
  'Fornecedor / Mercadoria',
  'Aluguel / Imóvel',
  'Energia / Água / Internet',
  'Serviços / Honorários',
  'Impostos / DAS MEI',
  'Empréstimo / Financiamento',
  'Manutenção / Veículo',
  'Outras Obrigações',
];

const CATEGORIES_A_RECEBER = [
  'Venda Fiada a Cliente',
  'Empréstimo Concedido',
  'Reembolso / Estorno a Receber',
  'Prestação de Serviços',
  'Devolução de Fornecedor',
  'Outros Créditos',
];

export const ManualCommitmentModal: React.FC<ManualCommitmentModalProps> = ({
  isOpen,
  onClose,
  commitmentToEdit,
  initialType = 'a_pagar',
}) => {
  const { saveManualCommitment } = useCatalog();

  const [type, setType] = useState<'a_pagar' | 'a_receber'>(initialType);
  const [description, setDescription] = useState('');
  const [counterpartyName, setCounterpartyName] = useState('');
  const [counterpartyContact, setCounterpartyContact] = useState('');
  const [category, setCategory] = useState(CATEGORIES_A_PAGAR[0]);
  const [totalAmount, setTotalAmount] = useState<number | ''>('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Pix');
  const [accountChannel, setAccountChannel] = useState<CashAccountChannel>('pix_banco');
  const [notes, setNotes] = useState('');

  // Installments generator state
  const [hasInstallments, setHasInstallments] = useState(false);
  const [installmentsCount, setInstallmentsCount] = useState<number>(2);
  const [installments, setInstallments] = useState<CommitmentInstallmentItem[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      if (commitmentToEdit) {
        setType(commitmentToEdit.type);
        setDescription(commitmentToEdit.description);
        setCounterpartyName(commitmentToEdit.counterpartyName);
        setCounterpartyContact(commitmentToEdit.counterpartyContact || '');
        setCategory(commitmentToEdit.category);
        setTotalAmount(commitmentToEdit.totalAmount);
        setIssueDate(commitmentToEdit.issueDate);
        setDueDate(commitmentToEdit.dueDate || '');
        setPaymentMethod(commitmentToEdit.paymentMethod || 'Pix');
        setAccountChannel(commitmentToEdit.accountChannel || 'pix_banco');
        setNotes(commitmentToEdit.notes || '');

        if (commitmentToEdit.installments && commitmentToEdit.installments.length > 0) {
          setHasInstallments(true);
          setInstallmentsCount(commitmentToEdit.installments.length);
          setInstallments(commitmentToEdit.installments);
        } else {
          setHasInstallments(false);
          setInstallmentsCount(2);
          setInstallments([]);
        }
      } else {
        setType(initialType);
        setDescription('');
        setCounterpartyName('');
        setCounterpartyContact('');
        setCategory(initialType === 'a_pagar' ? CATEGORIES_A_PAGAR[0] : CATEGORIES_A_RECEBER[0]);
        setTotalAmount('');
        setIssueDate(new Date().toISOString().slice(0, 10));
        setDueDate('');
        setPaymentMethod('Pix');
        setAccountChannel('pix_banco');
        setNotes('');
        setHasInstallments(false);
        setInstallmentsCount(2);
        setInstallments([]);
      }
    }
  }, [isOpen, commitmentToEdit, initialType]);

  if (!isOpen) return null;

  // Gerador automático de parcelas
  const handleGenerateInstallments = (count: number, baseDateStr?: string, total?: number) => {
    const num = Math.max(2, Math.min(count, 36));
    const targetTotal = typeof total === 'number' ? total : typeof totalAmount === 'number' ? totalAmount : 0;
    const baseDate = baseDateStr ? new Date(baseDateStr + 'T12:00:00') : new Date(issueDate + 'T12:00:00');

    const installmentValue = targetTotal > 0 ? Number((targetTotal / num).toFixed(2)) : 0;
    const items: CommitmentInstallmentItem[] = [];

    let accumulated = 0;
    for (let i = 1; i <= num; i++) {
      const d = new Date(baseDate);
      d.setMonth(d.getMonth() + (i - 1));

      // Ajuste de centavos na última parcela
      const val = i === num && targetTotal > 0 ? Number((targetTotal - accumulated).toFixed(2)) : installmentValue;
      accumulated += val;

      items.push({
        id: `inst-${Date.now()}-${i}`,
        installmentNumber: i,
        totalInstallments: num,
        amount: val,
        dueDate: d.toISOString().slice(0, 10),
        amountPaid: 0,
        amountPending: val,
        status: 'pendente',
      });
    }

    setInstallments(items);
  };

  const handleUpdateInstallment = (index: number, field: 'amount' | 'dueDate', value: any) => {
    setInstallments((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };
      if (field === 'amount') {
        const amt = parseFloat(value) || 0;
        item.amount = amt;
        item.amountPending = Math.max(0, amt - item.amountPaid);
      } else if (field === 'dueDate') {
        item.dueDate = value;
      }
      updated[index] = item;
      return updated;
    });
  };

  const installmentsSum = installments.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
  const numTotal = typeof totalAmount === 'number' ? totalAmount : 0;
  const isInstallmentsSumMatching = !hasInstallments || Math.abs(installmentsSum - numTotal) < 0.05;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!description.trim()) {
      setErrorMsg('Informe a descrição do compromisso.');
      return;
    }
    if (!counterpartyName.trim()) {
      setErrorMsg(
        type === 'a_pagar'
          ? 'Informe o nome do fornecedor ou credor.'
          : 'Informe o nome do cliente ou devedor.'
      );
      return;
    }
    if (numTotal <= 0) {
      setErrorMsg('Informe um valor total maior que zero.');
      return;
    }
    if (hasInstallments && !isInstallmentsSumMatching) {
      setErrorMsg(
        `A soma das parcelas (R$ ${installmentsSum.toFixed(2)}) não confere com o valor total (R$ ${numTotal.toFixed(2)}).`
      );
      return;
    }

    setIsSubmitting(true);

    const paidAlready = commitmentToEdit ? commitmentToEdit.amountPaid : 0;
    const pendingVal = Math.max(0, Number((numTotal - paidAlready).toFixed(2)));

    let status: 'pendente' | 'parcial' | 'pago' | 'cancelado' = 'pendente';
    if (pendingVal <= 0.001) status = 'pago';
    else if (paidAlready > 0) status = 'parcial';

    // Determinar data de vencimento principal
    let mainDueDate = dueDate || undefined;
    if (hasInstallments && installments.length > 0) {
      // Vencimento da primeira parcela não quitada
      const firstPending = installments.find((inst) => inst.amountPending > 0);
      if (firstPending) mainDueDate = firstPending.dueDate;
    }

    const payload: ManualCommitmentEntry = {
      id: commitmentToEdit ? commitmentToEdit.id : `compr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      description: description.trim(),
      counterpartyName: counterpartyName.trim(),
      counterpartyContact: counterpartyContact.trim() || undefined,
      category: category.trim() || 'Outros',
      totalAmount: numTotal,
      amountPaid: paidAlready,
      amountPending: pendingVal,
      issueDate: issueDate || new Date().toISOString().slice(0, 10),
      dueDate: mainDueDate,
      paymentMethod,
      accountChannel,
      paymentStatus: status,
      installments: hasInstallments ? installments : [],
      payments: commitmentToEdit?.payments || [],
      notes: notes.trim() || undefined,
      createdAt: commitmentToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const res = await saveManualCommitment(payload);
    setIsSubmitting(false);

    if (res.success) {
      onClose();
    } else {
      setErrorMsg(res.error || 'Erro ao salvar compromisso. Verifique os campos.');
    }
  };

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0B0D1B] border border-[#8423DA]/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#0D1022] via-[#141838] to-[#0D1022] border-b border-[#8423DA]/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl p-0.5 flex items-center justify-center shrink-0 ${
                type === 'a_pagar'
                  ? 'bg-gradient-to-br from-rose-500 to-[#8423DA]'
                  : 'bg-gradient-to-br from-[#10B981] to-[#00DFFF]'
              }`}
            >
              <div className="w-full h-full bg-[#080811] rounded-[14px] flex items-center justify-center">
                <Clock
                  className={`w-5 h-5 ${type === 'a_pagar' ? 'text-rose-400' : 'text-[#10B981]'}`}
                />
              </div>
            </div>
            <div>
              <h3 className="font-heading text-lg font-black text-white">
                {commitmentToEdit
                  ? 'Editar Compromisso Financeiro'
                  : type === 'a_pagar'
                  ? 'Nova Conta a Pagar'
                  : 'Nova Conta a Receber'}
              </h3>
              <p className="text-xs text-[#A5A5B8]">
                Controle manual de obrigações financeiras e fiados sem duplicar o caixa
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

          {/* 1. Tipo: A Pagar vs A Receber */}
          {!commitmentToEdit && (
            <div className="grid grid-cols-2 gap-3 p-1 bg-[#080811] rounded-2xl border border-white/5">
              <button
                type="button"
                onClick={() => {
                  setType('a_pagar');
                  setCategory(CATEGORIES_A_PAGAR[0]);
                }}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  type === 'a_pagar'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                Conta a Pagar (Obrigação)
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('a_receber');
                  setCategory(CATEGORIES_A_RECEBER[0]);
                }}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  type === 'a_receber'
                    ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40 shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                Conta a Receber (Direito)
              </button>
            </div>
          )}

          {/* 2. Descrição & Contraparte */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#00DFFF]" />
                Descrição do Compromisso *
              </label>
              <input
                type="text"
                placeholder={type === 'a_pagar' ? 'Ex: Aluguel da Loja Nov/2026' : 'Ex: Venda Fiada - 2 Pods'}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#080811] border border-[#8423DA]/30 text-white text-sm focus:outline-none focus:border-[#00DFFF]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#8423DA]" />
                {type === 'a_pagar' ? 'Fornecedor / Credor *' : 'Cliente / Devedor *'}
              </label>
              <input
                type="text"
                placeholder={type === 'a_pagar' ? 'Ex: Imobiliária Central / Distribuidor' : 'Ex: Carlos Silva'}
                value={counterpartyName}
                onChange={(e) => setCounterpartyName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#080811] border border-[#8423DA]/30 text-white text-sm focus:outline-none focus:border-[#00DFFF]"
              />
            </div>
          </div>

          {/* 3. Contato & Categoria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-gray-400" />
                Telefone / WhatsApp (Opcional)
              </label>
              <input
                type="text"
                placeholder="(98) 99999-9999"
                value={counterpartyContact}
                onChange={(e) => setCounterpartyContact(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#080811] border border-white/10 text-white text-sm focus:outline-none focus:border-[#00DFFF]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#00DFFF]" />
                Categoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#080811] border border-white/10 text-white text-sm focus:outline-none focus:border-[#00DFFF]"
              >
                {(type === 'a_pagar' ? CATEGORIES_A_PAGAR : CATEGORIES_A_RECEBER).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. Valor Total & Datas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                Valor Total (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                value={totalAmount}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                  setTotalAmount(val);
                  if (hasInstallments && typeof val === 'number') {
                    handleGenerateInstallments(installmentsCount, dueDate || issueDate, val);
                  }
                }}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#080811] border border-[#8423DA]/30 text-white text-sm focus:outline-none focus:border-[#00DFFF] font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#00DFFF]" />
                Data de Criação
              </label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#080811] border border-white/10 text-white text-sm focus:outline-none focus:border-[#00DFFF]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                Data de Vencimento
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  if (hasInstallments) {
                    handleGenerateInstallments(installmentsCount, e.target.value);
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#080811] border border-white/10 text-white text-sm focus:outline-none focus:border-[#00DFFF]"
              />
            </div>
          </div>

          {/* 5. Forma Prevista e Canal Financeiro */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                Forma Prevista
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
                <option value="Transferência">Transferência Bancária</option>
                <option value="Fiado / A Prazo">Fiado / A Prazo</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-gray-400" />
                Canal Financeiro Previsto
              </label>
              <select
                value={accountChannel}
                onChange={(e) => setAccountChannel(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#080811] border border-white/10 text-white text-sm focus:outline-none focus:border-[#00DFFF]"
              >
                <option value="pix_banco">Pix / Conta Bancária</option>
                <option value="dinheiro_caixa">Dinheiro / Caixa da Loja</option>
                <option value="cartao_maquininha">Cartão / Maquininha</option>
                <option value="outro">Outro Canal</option>
              </select>
            </div>
          </div>

          {/* 6. Controle de Parcelamento */}
          <div className="p-4 rounded-2xl bg-[#080811] border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasInstallments}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setHasInstallments(checked);
                    if (checked && installments.length === 0) {
                      handleGenerateInstallments(installmentsCount, dueDate || issueDate);
                    }
                  }}
                  className="w-4 h-4 rounded text-[#00DFFF] focus:ring-0 bg-[#0D1022] border-white/20"
                />
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Split className="w-3.5 h-3.5 text-[#00DFFF]" />
                  Dividir este compromisso em parcelas
                </span>
              </label>

              {hasInstallments && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-400 text-[11px]">Nº de Parcelas:</span>
                  <select
                    value={installmentsCount}
                    onChange={(e) => {
                      const count = Number(e.target.value);
                      setInstallmentsCount(count);
                      handleGenerateInstallments(count, dueDate || issueDate);
                    }}
                    className="px-2 py-1 rounded-lg bg-[#0D1022] border border-white/10 text-white text-xs"
                  >
                    {[2, 3, 4, 5, 6, 8, 10, 12, 18, 24].map((n) => (
                      <option key={n} value={n}>
                        {n}x
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {hasInstallments && (
              <div className="space-y-2 pt-2 border-t border-white/5 animate-in fade-in">
                <div className="grid grid-cols-12 gap-2 text-[10px] text-gray-500 uppercase font-bold px-2">
                  <span className="col-span-2">Parcela</span>
                  <span className="col-span-5">Data de Vencimento</span>
                  <span className="col-span-5 text-right">Valor da Parcela (R$)</span>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                  {installments.map((inst, idx) => (
                    <div
                      key={inst.id || idx}
                      className="grid grid-cols-12 gap-2 items-center p-2 rounded-xl bg-[#0D1022] border border-white/5 text-xs"
                    >
                      <span className="col-span-2 font-bold text-white pl-1">
                        {inst.installmentNumber}/{inst.totalInstallments}
                      </span>
                      <div className="col-span-5">
                        <input
                          type="date"
                          value={inst.dueDate}
                          onChange={(e) => handleUpdateInstallment(idx, 'dueDate', e.target.value)}
                          className="w-full px-2 py-1 rounded-lg bg-[#080811] border border-white/10 text-white text-xs"
                        />
                      </div>
                      <div className="col-span-5 relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-[11px]">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={inst.amount}
                          onChange={(e) => handleUpdateInstallment(idx, 'amount', e.target.value)}
                          className="w-full pl-7 pr-2 py-1 rounded-lg bg-[#080811] border border-white/10 text-white text-xs text-right font-bold"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs pt-2 px-1 border-t border-white/5">
                  <span className="text-gray-400">Soma das Parcelas:</span>
                  <span
                    className={`font-heading font-black ${
                      isInstallmentsSumMatching ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {formatBRL(installmentsSum)}
                    {!isInstallmentsSumMatching && ` (Divergência de ${formatBRL(Math.abs(installmentsSum - numTotal))})`}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 7. Observações */}
          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
              Observações Adicionais
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Nota fiscal nº 450, combinar entrega via WhatsApp..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-[#080811] border border-white/10 text-white text-xs focus:outline-none focus:border-[#00DFFF] resize-none"
            />
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
                type === 'a_pagar'
                  ? 'bg-gradient-to-r from-rose-500 to-[#8423DA] shadow-rose-500/20'
                  : 'bg-gradient-to-r from-[#10B981] to-[#00DFFF] shadow-[#10B981]/20'
              }`}
            >
              <Check className="w-4 h-4" />
              {isSubmitting
                ? 'Salvando...'
                : commitmentToEdit
                ? 'Atualizar Compromisso'
                : type === 'a_pagar'
                ? 'Salvar Conta a Pagar'
                : 'Salvar Conta a Receber'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
