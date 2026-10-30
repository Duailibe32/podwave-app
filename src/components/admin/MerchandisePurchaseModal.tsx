import React, { useState, useEffect } from 'react';
import { useCatalog } from '../../context/CatalogContext';
import {
  MerchandisePurchaseEntry,
  MerchandisePurchaseItem,
  PurchasePaymentItem,
} from '../../types/catalog';
import {
  X,
  Plus,
  Trash2,
  Calendar,
  User,
  Phone,
  Package,
  DollarSign,
  Truck,
  CreditCard,
  FileText,
  Clock,
  Sparkles,
  AlertCircle,
  Check,
  Tag,
  Hash,
  ShieldAlert,
} from 'lucide-react';

interface MerchandisePurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseToEdit?: MerchandisePurchaseEntry | null;
  onSaveSuccess?: () => void;
}

const PAYMENT_METHODS = [
  'Boleto',
  'Pix',
  'Transferência Bancária',
  'Cartão de Crédito',
  'Dinheiro',
  'Cheque / Outro',
] as const;

const RECEIVING_STATUSES: {
  id: MerchandisePurchaseEntry['receivingStatus'];
  label: string;
  color: string;
}[] = [
  { id: 'recebido', label: '100% Recebido', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  { id: 'parcialmente_recebido', label: 'Parcialmente Recebido', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  { id: 'aguardando', label: 'Aguardando Entrega', color: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
];

export const MerchandisePurchaseModal: React.FC<MerchandisePurchaseModalProps> = ({
  isOpen,
  onClose,
  purchaseToEdit,
  onSaveSuccess,
}) => {
  const { models, saveMerchandisePurchase } = useCatalog();

  const getTodayDate = () => new Date().toISOString().split('T')[0];

  // Header states
  const [purchaseDate, setPurchaseDate] = useState<string>(getTodayDate());
  const [supplierName, setSupplierName] = useState<string>('');
  const [supplierContact, setSupplierContact] = useState<string>('');
  const [invoiceOrRef, setInvoiceOrRef] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Boleto');
  const [receivingStatus, setReceivingStatus] = useState<MerchandisePurchaseEntry['receivingStatus']>('recebido');
  const [dueDate, setDueDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Cost components
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [otherCosts, setOtherCosts] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);

  // Items list
  const [items, setItems] = useState<
    Array<{
      id: string;
      productId?: string;
      name: string;
      flavorName?: string;
      quantity: number;
      unitCost: number;
    }>
  >([]);

  // Payments history
  const [payments, setPayments] = useState<PurchasePaymentItem[]>([]);

  // Helpers for adding catalog items
  const [selectedCatalogModelId, setSelectedCatalogModelId] = useState<string>('');
  const [selectedCatalogFlavorName, setSelectedCatalogFlavorName] = useState<string>('');

  // Payment registration fields
  const [newPayAmount, setNewPayAmount] = useState<number | ''>('');
  const [newPayDate, setNewPayDate] = useState<string>(getTodayDate());
  const [newPayMethod, setNewPayMethod] = useState<string>('Pix');
  const [newPayNotes, setNewPayNotes] = useState<string>('');
  const [showAddPaymentRow, setShowAddPaymentRow] = useState<boolean>(false);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (purchaseToEdit) {
      setPurchaseDate(purchaseToEdit.purchaseDate || getTodayDate());
      setSupplierName(purchaseToEdit.supplierName || '');
      setSupplierContact(purchaseToEdit.supplierContact || '');
      setInvoiceOrRef(purchaseToEdit.invoiceOrRef || '');
      setPaymentMethod(purchaseToEdit.paymentMethod || 'Boleto');
      setReceivingStatus(purchaseToEdit.receivingStatus || 'recebido');
      setDueDate(purchaseToEdit.dueDate || '');
      setNotes(purchaseToEdit.notes || '');
      setShippingCost(Number(purchaseToEdit.shippingCost) || 0);
      setOtherCosts(Number(purchaseToEdit.otherCosts) || 0);
      setDiscount(Number(purchaseToEdit.discount) || 0);

      if (purchaseToEdit.items && purchaseToEdit.items.length > 0) {
        setItems(
          purchaseToEdit.items.map((it, idx) => ({
            id: it.id || `item-${Date.now()}-${idx}`,
            productId: it.productId,
            name: it.name || '',
            flavorName: it.flavorName,
            quantity: Number(it.quantity) || 1,
            unitCost: Number(it.unitCost) || 0,
          }))
        );
      } else {
        setItems([
          {
            id: `item-${Date.now()}`,
            name: '',
            quantity: 1,
            unitCost: 0,
          },
        ]);
      }

      if (purchaseToEdit.payments && purchaseToEdit.payments.length > 0) {
        setPayments(purchaseToEdit.payments);
      } else if (purchaseToEdit.amountPaid > 0) {
        // Fallback for previous single amount paid
        setPayments([
          {
            id: `pay-${Date.now()}`,
            amount: purchaseToEdit.amountPaid,
            paymentDate: purchaseToEdit.purchaseDate,
            paymentMethod: purchaseToEdit.paymentMethod || 'Boleto',
            notes: 'Pagamento inicial registrado',
          },
        ]);
      } else {
        setPayments([]);
      }
    } else {
      // New purchase defaults
      setPurchaseDate(getTodayDate());
      setSupplierName('');
      setSupplierContact('');
      setInvoiceOrRef('');
      setPaymentMethod('Boleto');
      setReceivingStatus('recebido');
      setDueDate('');
      setNotes('');
      setShippingCost(0);
      setOtherCosts(0);
      setDiscount(0);
      setItems([
        {
          id: `item-${Date.now()}`,
          name: '',
          quantity: 10,
          unitCost: 0,
        },
      ]);
      setPayments([]);
    }

    setFormError(null);
    setShowAddPaymentRow(false);
    setNewPayAmount('');
    setNewPayDate(getTodayDate());
  }, [isOpen, purchaseToEdit]);

  if (!isOpen) return null;

  // Real calculations
  const itemsSubtotal = items.reduce((acc, it) => {
    const q = Number(it.quantity) || 0;
    const c = Number(it.unitCost) || 0;
    return acc + q * c;
  }, 0);

  const totalCost = Math.max(
    0,
    itemsSubtotal + Number(shippingCost || 0) + Number(otherCosts || 0) - Number(discount || 0)
  );

  const totalAmountPaid = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const amountPending = Math.max(0, totalCost - totalAmountPaid);

  const calculatedPaymentStatus: MerchandisePurchaseEntry['paymentStatus'] =
    totalAmountPaid >= totalCost && totalCost > 0
      ? 'pago'
      : totalAmountPaid > 0 && totalAmountPaid < totalCost
      ? 'parcial'
      : 'pendente';

  // Item list handlers
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: '',
        quantity: 5,
        unitCost: 0,
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      setFormError('A compra precisa conter pelo menos um produto.');
      return;
    }
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleUpdateItem = (id: string, updates: Partial<(typeof items)[0]>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...updates } : it)));
  };

  // Add item from catalog
  const handleAddFromCatalog = () => {
    if (!selectedCatalogModelId) return;
    const model = models.find((m) => m.id === selectedCatalogModelId);
    if (!model) return;

    const newItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId: model.id,
      name: `${model.brandName} - ${model.modelName}`,
      flavorName: selectedCatalogFlavorName || undefined,
      quantity: 10,
      unitCost: 0, // Admin fills in real acquired cost
    };

    if (items.length === 1 && !items[0].name.trim() && items[0].unitCost === 0) {
      setItems([newItem]);
    } else {
      setItems((prev) => [...prev, newItem]);
    }

    setSelectedCatalogModelId('');
    setSelectedCatalogFlavorName('');
  };

  // Quick payment presets
  const handleSetFullPayment = () => {
    if (totalCost <= 0) return;
    setPayments([
      {
        id: `pay-${Date.now()}`,
        amount: totalCost,
        paymentDate: purchaseDate,
        paymentMethod,
        notes: 'Pagamento total à vista',
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  const handleSetZeroPayment = () => {
    setPayments([]);
  };

  const handleSetHalfPayment = () => {
    if (totalCost <= 0) return;
    const half = Math.round((totalCost / 2) * 100) / 100;
    setPayments([
      {
        id: `pay-${Date.now()}`,
        amount: half,
        paymentDate: purchaseDate,
        paymentMethod,
        notes: 'Entrada de 50%',
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  // Add individual partial payment
  const handleAddIndividualPayment = () => {
    const val = Number(newPayAmount) || 0;
    if (val <= 0) {
      setFormError('O valor do pagamento parcial deve ser maior que zero.');
      return;
    }
    if (totalAmountPaid + val > totalCost) {
      setFormError(`O pagamento de R$ ${val.toFixed(2)} excede o saldo devedor atual de R$ ${amountPending.toFixed(2)}.`);
      return;
    }

    const newPayment: PurchasePaymentItem = {
      id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      amount: val,
      paymentDate: newPayDate || getTodayDate(),
      paymentMethod: newPayMethod,
      notes: newPayNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    setPayments((prev) => [...prev, newPayment]);
    setNewPayAmount('');
    setNewPayNotes('');
    setShowAddPaymentRow(false);
    setFormError(null);
  };

  const handleRemovePayment = (id: string) => {
    setPayments((prev) => prev.filter((p) => p.id !== id));
  };

  // Form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!supplierName.trim()) {
      setFormError('Por favor, informe o nome do fornecedor ou distribuidor.');
      return;
    }

    if (items.length === 0) {
      setFormError('Adicione pelo menos um produto na compra.');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.name.trim()) {
        setFormError(`O produto #${i + 1} precisa ter um nome ou descrição informada.`);
        return;
      }
      if (Number(it.quantity) <= 0) {
        setFormError(`A quantidade do produto "${it.name}" deve ser de no mínimo 1.`);
        return;
      }
      if (Number(it.unitCost) < 0) {
        setFormError(`O custo unitário do produto "${it.name}" não pode ser negativo.`);
        return;
      }
    }

    if (totalAmountPaid > totalCost) {
      setFormError(`O valor total pago (R$ ${totalAmountPaid.toFixed(2)}) não pode ser superior ao valor total da compra (R$ ${totalCost.toFixed(2)}).`);
      return;
    }

    const payloadItems: MerchandisePurchaseItem[] = items.map((it) => ({
      id: it.id,
      productId: it.productId,
      name: it.name.trim(),
      flavorName: it.flavorName?.trim() || undefined,
      quantity: Number(it.quantity) || 1,
      unitCost: Number(it.unitCost) || 0,
      totalCost: (Number(it.quantity) || 1) * (Number(it.unitCost) || 0),
    }));

    const purchaseEntry: MerchandisePurchaseEntry = {
      id: purchaseToEdit?.id || `purch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      purchaseDate,
      supplierName: supplierName.trim(),
      supplierContact: supplierContact.trim() || undefined,
      invoiceOrRef: invoiceOrRef.trim() || undefined,
      itemsSubtotal,
      shippingCost: Number(shippingCost) || 0,
      otherCosts: Number(otherCosts) || 0,
      discount: Number(discount) || 0,
      totalCost,
      amountPaid: totalAmountPaid,
      amountPending,
      paymentStatus: calculatedPaymentStatus,
      paymentMethod,
      receivingStatus,
      dueDate: amountPending > 0 && dueDate ? dueDate : undefined,
      items: payloadItems,
      payments,
      notes: notes.trim() || undefined,
      createdAt: purchaseToEdit?.createdAt || new Date().toISOString(),
    };

    setIsSaving(true);
    const result = await saveMerchandisePurchase(purchaseEntry);
    setIsSaving(false);

    if (result.success) {
      if (onSaveSuccess) onSaveSuccess();
      onClose();
    } else {
      setFormError(
        result.error ||
          'Erro ao salvar compra de mercadoria no Supabase. Os dados foram preservados no formulário.'
      );
    }
  };

  const selectedModelObj = models.find((m) => m.id === selectedCatalogModelId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#090C19] border border-[#00DFFF]/30 rounded-3xl shadow-2xl shadow-[#00DFFF]/10 overflow-hidden text-white my-auto">
        {/* HEADER DO MODAL */}
        <div className="p-5 sm:p-6 border-b border-[#00DFFF]/20 bg-gradient-to-r from-[#0D1022] via-[#111A33] to-[#0D1022] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#00DFFF] to-[#8423DA] p-0.5 flex items-center justify-center shadow-lg shadow-[#00DFFF]/20">
              <div className="w-full h-full bg-[#080811] rounded-[14px] flex items-center justify-center">
                <Package className="w-5 h-5 text-[#00DFFF]" />
              </div>
            </div>
            <div>
              <h3 className="font-heading text-lg sm:text-xl font-black text-white flex items-center gap-2">
                {purchaseToEdit ? 'Editar Compra de Mercadorias' : 'Registrar Compra de Mercadorias'}
              </h3>
              <p className="text-xs text-[#A5A5B8]">
                Registro de reposição de estoque para revenda (sem baixa ou alteração automática de saldo)
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

        {/* CORPO DO FORMULÁRIO */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* SEÇÃO 1: DADOS DO FORNECEDOR E DA NOTA */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0D1022] border border-[#8423DA]/20 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[#00DFFF] uppercase tracking-wider">
              <User className="w-4 h-4" />
              <span>1. Fornecedor & Identificação da Compra</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Data da Compra */}
              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1.5">
                  Data da Compra *
                </label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-xs text-white focus:outline-none focus:border-[#00DFFF] font-bold"
                />
              </div>

              {/* Nome do Fornecedor */}
              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1.5">
                  Nome do Fornecedor *
                </label>
                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="Ex: Distribuidora Pods SP"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00DFFF]"
                />
              </div>

              {/* Telefone / Contato */}
              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1.5 flex items-center justify-between">
                  <span>Contato / WhatsApp</span>
                  <span className="text-[10px] text-gray-500 font-normal">(Opcional)</span>
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={supplierContact}
                    onChange={(e) => setSupplierContact(e.target.value)}
                    placeholder="Ex: (11) 98888-7777"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00DFFF]"
                  />
                </div>
              </div>

              {/* Nota / Pedido de Compra */}
              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1.5 flex items-center justify-between">
                  <span>Nota Fiscal / Ref.</span>
                  <span className="text-[10px] text-gray-500 font-normal">(Opcional)</span>
                </label>
                <div className="relative">
                  <Hash className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={invoiceOrRef}
                    onChange={(e) => setInvoiceOrRef(e.target.value)}
                    placeholder="Ex: NF-e 4920 ou Pedido #88"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00DFFF]"
                  />
                </div>
              </div>
            </div>

            {/* Status de Recebimento */}
            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-[#8423DA]/15">
              <span className="text-xs text-gray-400 font-semibold">
                Status de Entrega da Mercadoria:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {RECEIVING_STATUSES.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setReceivingStatus(st.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      receivingStatus === st.id
                        ? `${st.color} shadow-md`
                        : 'bg-[#141838] text-gray-400 border-[#8423DA]/20 hover:text-white'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: MÚLTIPLOS PRODUTOS COMPRADOS */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0D1022] border border-[#8423DA]/20 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#00DFFF] uppercase tracking-wider">
                <Package className="w-4 h-4" />
                <span>2. Produtos Adquiridos & Custo de Compra</span>
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#181C3D] hover:bg-[#8423DA]/40 text-[#00DFFF] hover:text-white border border-[#00DFFF]/30 text-xs font-bold transition-all cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Adicionar Produto Avulso</span>
              </button>
            </div>

            {/* SELETOR RÁPIDO DO CATÁLOGO EXISTENTE */}
            <div className="p-3.5 rounded-xl bg-[#111530] border border-[#8423DA]/25 flex flex-col md:flex-row items-stretch md:items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-300 shrink-0">
                <Sparkles className="w-4 h-4 text-[#00DFFF]" />
                <span>Puxar do Catálogo:</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
                <select
                  value={selectedCatalogModelId}
                  onChange={(e) => {
                    setSelectedCatalogModelId(e.target.value);
                    setSelectedCatalogFlavorName('');
                  }}
                  className="px-3 py-2 rounded-xl bg-[#181C3D] border border-[#8423DA]/30 text-xs text-white focus:outline-none focus:border-[#00DFFF] cursor-pointer"
                >
                  <option value="" className="bg-[#090C19]">
                    -- Escolha um Aparelho do Catálogo --
                  </option>
                  {models.map((m) => (
                    <option key={m.id} value={m.id} className="bg-[#090C19]">
                      {m.brandName} - {m.modelName}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedCatalogFlavorName}
                  onChange={(e) => setSelectedCatalogFlavorName(e.target.value)}
                  disabled={!selectedModelObj || selectedModelObj.flavors.length === 0}
                  className="px-3 py-2 rounded-xl bg-[#181C3D] border border-[#8423DA]/30 text-xs text-white focus:outline-none focus:border-[#00DFFF] cursor-pointer disabled:opacity-50"
                >
                  <option value="" className="bg-[#090C19]">
                    {selectedModelObj && selectedModelObj.flavors.length > 0
                      ? '-- Selecione a Variação/Sabor --'
                      : 'Sem variação de sabor'}
                  </option>
                  {selectedModelObj?.flavors.map((f) => (
                    <option key={f.id} value={f.name} className="bg-[#090C19]">
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleAddFromCatalog}
                disabled={!selectedCatalogModelId}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00DFFF] to-[#8423DA] text-black font-extrabold text-xs shadow-md shadow-[#00DFFF]/20 hover:brightness-110 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                + Inserir na Compra
              </button>
            </div>

            {/* LISTA DE PRODUTOS COMPRADOS */}
            <div className="space-y-3">
              {items.map((item, index) => {
                const itemSubtotal = (Number(item.quantity) || 0) * (Number(item.unitCost) || 0);
                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl bg-[#141838] border border-[#8423DA]/25 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                  >
                    {/* Descrição / Produto */}
                    <div className="sm:col-span-5 space-y-1">
                      <label className="text-[10px] font-bold text-gray-400">
                        Item #{index + 1} - Produto / Mercadoria *
                      </label>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleUpdateItem(item.id, { name: e.target.value })}
                        placeholder="Ex: Pod Elfbar BC10000"
                        required
                        className="w-full px-3 py-2 rounded-lg bg-[#090C19] border border-[#8423DA]/30 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00DFFF]"
                      />
                      {item.flavorName && (
                        <div className="text-[10px] text-[#00DFFF] flex items-center gap-1 font-semibold">
                          <span>Sabor/Variante:</span>
                          <span className="text-gray-300">{item.flavorName}</span>
                        </div>
                      )}
                    </div>

                    {/* Quantidade */}
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-gray-400">Qtd Comprada *</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          handleUpdateItem(item.id, { quantity: Math.max(1, parseInt(e.target.value) || 1) })
                        }
                        required
                        className="w-full px-3 py-2 rounded-lg bg-[#090C19] border border-[#8423DA]/30 text-xs text-white text-center font-bold focus:outline-none focus:border-[#00DFFF]"
                      />
                    </div>

                    {/* Preço de Custo Unitário */}
                    <div className="sm:col-span-3 space-y-1">
                      <label className="text-[10px] font-bold text-gray-400">Custo Unitário (R$) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unitCost}
                        onChange={(e) =>
                          handleUpdateItem(item.id, { unitCost: parseFloat(e.target.value) || 0 })
                        }
                        required
                        className="w-full px-3 py-2 rounded-lg bg-[#090C19] border border-[#8423DA]/30 text-xs text-white text-right font-bold focus:outline-none focus:border-[#00DFFF]"
                      />
                    </div>

                    {/* Subtotal & Remover */}
                    <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-4">
                      <div className="text-right">
                        <span className="text-[10px] text-gray-400 block sm:hidden">Subtotal:</span>
                        <span className="text-xs font-black text-[#00DFFF]">R$ {itemSubtotal.toFixed(2)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={items.length <= 1}
                        className="p-2 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Remover produto da compra"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SEÇÃO 3: CUSTOS ADICIONAIS, FRETE E TOTAL DA COMPRA */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0D1022] border border-[#8423DA]/20 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[#00DFFF] uppercase tracking-wider">
              <Truck className="w-4 h-4" />
              <span>3. Frete, Outros Custos & Descontos da Compra</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Frete da Compra */}
              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1.5">
                  Frete do Fornecedor (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={shippingCost}
                  onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-xs text-white font-bold text-right focus:outline-none focus:border-[#00DFFF]"
                />
              </div>

              {/* Outros Custos Adicionais */}
              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1.5">
                  Outros Custos / Taxas (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={otherCosts}
                  onChange={(e) => setOtherCosts(parseFloat(e.target.value) || 0)}
                  placeholder="Ex: Embalagem extra, seguro..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-xs text-white font-bold text-right focus:outline-none focus:border-[#00DFFF]"
                />
              </div>

              {/* Desconto Obtido */}
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-xs text-emerald-400 font-bold text-right focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            {/* Painel do Total da Compra */}
            <div className="p-4 rounded-xl bg-[#141838]/80 border border-[#8423DA]/30 flex flex-wrap items-center justify-between gap-4">
              <div className="text-xs">
                <span className="text-gray-400">Subtotal dos Produtos: </span>
                <span className="font-bold text-white">R$ {itemsSubtotal.toFixed(2)}</span>
                {shippingCost > 0 && (
                  <span className="text-gray-400 ml-3">
                    + Frete: <span className="font-semibold text-white">R$ {shippingCost.toFixed(2)}</span>
                  </span>
                )}
                {otherCosts > 0 && (
                  <span className="text-gray-400 ml-3">
                    + Outros Custos: <span className="font-semibold text-white">R$ {otherCosts.toFixed(2)}</span>
                  </span>
                )}
                {discount > 0 && (
                  <span className="text-emerald-400 ml-3">
                    - Desconto: <span className="font-semibold">R$ {discount.toFixed(2)}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-extrabold tracking-wider text-gray-300">
                  Total da Compra:
                </span>
                <span className="font-heading text-xl sm:text-2xl font-black text-[#00DFFF]">
                  R$ {totalCost.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* SEÇÃO 4: CONTROLE DE PAGAMENTO E HISTÓRICO DE PARCELAS */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0D1022] border border-[#8423DA]/20 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#00DFFF] uppercase tracking-wider">
                <CreditCard className="w-4 h-4" />
                <span>4. Quitação & Histórico de Pagamentos ao Fornecedor</span>
              </div>

              {/* Atalhos Rápidos de Quitação */}
              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={handleSetFullPayment}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-[11px] font-bold transition-colors cursor-pointer"
                  title="Registra pagamento integral à vista"
                >
                  100% Pago
                </button>
                <button
                  type="button"
                  onClick={handleSetHalfPayment}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-[11px] font-bold transition-colors cursor-pointer"
                  title="Registra entrada de 50%"
                >
                  50% Entrada
                </button>
                <button
                  type="button"
                  onClick={handleSetZeroPayment}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-[11px] font-bold transition-colors cursor-pointer"
                  title="Fatura a pagar / 0% quitado"
                >
                  A Pagar (0%)
                </button>
              </div>
            </div>

            {/* Informações Gerais de Cobrança */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1.5">
                  Forma de Pagamento Principal
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-xs text-white focus:outline-none focus:border-[#00DFFF] cursor-pointer font-bold"
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm} value={pm} className="bg-[#090C19]">
                      {pm}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1.5 flex items-center justify-between">
                  <span>Data de Vencimento</span>
                  <span className="text-[10px] text-gray-500 font-normal">
                    {amountPending > 0 ? '(Boleto / parcela a vencer)' : '(Opcional)'}
                  </span>
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-xs text-white focus:outline-none focus:border-[#00DFFF] font-bold"
                />
              </div>
            </div>

            {/* TABELA DE PAGAMENTOS REGISTRADOS */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-300">
                  Histórico de Parcelas Pagas ({payments.length}):
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddPaymentRow(!showAddPaymentRow)}
                  className="text-[11px] text-[#00DFFF] hover:underline font-bold cursor-pointer"
                >
                  {showAddPaymentRow ? 'Cancelar Novo Pagamento' : '+ Registrar Pagamento Parcial'}
                </button>
              </div>

              {/* Formulário inline para novo pagamento */}
              {showAddPaymentRow && (
                <div className="p-3.5 rounded-xl bg-[#111530] border border-[#00DFFF]/30 space-y-3 animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 mb-1">
                        Valor Pago (R$) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={amountPending}
                        value={newPayAmount}
                        onChange={(e) => setNewPayAmount(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                        placeholder={`Máx R$ ${amountPending.toFixed(2)}`}
                        className="w-full px-3 py-2 rounded-lg bg-[#090C19] border border-[#8423DA]/30 text-xs text-emerald-400 font-black text-right"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 mb-1">
                        Data Efetiva *
                      </label>
                      <input
                        type="date"
                        value={newPayDate}
                        onChange={(e) => setNewPayDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[#090C19] border border-[#8423DA]/30 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 mb-1">
                        Método Utilizado
                      </label>
                      <select
                        value={newPayMethod}
                        onChange={(e) => setNewPayMethod(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[#090C19] border border-[#8423DA]/30 text-xs text-white"
                      >
                        {PAYMENT_METHODS.map((pm) => (
                          <option key={pm} value={pm} className="bg-[#090C19]">
                            {pm}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <input
                      type="text"
                      value={newPayNotes}
                      onChange={(e) => setNewPayNotes(e.target.value)}
                      placeholder="Identificador / comprovante / observação do pagamento..."
                      className="w-full px-3 py-2 rounded-lg bg-[#090C19] border border-[#8423DA]/30 text-xs text-white flex-1"
                    />
                    <button
                      type="button"
                      onClick={handleAddIndividualPayment}
                      className="w-full sm:w-auto px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shrink-0"
                    >
                      Confirmar Parcela
                    </button>
                  </div>
                </div>
              )}

              {/* Lista dos pagamentos realizados */}
              {payments.length === 0 ? (
                <div className="p-3 rounded-xl bg-[#141838] border border-[#8423DA]/20 text-center text-xs text-gray-400">
                  Nenhum pagamento registrado ainda. O valor total de{' '}
                  <strong className="text-rose-400">R$ {totalCost.toFixed(2)}</strong> consta como pendente a pagar.
                </div>
              ) : (
                <div className="divide-y divide-[#8423DA]/20 rounded-xl border border-[#8423DA]/20 bg-[#141838] overflow-hidden text-xs">
                  {payments.map((p, idx) => (
                    <div key={p.id} className="p-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-emerald-400 flex items-center gap-2">
                          <span>Parcela #{idx + 1}: R$ {p.amount.toFixed(2)}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-black/40 text-gray-300 font-normal">
                            {p.paymentMethod}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          Data do pagamento: <strong>{new Date(p.paymentDate + 'T12:00:00').toLocaleDateString('pt-BR')}</strong>
                          {p.notes && <span className="ml-2 italic text-gray-300">• {p.notes}</span>}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemovePayment(p.id)}
                        className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                        title="Remover pagamento"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Painel de Situação Financeira */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-[#141838] border border-emerald-500/25 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    Saída Efetiva do Caixa
                  </span>
                  <div className="font-heading text-lg font-black text-emerald-300 mt-0.5">
                    R$ {totalAmountPaid.toFixed(2)}
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
                    {calculatedPaymentStatus === 'pago' && 'Pago Total'}
                    {calculatedPaymentStatus === 'parcial' && 'Pago Parcial'}
                    {calculatedPaymentStatus === 'pendente' && 'A Pagar / Pendente'}
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
                    Saldo Devedor ao Fornecedor
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
                    Contas a Pagar
                  </span>
                ) : (
                  <span className="text-[11px] text-gray-500 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-emerald-400" /> Quitado
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* SEÇÃO 5: OBSERVAÇÕES */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0D1022] border border-[#8423DA]/20 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#00DFFF] uppercase tracking-wider">
              <FileText className="w-4 h-4" />
              <span>5. Observações Adicionais</span>
            </div>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Mercadoria veio bem embalada; fornecedor prometeu envio de brinde no próximo pedido..."
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
                  <span>{purchaseToEdit ? 'Atualizar Compra' : 'Salvar Compra de Mercadorias'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
