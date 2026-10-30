import React, { useState, useEffect } from 'react';
import { useCatalog } from '../../context/CatalogContext';
import { CashMovementEntry, CashAccountChannel } from '../../types/catalog';
import {
  X,
  Calendar,
  DollarSign,
  FileText,
  AlertCircle,
  Check,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  Layers,
  Wallet,
} from 'lucide-react';

interface CashMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  movementToEdit?: CashMovementEntry | null;
  onSaveSuccess?: () => void;
}

const ACCOUNT_CHANNELS: { id: CashAccountChannel; label: string }[] = [
  { id: 'pix_banco', label: 'Pix / Conta Bancária' },
  { id: 'dinheiro_caixa', label: 'Dinheiro Físico (Caixa da Loja)' },
  { id: 'cartao_maquininha', label: 'Cartão / Maquininha' },
  { id: 'outro', label: 'Outro Canal Financeiro' },
];

const PRESET_CATEGORIES: Record<'entrada' | 'saida' | 'transferencia', string[]> = {
  entrada: [
    'Aporte de Capital / Investimento Próprio',
    'Empréstimo Recebido',
    'Devolução de Fornecedor / Estorno',
    'Rendimento de Aplicação',
    'Venda de Ativo / Outros',
  ],
  saida: [
    'Retirada Pró-labore do Dono',
    'Ajuste de Saldo / Quebra de Caixa',
    'Devolução / Estorno a Cliente',
    'Impostos / Taxas MEI',
    'Doação / Eventual',
    'Outras Saídas Avulsas',
  ],
  transferencia: [
    'Depósito de Dinheiro em Banco',
    'Saque do Banco para Caixa Físico',
    'Repasse de Cartão para Conta Corrente',
    'Transferência Interna entre Contas',
  ],
};

