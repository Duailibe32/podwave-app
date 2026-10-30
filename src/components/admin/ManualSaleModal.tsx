import React, { useState, useEffect, useRef } from 'react';
import { useCatalog } from '../../context/CatalogContext';
import { ManualSaleEntry, ManualSaleItem } from '../../types/catalog';
import {
  X,
  Plus,
  Trash2,
  Calendar,
  User,
  Phone,
  DollarSign,
  Package,
  Check,
  AlertCircle,
  Truck,
  CreditCard,
  FileText,
  Clock,
  Sparkles,
} from 'lucide-react';

interface ManualSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleToEdit?: ManualSaleEntry | null;
  onSaveSuccess?: () => void;
}

const PAYMENT_METHODS = [
  'Pix',
  'Dinheiro',
  'Cartão de Débito',
  'Cartão de Crédito',
  'Fiado',
  'Misto',
] as const;

const DELIVERY_TYPES = [
  'Entrega Própria',
  'Retirada no Local',
  'Motoboy Terceirizado',
  'Correios / Envio',
] as const;

const ORDER_STATUSES: { id: ManualSaleEntry['orderStatus']; label: string; color: string }[] = [
  { id: 'confirmado', label: 'Confirmado', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  { id: 'entregue', label: 'Entregue', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
  { id: 'pendente', label: 'Pendente', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  { id: 'cancelado', label: 'Cancelado', color: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
];

// Helper to format ISO to datetime-local string (YYYY-MM-DDTHH:mm)
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

export const ManualSaleModal: React.FC<ManualSaleModalProps> = ({
  isOpen,
  onClose,
  saleToEdit,
  onSaveSuccess,
}) => {
  const { models, saveManualSale } = useCatalog();

  // Form states
  const [saleDate, setSaleDate] = useState<string>(toDateTimeLocal());
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [deliveryType, setDeliveryType] = useState<string>('Entrega Própria');
  const [orderStatus, setOrderStatus] = useState<ManualSaleEntry['orderStatus']>('confirmado');
  const [paymentMethod, setPaymentMethod] = useState<string>('Pix');
  const [receivedDate, setReceivedDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [amountReceived, setAmountReceived] = useState<number>(0);

  // Items list
  const [items, setItems] = useState<
    Array<{
      id: string;
      productId?: string;
      flavorId?: string;
      productName: string;
      flavorName?: string;
      quantity: number;
      unitPrice: number;
      unitCost?: number | '';
    }>
  >([]);

  // Item selector helpers
  const [selectedCatalogModelId, setSelectedCatalogModelId] = useState<string>('');
  const [selectedCatalogFlavorName, setSelectedCatalogFlavorName] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const newSaleId = useRef('');
  const mutation = useRef({ fingerprint:'', id:'' });

  // Initialize or reset form when modal opens or saleToEdit changes
  useEffect(() => {
    if (!isOpen) return;
    newSaleId.current = crypto.randomUUID();
    mutation.current = {fingerprint:'',id:''};

    if (saleToEdit) {
      setSaleDate(toDateTimeLocal(saleToEdit.saleDate));
      setCustomerName(saleToEdit.customerName || '');
      setCustomerPhone(saleToEdit.customerPhone || '');
      setDeliveryType(saleToEdit.deliveryType || 'Entrega Própria');
      setOrderStatus(saleToEdit.orderStatus || 'confirmado');
      setPaymentMethod(saleToEdit.paymentMethod || 'Pix');
      setReceivedDate(saleToEdit.receivedDate ? toDateTimeLocal(saleToEdit.receivedDate) : '');
      setNotes(saleToEdit.notes || '');
      setDeliveryFee(Number(saleToEdit.deliveryFee) || 0);
      setDiscount(Number(saleToEdit.discount) || 0);
      setAmountReceived(Number(saleToEdit.amountReceived) || 0);

      if (saleToEdit.items && saleToEdit.items.length > 0) {
        setItems(
          saleToEdit.items.map((it, idx) => ({
            id: it.id || `item-${Date.now()}-${idx}`,
            productId: it.productId,
            flavorId: it.flavorId,
            productName: it.productName || '',
            flavorName: it.flavorName,
            quantity: Number(it.quantity) || 1,
            unitPrice: Number(it.unitPrice) || 0,
            unitCost: it.unitCost !== undefined && it.unitCost !== null ? Number(it.unitCost) : '',
          }))
        );
      } else {
        setItems([
          {
            id: `item-${Date.now()}`,
            productName: '',
            quantity: 1,
            unitPrice: 0,
            unitCost: '',
          },
        ]);
      }
    } else {
      // New sale defaults
      setSaleDate(toDateTimeLocal());
      setCustomerName('');
      setCustomerPhone('');
      setDeliveryType('Entrega Própria');
      setOrderStatus('confirmado');
      setPaymentMethod('Pix');
      setReceivedDate(toDateTimeLocal());
      setNotes('');
      setDeliveryFee(0);
      setDiscount(0);
      setAmountReceived(0);
      setItems([
        {
          id: `item-${Date.now()}`,
          productName: '',
          quantity: 1,
          unitPrice: 0,
          unitCost: '',
        },
      ]);
    }
    setFormError(null);
  }, [isOpen, saleToEdit]);

  if (!isOpen) return null;

  // Real calculations
  const grossTotal = items.reduce((acc, it) => {
    const q = Number(it.quantity) || 0;
    const p = Number(it.unitPrice) || 0;
    return acc + q * p;
  }, 0);

  const netTotal = Math.max(0, grossTotal - Number(discount || 0) + Number(deliveryFee || 0));
  const amountPending = Math.max(0, netTotal - Number(amountReceived || 0));

  // Determine dynamic paymentStatus
  const calculatedPaymentStatus: ManualSaleEntry['paymentStatus'] =
    amountReceived >= netTotal && netTotal > 0
      ? 'pago'
      : amountReceived > 0 && amountReceived < netTotal
      ? 'parcial'
      : 'pendente';

  // Item list handlers
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productName: '',
        quantity: 1,
        unitPrice: 0,
        unitCost: '',
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      setFormError('A venda precisa conter pelo menos um item.');
      return;
    }
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleUpdateItem = (id: string, updates: Partial<(typeof items)[0]>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...updates } : it)));
  };

  // Add item directly from existing catalog
  const handleAddFromCatalog = () => {
    if (!selectedCatalogModelId) return;
    const model = models.find((m) => m.id === selectedCatalogModelId);
    if (!model) return;
    const flavor = model.flavors.find((f) => f.id === selectedCatalogFlavorName);
    if (!model.active || !flavor?.inStock || !Number.isInteger(flavor.demoQuantity) || (flavor.demoQuantity ?? 0)<1) {
      setFormError('Escolha um produto e sabor com quantidade disponível no estoque.'); return;
    }

    const newItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId: model.id,
      flavorId: flavor.id,
      productName: model.modelName,
      flavorName: flavor.name,
      quantity: 1,
      unitPrice: Number(model.startingPrice) || 0,
      unitCost: '' as const, // Unknown unit cost by default, never zero
    };

    // If first item is completely empty, replace it; otherwise append
    if (items.length === 1 && !items[0].productName.trim() && items[0].unitPrice === 0) {
      setItems([newItem]);
    } else {
      setItems((prev) => [...prev, newItem]);
    }

    setSelectedCatalogModelId('');
    setSelectedCatalogFlavorName('');
  };

  // Quick payment amount buttons
  const setFullPayment = () => {
    setAmountReceived(netTotal);
    if (!receivedDate) setReceivedDate(toDateTimeLocal());
  };

  const setZeroPayment = () => {
    setAmountReceived(0);
  };

  const setHalfPayment = () => {
    setAmountReceived(Math.round((netTotal / 2) * 100) / 100);
    if (!receivedDate) setReceivedDate(toDateTimeLocal());
  };

  // Form submission with safety (never loss of data on error)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setFormError(null);

    // Validation
    if (items.length === 0) {
      setFormError('Adicione pelo menos um produto para registrar a venda.');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.productName.trim()) {
        setFormError(`O item #${i + 1} precisa ter um nome ou descrição preenchida.`);
        return;
      }
      if (Number(it.quantity) <= 0) {
        setFormError(`A quantidade do item "${it.productName}" deve ser no mínimo 1.`);
        return;
      }
      if (Number(it.unitPrice) < 0) {
        setFormError(`O preço unitário do item "${it.productName}" não pode ser negativo.`);
        return;
      }
    }

    const payloadItems: ManualSaleItem[] = items.map((it) => ({
      id: it.id,
      productId: it.productId,
      flavorId: it.flavorId,
      productName: it.productName.trim(),
      flavorName: it.flavorName?.trim() || undefined,
      quantity: Number(it.quantity) || 1,
      unitPrice: Number(it.unitPrice) || 0,
      // Unit cost is undefined if empty or not informed (NEVER assume zero)
      unitCost:
        it.unitCost !== '' && it.unitCost !== undefined && it.unitCost !== null
          ? Number(it.unitCost)
          : undefined,
      subtotal: (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0),
    }));

    const saleEntry: ManualSaleEntry = {
      ...saleToEdit,
      id: saleToEdit?.id || newSaleId.current,
      stockManaged: saleToEdit ? saleToEdit.stockManaged === true : true,
      stockRevision: saleToEdit?.stockRevision ?? 0,
      saleDate: new Date(saleDate).toISOString(),
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      deliveryType,
      deliveryFee: Number(deliveryFee) || 0,
      discount: Number(discount) || 0,
      grossTotal,
      netTotal,
      amountReceived: Number(amountReceived) || 0,
      amountPending,
      paymentStatus: calculatedPaymentStatus,
      paymentMethod,
      orderStatus,
      receivedDate: amountReceived > 0 && receivedDate ? new Date(receivedDate).toISOString() : undefined,
      items: saleToEdit && !saleToEdit.stockManaged ? saleToEdit.items : payloadItems,
      receipts:
        saleToEdit?.receipts && saleToEdit.receipts.length > 0
          ? saleToEdit.receipts
          : amountReceived > 0
          ? [
              {
                id: `rcpt-${Date.now()}`,
                amount: Number(amountReceived) || 0,
                receiptDate: amountReceived > 0 && receivedDate ? new Date(receivedDate).toISOString() : new Date(saleDate).toISOString(),
                paymentMethod,
                notes: 'Recebimento registrado da venda',
                createdAt: new Date().toISOString(),
              },
            ]
          : [],
      notes: notes.trim() || undefined,
      createdAt: saleToEdit?.createdAt || new Date().toISOString(),
    };

    setIsSaving(true);
    const fingerprint = JSON.stringify({items,paymentMethod,orderStatus,saleDate,customerName,customerPhone,deliveryType,receivedDate,notes,deliveryFee,discount,amountReceived});
    if (mutation.current.fingerprint !== fingerprint) mutation.current = {fingerprint,id:crypto.randomUUID()};
    saleEntry.stockRequestId = mutation.current.id;
    const result = await saveManualSale(saleEntry);
    setIsSaving(false);

    if (result.success) {
      if (onSaveSuccess) onSaveSuccess();
      onClose();
    } else {
      // Keep form intact and show clear error
      setFormError(
        result.error ||
          'Não foi possível salvar a venda no Supabase. Os dados foram mantidos nesta janela para você tentar novamente.'
      );
    }
  };

  const selectedModelObj = models.find((m) => m.id === selectedCatalogModelId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#090C19] border border-[#8423DA]/40 rounded-3xl shadow-2xl shadow-[#8423DA]/20 overflow-hidden text-white my-auto">
        {/* HEADER DO MODAL */}
        <div className="p-5 sm:p-6 border-b border-[#8423DA]/20 bg-gradient-to-r from-[#0D1022] via-[#121633] to-[#0D1022] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#00DFFF] to-[#8423DA] p-0.5 flex items-center justify-center shadow-lg shadow-[#00DFFF]/20">
              <div className="w-full h-full bg-[#080811] rounded-[14px] flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-[#00DFFF]" />
              </div>
            </div>
            <div>
              <h3 className="font-heading text-lg sm:text-xl font-black text-white flex items-center gap-2">
                {saleToEdit ? 'Editar Venda Manual' : 'Cadastrar Nova Venda'}
              </h3>
              <p className="text-xs text-[#A5A5B8]">
                Lançamento manual de venda atendida no WhatsApp com controle financeiro real
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

        {/* MENSAGEM DE ERRO (PRESERVA DADOS) */}
        {formError && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-xs shrink-0 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1 font-medium">{formError}</div>
          </div>
        )}

        {/* CORPO DO FORMULÁRIO COM SCROLL */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* SEÇÃO 1: CABEÇALHO DO PEDIDO (DATA, STATUS, CLIENTE) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0D1022] border border-[#8423DA]/20 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[#00DFFF] uppercase tracking-wider">
              <Calendar className="w-4 h-4" />
              <span>1. Informações Básicas da Venda</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Data e Horário */}
              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1.5">
                  Data e Horário da Venda *
                </label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-xs text-white focus:outline-none focus:border-[#00DFFF] transition-all"
                  />
                </div>
              </div>

              {/* Status do Pedido */}
              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1.5">
                  Status do Pedido *
                </label>
                <select
                  value={orderStatus}
                  onChange={(e) => setOrderStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-xs text-white focus:outline-none focus:border-[#00DFFF] transition-all cursor-pointer font-bold"
                >
                  {ORDER_STATUSES.map((st) => (
                    <option key={st.id} value={st.id} className="bg-[#090C19] text-white">
                      {st.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nome do Cliente */}
              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1.5 flex items-center justify-between">
                  <span>Nome do Cliente</span>
                  <span className="text-[10px] text-gray-500 font-normal">(Opcional)</span>
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Ex: Carlos Oliveira"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00DFFF] transition-all"
                  />
                </div>
              </div>

              {/* Telefone / WhatsApp */}
              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1.5 flex items-center justify-between">
                  <span>WhatsApp / Telefone</span>
                  <span className="text-[10px] text-gray-500 font-normal">(Opcional)</span>
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Ex: (11) 99999-8888"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00DFFF] transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: ITENS DA VENDA (MÚLTIPLOS PRODUTOS) */}
          {saleToEdit && !saleToEdit.stockManaged && (
            <p className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-semibold text-amber-300 leading-relaxed">
              Venda histórica: os itens são preservados e não haverá baixa retroativa no estoque. Você pode atualizar os demais dados.
            </p>
          )}
          <div inert={Boolean(saleToEdit && !saleToEdit.stockManaged)} className="p-4 sm:p-5 rounded-2xl bg-[#0D1022] border border-[#8423DA]/20 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#00DFFF] uppercase tracking-wider">
                <Package className="w-4 h-4" />
                <span>2. Produtos & Quantidades (Múltiplos Itens)</span>
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#181C3D] hover:bg-[#8423DA]/40 text-[#00DFFF] hover:text-white border border-[#00DFFF]/30 text-xs font-bold transition-all cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Linha Avulsa</span>
              </button>
            </div>

            {/* SELETOR RÁPIDO DO CATÁLOGO EXISTENTE */}
            <div className="p-3.5 rounded-xl bg-[#111530] border border-[#8423DA]/25 flex flex-col md:flex-row items-stretch md:items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-300 shrink-0">
                <Sparkles className="w-4 h-4 text-[#00DFFF]" />
                <span>Puxar do Catálogo:</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
                {/* Selecionar Modelo */}
                <select
                  value={selectedCatalogModelId}
                  onChange={(e) => {
                    setSelectedCatalogModelId(e.target.value);
                    setSelectedCatalogFlavorName('');
                  }}
                  className="px-3 py-2 rounded-xl bg-[#181C3D] border border-[#8423DA]/30 text-xs text-white focus:outline-none focus:border-[#00DFFF] cursor-pointer"
                >
                  <option value="" className="bg-[#090C19]">
                    -- Escolha um Pod / Aparelho --
                  </option>
                  {models.map((m) => (
                    <option key={m.id} value={m.id} className="bg-[#090C19]">
                      {m.brandName} - {m.modelName} (R$ {m.startingPrice.toFixed(2)})
                    </option>
                  ))}
                </select>

                {/* Selecionar Sabor (se o modelo tiver sabores) */}
                <select
                  value={selectedCatalogFlavorName}
                  onChange={(e) => setSelectedCatalogFlavorName(e.target.value)}
                  disabled={!selectedModelObj || selectedModelObj.flavors.length === 0}
                  className="px-3 py-2 rounded-xl bg-[#181C3D] border border-[#8423DA]/30 text-xs text-white focus:outline-none focus:border-[#00DFFF] cursor-pointer disabled:opacity-50"
                >
                  <option value="" className="bg-[#090C19]">
                    {selectedModelObj && selectedModelObj.flavors.length > 0
                      ? '-- Selecione o Sabor --'
                      : 'Sem variação de sabor'}
                  </option>
                  {selectedModelObj?.flavors.map((f) => (
                    <option key={f.id} value={f.id} disabled={!f.inStock || !Number.isInteger(f.demoQuantity) || (f.demoQuantity ?? 0)<1} className="bg-[#090C19]">
                      {f.name} — {f.demoQuantity ?? 'não informado'} em estoque
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleAddFromCatalog}
                disabled={!selectedCatalogModelId || !selectedCatalogFlavorName}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00DFFF] to-[#8423DA] text-black font-extrabold text-xs shadow-md shadow-[#00DFFF]/20 hover:brightness-110 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                + Inserir na Venda
              </button>
            </div>

            {/* TABELA/LISTA DE ITENS */}
            <div className="space-y-3">
              {items.map((item, index) => {
                const subtotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl bg-[#141838] border border-[#8423DA]/25 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center tabular-nums"
                  >
                    {/* Descrição / Produto */}
                    <div className="sm:col-span-5 space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-[#C4C6D8]">
                          Item #{index + 1} - Produto / Descrição *
                        </label>
                      </div>
                      <input
                        type="text"
                        value={item.productName}
                        onChange={(e) => handleUpdateItem(item.id, { productName: e.target.value })}
                        placeholder="Ex: Ignite V50 ou Cartucho 0.8"
                        required
                        className="w-full px-3 py-2 rounded-lg bg-[#090C19] border border-[#8423DA]/30 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00DFFF]"
                      />
                      {item.flavorName && (
                        <div className="text-[10px] text-[#00DFFF] flex items-center gap-1 font-semibold">
                          <span>Sabor:</span>
                          <span className="text-gray-200">{item.flavorName}</span>
                        </div>
                      )}
                    </div>

                    {/* Quantidade */}
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-[#C4C6D8]">Qtd *</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          handleUpdateItem(item.id, { quantity: Math.max(1, parseInt(e.target.value) || 1) })
                        }
                        required
                        className="w-full px-3 py-2 rounded-lg bg-[#090C19] border border-[#8423DA]/30 text-xs text-white text-center font-bold tabular-nums focus:outline-none focus:border-[#00DFFF]"
                      />
                    </div>

                    {/* Preço Unitário */}
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-[#C4C6D8]">Preço Unit. (R$) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) =>
                          handleUpdateItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })
                        }
                        required
                        className="w-full px-3 py-2 rounded-lg bg-[#090C19] border border-[#8423DA]/30 text-xs text-white text-right font-bold tabular-nums focus:outline-none focus:border-[#00DFFF]"
                      />
                    </div>

                    {/* Custo Unitário (Opcional - Nunca forçar zero) */}
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-[#C4C6D8] flex items-center justify-between">
                        <span>Custo Unit.</span>
                        <span className="text-[9px] text-gray-400">(Opcional)</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="N/I"
                        value={item.unitCost}
                        onChange={(e) =>
                          handleUpdateItem(item.id, {
                            unitCost: e.target.value === '' ? '' : parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-[#090C19] border border-[#8423DA]/30 text-xs text-gray-200 placeholder-gray-500 text-right tabular-nums focus:outline-none focus:border-[#00DFFF]"
                        title="Deixe em branco se o custo for desconhecido"
                      />
                    </div>

                    {/* Subtotal & Remover */}
                    <div className="sm:col-span-1 flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-4">
                      <div className="text-right sm:hidden">
                        <span className="text-[10px] text-gray-400">Subtotal: </span>
                        <span className="text-xs font-bold text-white">R$ {subtotal.toFixed(2)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={items.length <= 1}
                        className="p-2 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Remover produto da venda"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Aviso sobre custo desconhecido */}
            <p className="text-[11px] text-gray-400 italic">
              * Dica: Se o custo da mercadoria não for informado, o sistema mantém como desconhecido e não simula margem falsa.
            </p>
          </div>

          {/* SEÇÃO 3: ENTREGA, DESCONTO E TOTALIZAÇÃO */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0D1022] border border-[#8423DA]/20 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[#00DFFF] uppercase tracking-wider">
              <Truck className="w-4 h-4" />
              <span>3. Entrega & Descontos</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Tipo de Entrega */}
              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1.5">
                  Modalidade de Entrega
                </label>
                <select
                  value={deliveryType}
                  onChange={(e) => setDeliveryType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-xs text-white focus:outline-none focus:border-[#00DFFF] cursor-pointer font-bold"
                >
                  {DELIVERY_TYPES.map((dt) => (
                    <option key={dt} value={dt} className="bg-[#090C19]">
                      {dt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Taxa de Entrega / Frete */}
              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1.5">
                  Taxa de Entrega / Frete (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-xs text-white font-bold text-right focus:outline-none focus:border-[#00DFFF]"
                />
              </div>

              {/* Desconto */}
              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1.5">
                  Desconto Concedido (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-xs text-rose-300 font-bold text-right focus:outline-none focus:border-[#00DFFF]"
                />
              </div>
            </div>

            {/* Resumo dos Valores da Venda */}
            <div className="p-4 rounded-xl bg-[#141838]/80 border border-[#8423DA]/30 flex flex-wrap items-center justify-between gap-4">
              <div className="text-xs">
                <span className="text-gray-400">Total dos Itens: </span>
                <span className="font-bold text-white">R$ {grossTotal.toFixed(2)}</span>
                {deliveryFee > 0 && (
                  <span className="text-gray-400 ml-3">
                    + Frete: <span className="font-semibold text-white">R$ {deliveryFee.toFixed(2)}</span>
                  </span>
                )}
                {discount > 0 && (
                  <span className="text-rose-400 ml-3">
                    - Desconto: <span className="font-semibold">R$ {discount.toFixed(2)}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-extrabold tracking-wider text-gray-300">
                  Total Líquido da Venda:
                </span>
                <span className="font-heading text-xl sm:text-2xl font-black text-[#00DFFF]">
                  R$ {netTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* SEÇÃO 4: PAGAMENTO, RECEBIMENTO & PENDÊNCIA (CONTROLE FINANCEIRO REAL) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0D1022] border border-[#8423DA]/20 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[#00DFFF] uppercase tracking-wider">
              <CreditCard className="w-4 h-4" />
              <span>4. Pagamento & Recebimento Efetivo</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Forma de Pagamento */}
              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1.5">
                  Forma de Pagamento *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => {
                    const method = e.target.value;
                    setPaymentMethod(method);
                    // Se for fiado, sugere valor recebido 0
                    if (method === 'Fiado' && amountReceived > 0) {
                      setAmountReceived(0);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-xs text-white focus:outline-none focus:border-[#00DFFF] cursor-pointer font-bold"
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm} value={pm} className="bg-[#090C19]">
                      {pm}
                    </option>
                  ))}
                </select>
              </div>

              {/* Valor Efetivamente Recebido */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-emerald-400">
                    Valor Recebido (R$) *
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={setFullPayment}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors cursor-pointer"
                      title="Preenche com o total líquido"
                    >
                      100%
                    </button>
                    <button
                      type="button"
                      onClick={setHalfPayment}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors cursor-pointer"
                      title="50% entrada"
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      onClick={setZeroPayment}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition-colors cursor-pointer"
                      title="Fiado / 0% recebido"
                    >
                      0%
                    </button>
                  </div>
                </div>

                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#141838] border border-emerald-500/40 text-xs text-emerald-300 font-extrabold text-right focus:outline-none focus:border-emerald-400"
                />
              </div>

              {/* Data do Recebimento */}
              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1.5 flex items-center justify-between">
                  <span>Data do Recebimento</span>
                  <span className="text-[10px] text-gray-500 font-normal">(Opcional)</span>
                </label>
                <input
                  type="datetime-local"
                  value={receivedDate}
                  onChange={(e) => setReceivedDate(e.target.value)}
                  disabled={amountReceived <= 0}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-xs text-white focus:outline-none focus:border-[#00DFFF] disabled:opacity-40"
                />
              </div>
            </div>

            {/* PAINEL DE SITUAÇÃO FINANCEIRA DA VENDA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-[#141838] border border-emerald-500/25 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    Dinheiro Efetivo no Caixa
                  </span>
                  <div className="font-heading text-lg font-black text-emerald-300 mt-0.5">
                    R$ {amountReceived.toFixed(2)}
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
                    {calculatedPaymentStatus === 'pago' && 'Pago Integral'}
                    {calculatedPaymentStatus === 'parcial' && 'Pago Parcial'}
                    {calculatedPaymentStatus === 'pendente' && 'A Receber / Fiado'}
                  </span>
                </div>
              </div>

              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  amountPending > 0
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-[#141838] border-[#8423DA]/25'
                }`}
              >
                <div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      amountPending > 0 ? 'text-amber-400' : 'text-gray-400'
                    }`}
                  >
                    Valor Pendente (A Receber)
                  </span>
                  <div
                    className={`font-heading text-lg font-black mt-0.5 ${
                      amountPending > 0 ? 'text-amber-300' : 'text-gray-400'
                    }`}
                  >
                    R$ {amountPending.toFixed(2)}
                  </div>
                </div>
                {amountPending > 0 ? (
                  <span className="text-[11px] text-amber-300 font-semibold px-2 py-0.5 rounded bg-amber-500/20">
                    Consta em Contas a Receber
                  </span>
                ) : (
                  <span className="text-[11px] text-gray-500 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-emerald-400" /> Sem pendência
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* SEÇÃO 5: OBSERVAÇÕES ADICIONAIS */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0D1022] border border-[#8423DA]/20 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#00DFFF] uppercase tracking-wider">
              <FileText className="w-4 h-4" />
              <span>5. Observações & Detalhes do Atendimento</span>
            </div>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Entregue na portaria do condomínio; cliente pediu brinde; promessa de Pix amanhã..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00DFFF] resize-none"
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
                  <span>{saleToEdit ? 'Atualizar Venda' : 'Salvar Venda no Supabase'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
