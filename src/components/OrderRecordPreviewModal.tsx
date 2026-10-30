import React, { useState } from 'react';
import { useCatalog } from '../context/CatalogContext';
import { toast } from '../context/ToastContext';
import { OrderForm } from '../types/catalog';
import { formatAttendanceRecord, generateReferenceId, getBrasiliaDateTime } from '../utils/recordFormatter';
import { X, Copy, Check, Send, Edit2, ArrowLeft, ShieldCheck, FileText } from 'lucide-react';

interface OrderRecordPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  form: OrderForm;
}

export const OrderRecordPreviewModal: React.FC<OrderRecordPreviewModalProps> = ({
  isOpen,
  onClose,
  onEdit,
  form,
}) => {
  const {
    cart,
    isUsbCableAdded,
    cablePrice,
    appliedCoupon,
    submitOrderViaWhatsapp,
    settings,
  } = useCatalog();

  const [copied, setCopied] = useState(false);
  const [referenceId] = useState(() => generateReferenceId());
  const [dateTime] = useState(() => getBrasiliaDateTime());

  if (!isOpen) return null;

  const recordText = formatAttendanceRecord({
    referenceId,
    dateTimeBrasilia: dateTime,
    form,
    cart,
    isUsbCableAdded,
    cablePrice,
    appliedCoupon,
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(recordText);
      setCopied(true);
      toast.success('Ficha copiada!', 'Resumo do pedido copiado para a área de transferência.');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback copy using textarea
      const textarea = document.createElement('textarea');
      textarea.value = recordText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      toast.success('Ficha copiada!', 'Resumo do pedido copiado para a área de transferência.');
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleSendWhatsapp = async () => {
    // Send the exact same validated Unicode string previewed by the user
    if (await submitOrderViaWhatsapp(form, recordText)) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-[#0D1022] border-2 border-[#8423DA]/50 shadow-[0_0_50px_rgba(132,35,218,0.4)] text-white z-10 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#8423DA]/25 flex items-center justify-between bg-[#11152A]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#8423DA]/30 border border-[#8423DA] flex items-center justify-center text-[#00DFFF]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>Ficha de Atendimento &bull; PodWave</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/40">
                  Prévia Oficial
                </span>
              </h3>
              <p className="text-xs text-[#A5A5B8]">
                Confira todas as informações registradas antes de copiar ou encaminhar
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-[#181C38] hover:bg-[#8423DA] text-gray-300 hover:text-white transition cursor-pointer"
            title="Fechar prévia"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Notice Bar */}
        <div className="bg-[#141838]/80 px-5 py-2.5 border-b border-[#8423DA]/20 flex items-center justify-between text-xs">
          <span className="text-gray-300 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#00DFFF]" />
            <span>Valores calculados em centavos inteiros &bull; Fuso horário de Brasília</span>
          </span>
          <span className="font-mono text-[11px] text-[#00DFFF] font-bold">
            Ref: {referenceId}
          </span>
        </div>

        {/* Scrollable Document Content formatted as a Digital Voucher */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="rounded-2xl bg-[#080811] p-4 sm:p-6 border border-[#8423DA]/30 shadow-inner font-mono text-xs sm:text-sm text-gray-200 whitespace-pre-wrap leading-relaxed select-all">
            {recordText}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-[#8423DA]/25 bg-[#11152A] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="px-3.5 py-2 rounded-xl bg-[#181C38] hover:bg-[#20264d] text-gray-200 hover:text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-white/10"
              title="Voltar ao formulário para editar dados"
            >
              <Edit2 className="w-3.5 h-3.5 text-[#00DFFF]" />
              <span>Editar Dados</span>
            </button>

            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-transparent hover:bg-white/5 text-gray-400 hover:text-white text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleCopy}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-md ${
                copied
                  ? 'bg-emerald-600 text-white shadow-emerald-500/30'
                  : 'bg-[#181C38] hover:bg-[#8423DA] text-white border border-[#00DFFF]/50'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-200" />
                  <span>Registro Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[#00DFFF]" />
                  <span>Copiar Registro</span>
                </>
              )}
            </button>

            <button
              onClick={handleSendWhatsapp}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:brightness-110 text-white text-xs font-black uppercase tracking-wider shadow-lg flex items-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <Send className="w-4 h-4 fill-white stroke-none" />
              <span>Enviar para WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