const toDateTimeLocal = (isoString?: string) => {
  const d = isoString ? new Date(isoString) : new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export const CashMovementModal: React.FC<CashMovementModalProps> = ({
  isOpen,
  onClose,
  movementToEdit,
  onSaveSuccess,
}) => {
  const { saveCashMovement } = useCatalog();

  const [movementType, setMovementType] = useState<'entrada' | 'saida' | 'transferencia'>('entrada');
  const [movementDate, setMovementDate] = useState<string>(toDateTimeLocal());
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<string>('Aporte de Capital / Investimento Próprio');
  const [customCategory, setCustomCategory] = useState<string>('');
  const [isCustomCategory, setIsCustomCategory] = useState<boolean>(false);
  const [amount, setAmount] = useState<number | ''>('');
  const [accountChannel, setAccountChannel] = useState<CashAccountChannel>('pix_banco');
  const [destinationChannel, setDestinationChannel] = useState<CashAccountChannel>('dinheiro_caixa');
  const [notes, setNotes] = useState<string>('');

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (movementToEdit) {
      const isTransfer = movementToEdit.originType === 'transferencia';
      setMovementType(isTransfer ? 'transferencia' : movementToEdit.type);
      setMovementDate(toDateTimeLocal(movementToEdit.movementDate));
      setDescription(movementToEdit.description || '');
      setCategory(movementToEdit.category || 'Outros');
      setIsCustomCategory(false);
      setCustomCategory('');
      setAmount(movementToEdit.amount || 0);
      setAccountChannel(movementToEdit.accountChannel || 'pix_banco');
      setDestinationChannel(movementToEdit.destinationAccountChannel || 'dinheiro_caixa');
      setNotes(movementToEdit.notes || '');
    } else {
      setMovementType('entrada');
      setMovementDate(toDateTimeLocal());
      setDescription('');
      setCategory(PRESET_CATEGORIES.entrada[0]);
      setIsCustomCategory(false);
      setCustomCategory('');
      setAmount('');
      setAccountChannel('pix_banco');
      setDestinationChannel('dinheiro_caixa');
      setNotes('');
    }
    setFormError(null);
  }, [isOpen, movementToEdit]);

  if (!isOpen) return null;

  const handleTypeChange = (type: 'entrada' | 'saida' | 'transferencia') => {
    setMovementType(type);
    setCategory(PRESET_CATEGORIES[type][0] || 'Outros');
    setIsCustomCategory(false);
    setCustomCategory('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const numAmount = Number(amount) || 0;
    if (numAmount <= 0) {
      setFormError('O valor da movimentação deve ser maior que zero.');
      return;
    }
    if (!description.trim()) {
      setFormError('Por favor, informe uma descrição para o lançamento.');
      return;
    }

    if (movementType === 'transferencia' && accountChannel === destinationChannel) {
      setFormError('Na transferência interna, a conta de origem e de destino devem ser diferentes.');
      return;
    }

    const finalCategory = isCustomCategory ? customCategory.trim() : category;

    const payload: CashMovementEntry = {
      id: movementToEdit?.id || `mov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      movementDate: new Date(movementDate).toISOString(),
      type: movementType === 'transferencia' ? 'saida' : movementType,
      originType: movementType === 'transferencia' ? 'transferencia' : 'avulso',
      category: finalCategory,
      accountChannel,
      destinationAccountChannel: movementType === 'transferencia' ? destinationChannel : undefined,
      amount: numAmount,
      description: description.trim(),
      notes: notes.trim() || undefined,
      createdAt: movementToEdit?.createdAt || new Date().toISOString(),
    };

    setIsSaving(true);
    const result = await saveCashMovement(payload);
    setIsSaving(false);

    if (result.success) {
      if (onSaveSuccess) onSaveSuccess();
      onClose();
    } else {
      setFormError(result.error || 'Erro ao salvar movimentação no Supabase. Os dados foram preservados no formulário.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-[#090C19] border border-[#00DFFF]/30 rounded-3xl shadow-2xl overflow-hidden text-white my-auto">
        {/* HEADER */}
        <div className="p-5 sm:p-6 border-b border-[#00DFFF]/20 bg-gradient-to-r from-[#0D1022] via-[#121A33] to-[#0D1022] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#00DFFF] to-[#8423DA] p-0.5 flex items-center justify-center shadow-lg shadow-[#00DFFF]/20">
              <div className="w-full h-full bg-[#080811] rounded-[14px] flex items-center justify-center">
                <Wallet className="w-5 h-5 text-[#00DFFF]" />
              </div>
            </div>
            <div>
              <h3 className="font-heading text-lg sm:text-xl font-black text-white">
                {movementToEdit ? 'Editar Lançamento Avulso' : 'Novo Lançamento Avulso no Caixa'}
              </h3>
              <p className="text-xs text-[#A5A5B8]">
                Entrada, saída ou transferência manual independente de vendas e compras
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-[#141838] hover:bg-[#8423DA]/30 text-gray-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ALERTA DE ERRO */}
        {formError && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-xs shrink-0 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1 font-medium">{formError}</div>
          </div>
        )}

        {/* FORM */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* SELETOR DE TIPO */}
          <div className="p-1.5 rounded-2xl bg-[#0D1022] border border-[#8423DA]/25 grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => handleTypeChange('entrada')}
              className={`py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                movementType === 'entrada'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-md shadow-emerald-500/10'
                  : 'text-gray-400 hover:text-white hover:bg-[#141838]'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>Entrada [+]</span>
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange('saida')}
              className={`py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                movementType === 'saida'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-md shadow-rose-500/10'
                  : 'text-gray-400 hover:text-white hover:bg-[#141838]'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Saída [-]</span>
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange('transferencia')}
              className={`py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                movementType === 'transferencia'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-md shadow-cyan-500/10'
                  : 'text-gray-400 hover:text-white hover:bg-[#141838]'
              }`}
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>Transferência</span>
            </button>
          </div>

          {/* DADOS PRINCIPAIS */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0D1022] border border-[#8423DA]/20 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Data e Hora */}
              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1.5">
                  Data e Hora Efetiva *
                </label>
                <input
                  type="datetime-local"
                  value={movementDate}
                  onChange={(e) => setMovementDate(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-xs text-white focus:outline-none focus:border-[#00DFFF] font-bold"
                />
              </div>

              {/* Valor */}
              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1.5">
                  Valor da Movimentação (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                  required
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-[#141838] border text-xs font-black text-right focus:outline-none ${
                    movementType === 'entrada'
                      ? 'border-emerald-500/40 text-emerald-400 focus:border-emerald-400'
                      : movementType === 'saida'
                      ? 'border-rose-500/40 text-rose-300 focus:border-rose-400'
                      : 'border-cyan-500/40 text-cyan-300 focus:border-cyan-400'
                  }`}
                />
              </div>
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-[11px] font-bold text-gray-300 mb-1.5">
                Descrição do Lançamento *
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  movementType === 'entrada'
                    ? 'Ex: Aporte inicial de capital para giro da loja'
                    : movementType === 'saida'
                    ? 'Ex: Retirada pró-labore semanal do sócio'
                    : 'Ex: Depósito de dinheiro da gaveta na conta bancária'
                }
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00DFFF]"
              />
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-[11px] font-bold text-gray-300 mb-1.5">
                Categoria da Movimentação *
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
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-xs text-white focus:outline-none focus:border-[#00DFFF] cursor-pointer font-bold"
              >
                {PRESET_CATEGORIES[movementType].map((cat) => (
                  <option key={cat} value={cat} className="bg-[#090C19]">
                    {cat}
                  </option>
                ))}
                <option value="custom" className="bg-[#090C19] text-[#00DFFF]">
                  + Digitar outra categoria personalizada...
                </option>
              </select>
            </div>

            {isCustomCategory && (
              <div>
                <label className="block text-[11px] font-bold text-[#00DFFF] mb-1.5">
                  Nome da Categoria Personalizada *
                </label>
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Ex: Empréstimo familiar, Venda de equipamento usado..."
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#141838] border border-[#00DFFF]/40 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00DFFF]"
                />
              </div>
            )}
          </div>

          {/* CONTAS / CANAIS FINANCEIROS */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0D1022] border border-[#8423DA]/20 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1.5">
                  {movementType === 'transferencia' ? 'Conta de Origem (Saiu de)' : 'Conta / Canal Financeiro *'}
                </label>
                <select
                  value={accountChannel}
                  onChange={(e) => setAccountChannel(e.target.value as CashAccountChannel)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-xs text-white focus:outline-none focus:border-[#00DFFF] cursor-pointer font-bold"
                >
                  {ACCOUNT_CHANNELS.map((ch) => (
                    <option key={ch.id} value={ch.id} className="bg-[#090C19]">
                      {ch.label}
                    </option>
                  ))}
                </select>
              </div>

              {movementType === 'transferencia' && (
                <div>
                  <label className="block text-[11px] font-bold text-cyan-300 mb-1.5">
                    Conta de Destino (Entrou em) *
                  </label>
                  <select
                    value={destinationChannel}
                    onChange={(e) => setDestinationChannel(e.target.value as CashAccountChannel)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#141838] border border-cyan-500/40 text-xs text-cyan-300 focus:outline-none focus:border-cyan-400 cursor-pointer font-bold"
                  >
                    {ACCOUNT_CHANNELS.map((ch) => (
                      <option key={ch.id} value={ch.id} className="bg-[#090C19]">
                        {ch.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {movementType === 'transferencia' && (
              <p className="text-[11px] text-gray-400 italic">
                * Transferências internas movimentam valores entre suas contas (ex: dinheiro para o banco) sem alterar a receita ou despesa total da loja.
              </p>
            )}
          </div>

          {/* OBSERVAÇÕES */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0D1022] border border-[#8423DA]/20 space-y-2">
            <label className="block text-[11px] font-bold text-gray-300">
              Observações / Comprovante (Opcional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Comprovante guardado no arquivo; transferência realizada via app do banco..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00DFFF] resize-none"
            />
          </div>

          {/* BOTÕES */}
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
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#00DFFF] via-[#8423DA] to-[#E53CF3] text-black font-extrabold text-xs shadow-lg shadow-[#00DFFF]/20 hover:brightness-110 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Salvando no Supabase...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{movementToEdit ? 'Atualizar Lançamento' : 'Salvar no Fluxo de Caixa'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
