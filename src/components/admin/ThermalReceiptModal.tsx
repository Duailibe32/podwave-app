import React, { useState } from 'react';
import { CustomerOrderHistoryItem, StoreSettings } from '../../types/catalog';
import {
  Printer,
  Copy,
  Check,
  X,
  FileText,
  Sliders,
  DollarSign,
  Truck,
  MapPin,
  Calendar,
  Clock,
  User,
  ShoppingBag,
} from 'lucide-react';
import { toast } from '../../context/ToastContext';

interface ThermalReceiptModalProps {
  order: CustomerOrderHistoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  settings: StoreSettings;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  order,
  isOpen,
  onClose,
  settings,
}) => {
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>('80mm');
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen || !order) return null;

  const orderDate = new Date(order.createdAt);
  const formattedDate = orderDate.toLocaleDateString('pt-BR');
  const formattedTime = orderDate.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const storeName = settings.storeName || 'PODWAVE OFICIAL';
  const storePhone = settings.whatsappNumber || '(86) 99901-4685';

  const isDelivery = order.deliveryType === 'delivery';

  // Generate plain text receipt for copying to WhatsApp
  const generateAsciiReceipt = (): string => {
    const divider = '----------------------------------------';
    const doubleDivider = '========================================';
    const lines: string[] = [];

    lines.push(doubleDivider);
    lines.push(`       ${storeName.toUpperCase()}`);
    lines.push(`    Vapes, Pods & Acessórios Premium`);
    lines.push(`    WhatsApp: ${storePhone}`);
    lines.push(doubleDivider);
    lines.push(`PEDIDO: #${order.referenceId}`);
    lines.push(`DATA: ${formattedDate} às ${formattedTime}`);
    lines.push(`MODALIDADE: [ ${isDelivery ? 'ENTREGA VIA MOTOBOY' : 'RETIRADA NO LOCAL'} ]`);
    lines.push(divider);
    lines.push(`CLIENTE: ${order.customerName || 'Cliente'}`);
    lines.push(`WHATSAPP: ${order.customerPhone || 'Não informado'}`);

    if (isDelivery) {
      lines.push(divider);
      lines.push('ENDEREÇO DE ENTREGA:');
      lines.push(`${order.addressSummary || 'Endereço não informado'}`);
    }

    if (order.customerNotes) {
      lines.push(`OBS/REF: ${order.customerNotes}`);
    }

    lines.push(divider);
    lines.push('ITENS DO PEDIDO:');

    if (order.items && order.items.length > 0) {
      order.items.forEach((item, idx) => {
        lines.push(
          `${idx + 1}. ${item.quantity}x ${item.modelName} - ${item.flavorName}`
        );
        lines.push(
          `   R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}`
        );
      });
    } else {
      lines.push(`Total de itens registrados no valor de R$ ${order.total.toFixed(2).replace('.', ',')}`);
    }

    lines.push(divider);
    lines.push(`SUBTOTAL:           R$ ${order.subtotal.toFixed(2).replace('.', ',')}`);

    if (order.discount && order.discount > 0) {
      lines.push(`DESCONTOS:         -R$ ${order.discount.toFixed(2).replace('.', ',')}`);
    }

    if (order.deliveryFee && order.deliveryFee > 0) {
      lines.push(`TAXA ENTREGA:      +R$ ${order.deliveryFee.toFixed(2).replace('.', ',')}`);
    } else if (isDelivery) {
      lines.push(`TAXA ENTREGA:       R$ 0,00 (GRÁTIS)`);
    }

    lines.push(doubleDivider);
    lines.push(`VALOR A COBRAR:    R$ ${order.total.toFixed(2).replace('.', ',')}`);
    lines.push(`PAGAMENTO:         ${(order.paymentMethod || 'A combinar').toUpperCase()}`);
    lines.push(
      `SITUAÇÃO:          [ ${(order.paymentStatus || 'Pendente').toUpperCase()} ]`
    );
    lines.push(doubleDivider);
    lines.push('');
    lines.push('Assinatura do Recebedor:');
    lines.push('');
    lines.push('________________________________________');
    lines.push('');
    lines.push('Obrigado pela preferência!');
    lines.push('Volte sempre à PodWave 💨');
    lines.push(doubleDivider);

    return lines.join('\n');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    const text = generateAsciiReceipt();
    if (navigator?.clipboard?.writeText) {
      void navigator.clipboard.writeText(text);
      setIsCopied(true);
      toast.success(
        'Comprovante copiado!',
        'Texto formatado pronto para enviar ao motoboy via WhatsApp.'
      );
      setTimeout(() => setIsCopied(false), 3000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="thermal-receipt-title"
    >
      <div className="relative w-full max-w-xl rounded-2xl sm:rounded-3xl bg-[#0D1022] border-2 border-[#8423DA]/40 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#141838] via-[#10142D] to-[#181D3D] border-b border-[#8423DA]/30 flex items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#8423DA] to-[#00DFFF] flex items-center justify-center text-white shadow-md">
              <Printer className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3
                id="thermal-receipt-title"
                className="font-heading font-black text-white text-sm sm:text-base"
              >
                Comprovante Térmico de Pedido (Motoboy & Balcão)
              </h3>
              <p className="text-[11px] text-[#A5A5B8]">
                Pedido #{order.referenceId} &bull; Formato para impressoras de 58mm e 80mm
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-[#141838] hover:bg-[#8423DA]/30 text-gray-300 hover:text-white transition cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Settings */}
        <div className="px-4 sm:px-5 py-3 bg-[#11152A] border-b border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0 print:hidden">
          {/* Paper Width Selector */}
          <div className="flex items-center gap-1.5 bg-[#080811] p-1 rounded-xl border border-white/10">
            <span className="text-[10px] text-[#A5A5B8] px-2 font-bold uppercase tracking-wider">
              Largura do Papel:
            </span>
            <button
              type="button"
              onClick={() => setPaperWidth('58mm')}
              className={`px-3 py-1 rounded-lg font-mono font-bold text-xs transition cursor-pointer ${
                paperWidth === '58mm'
                  ? 'bg-[#00DFFF] text-[#080811] shadow-sm'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              58mm (Mini POS)
            </button>
            <button
              type="button"
              onClick={() => setPaperWidth('80mm')}
              className={`px-3 py-1 rounded-lg font-mono font-bold text-xs transition cursor-pointer ${
                paperWidth === '80mm'
                  ? 'bg-[#00DFFF] text-[#080811] shadow-sm'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              80mm (Balcão)
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition"
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#00DFFF]" />
                  <span>Copiar Texto</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-[#080811] font-black text-xs flex items-center gap-1.5 cursor-pointer transition shadow-md"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Agora (Ctrl+P)</span>
            </button>
          </div>
        </div>

        {/* Paper Container Preview */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-[#080811]/90 flex justify-center items-start print:p-0 print:bg-white">
          {/* Thermal Receipt Paper Card */}
          <div
            id="thermal-receipt-printable"
            style={{ width: paperWidth === '58mm' ? '58mm' : '80mm' }}
            className="bg-white text-black p-3 sm:p-4 rounded-lg shadow-2xl font-mono text-xs leading-tight border border-gray-200 select-all print:border-none print:shadow-none print:p-1 print:m-0"
          >
            {/* Header */}
            <div className="text-center pb-2 border-b border-dashed border-gray-400 space-y-0.5">
              <h4 className="font-extrabold text-sm tracking-wide">
                {storeName.toUpperCase()}
              </h4>
              <p className="text-[10px] text-gray-600 font-sans">
                Vapes, Pods & Acessórios Premium
              </p>
              <p className="text-[10px] font-bold">WhatsApp: {storePhone}</p>
            </div>

            {/* Order info */}
            <div className="py-2 border-b border-dashed border-gray-400 space-y-1 text-[11px]">
              <div className="flex justify-between font-bold">
                <span>PEDIDO:</span>
                <span>#{order.referenceId}</span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-700">
                <span>DATA/HORA:</span>
                <span>
                  {formattedDate} {formattedTime}
                </span>
              </div>
              <div className="flex justify-between font-bold pt-0.5">
                <span>MODALIDADE:</span>
                <span className="uppercase">
                  {isDelivery ? 'ENTREGA VIA MOTOBOY' : 'RETIRADA NO LOCAL'}
                </span>
              </div>
            </div>

            {/* Customer Details */}
            <div className="py-2 border-b border-dashed border-gray-400 space-y-1 text-[11px]">
              <div>
                <span className="font-bold">CLIENTE: </span>
                <span>{order.customerName || 'Cliente'}</span>
              </div>
              <div>
                <span className="font-bold">WHATSAPP: </span>
                <span>{order.customerPhone || 'Não informado'}</span>
              </div>

              {isDelivery && (
                <div className="pt-1">
                  <span className="font-bold block">ENDEREÇO DE ENTREGA:</span>
                  <p className="text-[11px] font-semibold leading-snug mt-0.5">
                    {order.addressSummary || 'Endereço não informado'}
                  </p>
                </div>
              )}

              {order.customerNotes && (
                <div className="pt-1 text-[10px] bg-gray-100 p-1.5 rounded">
                  <span className="font-bold">OBSERVAÇÕES: </span>
                  <span>{order.customerNotes}</span>
                </div>
              )}
            </div>

            {/* Items table */}
            <div className="py-2 border-b border-dashed border-gray-400 space-y-1.5">
              <div className="flex justify-between font-bold text-[10px] uppercase text-gray-600 pb-0.5 border-b border-gray-200">
                <span>QTD ITEM / SABOR</span>
                <span>VALOR</span>
              </div>

              {order.items && order.items.length > 0 ? (
                order.items.map((item, idx) => (
                  <div key={idx} className="space-y-0.5 text-[11px]">
                    <div className="flex justify-between font-bold">
                      <span className="truncate pr-1">
                        {item.quantity}x {item.modelName}
                      </span>
                      <span className="shrink-0">
                        R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-700 pl-3">
                      Sabor: {item.flavorEmoji || ''} {item.flavorName}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-[11px] text-gray-700">
                  Total de itens registrados no pedido.
                </div>
              )}
            </div>

            {/* Financial Summary */}
            <div className="py-2 border-b-2 border-dashed border-black space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Subtotal Itens:</span>
                <span>R$ {order.subtotal.toFixed(2).replace('.', ',')}</span>
              </div>

              {order.discount && order.discount > 0 ? (
                <div className="flex justify-between text-gray-800">
                  <span>Descontos:</span>
                  <span>-R$ {order.discount.toFixed(2).replace('.', ',')}</span>
                </div>
              ) : null}

              {isDelivery && (
                <div className="flex justify-between">
                  <span>Taxa de Entrega:</span>
                  <span>
                    {order.deliveryFee && order.deliveryFee > 0
                      ? `+R$ ${order.deliveryFee.toFixed(2).replace('.', ',')}`
                      : 'R$ 0,00 (GRÁTIS)'}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-baseline pt-1.5 border-t border-black font-extrabold text-sm sm:text-base">
                <span>TOTAL A COBRAR:</span>
                <span>R$ {order.total.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="py-2 border-b border-dashed border-gray-400 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="font-bold">FORMA DE PAGAMENTO:</span>
                <span className="font-bold uppercase">
                  {order.paymentMethod || 'A combinar'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>STATUS DO PAGAMENTO:</span>
                <span
                  className={`font-black uppercase ${
                    order.paymentStatus === 'pago'
                      ? 'text-emerald-700'
                      : 'text-amber-800'
                  }`}
                >
                  [ {order.paymentStatus || 'PENDENTE'} ]
                </span>
              </div>
            </div>

            {/* Motoboy & Customer Signature Line */}
            <div className="pt-4 pb-2 text-center space-y-2">
              <div className="w-full border-b border-black pt-4" />
              <p className="text-[9px] uppercase tracking-wider text-gray-700 font-bold">
                Assinatura do Recebedor (Canhoto de Entrega)
              </p>
            </div>

            {/* Footer friendly message */}
            <div className="text-center pt-2 text-[10px] text-gray-600 space-y-0.5">
              <p className="font-bold">Obrigado pela preferência!</p>
              <p>Volte sempre à PodWave 💨</p>
            </div>
          </div>
        </div>

        {/* Global Print Stylesheet for true thermal receipts */}
        <style>{`
          @media print {
            body * {
              visibility: hidden !important;
            }
            #thermal-receipt-printable, #thermal-receipt-printable * {
              visibility: visible !important;
            }
            #thermal-receipt-printable {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              margin: 0 !important;
              padding: 4mm !important;
              background: white !important;
              color: black !important;
              box-shadow: none !important;
              border: none !important;
              width: ${paperWidth} !important;
              max-width: ${paperWidth} !important;
            }
            @page {
              margin: 0;
              size: ${paperWidth} auto;
            }
          }
        `}</style>
      </div>
    </div>
  );
};
