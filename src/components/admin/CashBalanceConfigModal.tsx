import React, { useState, useEffect } from 'react';
import { InitialCashBalanceConfig } from '../../types/catalog';
import {
  X,
  Wallet,
  Calendar,
  DollarSign,
  AlertCircle,
  Check,
  Building,
  CreditCard,
  Banknote,
  PiggyBank,
  Database,
  SlidersHorizontal,
} from 'lucide-react';

interface CashBalanceConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: InitialCashBalanceConfig;
  onSave: (config: InitialCashBalanceConfig) => Promise<{ success: boolean; error?: string }> | void;
}

export const CashBalanceConfigModal: React.FC<CashBalanceConfigModalProps> = ({
  isOpen,
  onClose,
  currentConfig,
  onSave,
}) => {
  const [globalDate, setGlobalDate] = useState(
    currentConfig.referenceDate || `${new Date().getFullYear()}-01-01`
  );
  const [useIndividualDates, setUseIndividualDates] = useState(false);

  const [pixBanco, setPixBanco] = useState<number | ''>(currentConfig.pix_banco || 0);
  const [pixDate, setPixDate] = useState(
    currentConfig.channelReferenceDates?.pix_banco || currentConfig.referenceDate || `${new Date().getFullYear()}-01-01`
  );

  const [dinheiroCaixa, setDinheiroCaixa] = useState<number | ''>(currentConfig.dinheiro_caixa || 0);
  const [dinheiroDate, setDinheiroDate] = useState(
    currentConfig.channelReferenceDates?.dinheiro_caixa || currentConfig.referenceDate || `${new Date().getFullYear()}-01-01`
  );

  const [cartaoMaquininha, setCartaoMaquininha] = useState<number | ''>(currentConfig.cartao_maquininha || 0);
  const [cartaoDate, setCartaoDate] = useState(
    currentConfig.channelReferenceDates?.cartao_maquininha || currentConfig.referenceDate || `${new Date().getFullYear()}-01-01`
  );

  const [outro, setOutro] = useState<number | ''>(currentConfig.outro || 0);
  const [outroDate, setOutroDate] = useState(
    currentConfig.channelReferenceDates?.outro || currentConfig.referenceDate || `${new Date().getFullYear()}-01-01`
  );

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const gDate = currentConfig.referenceDate || `${new Date().getFullYear()}-01-01`;
      setGlobalDate(gDate);

      setPixBanco(currentConfig.pix_banco ?? 0);
      setPixDate(currentConfig.channelReferenceDates?.pix_banco || gDate);

      setDinheiroCaixa(currentConfig.dinheiro_caixa ?? 0);
      setDinheiroDate(currentConfig.channelReferenceDates?.dinheiro_caixa || gDate);

      setCartaoMaquininha(currentConfig.cartao_maquininha ?? 0);
      setCartaoDate(currentConfig.channelReferenceDates?.cartao_maquininha || gDate);

      setOutro(currentConfig.outro ?? 0);
      setOutroDate(currentConfig.channelReferenceDates?.outro || gDate);

      const hasDiffDates =
        (currentConfig.channelReferenceDates?.pix_banco && currentConfig.channelReferenceDates.pix_banco !== gDate) ||
        (currentConfig.channelReferenceDates?.dinheiro_caixa && currentConfig.channelReferenceDates.dinheiro_caixa !== gDate) ||
        (currentConfig.channelReferenceDates?.cartao_maquininha && currentConfig.channelReferenceDates.cartao_maquininha !== gDate) ||
        (currentConfig.channelReferenceDates?.outro && currentConfig.channelReferenceDates.outro !== gDate);

      setUseIndividualDates(Boolean(hasDiffDates));
      setSaveSuccess(false);
    }
  }, [isOpen, currentConfig]);

  if (!isOpen) return null;

  const numPix = typeof pixBanco === 'number' ? pixBanco : 0;
  const numDinheiro = typeof dinheiroCaixa === 'number' ? dinheiroCaixa : 0;
  const numCartao = typeof cartaoMaquininha === 'number' ? cartaoMaquininha : 0;
  const numOutro = typeof outro === 'number' ? outro : 0;
  const totalInitial = numPix + numDinheiro + numCartao + numOutro;

  const handleGlobalDateChange = (date: string) => {
    setGlobalDate(date);
    if (!useIndividualDates) {
      setPixDate(date);
      setDinheiroDate(date);
      setCartaoDate(date);
      setOutroDate(date);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const config: InitialCashBalanceConfig = {
      referenceDate: globalDate || `${new Date().getFullYear()}-01-01`,
      pix_banco: numPix,
      dinheiro_caixa: numDinheiro,
      cartao_maquininha: numCartao,
      outro: numOutro,
      channelReferenceDates: {
        pix_banco: useIndividualDates ? pixDate : globalDate,
        dinheiro_caixa: useIndividualDates ? dinheiroDate : globalDate,
        cartao_maquininha: useIndividualDates ? cartaoDate : globalDate,
        outro: useIndividualDates ? outroDate : globalDate,
      },
    };

    try {
      await onSave(config);
      setSaveSuccess(true);
      setTimeout(() => {
        setIsSaving(false);
        onClose();
      }, 600);
    } catch {
      setIsSaving(false);
    }
  };

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0B0D1B] border border-[#8423DA]/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#0D1022] via-[#141838] to-[#0D1022] border-b border-[#8423DA]/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#00DFFF] to-[#8423DA] p-0.5 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-[#080811] rounded-[14px] flex items-center justify-center">
                <PiggyBank className="w-5 h-5 text-[#00DFFF]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading text-lg font-black text-white">
                  Saldos Iniciais de Caixa
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-[#00DFFF]/10 border border-[#00DFFF]/30 text-[10px] font-bold text-[#00DFFF] flex items-center gap-1">
                  <Database className="w-2.5 h-2.5" />
                  Supabase
                </span>
              </div>
              <p className="text-xs text-[#A5A5B8]">
                Ponto de partida do seu fluxo de caixa por conta/canal
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
          {/* Information Notice */}
          <div className="p-3.5 rounded-2xl bg-[#00DFFF]/5 border border-[#00DFFF]/20 flex items-start gap-2.5 text-xs text-[#A5A5B8]">
            <AlertCircle className="w-4 h-4 text-[#00DFFF] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Cada saldo inicial possui seu valor e data de referência. O sistema considera que esses saldos já incluem tudo o que ocorreu antes dessa data, <strong>evitando contabilizar em duplicidade</strong> movimentações anteriores.
            </p>
          </div>

          {/* Reference Date Controls */}
          <div className="p-4 rounded-2xl bg-[#080811] border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#00DFFF]" />
                Data de Referência {useIndividualDates ? 'Padrão' : 'Geral'}
              </label>
              <button
                type="button"
                onClick={() => setUseIndividualDates(!useIndividualDates)}
                className="text-[11px] text-[#00DFFF] hover:underline flex items-center gap-1 font-semibold"
              >
                <SlidersHorizontal className="w-3 h-3" />
                {useIndividualDates ? 'Unificar Datas' : 'Datas Individuais por Canal'}
              </button>
            </div>

            <input
              type="date"
              value={globalDate}
              onChange={(e) => handleGlobalDateChange(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0D1022] border border-[#8423DA]/30 text-white text-sm focus:outline-none focus:border-[#00DFFF] transition-colors"
            />
            <p className="text-[11px] text-gray-500">
              Movimentações anteriores a esta data serão preservadas no histórico, mas não duplicarão este saldo.
            </p>
          </div>

          {/* Accounts Breakdown */}
          <div className="space-y-3 pt-1">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Saldos Iniciais por Canal
            </h4>

            {/* Pix / Banco */}
            <div className="p-3.5 rounded-2xl bg-[#080811] border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-[#00DFFF]" />
                  Pix / Conta Bancária
                </label>
                <span className="text-[11px] text-gray-500">Saldo em banco</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-bold">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={pixBanco}
                    onChange={(e) => setPixBanco(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="0,00"
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#0D1022] border border-[#8423DA]/25 text-white text-sm focus:outline-none focus:border-[#00DFFF]"
                  />
                </div>
                {useIndividualDates ? (
                  <div>
                    <input
                      type="date"
                      value={pixDate}
                      onChange={(e) => setPixDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#0D1022] border border-white/10 text-white text-xs"
                      title="Data de referência para o Pix/Banco"
                    />
                  </div>
                ) : (
                  <div className="text-[11px] text-gray-500 flex items-center px-1">
                    Ref: {globalDate}
                  </div>
                )}
              </div>
            </div>

            {/* Dinheiro Físico / Gaveta */}
            <div className="p-3.5 rounded-2xl bg-[#080811] border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                  <Banknote className="w-3.5 h-3.5 text-[#10B981]" />
                  Dinheiro Físico (Caixa da Loja)
                </label>
                <span className="text-[11px] text-gray-500">Em espécie</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-bold">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={dinheiroCaixa}
                    onChange={(e) => setDinheiroCaixa(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="0,00"
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#0D1022] border border-[#8423DA]/25 text-white text-sm focus:outline-none focus:border-[#10B981]"
                  />
                </div>
                {useIndividualDates ? (
                  <div>
                    <input
                      type="date"
                      value={dinheiroDate}
                      onChange={(e) => setDinheiroDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#0D1022] border border-white/10 text-white text-xs"
                      title="Data de referência para Dinheiro"
                    />
                  </div>
                ) : (
                  <div className="text-[11px] text-gray-500 flex items-center px-1">
                    Ref: {globalDate}
                  </div>
                )}
              </div>
            </div>

            {/* Cartão / Maquininha */}
            <div className="p-3.5 rounded-2xl bg-[#080811] border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-[#8423DA]" />
                  Cartão / Maquininha (Em trânsito)
                </label>
                <span className="text-[11px] text-gray-500">A compensar</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-bold">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={cartaoMaquininha}
                    onChange={(e) => setCartaoMaquininha(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="0,00"
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#0D1022] border border-[#8423DA]/25 text-white text-sm focus:outline-none focus:border-[#8423DA]"
                  />
                </div>
                {useIndividualDates ? (
                  <div>
                    <input
                      type="date"
                      value={cartaoDate}
                      onChange={(e) => setCartaoDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#0D1022] border border-white/10 text-white text-xs"
                      title="Data de referência para Cartão"
                    />
                  </div>
                ) : (
                  <div className="text-[11px] text-gray-500 flex items-center px-1">
                    Ref: {globalDate}
                  </div>
                )}
              </div>
            </div>

            {/* Outro Canal */}
            <div className="p-3.5 rounded-2xl bg-[#080811] border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-[#FACC15]" />
                  Outro Canal Financeiro
                </label>
                <span className="text-[11px] text-gray-500">Outros saldos</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-bold">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={outro}
                    onChange={(e) => setOutro(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="0,00"
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#0D1022] border border-[#8423DA]/25 text-white text-sm focus:outline-none focus:border-[#FACC15]"
                  />
                </div>
                {useIndividualDates ? (
                  <div>
                    <input
                      type="date"
                      value={outroDate}
                      onChange={(e) => setOutroDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#0D1022] border border-white/10 text-white text-xs"
                      title="Data de referência para Outros"
                    />
                  </div>
                ) : (
                  <div className="text-[11px] text-gray-500 flex items-center px-1">
                    Ref: {globalDate}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Total Initial Balance Summary Card */}
          <div className="p-4 rounded-2xl bg-[#141838] border border-[#8423DA]/30 flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-400 font-medium block">Saldo Inicial Total Configurado</span>
              <span className="text-[11px] text-gray-500">Soma sincronizada de todos os canais</span>
            </div>
            <div className="font-heading text-xl font-black text-white">
              {formatBRL(totalInitial)}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00DFFF] to-[#8423DA] hover:opacity-95 text-white text-xs font-black shadow-lg shadow-[#00DFFF]/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  Salvo com Sucesso!
                </>
              ) : isSaving ? (
                'Salvando no Supabase...'
              ) : (
                'Salvar no Supabase'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
