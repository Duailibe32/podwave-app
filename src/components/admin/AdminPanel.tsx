import React, { useState } from 'react';
import { useCatalog } from '../../context/CatalogContext';
import {
  LayoutDashboard,
  Layers,
  Package,
  Sparkles,
  Settings,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Zap,
  ArrowLeft,
  RotateCcw,
  Sliders,
  Image as ImageIcon,
  CheckCircle,
  Eye,
  EyeOff,
  Ticket,
  Tag,
  Percent,
  LogOut,
  Target,
  Hash,
  ShoppingBag,
  ExternalLink
} from 'lucide-react';
import { ProductModel, Brand, FlavorVariant, Coupon } from '../../types/catalog';
import { AdminLogin } from './AdminLogin';
import { BannerVisualEditor } from './BannerVisualEditor';

type AdminTab = 'dashboard' | 'marcas' | 'modelos' | 'sabores' | 'cupons' | 'banners' | 'configuracoes';

export const AdminPanel: React.FC = () => {
  const {
    brands,
    models,
    banners,
    settings,
    coupons,
    isAdminAuthenticated,
    adminLogout,
    setCurrentView,
    addBrand,
    updateBrand,
    deleteBrand,
    addModel,
    updateModel,
    deleteModel,
    toggleModelActive,
    addFlavor,
    updateFlavor,
    deleteFlavor,
    addCoupon,
    updateCoupon,
    deleteCoupon,
    toggleCouponActive,
    updateSettings,
    resetAllData,
  } = useCatalog();

  // If user is not authenticated as the owner (admin / 123), show the login screen
  if (!isAdminAuthenticated) {
    return <AdminLogin />;
  }

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // --- BRAND MANAGEMENT MODAL STATE ---
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [brandForm, setBrandForm] = useState({ name: '', country: '', description: '' });

  const handleOpenBrandModal = (brand?: Brand) => {
    if (brand) {
      setEditingBrand(brand);
      setBrandForm({
        name: brand.name,
        country: brand.country || '',
        description: brand.description || '',
      });
    } else {
      setEditingBrand(null);
      setBrandForm({ name: '', country: '', description: '' });
    }
    setIsBrandModalOpen(true);
  };

  const handleSaveBrand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandForm.name.trim()) return;

    if (editingBrand) {
      updateBrand(editingBrand.id, brandForm);
      showToast(`Marca "${brandForm.name}" atualizada com sucesso!`);
    } else {
      addBrand({
        name: brandForm.name.toUpperCase(),
        logoText: brandForm.name.toUpperCase(),
        featured: true,
        country: brandForm.country || 'Global',
        description: brandForm.description || 'Fabricante de dispositivos de vaporização.',
      });
      showToast(`Marca "${brandForm.name}" cadastrada com sucesso!`);
    }
    setIsBrandModalOpen(false);
  };

  // --- MODEL MANAGEMENT MODAL STATE ---
  const [editingModel, setEditingModel] = useState<ProductModel | null>(null);
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [modelForm, setModelForm] = useState({
    brandId: '',
    modelName: '',
    puffs: 15000,
    puffsLabel: '⚡ 15.000 Puffs',
    badge: '★ TOP',
    startingPrice: 99.99,
    imageUrl: '/assets/images/pod_gold_black_1792699257182.jpg',
    category: 'Descartável Premium',
    description: '',
    battery: '650mAh USB-C',
    eLiquid: '16ml',
    nicotine: '5% (50mg)',
    chargeType: 'USB Tipo C Fast Charge',
    coil: 'Dual Mesh Coil',
  });

  const availableImages = [
    { label: 'Matte Black Gold (V55 Style)', url: '/assets/images/pod_gold_black_1792699257182.jpg' },
    { label: 'Frost Bar Strawberry/Blue (BC15K Style)', url: '/assets/images/pod_oxbar_maze_1792699228586.jpg' },
    { label: 'Aether Smart Screen (Pulse Style)', url: '/assets/images/pod_geekbar_pulse_1792699212047.jpg' },
    { label: 'Lumin Deep Purple (Grape Style)', url: '/assets/images/pod_grape_ice_1792699243386.jpg' },
    { label: 'Card Duplo Oficial de Referência', url: '/assets/images/reference_card.png' },
  ];

  const handleOpenModelModal = (model?: ProductModel) => {
    if (model) {
      setEditingModel(model);
      setModelForm({
        brandId: model.brandId,
        modelName: model.modelName,
        puffs: model.puffs,
        puffsLabel: model.puffsLabel,
        badge: model.badge || '',
        startingPrice: model.startingPrice,
        imageUrl: model.imageUrl,
        category: model.category,
        description: model.description,
        battery: model.specs.battery,
        eLiquid: model.specs.eLiquid,
        nicotine: model.specs.nicotine,
        chargeType: model.specs.chargeType,
        coil: model.specs.coil,
      });
    } else {
      setEditingModel(null);
      setModelForm({
        brandId: brands[0]?.id || 'ignite',
        modelName: '',
        puffs: 15000,
        puffsLabel: '⚡ 15.000 Puffs',
        badge: '★ TOP',
        startingPrice: 99.99,
        imageUrl: availableImages[0].url,
        category: 'Descartável Premium',
        description: 'Dispositivo eletrônico com alta capacidade e rendimento equilibrado.',
        battery: '650mAh USB-C',
        eLiquid: '15ml',
        nicotine: '5% Salt Nic',
        chargeType: 'USB Tipo C',
        coil: 'Dual Mesh Coil',
      });
    }
    setIsModelModalOpen(true);
  };

  const handleSaveModel = (e: React.FormEvent) => {
    e.preventDefault();
    const brand = brands.find((b) => b.id === modelForm.brandId);
    const brandName = brand ? brand.name : 'GENERIC';

    const formattedPuffsLabel = modelForm.puffsLabel.startsWith('⚡')
      ? modelForm.puffsLabel
      : `⚡ ${modelForm.puffsLabel}`;

    if (editingModel) {
      updateModel(editingModel.id, {
        brandId: modelForm.brandId,
        brandName,
        modelName: modelForm.modelName,
        puffs: Number(modelForm.puffs),
        puffsLabel: formattedPuffsLabel,
        badge: modelForm.badge || undefined,
        startingPrice: Number(modelForm.startingPrice),
        imageUrl: modelForm.imageUrl,
        category: modelForm.category,
        description: modelForm.description,
        specs: {
          battery: modelForm.battery,
          eLiquid: modelForm.eLiquid,
          nicotine: modelForm.nicotine,
          chargeType: modelForm.chargeType,
          coil: modelForm.coil,
        },
      });
      showToast(`Modelo "${modelForm.modelName}" atualizado com sucesso!`);
    } else {
      addModel({
        brandId: modelForm.brandId,
        brandName,
        modelName: modelForm.modelName,
        puffs: Number(modelForm.puffs),
        puffsLabel: formattedPuffsLabel,
        badge: modelForm.badge || undefined,
        startingPrice: Number(modelForm.startingPrice),
        imageUrl: modelForm.imageUrl,
        category: modelForm.category,
        description: modelForm.description,
        active: true,
        flavors: [
          { id: `fl-${Date.now()}-1`, name: 'Blueberry Ice', colorHex: '#3B82F6', iconEmoji: '🫐', inStock: true },
          { id: `fl-${Date.now()}-2`, name: 'Watermelon Ice', colorHex: '#EF4444', iconEmoji: '🍉', inStock: true },
        ],
        specs: {
          battery: modelForm.battery,
          eLiquid: modelForm.eLiquid,
          nicotine: modelForm.nicotine,
          chargeType: modelForm.chargeType,
          coil: modelForm.coil,
        },
      });
      showToast(`Modelo "${modelForm.modelName}" cadastrado com sucesso!`);
    }
    setIsModelModalOpen(false);
  };

  // --- FLAVOR SELECTION STATE ---
  const [selectedModelForFlavors, setSelectedModelForFlavors] = useState<string>(
    models[0]?.id || ''
  );
  const activeModelForFlavors = models.find((m) => m.id === selectedModelForFlavors) || models[0];

  const [newFlavorForm, setNewFlavorForm] = useState({
    name: '',
    colorHex: '#9333EA',
    iconEmoji: '🍇',
    inStock: true,
  });

  const handleAddNewFlavor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFlavorForm.name.trim() || !activeModelForFlavors) return;

    addFlavor(activeModelForFlavors.id, {
      name: newFlavorForm.name,
      colorHex: newFlavorForm.colorHex,
      iconEmoji: newFlavorForm.iconEmoji || '⚡',
      inStock: newFlavorForm.inStock,
    });
    setNewFlavorForm({ name: '', colorHex: '#EF4444', iconEmoji: '🍉', inStock: true });
    showToast(`Sabor adicionado ao modelo ${activeModelForFlavors.modelName}!`);
  };

  // --- COUPON MANAGEMENT STATE ---
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: '',
    discountType: 'percent' as 'percent' | 'fixed',
    value: 15,
    description: '',
    applicableModelId: 'all',
    maxUses: 50,
    minOrderValue: 0,
    active: true,
  });

  const handleOpenCouponModal = (coupon?: Coupon) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setCouponForm({
        code: coupon.code,
        discountType: coupon.discountType,
        value: coupon.value,
        description: coupon.description || '',
        applicableModelId: coupon.applicableModelId || 'all',
        maxUses: coupon.maxUses || 0,
        minOrderValue: coupon.minOrderValue || 0,
        active: coupon.active !== false,
      });
    } else {
      setEditingCoupon(null);
      setCouponForm({
        code: '',
        discountType: 'percent',
        value: 15,
        description: '',
        applicableModelId: 'all',
        maxUses: 50,
        minOrderValue: 0,
        active: true,
      });
    }
    setIsCouponModalOpen(true);
  };

  const handleSaveCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCode = couponForm.code.trim().toUpperCase();
    if (!trimmedCode) return;

    let targetModelName = undefined;
    if (couponForm.applicableModelId && couponForm.applicableModelId !== 'all') {
      const found = models.find((m) => m.id === couponForm.applicableModelId);
      targetModelName = found ? found.modelName : undefined;
    }

    if (editingCoupon) {
      updateCoupon(editingCoupon.id, {
        code: trimmedCode,
        discountType: couponForm.discountType,
        value: Number(couponForm.value),
        description: couponForm.description,
        applicableModelId: couponForm.applicableModelId,
        applicableModelName: targetModelName,
        maxUses: Number(couponForm.maxUses) > 0 ? Number(couponForm.maxUses) : undefined,
        minOrderValue: Number(couponForm.minOrderValue) > 0 ? Number(couponForm.minOrderValue) : undefined,
        active: couponForm.active,
      });
      showToast(`Cupom "${trimmedCode}" atualizado com sucesso!`);
    } else {
      addCoupon({
        code: trimmedCode,
        discountType: couponForm.discountType,
        value: Number(couponForm.value),
        description: couponForm.description || `${couponForm.value}% de desconto`,
        applicableModelId: couponForm.applicableModelId,
        applicableModelName: targetModelName,
        maxUses: Number(couponForm.maxUses) > 0 ? Number(couponForm.maxUses) : undefined,
        minOrderValue: Number(couponForm.minOrderValue) > 0 ? Number(couponForm.minOrderValue) : undefined,
        active: couponForm.active,
      });
      showToast(`Cupom "${trimmedCode}" cadastrado com sucesso!`);
    }
    setIsCouponModalOpen(false);
  };

  // --- STATS COMPUTATION ---
  const totalBrands = brands.length;
  const totalModels = models.length;
  const activeModelsCount = models.filter((m) => m.active).length;
  const totalFlavors = models.reduce((acc, m) => acc + m.flavors.length, 0);
  const avgPuffs =
    models.length > 0 ? Math.round(models.reduce((acc, m) => acc + m.puffs, 0) / models.length) : 0;
  const totalCoupons = coupons.length;
  const itemRestrictedCoupons = coupons.filter((c) => c.applicableModelId && c.applicableModelId !== 'all').length;
  const limitedCoupons = coupons.filter((c) => c.maxUses && c.maxUses > 0).length;
  const totalCouponsUsed = coupons.reduce((acc, c) => acc + c.usedCount, 0);

  return (
    <div className="min-h-screen bg-[#080811] light:bg-[#F4F6FC] text-white light:text-slate-900 pb-20">
      {/* Toast Notification */}
      {successMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-[#11152A] border border-[#00DFFF] text-white shadow-[0_0_20px_rgba(0,223,255,0.4)] animate-in slide-in-from-bottom-4 duration-300">
          <CheckCircle className="w-5 h-5 text-[#00DFFF]" />
          <span className="text-xs font-bold">{successMessage}</span>
        </div>
      )}

      {/* Top Admin Sub-header */}
      <div className="border-b border-[#8423DA]/20 bg-[#0D1022]/90 light:bg-white sticky top-20 z-40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setCurrentView('catalog');
                  window.history.pushState({}, '', '/');
                }}
                className="p-2 rounded-xl bg-[#141838] light:bg-slate-100 hover:bg-[#8423DA] text-gray-300 hover:text-white transition-all cursor-pointer"
                title="Voltar ao catálogo principal"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2.5">
                <img src="/assets/images/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
                <div>
                  <h1 className="font-heading text-lg font-black tracking-tight text-white light:text-slate-900 flex items-center gap-2">
                    Painel Administrativo PodWave
                    <span className="px-2 py-0.5 rounded-full bg-[#8423DA]/30 border border-[#8423DA]/50 text-[10px] text-[#00DFFF] font-bold">
                      PROPRIETÁRIO
                    </span>
                  </h1>
                  <p className="text-[11px] text-[#A5A5B8]">
                    Gerencie marcas, modelos, sabores, cupons por item e limites de estoque.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (confirm('Deseja restaurar todo o catálogo para os dados iniciais de fábrica?')) {
                    resetAllData();
                    showToast('Dados padrão restaurados com sucesso!');
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-[#141838] light:bg-slate-200 hover:bg-rose-950/60 hover:text-rose-400 border border-transparent hover:border-rose-500/40 text-xs font-semibold text-gray-300 light:text-slate-700 transition-all cursor-pointer flex items-center gap-1.5"
                title="Limpar edições do localStorage e restaurar catálogo original"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar Padrão</span>
              </button>

              <button
                onClick={() => {
                  adminLogout();
                  showToast('Sessão administrativa encerrada.');
                }}
                className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-xs font-semibold text-rose-300 transition-all cursor-pointer flex items-center gap-1.5"
                title="Encerrar sessão de administrador"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-3 pt-1 scrollbar-none">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border shrink-0 ${
                activeTab === 'dashboard'
                  ? 'bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white border-[#00DFFF]/50 shadow-md'
                  : 'bg-[#11152A] light:bg-slate-100 text-gray-300 light:text-slate-700 border-transparent hover:border-[#8423DA]/40'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('modelos')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border shrink-0 ${
                activeTab === 'modelos'
                  ? 'bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white border-[#00DFFF]/50 shadow-md'
                  : 'bg-[#11152A] light:bg-slate-100 text-gray-300 light:text-slate-700 border-transparent hover:border-[#8423DA]/40'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Modelos & Puffs ⚡ ({totalModels})</span>
            </button>

            <button
              onClick={() => setActiveTab('marcas')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border shrink-0 ${
                activeTab === 'marcas'
                  ? 'bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white border-[#00DFFF]/50 shadow-md'
                  : 'bg-[#11152A] light:bg-slate-100 text-gray-300 light:text-slate-700 border-transparent hover:border-[#8423DA]/40'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Marcas ({totalBrands})</span>
            </button>

            <button
              onClick={() => setActiveTab('sabores')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border shrink-0 ${
                activeTab === 'sabores'
                  ? 'bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white border-[#00DFFF]/50 shadow-md'
                  : 'bg-[#11152A] light:bg-slate-100 text-gray-300 light:text-slate-700 border-transparent hover:border-[#8423DA]/40'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#FACC15]" />
              <span>Sabores ({totalFlavors})</span>
            </button>

            {/* TAB: CUPONS & DESCONTOS (SOLICITADO PELO USUÁRIO) */}
            <button
              onClick={() => setActiveTab('cupons')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border shrink-0 ${
                activeTab === 'cupons'
                  ? 'bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white border-[#00DFFF]/50 shadow-md'
                  : 'bg-[#11152A] light:bg-slate-100 text-gray-300 light:text-slate-700 border-transparent hover:border-[#8423DA]/40'
              }`}
            >
              <Ticket className="w-3.5 h-3.5 text-[#FACC15]" />
              <span>Cupons & Limites ({totalCoupons})</span>
            </button>

            <button
              onClick={() => setActiveTab('banners')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border shrink-0 ${
                activeTab === 'banners'
                  ? 'bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white border-[#00DFFF]/50 shadow-md'
                  : 'bg-[#11152A] light:bg-slate-100 text-gray-300 light:text-slate-700 border-transparent hover:border-[#8423DA]/40'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Banners & Destaques</span>
            </button>

            <button
              onClick={() => setActiveTab('configuracoes')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border shrink-0 ${
                activeTab === 'configuracoes'
                  ? 'bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white border-[#00DFFF]/50 shadow-md'
                  : 'bg-[#11152A] light:bg-slate-100 text-gray-300 light:text-slate-700 border-transparent hover:border-[#8423DA]/40'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Configurações</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* ===================== TAB 1: DASHBOARD ===================== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* KPI Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="p-5 rounded-2xl bg-[#0D1022] light:bg-white border border-[#8423DA]/30 shadow-lg space-y-2">
                <div className="flex items-center justify-between text-[#A5A5B8]">
                  <span className="text-xs font-bold uppercase tracking-wider">Marcas Ativas</span>
                  <Layers className="w-4 h-4 text-[#00DFFF]" />
                </div>
                <p className="font-heading text-3xl font-black text-white light:text-slate-900">
                  {totalBrands}
                </p>
                <p className="text-[11px] text-[#A5A5B8]">Fabricantes globais no catálogo</p>
              </div>

              <div className="p-5 rounded-2xl bg-[#0D1022] light:bg-white border border-[#8423DA]/30 shadow-lg space-y-2">
                <div className="flex items-center justify-between text-[#A5A5B8]">
                  <span className="text-xs font-bold uppercase tracking-wider">Modelos Ativos</span>
                  <Package className="w-4 h-4 text-[#8423DA]" />
                </div>
                <p className="font-heading text-3xl font-black text-[#00DFFF]">
                  {activeModelsCount}{' '}
                  <span className="text-xs font-normal text-gray-400">/ {totalModels}</span>
                </p>
                <p className="text-[11px] text-[#A5A5B8]">Dispositivos cadastrados</p>
              </div>

              <div className="p-5 rounded-2xl bg-[#0D1022] light:bg-white border border-[#8423DA]/30 shadow-lg space-y-2">
                <div className="flex items-center justify-between text-[#A5A5B8]">
                  <span className="text-xs font-bold uppercase tracking-wider">Sabores & Variantes</span>
                  <Sparkles className="w-4 h-4 text-[#E53CF3]" />
                </div>
                <p className="font-heading text-3xl font-black text-[#E53CF3]">
                  {totalFlavors}
                </p>
                <p className="text-[11px] text-[#A5A5B8]">Variações de aromas mapeadas</p>
              </div>

              <div className="p-5 rounded-2xl bg-[#0D1022] light:bg-white border border-[#8423DA]/30 shadow-lg space-y-2">
                <div className="flex items-center justify-between text-[#A5A5B8]">
                  <span className="text-xs font-bold uppercase tracking-wider">Média de Puffs</span>
                  <Zap className="w-4 h-4 text-[#FACC15] fill-[#FACC15]" />
                </div>
                <p className="font-heading text-3xl font-black text-[#FACC15] light:text-[#CA8A04]">
                  {avgPuffs.toLocaleString('pt-BR')}
                </p>
                <p className="text-[11px] text-[#A5A5B8]">Capacidade média por modelo</p>
              </div>
            </div>

            {/* Quick Actions & Recent Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Models Breakdown */}
              <div className="lg:col-span-8 p-6 rounded-2xl bg-[#0D1022] light:bg-white border border-[#8423DA]/25 shadow-xl space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-heading text-lg font-bold text-white light:text-slate-900">
                      Dispositivos no Catálogo
                    </h3>
                    <p className="text-xs text-[#A5A5B8]">Resumo de puffs, marca e status</p>
                  </div>
                  <button
                    onClick={() => handleOpenModelModal()}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#007BFF] to-[#00DFFF] text-[#080811] text-xs font-bold flex items-center gap-1 shadow-md hover:brightness-110 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Novo Modelo</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#8423DA]/20 text-[#A5A5B8]">
                        <th className="pb-3 font-semibold">Produto</th>
                        <th className="pb-3 font-semibold">Marca</th>
                        <th className="pb-3 font-semibold">Puffs ⚡</th>
                        <th className="pb-3 font-semibold">Sabores</th>
                        <th className="pb-3 font-semibold">Preço Ref.</th>
                        <th className="pb-3 font-semibold text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#8423DA]/10">
                      {models.slice(0, 6).map((m) => (
                        <tr key={m.id} className="hover:bg-[#141838]/50">
                          <td className="py-3 font-bold text-white light:text-slate-900 flex items-center gap-2">
                            <img src={m.imageUrl || '/assets/images/logo.png'} alt="" className="w-7 h-7 rounded bg-white p-0.5 object-contain" />
                            <span>{m.modelName}</span>
                          </td>
                          <td className="py-3 text-[#FACC15] font-semibold">{m.brandName}</td>
                          <td className="py-3 font-mono font-bold text-gray-300 light:text-slate-700">
                            {m.puffsLabel}
                          </td>
                          <td className="py-3 text-[#A5A5B8]">{m.flavors.length} opções</td>
                          <td className="py-3 font-bold text-white light:text-slate-900">
                            R$ {m.startingPrice.toFixed(2).replace('.', ',')}
                          </td>
                          <td className="py-3 text-right">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                m.active
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              }`}
                            >
                              {m.active ? 'Ativo' : 'Oculto'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Brands summary card */}
              <div className="lg:col-span-4 p-6 rounded-2xl bg-[#0D1022] light:bg-white border border-[#8423DA]/25 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading text-lg font-bold text-white light:text-slate-900">
                    Marcas Parceiras
                  </h3>
                  <button
                    onClick={() => setActiveTab('marcas')}
                    className="text-xs text-[#00DFFF] hover:underline"
                  >
                    Gerenciar
                  </button>
                </div>

                <div className="space-y-2.5">
                  {brands.map((b) => {
                    const count = models.filter((m) => m.brandId === b.id).length;
                    return (
                      <div
                        key={b.id}
                        className="p-3 rounded-xl bg-[#141838] light:bg-slate-100 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-bold text-xs text-white light:text-slate-900">{b.name}</p>
                          <p className="text-[10px] text-[#A5A5B8]">{b.country || 'Origem Global'}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-[#8423DA]/30 text-[#FACC15] text-xs font-bold">
                          {count} modelos
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 2: MODELOS ===================== */}
        {activeTab === 'modelos' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-heading text-xl font-bold text-white light:text-slate-900">
                  Gerenciamento de Modelos de Dispositivos
                </h2>
                <p className="text-xs text-[#A5A5B8]">
                  Cadastre novos pods, defina a quantidade nominal de puffs ⚡, preços demonstrativos e ficha técnica.
                </p>
              </div>

              <button
                onClick={() => handleOpenModelModal()}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white text-xs font-bold flex items-center gap-2 shadow-lg hover:brightness-110 cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar Novo Modelo</span>
              </button>
            </div>

            {/* Models Table */}
            <div className="rounded-2xl bg-[#0D1022] light:bg-white border border-[#8423DA]/25 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#121633] light:bg-slate-100 border-b border-[#8423DA]/20 text-[#A5A5B8]">
                    <tr>
                      <th className="p-4 font-semibold">Foto</th>
                      <th className="p-4 font-semibold">Marca & Modelo</th>
                      <th className="p-4 font-semibold">Puffs ⚡</th>
                      <th className="p-4 font-semibold">Etiqueta</th>
                      <th className="p-4 font-semibold">Sabores</th>
                      <th className="p-4 font-semibold">Preço Ref.</th>
                      <th className="p-4 font-semibold">Visibilidade</th>
                      <th className="p-4 font-semibold text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#8423DA]/10">
                    {models.map((model) => (
                      <tr key={model.id} className="hover:bg-[#141838]/40">
                        <td className="p-4">
                          <div className="w-12 h-12 rounded-xl bg-white p-1 border border-slate-200 flex items-center justify-center">
                            <img src={model.imageUrl || '/assets/images/logo.png'} alt="" className="w-full h-full object-contain" />
                          </div>
                        </td>

                        <td className="p-4">
                          <p className="font-extrabold text-sm text-white light:text-slate-900">
                            {model.modelName}
                          </p>
                          <span className="text-[10px] text-[#FACC15] font-bold uppercase">
                            {model.brandName} &bull; {model.category}
                          </span>
                        </td>

                        <td className="p-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#181C38] text-[#FACC15] font-bold text-xs border border-[#FACC15]/30">
                            <Zap className="w-3 h-3 fill-[#FACC15]" />
                            {model.puffsLabel}
                          </span>
                        </td>

                        <td className="p-4">
                          {model.badge ? (
                            <span className="px-2 py-0.5 rounded-full bg-[#FACC15] text-black font-black text-[10px]">
                              {model.badge}
                            </span>
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </td>

                        <td className="p-4">
                          <button
                            onClick={() => {
                              setSelectedModelForFlavors(model.id);
                              setActiveTab('sabores');
                            }}
                            className="text-[#00DFFF] hover:underline flex items-center gap-1 font-semibold"
                            title="Gerenciar sabores deste modelo"
                          >
                            <span>{model.flavors.length} sabores</span>
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </td>

                        <td className="p-4 font-bold text-white light:text-slate-900">
                          R$ {model.startingPrice.toFixed(2).replace('.', ',')}
                        </td>

                        <td className="p-4">
                          <button
                            onClick={() => toggleModelActive(model.id)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                              model.active
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                            }`}
                            title="Clique para alternar visibilidade no catálogo"
                          >
                            {model.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            <span>{model.active ? 'No Catálogo' : 'Oculto'}</span>
                          </button>
                        </td>

                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => handleOpenModelModal(model)}
                            className="p-2 rounded-lg bg-[#181C38] text-[#00DFFF] hover:bg-[#8423DA] hover:text-white transition-all cursor-pointer"
                            title="Editar Modelo"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Excluir o modelo "${model.modelName}"?`)) {
                                deleteModel(model.id);
                                showToast('Modelo removido com sucesso!');
                              }
                            }}
                            className="p-2 rounded-lg bg-[#181C38] text-rose-400 hover:bg-rose-900 hover:text-white transition-all cursor-pointer"
                            title="Excluir Modelo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 3: MARCAS ===================== */}
        {activeTab === 'marcas' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-heading text-xl font-bold text-white light:text-slate-900">
                  Fabricantes & Marcas
                </h2>
                <p className="text-xs text-[#A5A5B8]">
                  Cadastre novas marcas de dispositivos para exibição nos filtros e agrupamentos.
                </p>
              </div>

              <button
                onClick={() => handleOpenBrandModal()}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white text-xs font-bold flex items-center gap-2 shadow-lg hover:brightness-110 cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Marca</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {brands.map((brand) => {
                const brandModels = models.filter((m) => m.brandId === brand.id);
                return (
                  <div
                    key={brand.id}
                    className="p-5 rounded-2xl bg-[#0D1022] light:bg-white border border-[#8423DA]/25 shadow-lg space-y-4 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-heading text-lg font-black text-white light:text-slate-900 tracking-wider">
                          {brand.name}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#181C38] text-[#FACC15] border border-[#FACC15]/30">
                          {brand.country || 'Global'}
                        </span>
                      </div>
                      <p className="text-xs text-[#A5A5B8] mt-2 line-clamp-2">
                        {brand.description || 'Fabricante de dispositivos eletrônicos.'}
                      </p>
                      <div className="mt-3 text-xs text-[#00DFFF] font-semibold">
                        {brandModels.length} modelo(s) vinculado(s)
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#8423DA]/20 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenBrandModal(brand)}
                        className="px-3 py-1.5 rounded-lg bg-[#181C38] text-[#00DFFF] hover:bg-[#8423DA] hover:text-white text-xs font-semibold transition-all cursor-pointer flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" /> Editar
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Remover a marca "${brand.name}" e desvincular modelos?`)) {
                            deleteBrand(brand.id);
                            showToast('Marca removida!');
                          }
                        }}
                        className="p-1.5 rounded-lg bg-[#181C38] text-rose-400 hover:bg-rose-900 hover:text-white transition-all cursor-pointer"
                        title="Excluir Marca"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===================== TAB 4: SABORES ===================== */}
        {activeTab === 'sabores' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="font-heading text-xl font-bold text-white light:text-slate-900">
                Gerenciamento de Sabores por Modelo
              </h2>
              <p className="text-xs text-[#A5A5B8]">
                Vincule novos sabores aos modelos específicos, com cor de pastilha e disponibilidade.
              </p>
            </div>

            {/* Model Selector Bar */}
            <div className="p-4 rounded-2xl bg-[#0D1022] light:bg-white border border-[#8423DA]/25 flex flex-col sm:flex-row sm:items-center gap-3">
              <label className="text-xs font-bold text-gray-300 light:text-slate-700 flex-shrink-0">
                Selecione o Modelo para Editar Sabores:
              </label>
              <select
                value={selectedModelForFlavors}
                onChange={(e) => setSelectedModelForFlavors(e.target.value)}
                className="py-2 px-3 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/40 text-white light:text-slate-900 text-xs font-bold focus:outline-none flex-grow"
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.brandName} - {m.modelName} ({m.puffsLabel}) [{m.flavors.length} sabores]
                  </option>
                ))}
              </select>
            </div>

            {activeModelForFlavors && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Flavors List */}
                <div className="lg:col-span-7 p-6 rounded-2xl bg-[#0D1022] light:bg-white border border-[#8423DA]/25 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-heading text-base font-bold text-white light:text-slate-900">
                        Sabores Cadastrados em {activeModelForFlavors.modelName}
                      </h3>
                      <p className="text-xs text-[#A5A5B8]">
                        Total de {activeModelForFlavors.flavors.length} sabores ativos
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {activeModelForFlavors.flavors.map((flavor) => (
                      <div
                        key={flavor.id}
                        className="p-3 rounded-xl bg-[#141838] light:bg-slate-100 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-4 h-4 rounded-full shadow-sm flex-shrink-0"
                            style={{ backgroundColor: flavor.colorHex }}
                          />
                          <span className="text-base">{flavor.iconEmoji}</span>
                          <div>
                            <p className="font-bold text-xs text-white light:text-slate-900">{flavor.name}</p>
                            <span className="text-[10px] text-gray-400 font-mono">{flavor.colorHex}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              updateFlavor(activeModelForFlavors.id, flavor.id, {
                                inStock: !flavor.inStock,
                              })
                            }
                            className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                              flavor.inStock
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            {flavor.inStock ? 'Em estoque' : 'Esgotado'}
                          </button>

                          <button
                            onClick={() => {
                              if (confirm(`Remover o sabor "${flavor.name}"?`)) {
                                deleteFlavor(activeModelForFlavors.id, flavor.id);
                                showToast('Sabor removido!');
                              }
                            }}
                            className="p-1 rounded text-rose-400 hover:text-white hover:bg-rose-900"
                            title="Excluir Sabor"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add Flavor Form */}
                <div className="lg:col-span-5 p-6 rounded-2xl bg-[#0D1022] light:bg-white border border-[#8423DA]/25 shadow-xl space-y-4">
                  <h3 className="font-heading text-base font-bold text-white light:text-slate-900 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-[#00DFFF]" />
                    Adicionar Novo Sabor
                  </h3>

                  <form onSubmit={handleAddNewFlavor} className="space-y-4 text-xs">
                    <div>
                      <label className="block text-gray-300 light:text-slate-700 font-semibold mb-1">
                        Nome do Sabor (ex: Strawberry Ice)
                      </label>
                      <input
                        type="text"
                        value={newFlavorForm.name}
                        onChange={(e) => setNewFlavorForm({ ...newFlavorForm, name: e.target.value })}
                        placeholder="Ex: Passion Fruit Ice"
                        required
                        className="w-full p-2.5 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/30 text-white light:text-slate-900 focus:outline-none focus:border-[#00DFFF]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-gray-300 light:text-slate-700 font-semibold mb-1">
                          Cor da Pastilha (Hex)
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={newFlavorForm.colorHex}
                            onChange={(e) =>
                              setNewFlavorForm({ ...newFlavorForm, colorHex: e.target.value })
                            }
                            className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                          />
                          <input
                            type="text"
                            value={newFlavorForm.colorHex}
                            onChange={(e) =>
                              setNewFlavorForm({ ...newFlavorForm, colorHex: e.target.value })
                            }
                            className="w-full p-2 rounded-lg bg-[#141838] light:bg-slate-100 border border-[#8423DA]/30 font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-gray-300 light:text-slate-700 font-semibold mb-1">
                          Emoji / Ícone
                        </label>
                        <select
                          value={newFlavorForm.iconEmoji}
                          onChange={(e) =>
                            setNewFlavorForm({ ...newFlavorForm, iconEmoji: e.target.value })
                          }
                          className="w-full p-2.5 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/30 text-white light:text-slate-900"
                        >
                          <option value="🍇">🍇 Uva</option>
                          <option value="🍓">🍓 Morango</option>
                          <option value="🍉">🍉 Melancia</option>
                          <option value="🫐">🫐 Mirtilo</option>
                          <option value="🥭">🥭 Manga</option>
                          <option value="🍌">🍌 Banana</option>
                          <option value="🍏">🍏 Maçã Verde</option>
                          <option value="🍑">🍑 Pêssego</option>
                          <option value="🥝">🥝 Kiwi</option>
                          <option value="🍋">🍋 Limão</option>
                          <option value="🌿">🌿 Menta / Hortelã</option>
                          <option value="🧊">🧊 Ice / Gelo</option>
                          <option value="🥤">🥤 Cola / Refrigerante</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white font-bold hover:brightness-110 shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Cadastrar Sabor no Modelo
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================== TAB 5: BANNERS & DESTAQUES ===================== */}
        {activeTab === 'banners' && (
          <div className="animate-in fade-in duration-200">
            <BannerVisualEditor />
          </div>
        )}

        {/* ===================== TAB 6: CONFIGURAÇÕES ===================== */}
        {activeTab === 'configuracoes' && (
          <div className="max-w-2xl space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="font-heading text-xl font-bold text-white light:text-slate-900">
                Configurações da Loja & Identidade Visual
              </h2>
              <p className="text-xs text-[#A5A5B8]">
                Ajuste os dados institucionais e o aviso de maioridade regulatória.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                showToast('Configurações salvas com sucesso!');
              }}
              className="p-6 rounded-2xl bg-[#0D1022] light:bg-white border border-[#8423DA]/25 shadow-xl space-y-4 text-xs"
            >
              <div>
                <label className="block text-gray-300 light:text-slate-700 font-semibold mb-1">
                  Nome da Marca / Loja
                </label>
                <input
                  type="text"
                  value={settings.storeName}
                  onChange={(e) => updateSettings({ storeName: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/30 text-white light:text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="block text-gray-300 light:text-slate-700 font-semibold mb-1">
                  E-mail de Suporte / Institucional
                </label>
                <input
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) => updateSettings({ supportEmail: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/30 text-white light:text-slate-900"
                />
              </div>

              <div>
                <label className="block text-gray-300 light:text-slate-700 font-semibold mb-1">
                  Telefone / WhatsApp Visível
                </label>
                <input
                  type="text"
                  value={settings.supportPhone}
                  onChange={(e) => updateSettings({ supportPhone: e.target.value })}
                  placeholder="(86) 99901-4685"
                  className="w-full p-2.5 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/30 text-white light:text-slate-900"
                />
              </div>

              <div>
                <label className="block text-gray-300 light:text-slate-700 font-semibold mb-1">
                  Número de Envio do WhatsApp (com DDI + DDD, sem traço ou espaço)
                </label>
                <input
                  type="text"
                  value={settings.whatsappNumber}
                  onChange={(e) => updateSettings({ whatsappNumber: e.target.value.replace(/\D/g, '') })}
                  placeholder="5586999014685"
                  className="w-full p-2.5 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/30 text-white light:text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-gray-300 light:text-slate-700 font-semibold mb-1">
                  Aviso Regulatório e de Saúde (+18)
                </label>
                <textarea
                  rows={4}
                  value={settings.legalNotice}
                  onChange={(e) => updateSettings({ legalNotice: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/30 text-white light:text-slate-900 leading-relaxed"
                />
              </div>

              <div className="pt-3 flex items-center justify-between">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#007BFF] to-[#00DFFF] text-[#080811] font-bold shadow-md hover:brightness-110 cursor-pointer"
                >
                  Salvar Alterações
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Deseja resetar todas as configurações e catálogo?')) {
                      resetAllData();
                      showToast('Configurações resetadas!');
                    }
                  }}
                  className="text-rose-400 hover:underline"
                >
                  Restaurar Padrão de Fábrica
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ===================== TAB: CUPONS & LIMITES (SOLICITADO PELO USUÁRIO) ===================== */}
        {activeTab === 'cupons' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header with Title and Create Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-heading text-xl font-bold text-white light:text-slate-900 flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-[#FACC15]" />
                  <span>Cupons Promocionais & Limites</span>
                </h2>
                <p className="text-xs text-[#A5A5B8]">
                  Crie cupons com desconto percentual ou fixo, restrinja a itens específicos e defina quantidade máxima de utilizações.
                </p>
              </div>

              <button
                onClick={() => handleOpenCouponModal()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FACC15] to-[#EAB308] hover:from-[#ffe873] hover:to-[#FACC15] text-[#080811] text-xs font-black shadow-lg shadow-[#FACC15]/20 transition-all cursor-pointer shrink-0 active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Novo Cupom Promocional</span>
              </button>
            </div>

            {/* KPI Cards for Coupons */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0D1022] light:bg-white border border-[#8423DA]/30 shadow-lg space-y-1.5">
                <div className="flex items-center justify-between text-[#A5A5B8]">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Total de Cupons</span>
                  <Ticket className="w-4 h-4 text-[#00DFFF]" />
                </div>
                <p className="font-heading text-2xl sm:text-3xl font-black text-white light:text-slate-900">
                  {totalCoupons}
                </p>
                <p className="text-[10px] text-[#A5A5B8]">Códigos cadastrados no sistema</p>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-[#0D1022] light:bg-white border border-[#8423DA]/30 shadow-lg space-y-1.5">
                <div className="flex items-center justify-between text-[#A5A5B8]">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Item Específico</span>
                  <Target className="w-4 h-4 text-[#E53CF3]" />
                </div>
                <p className="font-heading text-2xl sm:text-3xl font-black text-[#E53CF3]">
                  {itemRestrictedCoupons}
                </p>
                <p className="text-[10px] text-[#A5A5B8]">Exclusivos para pods selecionados</p>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-[#0D1022] light:bg-white border border-[#8423DA]/30 shadow-lg space-y-1.5">
                <div className="flex items-center justify-between text-[#A5A5B8]">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Com Limite de Usos</span>
                  <Hash className="w-4 h-4 text-[#FACC15]" />
                </div>
                <p className="font-heading text-2xl sm:text-3xl font-black text-[#FACC15] light:text-[#CA8A04]">
                  {limitedCoupons}
                </p>
                <p className="text-[10px] text-[#A5A5B8]">Quantidade máxima controlada</p>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-[#0D1022] light:bg-white border border-[#8423DA]/30 shadow-lg space-y-1.5">
                <div className="flex items-center justify-between text-[#A5A5B8]">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Usos Computados</span>
                  <ShoppingBag className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="font-heading text-2xl sm:text-3xl font-black text-emerald-400">
                  {totalCouponsUsed}
                </p>
                <p className="text-[10px] text-[#A5A5B8]">Resgates realizados pelos clientes</p>
              </div>
            </div>

            {/* Explanatory Tip Banner */}
            <div className="p-3.5 rounded-2xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/30 flex items-start gap-3 text-xs text-[#A5A5B8] light:text-slate-700">
              <span className="text-base shrink-0">💡</span>
              <p className="leading-relaxed">
                <strong className="text-white light:text-slate-900">Como funciona a restrição e limite:</strong> Se você vincular um cupom a um modelo específico (como o <em>Ignite V55</em>), o cliente só conseguirá ativar o cupom se adicionar esse produto ao carrinho. Caso defina uma quantidade de usos (ex: 20 usos), assim que os clientes finalizarem 20 pedidos com ele, o cupom será bloqueado automaticamente.
              </p>
            </div>

            {/* Coupons Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {coupons.map((coupon) => {
                const isItemRestricted = coupon.applicableModelId && coupon.applicableModelId !== 'all';
                const hasMaxUses = typeof coupon.maxUses === 'number' && coupon.maxUses > 0;
                const isExhausted = hasMaxUses && coupon.usedCount >= (coupon.maxUses || 0);
                const remainingUses = hasMaxUses ? Math.max(0, (coupon.maxUses || 0) - coupon.usedCount) : null;
                const usageProgress = hasMaxUses
                  ? Math.min(100, Math.round((coupon.usedCount / (coupon.maxUses || 1)) * 100))
                  : 0;

                return (
                  <div
                    key={coupon.id}
                    className={`p-5 rounded-2xl border transition-all shadow-md flex flex-col justify-between gap-4 ${
                      !coupon.active
                        ? 'bg-[#0A0D1C] opacity-60 border-gray-800'
                        : isExhausted
                        ? 'bg-[#140D1E] border-rose-500/30'
                        : 'bg-[#0D1022] light:bg-white border-[#8423DA]/30 hover:border-[#00DFFF]/50'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Top Row: Code and Discount Pill */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 rounded-xl bg-[#151938] light:bg-slate-200 border border-[#8423DA]/40 text-white light:text-slate-900 font-mono font-black text-sm tracking-wider">
                            {coupon.code}
                          </span>
                          {!coupon.active && (
                            <span className="px-2 py-0.5 rounded-md bg-gray-700 text-gray-300 text-[10px] font-bold">
                              Inativo
                            </span>
                          )}
                        </div>

                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-heading font-black text-xs shrink-0">
                          {coupon.discountType === 'percent'
                            ? `${coupon.value}% OFF`
                            : `R$ ${coupon.value.toFixed(2).replace('.', ',')} OFF`}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-[#A5A5B8] light:text-slate-600 line-clamp-2">
                        {coupon.description || 'Sem descrição cadastrada.'}
                      </p>

                      {/* Target Restriction Badge */}
                      <div>
                        {isItemRestricted ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#E53CF3]/15 border border-[#E53CF3]/40 text-[#E53CF3] text-[11px] font-semibold max-w-full">
                            <Target className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">
                              Exclusivo: <strong>{coupon.applicableModelName || coupon.applicableModelId}</strong>
                            </span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#00DFFF]/10 border border-[#00DFFF]/30 text-[#00DFFF] text-[11px] font-semibold">
                            <span>🌐 Todo o Catálogo</span>
                          </div>
                        )}
                      </div>

                      {/* Usage Limit & Progress */}
                      <div className="pt-2 border-t border-[#8423DA]/15 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-gray-400">Limite de Usos:</span>
                          {hasMaxUses ? (
                            isExhausted ? (
                              <span className="font-bold text-rose-400">
                                ESGOTADO ({coupon.usedCount}/{coupon.maxUses})
                              </span>
                            ) : (
                              <span className="font-bold text-[#FACC15]">
                                {remainingUses} restantes ({coupon.usedCount}/{coupon.maxUses})
                              </span>
                            )
                          ) : (
                            <span className="font-bold text-[#00DFFF]">
                              Ilimitado ({coupon.usedCount} usados)
                            </span>
                          )}
                        </div>

                        {hasMaxUses && (
                          <div className="w-full h-1.5 rounded-full bg-[#181C38] overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isExhausted
                                  ? 'bg-rose-500'
                                  : 'bg-gradient-to-r from-[#FACC15] to-emerald-400'
                              }`}
                              style={{ width: `${usageProgress}%` }}
                            />
                          </div>
                        )}

                        {coupon.minOrderValue && coupon.minOrderValue > 0 && (
                          <p className="text-[10px] text-gray-400">
                            Pedido mínimo: R$ {coupon.minOrderValue.toFixed(2).replace('.', ',')}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Bottom Actions Row */}
                    <div className="pt-3 border-t border-[#8423DA]/20 flex items-center justify-between">
                      <button
                        onClick={() => toggleCouponActive(coupon.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          coupon.active
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                            : 'bg-gray-700/30 text-gray-400 border border-gray-600 hover:text-white'
                        }`}
                        title="Ativar ou desativar este cupom"
                      >
                        {coupon.active ? 'Ativo' : 'Inativo'}
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenCouponModal(coupon)}
                          className="p-1.5 rounded-lg bg-[#181C38] hover:bg-[#8423DA] text-gray-300 hover:text-white transition-all cursor-pointer"
                          title="Editar cupom"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            if (confirm(`Deseja realmente excluir o cupom "${coupon.code}"?`)) {
                              deleteCoupon(coupon.id);
                              showToast(`Cupom "${coupon.code}" excluído com sucesso!`);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-[#181C38] hover:bg-rose-600 text-gray-300 hover:text-white transition-all cursor-pointer"
                          title="Excluir cupom"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ===================== MODAL: EDIT/ADD BRAND ===================== */}
      {isBrandModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl bg-[#0D1022] light:bg-white border-2 border-[#8423DA]/50 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-lg font-bold">
                {editingBrand ? 'Editar Marca' : 'Nova Marca'}
              </h3>
              <button onClick={() => setIsBrandModalOpen(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleSaveBrand} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Nome da Marca</label>
                <input
                  type="text"
                  value={brandForm.name}
                  onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
                  placeholder="Ex: VAPORESSO"
                  required
                  className="w-full p-2.5 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/30 font-bold uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">País / Origem</label>
                <input
                  type="text"
                  value={brandForm.country}
                  onChange={(e) => setBrandForm({ ...brandForm, country: e.target.value })}
                  placeholder="Ex: USA, UK, Global"
                  className="w-full p-2.5 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/30"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Descrição</label>
                <textarea
                  rows={3}
                  value={brandForm.description}
                  onChange={(e) => setBrandForm({ ...brandForm, description: e.target.value })}
                  placeholder="Breve descrição da marca..."
                  className="w-full p-2.5 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/30"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBrandModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#181C38] text-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white font-bold"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL: EDIT/ADD MODEL ===================== */}
      {isModelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#0D1022] light:bg-white border-2 border-[#8423DA]/50 p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-xl font-bold flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#FACC15]" />
                {editingModel ? 'Editar Modelo' : 'Novo Modelo de Dispositivo'}
              </h3>
              <button onClick={() => setIsModelModalOpen(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleSaveModel} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Marca Vinculada</label>
                  <select
                    value={modelForm.brandId}
                    onChange={(e) => setModelForm({ ...modelForm, brandId: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/30 font-bold"
                  >
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Nome do Modelo</label>
                  <input
                    type="text"
                    value={modelForm.modelName}
                    onChange={(e) => setModelForm({ ...modelForm, modelName: e.target.value })}
                    placeholder="Ex: V55, BC15K, Magic Maze"
                    required
                    className="w-full p-2.5 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/30 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Puffs (Número para filtros)</label>
                  <input
                    type="number"
                    value={modelForm.puffs}
                    onChange={(e) => {
                      const num = Number(e.target.value);
                      setModelForm({
                        ...modelForm,
                        puffs: num,
                        puffsLabel: `⚡ ${num.toLocaleString('pt-BR')} Puffs`,
                      });
                    }}
                    placeholder="15000"
                    required
                    className="w-full p-2.5 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/30"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Etiqueta de Puffs (Card)</label>
                  <input
                    type="text"
                    value={modelForm.puffsLabel}
                    onChange={(e) => setModelForm({ ...modelForm, puffsLabel: e.target.value })}
                    placeholder="⚡ 15.000 Puffs"
                    required
                    className="w-full p-2.5 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/30"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Etiqueta Especial (Card)</label>
                  <select
                    value={modelForm.badge}
                    onChange={(e) => setModelForm({ ...modelForm, badge: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/30 font-bold"
                  >
                    <option value="">Nenhuma</option>
                    <option value="★ TOP">★ TOP (Como na referência)</option>
                    <option value="LANÇAMENTO">LANÇAMENTO</option>
                    <option value="DESTAQUE">DESTAQUE</option>
                    <option value="PREMIUM">PREMIUM</option>
                    <option value="NOVO">NOVO</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Preço Demonstrativo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={modelForm.startingPrice}
                    onChange={(e) => setModelForm({ ...modelForm, startingPrice: Number(e.target.value) })}
                    placeholder="99.99"
                    required
                    className="w-full p-2.5 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/30 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Categoria</label>
                  <input
                    type="text"
                    value={modelForm.category}
                    onChange={(e) => setModelForm({ ...modelForm, category: e.target.value })}
                    placeholder="Descartável Premium, Smart Pod..."
                    className="w-full p-2.5 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/30"
                  />
                </div>
              </div>

              {/* Photo selector */}
              <div>
                <label className="block font-semibold mb-1">Foto Principal do Dispositivo</label>
                <select
                  value={modelForm.imageUrl}
                  onChange={(e) => setModelForm({ ...modelForm, imageUrl: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/30 mb-2"
                >
                  {availableImages.map((img) => (
                    <option key={img.url} value={img.url}>
                      {img.label} ({img.url})
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-3 p-2 bg-[#141838] rounded-xl">
                  <div className="w-12 h-12 rounded bg-white p-1">
                    <img src={modelForm.imageUrl || '/assets/images/logo.png'} alt="" className="w-full h-full object-contain" />
                  </div>
                  <span className="text-[11px] text-gray-400">Prévia da imagem selecionada</span>
                </div>
              </div>

              {/* Technical Specs */}
              <div className="p-3.5 rounded-xl bg-[#141838] space-y-3">
                <h4 className="font-bold text-[#00DFFF] text-[11px] uppercase tracking-wider">
                  Especificações Técnicas
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[10px] text-gray-400 block">Bateria</span>
                    <input
                      type="text"
                      value={modelForm.battery}
                      onChange={(e) => setModelForm({ ...modelForm, battery: e.target.value })}
                      className="w-full p-1.5 rounded bg-[#0D1022] border border-[#8423DA]/30"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">Capacidade E-líquido</span>
                    <input
                      type="text"
                      value={modelForm.eLiquid}
                      onChange={(e) => setModelForm({ ...modelForm, eLiquid: e.target.value })}
                      className="w-full p-1.5 rounded bg-[#0D1022] border border-[#8423DA]/30"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">Teor de Nicotina</span>
                    <input
                      type="text"
                      value={modelForm.nicotine}
                      onChange={(e) => setModelForm({ ...modelForm, nicotine: e.target.value })}
                      className="w-full p-1.5 rounded bg-[#0D1022] border border-[#8423DA]/30"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Descrição</label>
                <textarea
                  rows={2}
                  value={modelForm.description}
                  onChange={(e) => setModelForm({ ...modelForm, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/30"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModelModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#181C38] text-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white font-bold"
                >
                  Salvar Modelo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL: EDIT/ADD COUPON (SOLICITADO PELO USUÁRIO) ===================== */}
      {isCouponModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl sm:rounded-3xl bg-[#0D1022] light:bg-white border-2 border-[#8423DA]/50 p-5 sm:p-6 space-y-4 text-white light:text-slate-900 shadow-2xl my-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#8423DA]/20 pb-3">
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-[#FACC15]" />
                <h3 className="font-heading text-lg font-bold">
                  {editingCoupon ? 'Editar Cupom Promocional' : 'Novo Cupom Promocional'}
                </h3>
              </div>
              <button
                onClick={() => setIsCouponModalOpen(false)}
                className="p-1.5 rounded-lg bg-[#181C38] hover:bg-[#8423DA] text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCoupon} className="space-y-4 text-xs">
              {/* Código do Cupom */}
              <div>
                <label className="block font-bold text-gray-200 light:text-slate-800 mb-1">
                  Código do Cupom * (ex: SAOLUIS15, VIP20, OFERTA-V55)
                </label>
                <input
                  type="text"
                  value={couponForm.code}
                  onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                  placeholder="EX: SAOLUIS15"
                  required
                  className="w-full p-2.5 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/30 font-mono font-black text-sm tracking-wider uppercase text-white light:text-slate-900 focus:outline-none focus:border-[#00DFFF]"
                />
              </div>

              {/* Tipo de Desconto & Valor */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-200 light:text-slate-800 mb-1">
                    Tipo de Desconto *
                  </label>
                  <select
                    value={couponForm.discountType}
                    onChange={(e) =>
                      setCouponForm({
                        ...couponForm,
                        discountType: e.target.value as 'percent' | 'fixed',
                      })
                    }
                    className="w-full p-2.5 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/30 text-white light:text-slate-900 focus:outline-none focus:border-[#00DFFF] cursor-pointer"
                  >
                    <option value="percent">Porcentagem (%)</option>
                    <option value="fixed">Valor Fixo (R$)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-200 light:text-slate-800 mb-1">
                    Valor do Desconto *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    value={couponForm.value}
                    onChange={(e) => setCouponForm({ ...couponForm, value: parseFloat(e.target.value) || 0 })}
                    placeholder="15"
                    required
                    className="w-full p-2.5 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/30 text-white light:text-slate-900 focus:outline-none focus:border-[#00DFFF]"
                  />
                </div>
              </div>

              {/* ITEM ESPECÍFICO (SOLICITADO PELO USUÁRIO) */}
              <div className="p-3.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 space-y-1.5">
                <label className="block font-bold text-[#FACC15] flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-[#FACC15]" />
                  <span>Aplicar a um Item Específico (Opcional)</span>
                </label>
                <select
                  value={couponForm.applicableModelId}
                  onChange={(e) => setCouponForm({ ...couponForm, applicableModelId: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[#0D1022] light:bg-white border border-[#8423DA]/30 text-white light:text-slate-900 focus:outline-none focus:border-[#00DFFF] cursor-pointer"
                >
                  <option value="all">🌐 Qualquer produto do catálogo (Sem restrição)</option>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      ⚡ [{m.brandName}] {m.modelName} ({m.puffsLabel})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-[#A5A5B8] leading-tight">
                  Se selecionado, o cupom só poderá ser aplicado se o cliente tiver este modelo adicionado no carrinho.
                </p>
              </div>

              {/* LIMITE DE QUANTIDADE DE CUPONS (SOLICITADO PELO USUÁRIO) */}
              <div className="p-3.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 space-y-1.5">
                <label className="block font-bold text-[#00DFFF] flex items-center gap-1.5">
                  <Hash className="w-4 h-4 text-[#00DFFF]" />
                  <span>Limite de Quantidade de Cupons / Usos</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={couponForm.maxUses || ''}
                  onChange={(e) => setCouponForm({ ...couponForm, maxUses: parseInt(e.target.value, 10) || 0 })}
                  placeholder="Ex: 50 (ou 0 para ilimitado)"
                  className="w-full p-2.5 rounded-xl bg-[#0D1022] light:bg-white border border-[#8423DA]/30 text-white light:text-slate-900 focus:outline-none focus:border-[#00DFFF]"
                />
                <p className="text-[10px] text-[#A5A5B8] leading-tight">
                  Deixe <strong>0 ou vazio</strong> para usos ilimitados. Caso defina uma quantidade (ex: 20), assim que atingir 20 pedidos finalizados, o cupom será bloqueado automaticamente.
                </p>
              </div>

              {/* Pedido Mínimo */}
              <div>
                <label className="block font-bold text-gray-200 light:text-slate-800 mb-1">
                  Valor Mínimo do Pedido (R$) - Opcional
                </label>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={couponForm.minOrderValue || ''}
                  onChange={(e) => setCouponForm({ ...couponForm, minOrderValue: parseFloat(e.target.value) || 0 })}
                  placeholder="Ex: 100 (ou 0 para sem valor mínimo)"
                  className="w-full p-2.5 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/30 text-white light:text-slate-900 focus:outline-none focus:border-[#00DFFF]"
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="block font-bold text-gray-200 light:text-slate-800 mb-1">
                  Descrição do Cupom
                </label>
                <input
                  type="text"
                  value={couponForm.description}
                  onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                  placeholder="Ex: 15% de desconto especial para clientes de São Luís"
                  className="w-full p-2.5 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/30 text-white light:text-slate-900 focus:outline-none focus:border-[#00DFFF]"
                />
              </div>

              {/* Checkbox Ativo */}
              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/20 cursor-pointer">
                <input
                  type="checkbox"
                  checked={couponForm.active}
                  onChange={(e) => setCouponForm({ ...couponForm, active: e.target.checked })}
                  className="w-4 h-4 rounded text-[#8423DA] focus:ring-[#00DFFF] cursor-pointer"
                />
                <span className="text-xs font-semibold text-gray-200">
                  Cupom Ativo (disponível para uso imediato no carrinho)
                </span>
              </label>

              {/* Footer Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#8423DA]/20">
                <button
                  type="button"
                  onClick={() => setIsCouponModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#181C38] text-gray-300 hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FACC15] to-[#EAB308] hover:from-[#ffe873] hover:to-[#FACC15] text-[#080811] font-black shadow-lg transition-all cursor-pointer active:scale-95"
                >
                  {editingCoupon ? 'Atualizar Cupom' : 'Salvar Cupom'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
