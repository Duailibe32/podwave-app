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
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  History,
  Filter,
  Search,
  Download,
  ShieldCheck,
  Flame,
  UserCheck,
  Users,
  RefreshCw,
  SlidersHorizontal,
  Fingerprint,
  Copy,
  KeyRound,
  Database,
  ChevronLeft,
  ChevronRight,
  Briefcase,
} from 'lucide-react';
import { ProductModel, Brand, FlavorVariant, Coupon, VariantHistoryEntry } from '../../types/catalog';
import { AdminLogin } from './AdminLogin';
import { BannerVisualEditor } from './BannerVisualEditor';
import { SupabaseTab } from './SupabaseTab';
import { OwnerAdvancedSettings } from './OwnerAdvancedSettings';
import { UserManagementTab } from './UserManagementTab';
import { BusinessAuditSection } from './BusinessAuditSection';
import { ImageEditorStudioModal } from './ImageEditorStudioModal';
import { MyBusinessModule } from './MyBusinessModule';
import { OrdersCenterTab } from './OrdersCenterTab';
import { calculateVariantAvailability, calculateVariantsSummary, isNeedsAttention, DEFAULT_LOW_QUANTITY_THRESHOLD } from '../../utils/availability';

type AdminTab = 'pedidos' | 'meu_negocio' | 'dashboard' | 'variantes' | 'modelos' | 'marcas' | 'cupons' | 'banners' | 'historico' | 'usuarios' | 'configuracoes' | 'supabase';

export const AdminPanel: React.FC = () => {
  const {
    brands,
    models,
    banners,
    settings,
    coupons,
    isAdminAuthenticated,
    isAuthChecking,
    isAdmin,
    currentUser,
    isOwner,
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
    variantHistory,
    clearVariantHistory,
    updateFlavorQuantity,
    updateFlavorThreshold,
    bulkUpdateVariants,
    globalLowQuantityThreshold,
    setGlobalLowQuantityThreshold,
    allCatalogOrders,
  } = useCatalog();

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [focusedCustomerIdInUsersTab, setFocusedCustomerIdInUsersTab] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const activeOrdersBadgeCount = React.useMemo(
    () =>
      allCatalogOrders.filter(
        (o) =>
          o.status === 'recebido' ||
          o.status === 'confirmado' ||
          o.status === 'em_separacao' ||
          o.status === 'enviado'
      ).length,
    [allCatalogOrders]
  );

  // Horizontal scroll state & controls for Admin Navigation Tabs
  const tabsContainerRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkTabsScroll = React.useCallback(() => {
    if (tabsContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsContainerRef.current;
      setCanScrollLeft(scrollLeft > 6);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 6);
    }
  }, []);

  React.useEffect(() => {
    checkTabsScroll();
    const handleResize = () => checkTabsScroll();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [checkTabsScroll]);

  const handleScrollTabs = (direction: 'left' | 'right') => {
    if (tabsContainerRef.current) {
      const offset = direction === 'left' ? -260 : 260;
      tabsContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
      setTimeout(checkTabsScroll, 320);
    }
  };

  const showToast = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // --- AI IMAGE STUDIO STATE & HANDLERS ---
  const [isAiStudioOpen, setIsAiStudioOpen] = useState(false);
  const [aiStudioTarget, setAiStudioTarget] = useState<'model' | 'flavor'>('model');
  const [aiStudioContextTitle, setAiStudioContextTitle] = useState('Produto');
  const [aiStudioInitialUrl, setAiStudioInitialUrl] = useState('');

  const handleOpenAiStudioForModel = (initialUrl?: string, title?: string) => {
    setAiStudioTarget('model');
    setAiStudioContextTitle(title || modelForm.modelName || 'Modelo');
    setAiStudioInitialUrl(initialUrl || modelForm.imageUrl || '');
    setIsAiStudioOpen(true);
  };

  const handleOpenAiStudioForFlavor = (initialUrl?: string, title?: string) => {
    setAiStudioTarget('flavor');
    setAiStudioContextTitle(title || flavorForm.name || 'Sabor');
    setAiStudioInitialUrl(initialUrl || flavorForm.customImage || modelForm.imageUrl || '');
    setIsAiStudioOpen(true);
  };

  const handleApplyAiStudioImage = (newImageUrl: string) => {
    if (aiStudioTarget === 'model') {
      setModelForm((prev) => ({ ...prev, imageUrl: newImageUrl }));
      showToast('Nova foto do modelo aprimorada com sucesso!');
    } else {
      setFlavorForm((prev) => ({ ...prev, customImage: newImageUrl }));
      showToast('Nova foto do sabor aprimorada com sucesso!');
    }
  };

  // --- VARIANT MANAGEMENT STATE & FILTERING ---
  const [variantStatusFilter, setVariantStatusFilter] = useState<
    'todas' | 'precisam_atencao' | 'disponivel' | 'ultimas_unidades' | 'esgotado' | 'nao_informado'
  >('precisam_atencao'); // Default to "Precisam de atenção" as priority
  const [variantSearchQuery, setVariantSearchQuery] = useState('');
  const [variantModelFilter, setVariantModelFilter] = useState('all');
  const [selectedVariantKeys, setSelectedVariantKeys] = useState<string[]>([]);

  // Quick inline edit state
  const [editingVariantKey, setEditingVariantKey] = useState<string | null>(null);
  const [inlineQuantity, setInlineQuantity] = useState<string>('');
  const [inlineThreshold, setInlineThreshold] = useState<string>('3');
  const [inlineNotes, setInlineNotes] = useState<string>('');
  const [isSavingInline, setIsSavingInline] = useState(false);

  // Batch modal state
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchActionType, setBatchActionType] = useState<'set_qty' | 'set_threshold' | 'clear_qty'>('set_qty');
  const [batchQuantityInput, setBatchQuantityInput] = useState('10');
  const [batchThresholdInput, setBatchThresholdInput] = useState('3');

  // History modal state
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Flattened variants across all models
  const allVariants = models.flatMap((m) =>
    m.flavors.map((f) => {
      const threshold = f.lowQuantityThreshold ?? m.lowQuantityThreshold ?? globalLowQuantityThreshold;
      const avail = calculateVariantAvailability(f.demoQuantity, threshold);
      return {
        key: `${m.id}:::${f.id}`,
        modelId: m.id,
        modelName: m.modelName,
        brandId: m.brandId,
        brandName: m.brandName,
        category: m.category,
        imageUrl: f.customImage || m.imageUrl,
        flavor: f,
        threshold,
        avail,
        isAttention: avail.status !== 'disponivel',
      };
    })
  );

  const variantsSummary = calculateVariantsSummary(
    models.flatMap((m) => m.flavors),
    globalLowQuantityThreshold
  );

  // Filtered variants based on tab filter & search
  const filteredVariants = allVariants
    .filter((item) => {
      // Model filter
      if (variantModelFilter !== 'all' && item.modelId !== variantModelFilter) {
        return false;
      }
      // Search query: match brand, model, or flavor name
      if (variantSearchQuery.trim()) {
        const q = variantSearchQuery.toLowerCase();
        const matchBrand = item.brandName.toLowerCase().includes(q);
        const matchModel = item.modelName.toLowerCase().includes(q);
        const matchFlavor = item.flavor.name.toLowerCase().includes(q);
        if (!matchBrand && !matchModel && !matchFlavor) return false;
      }
      // Status filter
      if (variantStatusFilter === 'precisam_atencao') {
        return item.avail.status !== 'disponivel';
      }
      if (variantStatusFilter !== 'todas') {
        return item.avail.status === variantStatusFilter;
      }
      return true;
    })
    .sort((a, b) => {
      // Priority ordering: Esgotadas (1), Últimas unidades (2), Não informadas (3)
      const priorityWeight = (status: string) => {
        if (status === 'esgotado') return 1;
        if (status === 'ultimas_unidades') return 2;
        if (status === 'nao_informado') return 3;
        return 4;
      };
      if (variantStatusFilter === 'precisam_atencao') {
        return priorityWeight(a.avail.status) - priorityWeight(b.avail.status);
      }
      return 0;
    });

  const handleStartInlineEdit = (item: typeof allVariants[0]) => {
    setEditingVariantKey(item.key);
    setInlineQuantity(item.flavor.demoQuantity === null || item.flavor.demoQuantity === undefined ? '' : String(item.flavor.demoQuantity));
    setInlineThreshold(String(item.threshold));
    setInlineNotes('');
  };

  const handleSaveInlineEdit = (modelId: string, flavorId: string) => {
    setIsSavingInline(true);
    let newQty: number | null = null;
    if (inlineQuantity.trim() !== '') {
      const parsed = parseInt(inlineQuantity.trim(), 10);
      if (isNaN(parsed) || parsed < 0) {
        alert('Por favor informe um número inteiro maior ou igual a zero (ou deixe vazio para "Não informado").');
        setIsSavingInline(false);
        return;
      }
      newQty = parsed;
    }

    const parsedThreshold = parseInt(inlineThreshold.trim(), 10);
    const newThreshold = isNaN(parsedThreshold) || parsedThreshold < 1 ? 3 : parsedThreshold;

    updateFlavorQuantity(modelId, flavorId, newQty, inlineNotes.trim() || undefined);
    updateFlavorThreshold(modelId, flavorId, newThreshold);

    setIsSavingInline(false);
    setEditingVariantKey(null);
    showToast('Variante atualizada com sucesso!');
  };

  const handleExecuteBatchAction = () => {
    if (selectedVariantKeys.length === 0) return;

    const variantKeyObjects = selectedVariantKeys.map((k) => {
      const [mId, fId] = k.split(':::');
      return { modelId: mId, flavorId: fId };
    });

    if (batchActionType === 'set_qty') {
      const parsed = parseInt(batchQuantityInput.trim(), 10);
      if (isNaN(parsed) || parsed < 0) {
        alert('Quantidade inválida para edição em lote.');
        return;
      }
      bulkUpdateVariants(variantKeyObjects, { demoQuantity: parsed });
      showToast(`${selectedVariantKeys.length} variantes atualizadas para ${parsed} unidades!`);
    } else if (batchActionType === 'set_threshold') {
      const parsed = parseInt(batchThresholdInput.trim(), 10);
      if (isNaN(parsed) || parsed < 1) {
        alert('Limite inválido.');
        return;
      }
      bulkUpdateVariants(variantKeyObjects, { lowQuantityThreshold: parsed });
      showToast(`Limite de alerta de ${selectedVariantKeys.length} variantes alterado para ${parsed}!`);
    } else if (batchActionType === 'clear_qty') {
      bulkUpdateVariants(variantKeyObjects, { demoQuantity: null });
      showToast(`Quantidades de ${selectedVariantKeys.length} variantes limpas (Não informada)!`);
    }

    setIsBatchModalOpen(false);
    setSelectedVariantKeys([]);
  };

  const handleExportVariantsCSV = () => {
    const rows = [
      ['Marca', 'Modelo', 'Sabor', 'Quantidade Demonstrativa', 'Limite Alerta', 'Status', 'Ultima Atualizacao'].join(';')
    ];

    const targetList = selectedVariantKeys.length > 0 
      ? allVariants.filter((v) => selectedVariantKeys.includes(v.key))
      : filteredVariants;

    targetList.forEach((v) => {
      rows.push([
        `"${v.brandName}"`,
        `"${v.modelName}"`,
        `"${v.flavor.name}"`,
        v.flavor.demoQuantity === null || v.flavor.demoQuantity === undefined ? 'Nao informada' : String(v.flavor.demoQuantity),
        String(v.threshold),
        `"${v.avail.label}"`,
        `"${v.flavor.updatedAt || 'Inicial'}"`
      ].join(';'));
    });

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `podwave_variantes_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Relatório CSV exportado com sucesso!');
  };

  // --- BRAND MANAGEMENT CONSTANTS & THEMES ---
  const BRAND_CARD_THEMES = [
    { id: 'black', label: 'Preto Titânio', bg: 'from-[#1C1C24] via-[#0D0D12] to-[#050508]', border: 'border-white/30', text: '#FFFFFF' },
    { id: 'magenta', label: 'Magenta Neon (Elfbar)', bg: 'from-[#E11D48] via-[#C026D3] to-[#7E22CE]', border: 'border-[#F43F5E]/60', text: '#FF2D87' },
    { id: 'cyan', label: 'Ciano Elétrico (Lost Mary)', bg: 'from-[#0284C7] via-[#0369A1] to-[#0C4A6E]', border: 'border-[#00DFFF]/60', text: '#00DFFF' },
    { id: 'emerald', label: 'Esmeralda (Vaporesso)', bg: 'from-[#065F46] via-[#064E3B] to-[#022C22]', border: 'border-[#10B981]/60', text: '#10B981' },
    { id: 'blue', label: 'Azul Safira (Fumot)', bg: 'from-[#1E3A8A] via-[#172554] to-[#0A0F1D]', border: 'border-[#3B82F6]/60', text: '#3B82F6' },
    { id: 'purple', label: 'Roxo Cyberpunk', bg: 'from-[#4C1D95] via-[#311042] to-[#0D0B18]', border: 'border-[#8423DA]/60', text: '#A855F7' },
    { id: 'gold', label: 'Neon Cyber', bg: 'from-[#0D1B2A] via-[#14213D] to-[#0A1128]', border: 'border-[#00DFFF]/60', text: '#00DFFF' },
    { id: 'slate', label: 'Grafite (Geek Bar)', bg: 'from-[#334155] via-[#1E293B] to-[#0F172A]', border: 'border-slate-400/50', text: '#94A3B8' },
  ];

  const BRAND_PRESET_LOGOS = [
    { label: 'PodWave Onda Neon', url: '/assets/images/logo.png' },
    { label: 'Gold Metallic Emblem', url: '/assets/images/pod_gold_black_1792699257182.jpg' },
    { label: 'Aether Blue Tech', url: '/assets/images/pod_geekbar_pulse_1792699212047.jpg' },
    { label: 'Frost Berry Neon', url: '/assets/images/pod_oxbar_maze_1792699228586.jpg' },
    { label: 'Lumin Deep Purple', url: '/assets/images/pod_grape_ice_1792699243386.jpg' },
  ];

  // Client-side image compression to prevent localStorage overflow
  const compressImage = (file: File, maxWidth = 320, maxHeight = 320): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        const image = new Image();
        image.onload = () => {
          let width = image.width;
          let height = image.height;
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(image, 0, 0, width, height);
            resolve(canvas.toDataURL('image/png', 0.88));
          } else {
            resolve(readerEvent.target?.result as string);
          }
        };
        image.onerror = () => resolve(readerEvent.target?.result as string);
        image.src = readerEvent.target?.result as string;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  // --- BRAND MANAGEMENT MODAL STATE (Name & Photo Editing) ---
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [brandForm, setBrandForm] = useState({
    name: '',
    country: '',
    description: '',
    logoUrl: '',
    cardColor: 'black',
  });

  const handleOpenBrandModal = (brand?: Brand) => {
    if (brand) {
      setEditingBrand(brand);
      setBrandForm({
        name: brand.name,
        country: brand.country || '',
        description: brand.description || '',
        logoUrl: brand.logoUrl || '',
        cardColor: brand.cardColor || (
          brand.id.includes('elfbar') ? 'magenta' :
          brand.id.includes('lostmary') ? 'cyan' :
          brand.id.includes('vaporesso') ? 'emerald' :
          brand.id.includes('fumot') ? 'blue' :
          brand.id.includes('geekbar') ? 'slate' : 'black'
        ),
      });
    } else {
      setEditingBrand(null);
      setBrandForm({ name: '', country: '', description: '', logoUrl: '', cardColor: 'black' });
    }
    setIsBrandModalOpen(true);
  };

  const handleBrandLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const compressed = await compressImage(file, 320, 320);
    if (compressed) {
      setBrandForm((prev) => ({ ...prev, logoUrl: compressed }));
    }
  };

  const handleInlineBrandPhotoUpload = async (brandId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const compressed = await compressImage(file, 320, 320);
    if (compressed) {
      updateBrand(brandId, { logoUrl: compressed });
      showToast('Foto da marca atualizada com sucesso!');
    }
  };

  const handleSaveBrand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandForm.name.trim()) return;

    if (editingBrand) {
      updateBrand(editingBrand.id, {
        name: brandForm.name.trim(),
        country: brandForm.country.trim() || 'Global',
        description: brandForm.description.trim(),
        logoUrl: brandForm.logoUrl.trim() || undefined,
        cardColor: brandForm.cardColor,
      });
      showToast(`Marca "${brandForm.name}" atualizada com sucesso!`);
    } else {
      const generatedId = `brand-${Date.now()}`;
      addBrand({
        name: brandForm.name.trim().toUpperCase(),
        logoText: brandForm.name.trim().toUpperCase(),
        featured: true,
        country: brandForm.country || 'Global',
        description: brandForm.description || 'Fabricante de dispositivos de vaporização.',
        logoUrl: brandForm.logoUrl.trim() || undefined,
        cardColor: brandForm.cardColor,
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

  const handleModelImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file, 400, 400);
    if (compressed) {
      setModelForm((prev) => ({ ...prev, imageUrl: compressed }));
      showToast('Foto do modelo carregada com sucesso!');
    }
  };

  const handleDuplicateModel = (model: ProductModel) => {
    const copyName = `${model.modelName} (Cópia)`;
    addModel({
      ...model,
      modelName: copyName,
      flavors: model.flavors.map((f, i) => ({
        ...f,
        id: `fl-dup-${Date.now()}-${i}`,
      })),
    });
    showToast(`Modelo "${model.modelName}" duplicado com sucesso!`);
  };

  // --- FLAVOR FULL CRUD STATE & PRESETS ---
  const FLAVOR_PRESET_COLORS = [
    { name: 'Uva / Roxo', color: '#9333EA' },
    { name: 'Morango / Vermelho', color: '#EF4444' },
    { name: 'Melancia / Pink', color: '#F43F5E' },
    { name: 'Blueberry / Ice', color: '#3B82F6' },
    { name: 'Menta / Ciano', color: '#00DFFF' },
    { name: 'Limão / Citrus', color: '#EAB308' },
    { name: 'Manga / Laranja', color: '#F59E0B' },
    { name: 'Pêssego / Salmão', color: '#FB923C' },
    { name: 'Maçã Verde', color: '#10B981' },
    { name: 'Tabaco / Gold', color: '#D97706' },
    { name: 'Café / Marrom', color: '#78350F' },
    { name: 'Frozen / Ice', color: '#38BDF8' },
  ];

  const FLAVOR_PRESET_EMOJIS = [
    '🍇', '🍓', '🍉', '🫐', '🍋', '🥭', '🍑', '🍏', '🍒', '🍍', '❄️', '⚡', '🍹', '🌴', '🍬', '☕'
  ];

  const [isFlavorModalOpen, setIsFlavorModalOpen] = useState(false);
  const [editingFlavor, setEditingFlavor] = useState<{ modelId: string; flavor: FlavorVariant } | null>(null);
  const [flavorForm, setFlavorForm] = useState({
    modelId: '',
    name: '',
    colorHex: '#9333EA',
    iconEmoji: '🍇',
    demoQuantity: '10',
    lowQuantityThreshold: 3,
    customImage: '',
    inStock: true,
  });

  const handleOpenFlavorModal = (targetModelId?: string, flavor?: FlavorVariant) => {
    const chosenModelId = targetModelId || (variantModelFilter !== 'all' ? variantModelFilter : (models[0]?.id || ''));

    if (flavor && targetModelId) {
      setEditingFlavor({ modelId: targetModelId, flavor });
      setFlavorForm({
        modelId: targetModelId,
        name: flavor.name,
        colorHex: flavor.colorHex || '#9333EA',
        iconEmoji: flavor.iconEmoji || '🍇',
        demoQuantity: flavor.demoQuantity === null || flavor.demoQuantity === undefined ? '' : String(flavor.demoQuantity),
        lowQuantityThreshold: flavor.lowQuantityThreshold ?? 3,
        customImage: flavor.customImage || '',
        inStock: flavor.inStock !== false,
      });
    } else {
      setEditingFlavor(null);
      setFlavorForm({
        modelId: chosenModelId,
        name: '',
        colorHex: '#3B82F6',
        iconEmoji: '🫐',
        demoQuantity: '10',
        lowQuantityThreshold: 3,
        customImage: '',
        inStock: true,
      });
    }
    setIsFlavorModalOpen(true);
  };

  const handleFlavorImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file, 260, 260);
    if (compressed) {
      setFlavorForm((prev) => ({ ...prev, customImage: compressed }));
      showToast('Foto do sabor carregada!');
    }
  };

  const handleSaveFlavor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!flavorForm.name.trim() || !flavorForm.modelId) return;

    let parsedQty: number | null = null;
    if (flavorForm.demoQuantity.trim() !== '') {
      const q = parseInt(flavorForm.demoQuantity.trim(), 10);
      parsedQty = isNaN(q) || q < 0 ? 0 : q;
    }

    const thresholdVal = Number(flavorForm.lowQuantityThreshold) || 3;

    if (editingFlavor) {
      updateFlavor(editingFlavor.modelId, editingFlavor.flavor.id, {
        name: flavorForm.name.trim(),
        colorHex: flavorForm.colorHex,
        iconEmoji: flavorForm.iconEmoji || '⚡',
        demoQuantity: parsedQty,
        lowQuantityThreshold: thresholdVal,
        customImage: flavorForm.customImage.trim() || undefined,
        inStock: parsedQty === null ? flavorForm.inStock : parsedQty > 0,
        updatedAt: new Date().toISOString(),
      });
      showToast(`Sabor "${flavorForm.name}" atualizado com sucesso!`);
    } else {
      addFlavor(flavorForm.modelId, {
        name: flavorForm.name.trim(),
        colorHex: flavorForm.colorHex,
        iconEmoji: flavorForm.iconEmoji || '⚡',
        demoQuantity: parsedQty,
        lowQuantityThreshold: thresholdVal,
        customImage: flavorForm.customImage.trim() || undefined,
        inStock: parsedQty === null ? flavorForm.inStock : parsedQty > 0,
        updatedAt: new Date().toISOString(),
      });
      showToast(`Novo sabor "${flavorForm.name}" adicionado com sucesso!`);
    }
    setIsFlavorModalOpen(false);
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

  // If user is not authenticated as an admin or owner, render the admin login gate screen
  if (isAuthChecking) {
    return <div role="status" className="p-6 text-center text-sm text-gray-300">Verificando acesso...</div>;
  }
  if (!isAdmin) {
    return <AdminLogin />;
  }

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
      {/* Top Admin Sub-header with Owner Profile (Section 7) */}
      <div className="border-b border-[#8423DA]/25 bg-[#0D1022]/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setCurrentView('catalog');
                  window.history.pushState({}, '', '/');
                }}
                className="p-2 rounded-xl bg-[#141838] hover:bg-[#8423DA] text-gray-300 hover:text-white transition-all cursor-pointer border border-[#8423DA]/30"
                title="Voltar ao catálogo principal"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#11152A] p-1.5 border border-[#00DFFF]/40 flex items-center justify-center shadow-lg shadow-[#00DFFF]/15">
                  <img src="/assets/images/logo.png" alt="Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="font-heading text-lg font-black tracking-tight text-white flex items-center gap-2">
                      Painel Administrativo
                    </h1>
                    <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-[#00DFFF]/20 via-[#8423DA]/30 to-[#E53CF3]/20 border border-[#00DFFF]/50 text-[10px] text-[#00DFFF] font-black tracking-widest shadow-[0_0_10px_rgba(0,223,255,0.3)]">
                      {isOwner ? 'PROPRIETÁRIO' : 'ADMINISTRADOR'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#A5A5B8] flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Sessão Ativa
                    </span>
                    <span>&bull;</span>
                    <span className="text-gray-300 truncate max-w-[220px]">
                      {currentUser?.fullName || currentUser?.email || 'Proprietário Autorizado'}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">


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

          {/* Navigation Tabs with Smooth Horizontal Scroll Controls */}
          <div className="relative group/tabs pt-1 pb-3">
            {/* Scroll Left Indicator Button */}
            {canScrollLeft && (
              <button
                type="button"
                onClick={() => handleScrollTabs('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-[#0D1022]/95 hover:bg-[#8423DA] text-white border border-[#00DFFF]/60 flex items-center justify-center shadow-xl shadow-black/80 transition-all cursor-pointer backdrop-blur-md"
                title="Rolar abas para a esquerda"
                aria-label="Rolar para a esquerda"
              >
                <ChevronLeft className="w-4 h-4 text-[#00DFFF]" />
              </button>
            )}

            {/* Scroll Right Indicator Button */}
            {canScrollRight && (
              <button
                type="button"
                onClick={() => handleScrollTabs('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-[#0D1022]/95 hover:bg-[#8423DA] text-white border border-[#00DFFF]/60 flex items-center justify-center shadow-xl shadow-black/80 transition-all cursor-pointer backdrop-blur-md"
                title="Rolar abas para a direita"
                aria-label="Rolar para a direita"
              >
                <ChevronRight className="w-4 h-4 text-[#00DFFF]" />
              </button>
            )}

            <div
              ref={tabsContainerRef}
              onScroll={checkTabsScroll}
              className="flex items-center gap-2 overflow-x-auto pb-1.5 scroll-smooth [scrollbar-width:thin] [scrollbar-color:#8423DA_#0D1022] pr-10"
            >
              {/* TAB: CENTRAL DE PEDIDOS (PEDIDOS EM TEMPO REAL, FIDELIDADE & FINANCEIRO) */}
              <button
                onClick={() => {
                  setActiveTab('pedidos');
                  setTimeout(checkTabsScroll, 100);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border shrink-0 relative ${
                  activeTab === 'pedidos'
                    ? 'bg-gradient-to-r from-[#8423DA] via-[#007BFF] to-[#00DFFF] text-white font-black border-[#00DFFF] shadow-[0_0_15px_rgba(0,223,255,0.4)]'
                    : 'bg-[#11152A] text-gray-300 border-transparent hover:border-[#00DFFF]/50'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5 text-[#00DFFF]" />
                <span>Pedidos</span>
                {activeOrdersBadgeCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-[#00DFFF] text-[#080811] font-black text-[10px]">
                    {activeOrdersBadgeCount}
                  </span>
                )}
              </button>

              {/* TAB: MEU NEGÓCIO (CONTROLE GERENCIAL & FINANCEIRO MANUAL) */}
              <button
                onClick={() => {
                  setActiveTab('meu_negocio');
                  setTimeout(checkTabsScroll, 100);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border shrink-0 relative ${
                  activeTab === 'meu_negocio'
                    ? 'bg-gradient-to-r from-[#00DFFF] via-[#007BFF] to-[#8423DA] text-black font-black border-[#00DFFF] shadow-[0_0_15px_rgba(0,223,255,0.4)]'
                    : 'bg-[#11152A] text-gray-300 border-transparent hover:border-[#00DFFF]/50'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Meu Negócio</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('dashboard');
                  setTimeout(checkTabsScroll, 100);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border shrink-0 ${
                  activeTab === 'dashboard'
                    ? 'bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white border-[#00DFFF]/50 shadow-md'
                    : 'bg-[#11152A] text-gray-300 border-transparent hover:border-[#8423DA]/40'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Resumo do catálogo</span>
              </button>

              {/* TAB: GESTÃO DE VARIANTES (SOLICITADO COM PRIORIDADE) */}
              <button
                onClick={() => {
                  setActiveTab('variantes');
                  setTimeout(checkTabsScroll, 100);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border shrink-0 relative ${
                  activeTab === 'variantes'
                    ? 'bg-gradient-to-r from-[#8423DA] via-[#007BFF] to-[#00DFFF] text-white border-[#00DFFF] shadow-[0_0_15px_rgba(0,223,255,0.35)]'
                    : 'bg-[#11152A] text-gray-300 border-transparent hover:border-[#8423DA]/40'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-[#00DFFF]" />
                <span>Gestão de Variantes</span>
                {variantsSummary.precisamAtencao > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-black font-black text-[10px] animate-pulse">
                    {variantsSummary.precisamAtencao}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  setActiveTab('modelos');
                  setTimeout(checkTabsScroll, 100);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border shrink-0 ${
                  activeTab === 'modelos'
                    ? 'bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white border-[#00DFFF]/50 shadow-md'
                    : 'bg-[#11152A] text-gray-300 border-transparent hover:border-[#8423DA]/40'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Modelos & Puffs ({totalModels})</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('marcas');
                  setTimeout(checkTabsScroll, 100);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border shrink-0 ${
                  activeTab === 'marcas'
                    ? 'bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white border-[#00DFFF]/50 shadow-md'
                    : 'bg-[#11152A] text-gray-300 border-transparent hover:border-[#8423DA]/40'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Marcas ({totalBrands})</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('cupons');
                  setTimeout(checkTabsScroll, 100);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border shrink-0 ${
                  activeTab === 'cupons'
                    ? 'bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white border-[#00DFFF]/50 shadow-md'
                    : 'bg-[#11152A] text-gray-300 border-transparent hover:border-[#8423DA]/40'
                }`}
              >
                <Ticket className="w-3.5 h-3.5 text-[#00DFFF]" />
                <span>Cupons ({totalCoupons})</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('banners');
                  setTimeout(checkTabsScroll, 100);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border shrink-0 ${
                  activeTab === 'banners'
                    ? 'bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white border-[#00DFFF]/50 shadow-md'
                    : 'bg-[#11152A] text-gray-300 border-transparent hover:border-[#8423DA]/40'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Banners</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('historico');
                  setTimeout(checkTabsScroll, 100);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border shrink-0 ${
                  activeTab === 'historico'
                    ? 'bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white border-[#00DFFF]/50 shadow-md'
                    : 'bg-[#11152A] text-gray-300 border-transparent hover:border-[#8423DA]/40'
                }`}
              >
                <History className="w-3.5 h-3.5 text-[#00DFFF]" />
                <span>Auditoria & Logs</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('usuarios');
                  setTimeout(checkTabsScroll, 100);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border shrink-0 ${
                  activeTab === 'usuarios'
                    ? 'bg-gradient-to-r from-[#8423DA] via-[#007BFF] to-[#00DFFF] text-white border-[#00DFFF] shadow-md'
                    : 'bg-[#11152A] text-gray-300 border-transparent hover:border-[#8423DA]/40'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-[#00DFFF]" />
                <span>Usuários & VIPs</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('configuracoes');
                  setTimeout(checkTabsScroll, 100);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border shrink-0 ${
                  activeTab === 'configuracoes'
                    ? 'bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white border-[#00DFFF]/50 shadow-md'
                    : 'bg-[#11152A] text-gray-300 border-transparent hover:border-[#8423DA]/40'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Configurações</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('supabase');
                  setTimeout(checkTabsScroll, 100);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border shrink-0 ${
                  activeTab === 'supabase'
                    ? 'bg-gradient-to-r from-[#00DFFF] to-[#007BFF] text-[#080811] font-black border-[#00DFFF] shadow-md shadow-[#00DFFF]/20'
                    : 'bg-[#11152A] text-gray-300 border-transparent hover:border-[#00DFFF]/40'
                }`}
              >
                <Database className="w-3.5 h-3.5 text-[#00DFFF]" />
                <span>Sincronização</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tab Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* ===================== TAB: CENTRAL DE PEDIDOS ===================== */}
        {activeTab === 'pedidos' && (
          <OrdersCenterTab
            onOpenUserInTab={(customerId) => {
              setFocusedCustomerIdInUsersTab(customerId);
              setActiveTab('usuarios');
            }}
            onOpenBusinessTab={() => {
              setActiveTab('meu_negocio');
            }}
          />
        )}

        {/* ===================== TAB: MEU NEGÓCIO (CONTROLE GERENCIAL & FINANCEIRO MANUAL) ===================== */}
        {activeTab === 'meu_negocio' && <MyBusinessModule />}

        {/* ===================== TAB 1: DASHBOARD ===================== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* CENTRAL DE ALERTAS: ATENÇÃO ÀS VARIANTES (SECTION 11 & 12) */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-[#141838] via-[#11152A] to-[#181D3D] border-2 border-[#8423DA]/40 shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-rose-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <Flame className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-black text-white flex items-center gap-2">
                      Atenção às Variantes
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black">
                        {variantsSummary.precisamAtencao} precisam de atenção
                      </span>
                    </h3>
                    <p className="text-xs text-[#A5A5B8]">
                      Confira a disponibilidade e os alertas de estoque por sabor.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setVariantStatusFilter('precisam_atencao');
                    setActiveTab('variantes');
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#8423DA] via-[#007BFF] to-[#00DFFF] hover:opacity-95 text-white text-xs font-black shadow-lg shadow-[#8423DA]/30 flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Gerenciar Variantes com Alerta &rarr;</span>
                </button>
              </div>

              {/* Counter Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {/* Esgotadas */}
                <button
                  type="button"
                  onClick={() => {
                    setVariantStatusFilter('esgotado');
                    setActiveTab('variantes');
                  }}
                  className="p-3.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-rose-400">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Esgotadas</span>
                    <XCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  </div>
                  <p className="font-heading text-2xl font-black text-rose-400 mt-1">
                    {variantsSummary.esgotado}
                  </p>
                  <p className="text-[10px] text-rose-300/80">Quantidade zerada (0 un)</p>
                </button>

                {/* Últimas unidades */}
                <button
                  type="button"
                  onClick={() => {
                    setVariantStatusFilter('ultimas_unidades');
                    setActiveTab('variantes');
                  }}
                  className="p-3.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-amber-400">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Últimas Unidades</span>
                    <AlertTriangle className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  </div>
                  <p className="font-heading text-2xl font-black text-amber-400 mt-1">
                    {variantsSummary.ultimasUnidades}
                  </p>
                  <p className="text-[10px] text-amber-300/80">Abaixo de {globalLowQuantityThreshold} un.</p>
                </button>

                {/* Não informadas */}
                <button
                  type="button"
                  onClick={() => {
                    setVariantStatusFilter('nao_informado');
                    setActiveTab('variantes');
                  }}
                  className="p-3.5 rounded-2xl bg-slate-500/10 hover:bg-slate-500/20 border border-slate-500/30 transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Sem Quantidade</span>
                    <HelpCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  </div>
                  <p className="font-heading text-2xl font-black text-slate-300 mt-1">
                    {variantsSummary.naoInformado}
                  </p>
                  <p className="text-[10px] text-slate-400">Quantidade nula / ausente</p>
                </button>

                {/* Disponíveis */}
                <button
                  type="button"
                  onClick={() => {
                    setVariantStatusFilter('disponivel');
                    setActiveTab('variantes');
                  }}
                  className="p-3.5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-emerald-400">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Disponíveis</span>
                    <CheckCircle2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  </div>
                  <p className="font-heading text-2xl font-black text-emerald-400 mt-1">
                    {variantsSummary.disponivel}
                  </p>
                  <p className="text-[10px] text-emerald-300/80">Acima do limite de alerta</p>
                </button>
              </div>
            </div>

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
                  <span className="text-xs font-bold uppercase tracking-wider">Total de Variantes</span>
                  <Sparkles className="w-4 h-4 text-[#E53CF3]" />
                </div>
                <p className="font-heading text-3xl font-black text-[#E53CF3]">
                  {variantsSummary.total}
                </p>
                <p className="text-[11px] text-[#A5A5B8]">Sabores e opções de estoque</p>
              </div>

              <div className="p-5 rounded-2xl bg-[#0D1022] light:bg-white border border-[#8423DA]/30 shadow-lg space-y-2">
                <div className="flex items-center justify-between text-[#A5A5B8]">
                  <span className="text-xs font-bold uppercase tracking-wider">Média de Puffs</span>
                  <Zap className="w-4 h-4 text-[#00DFFF] fill-[#00DFFF]" />
                </div>
                <p className="font-heading text-3xl font-black text-[#00DFFF]">
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
                  <table className="w-full text-left text-xs tabular-nums">
                    <thead>
                      <tr className="border-b border-[#8423DA]/25 text-[#C4C6D8] light:text-slate-600 text-[10px] font-extrabold uppercase tracking-wider select-none">
                        <th className="pb-3 pr-3">Produto</th>
                        <th className="pb-3 px-3">Marca</th>
                        <th className="pb-3 px-3">Puffs ⚡</th>
                        <th className="pb-3 px-3 text-center">Sabores</th>
                        <th className="pb-3 px-3 text-right">Preço Ref.</th>
                        <th className="pb-3 pl-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#8423DA]/15">
                      {models.slice(0, 6).map((m) => (
                        <tr key={m.id} className="hover:bg-[#141838]/50 transition-colors">
                          <td className="py-3 pr-3 font-bold text-white light:text-slate-900">
                            <div className="flex items-center gap-2.5">
                              <img src={m.imageUrl || '/assets/images/logo.png'} alt="" className="w-7 h-7 rounded bg-white p-0.5 object-contain shrink-0" />
                              <span>{m.modelName}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-[#00DFFF] font-semibold">{m.brandName}</td>
                          <td className="py-3 px-3 font-mono font-bold text-gray-200 light:text-slate-700">
                            {m.puffsLabel}
                          </td>
                          <td className="py-3 px-3 text-center text-[#C4C6D8]">{m.flavors.length} opções</td>
                          <td className="py-3 px-3 text-right font-bold text-white light:text-slate-900 whitespace-nowrap">
                            R$ {m.startingPrice.toFixed(2).replace('.', ',')}
                          </td>
                          <td className="py-3 pl-3 text-right whitespace-nowrap">
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
                        <span className="px-2 py-0.5 rounded-md bg-[#8423DA]/30 text-[#00DFFF] text-xs font-bold">
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
                  Cadastre novos pods, defina a quantidade nominal de puffs ⚡, preços e ficha técnica.
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
                <table className="w-full text-left text-xs tabular-nums">
                  <thead className="bg-[#121633] light:bg-slate-100 border-b border-[#8423DA]/25 text-[#C4C6D8] light:text-slate-600 text-[10px] font-extrabold uppercase tracking-wider select-none">
                    <tr>
                      <th className="py-3.5 px-4">Foto</th>
                      <th className="py-3.5 px-4">Marca & Modelo</th>
                      <th className="py-3.5 px-4">Puffs ⚡</th>
                      <th className="py-3.5 px-4">Etiqueta</th>
                      <th className="py-3.5 px-4">Sabores</th>
                      <th className="py-3.5 px-4 text-right">Preço Ref.</th>
                      <th className="py-3.5 px-4 text-center">Visibilidade</th>
                      <th className="py-3.5 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#8423DA]/15">
                    {models.map((model) => (
                      <tr key={model.id} className="hover:bg-[#141838]/50 transition-colors">
                        <td className="p-4">
                          <div className="w-12 h-12 rounded-xl bg-white p-1 border border-slate-200 flex items-center justify-center">
                            <img src={model.imageUrl || '/assets/images/logo.png'} alt="" className="w-full h-full object-contain" />
                          </div>
                        </td>

                        <td className="p-4">
                          <p className="font-extrabold text-sm text-white light:text-slate-900">
                            {model.modelName}
                          </p>
                          <span className="text-[10px] text-[#00DFFF] font-bold uppercase">
                            {model.brandName} &bull; {model.category}
                          </span>
                        </td>

                        <td className="p-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#181C38] text-[#00DFFF] font-bold text-xs border border-[#00DFFF]/30">
                            <Zap className="w-3 h-3 fill-[#00DFFF]" />
                            {model.puffsLabel}
                          </span>
                        </td>

                        <td className="p-4 whitespace-nowrap">
                          {model.badge ? (
                            <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-[#00DFFF] to-[#8423DA] text-white font-black text-[10px]">
                              {model.badge}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>

                        <td className="p-4 whitespace-nowrap">
                          <button
                            onClick={() => {
                              setVariantModelFilter(model.id);
                              setVariantStatusFilter('todas');
                              setActiveTab('variantes');
                            }}
                            className="text-[#00DFFF] hover:underline flex items-center gap-1 font-semibold"
                            title="Gerenciar variantes deste modelo"
                          >
                            <span>{model.flavors.length} sabores</span>
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </td>

                        <td className="p-4 text-right font-bold text-white light:text-slate-900 whitespace-nowrap tabular-nums">
                          R$ {model.startingPrice.toFixed(2).replace('.', ',')}
                        </td>

                        <td className="p-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => toggleModelActive(model.id)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                              model.active
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                            }`}
                            title="Clique para alternar visibilidade no catálogo"
                          >
                            {model.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            <span>{model.active ? 'No Catálogo' : 'Oculto'}</span>
                          </button>
                        </td>

                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenFlavorModal(model.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-[#00DFFF]/20 to-[#8423DA]/20 hover:from-[#00DFFF]/30 hover:to-[#8423DA]/30 border border-[#00DFFF]/40 text-[#00DFFF] hover:text-white text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                              title={`Adicionar novo sabor para ${model.modelName}`}
                            >
                              <Plus className="w-3 h-3 stroke-[3]" />
                              <span>Sabor</span>
                            </button>

                            <button
                              onClick={() => handleDuplicateModel(model)}
                              className="p-1.5 rounded-lg bg-[#181C38] text-gray-300 hover:bg-[#8423DA] hover:text-white transition-all cursor-pointer"
                              title="Duplicar este modelo"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                handleOpenModelModal(model);
                                handleOpenAiStudioForModel(model.imageUrl, model.modelName);
                              }}
                              className="p-1.5 rounded-lg bg-gradient-to-r from-[#8423DA]/30 to-[#00DFFF]/30 text-[#00DFFF] hover:text-white border border-[#00DFFF]/40 transition-all cursor-pointer shadow-sm"
                              title="Editar ou Aprimorar Foto com IA"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleOpenModelModal(model)}
                              className="p-1.5 rounded-lg bg-[#181C38] text-[#00DFFF] hover:bg-[#8423DA] hover:text-white transition-all cursor-pointer"
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
                              className="p-1.5 rounded-lg bg-[#181C38] text-rose-400 hover:bg-rose-900 hover:text-white transition-all cursor-pointer"
                              title="Excluir Modelo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0D1022] border border-[#8423DA]/30 shadow-lg">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gradient-to-r from-[#8423DA] to-[#00DFFF] text-white text-xs font-black flex items-center justify-center">
                    9
                  </span>
                  <h2 className="font-heading text-xl font-bold text-white light:text-slate-900">
                    Página de Marcas &bull; Gestão Visual
                  </h2>
                </div>
                <p className="text-xs text-[#A5A5B8] mt-1">
                  Altere o <strong>Nome</strong>, a <strong>Foto/Logo</strong> e as <strong>Cores dos Cards</strong> exibidos na seção #9 da página inicial sempre que quiser.
                </p>
              </div>

              <button
                onClick={() => handleOpenBrandModal()}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#8423DA] to-[#007BFF] hover:brightness-110 text-white text-xs font-bold flex items-center gap-2 shadow-lg transition-all cursor-pointer self-start sm:self-auto active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Marca</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {brands.map((brand) => {
                const brandModels = models.filter((m) => m.brandId === brand.id);
                const currentTheme = BRAND_CARD_THEMES.find((t) => t.id === brand.cardColor) || BRAND_CARD_THEMES[0];

                return (
                  <div
                    key={brand.id}
                    className="p-5 rounded-2xl bg-[#0D1022] border border-[#8423DA]/30 shadow-xl space-y-4 flex flex-col justify-between hover:border-[#00DFFF]/40 transition-all"
                  >
                    <div>
                      {/* Top Bar with Status and Country */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#181C38] text-[#00DFFF] border border-[#00DFFF]/30">
                          {brand.country || 'Global'}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium">
                          {brandModels.length} {brandModels.length === 1 ? 'modelo' : 'modelos'}
                        </span>
                      </div>

                      {/* Mini Live Preview of the Brand Card as it appears on the Homepage */}
                      <div className={`relative h-[115px] rounded-2xl p-2.5 flex flex-col justify-between bg-gradient-to-b ${currentTheme.bg || 'from-[#1C1C24] via-[#0D0D12] to-[#050508]'} border ${currentTheme.border || 'border-white/20'} overflow-hidden shadow-inner`}>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-white/10 pointer-events-none" />
                        <div className="relative z-10 flex-grow flex items-center justify-center p-1">
                          {brand.logoUrl ? (
                            <div className="flex flex-col items-center justify-center text-center space-y-1">
                              <img
                                src={brand.logoUrl}
                                alt={brand.name}
                                className="max-h-12 max-w-[100px] object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
                              />
                              <span className="font-heading font-black text-xs tracking-wider text-white drop-shadow-sm truncate max-w-[100px]">
                                {brand.name}
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center text-center space-y-1">
                              <span className="font-heading font-black text-sm tracking-wider text-white drop-shadow-md">
                                {brand.name}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="relative z-10 pt-1 border-t border-white/20 flex items-center justify-between text-[10px] text-white/90">
                          <span className="font-bold opacity-80">
                            {brandModels.length} {brandModels.length === 1 ? 'modelo' : 'modelos'}
                          </span>
                          <span className="text-[#00DFFF] font-black">
                            Ver &darr;
                          </span>
                        </div>
                      </div>

                      {/* Brand Description & Status */}
                      <div className="mt-3 space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-heading font-black text-white text-sm tracking-wide">
                            {brand.name}
                          </span>
                          {brand.logoUrl ? (
                            <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                              <Check className="w-3 h-3" /> Foto Ativa
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400">
                              Ícone Padrão
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#A5A5B8] line-clamp-2">
                          {brand.description || 'Fabricante de dispositivos de vaporização.'}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons: Alterar Nome & Foto / Trocar Foto Rápido / Excluir */}
                    <div className="pt-3 border-t border-[#8423DA]/20 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-1">
                        {/* Primary: Alterar Foto & Nome (Opens Modal) */}
                        <button
                          onClick={() => handleOpenBrandModal(brand)}
                          className="flex-1 px-3 py-2 rounded-xl bg-gradient-to-r from-[#8423DA] to-[#007BFF] hover:brightness-110 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md active:scale-95"
                          title="Alterar nome, foto, cores e detalhes"
                        >
                          <Edit2 className="w-3 h-3 text-[#00DFFF]" />
                          <span>Alterar Foto & Nome</span>
                        </button>

                        {/* Secondary: Quick Image Upload Filepicker */}
                        <label
                          className="p-2 rounded-xl bg-[#141838] hover:bg-[#8423DA]/40 text-[#00DFFF] hover:text-white border border-[#8423DA]/40 text-xs font-semibold transition cursor-pointer flex items-center justify-center shrink-0"
                          title="Trocar Foto Diretamente (Upload do Computador ou Celular)"
                        >
                          <ImageIcon className="w-4 h-4" />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleInlineBrandPhotoUpload(brand.id, e)}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {/* Delete Brand */}
                      <button
                        onClick={() => {
                          if (confirm(`Remover a marca "${brand.name}" e desvincular modelos?`)) {
                            deleteBrand(brand.id);
                            showToast('Marca removida!');
                          }
                        }}
                        className="p-2 rounded-xl bg-[#181C38] text-rose-400 hover:bg-rose-900/60 hover:text-white transition-all cursor-pointer shrink-0"
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

        {/* ===================== TAB 4: GESTÃO DE VARIANTES & SABORES ===================== */}
        {activeTab === 'variantes' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header & Quick Summary */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-3xl bg-[#0D1022] border-2 border-[#8423DA]/30 shadow-xl">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-gradient-to-r from-[#00DFFF] to-[#8423DA] text-[#080811] text-xs font-black flex items-center justify-center shadow-md">
                    ⚡
                  </span>
                  <h2 className="font-heading text-xl sm:text-2xl font-black text-white">
                    Gestão Inteligente de Variantes & Sabores
                  </h2>
                </div>
                <p className="text-xs text-[#A5A5B8] mt-1 max-w-2xl leading-relaxed">
                  Controle individual de quantidades demonstrativas por sabor e modelo. Alertas calculados automaticamente em tempo real.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleOpenFlavorModal(variantModelFilter !== 'all' ? variantModelFilter : undefined)}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#00DFFF] to-[#007BFF] hover:from-[#33e5ff] hover:to-[#1a8cff] text-[#080811] text-xs font-black flex items-center gap-1.5 shadow-md shadow-[#00DFFF]/20 cursor-pointer active:scale-95 transition-all"
                  title="Cadastrar novo sabor ou variação"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Novo Sabor</span>
                </button>

                {selectedVariantKeys.length > 0 && (
                  <button
                    onClick={() => setIsBatchModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#8423DA] to-[#00DFFF] hover:opacity-95 text-white text-xs font-black flex items-center gap-1.5 shadow-lg shadow-[#8423DA]/30 cursor-pointer active:scale-95 animate-pulse"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Edição em Lote ({selectedVariantKeys.length})</span>
                  </button>
                )}

                <button
                  onClick={handleExportVariantsCSV}
                  className="px-3.5 py-2 rounded-xl bg-[#141838] hover:bg-[#1f2658] border border-[#8423DA]/40 text-xs font-bold text-gray-200 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Exportar dados das variantes para planilha CSV"
                >
                  <Download className="w-3.5 h-3.5 text-[#00DFFF]" />
                  <span>Exportar CSV</span>
                </button>

                <button
                  onClick={() => setActiveTab('historico')}
                  className="px-3.5 py-2 rounded-xl bg-[#141838] hover:bg-[#1f2658] border border-[#8423DA]/40 text-xs font-bold text-gray-200 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <History className="w-3.5 h-3.5 text-[#00DFFF]" />
                  <span>Histórico ({variantHistory.length})</span>
                </button>
              </div>
            </div>

            {/* PRIORITY FILTER & CONTROLS (SECTION 10) */}
            <div className="p-5 rounded-2xl bg-[#0D1022] border border-[#8423DA]/25 shadow-lg space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Status Filter Buttons */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {/* PRIORIDADE: PRECISAM DE ATENÇÃO */}
                  <button
                    onClick={() => setVariantStatusFilter('precisam_atencao')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border shrink-0 ${
                      variantStatusFilter === 'precisam_atencao'
                        ? 'bg-gradient-to-r from-amber-500/25 to-rose-500/25 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                        : 'bg-[#141838] text-gray-400 border-transparent hover:border-amber-500/30 hover:text-amber-300'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span>Precisam de Atenção</span>
                    <span className="px-1.5 py-0.2 rounded-md bg-amber-500 text-black text-[10px] font-black">
                      {variantsSummary.precisamAtencao}
                    </span>
                  </button>

                  <button
                    onClick={() => setVariantStatusFilter('todas')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shrink-0 ${
                      variantStatusFilter === 'todas'
                        ? 'bg-[#8423DA] text-white border-[#00DFFF]/50'
                        : 'bg-[#141838] text-gray-400 border-transparent hover:text-white'
                    }`}
                  >
                    Todas ({allVariants.length})
                  </button>

                  <button
                    onClick={() => setVariantStatusFilter('disponivel')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shrink-0 ${
                      variantStatusFilter === 'disponivel'
                        ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300'
                        : 'bg-[#141838] text-gray-400 border-transparent hover:text-emerald-400'
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>Disponíveis ({variantsSummary.disponivel})</span>
                  </button>

                  <button
                    onClick={() => setVariantStatusFilter('ultimas_unidades')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shrink-0 ${
                      variantStatusFilter === 'ultimas_unidades'
                        ? 'bg-amber-500/25 border-amber-400 text-amber-300'
                        : 'bg-[#141838] text-gray-400 border-transparent hover:text-amber-400'
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    <span>Últimas un. ({variantsSummary.ultimasUnidades})</span>
                  </button>

                  <button
                    onClick={() => setVariantStatusFilter('esgotado')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shrink-0 ${
                      variantStatusFilter === 'esgotado'
                        ? 'bg-rose-500/25 border-rose-400 text-rose-300'
                        : 'bg-[#141838] text-gray-400 border-transparent hover:text-rose-400'
                    }`}
                  >
                    <XCircle className="w-3 h-3 text-rose-400" />
                    <span>Esgotadas ({variantsSummary.esgotado})</span>
                  </button>

                  <button
                    onClick={() => setVariantStatusFilter('nao_informado')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shrink-0 ${
                      variantStatusFilter === 'nao_informado'
                        ? 'bg-slate-500/25 border-slate-400 text-slate-200'
                        : 'bg-[#141838] text-gray-400 border-transparent hover:text-slate-300'
                    }`}
                  >
                    <HelpCircle className="w-3 h-3 text-slate-400" />
                    <span>Sem Quantidade ({variantsSummary.naoInformado})</span>
                  </button>
                </div>
              </div>

              {/* Search & Model Filter Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
                <div className="sm:col-span-7 relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
                  <input
                    type="text"
                    value={variantSearchQuery}
                    onChange={(e) => setVariantSearchQuery(e.target.value)}
                    placeholder="Pesquisar por sabor, modelo ou marca (ex: Aloe Grape, V55, Ignite)..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 focus:border-[#00DFFF] text-white text-xs focus:outline-none transition-colors"
                  />
                  {variantSearchQuery && (
                    <button
                      onClick={() => setVariantSearchQuery('')}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-white text-xs cursor-pointer"
                    >
                      Limpar
                    </button>
                  )}
                </div>

                <div className="sm:col-span-5 flex items-center gap-2">
                  <select
                    value={variantModelFilter}
                    onChange={(e) => setVariantModelFilter(e.target.value)}
                    className="w-full py-2.5 px-3 rounded-xl bg-[#141838] border border-[#8423DA]/30 focus:border-[#00DFFF] text-white text-xs font-semibold focus:outline-none"
                  >
                    <option value="all">Todos os Modelos ({models.length})</option>
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.brandName} - {m.modelName} ({m.flavors.length} sabores)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Selection Bar Helper */}
              <div className="flex items-center justify-between text-[11px] text-[#A5A5B8] pt-1">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-gray-300">
                    <input
                      type="checkbox"
                      checked={
                        filteredVariants.length > 0 &&
                        selectedVariantKeys.length === filteredVariants.length
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedVariantKeys(filteredVariants.map((v) => v.key));
                        } else {
                          setSelectedVariantKeys([]);
                        }
                      }}
                      className="rounded accent-[#00DFFF]"
                    />
                    <span>Selecionar Todos ({filteredVariants.length})</span>
                  </label>
                  {selectedVariantKeys.length > 0 && (
                    <span className="text-[#00DFFF] font-bold">
                      {selectedVariantKeys.length} selecionados
                    </span>
                  )}
                </div>
                <span className="text-gray-400">
                  Exibindo {filteredVariants.length} de {allVariants.length} variantes
                </span>
              </div>
            </div>

            {/* VARIANTS TABLE / CARD LIST */}
            <div className="rounded-3xl bg-[#0D1022] border border-[#8423DA]/25 shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs tabular-nums">
                  <thead>
                    <tr className="border-b border-[#8423DA]/25 text-[#C4C6D8] bg-[#121633] font-extrabold uppercase tracking-wider text-[10px] select-none">
                      <th className="py-3.5 px-3.5 w-10 text-center">#</th>
                      <th className="py-3.5 px-3.5">Modelo & Marca</th>
                      <th className="py-3.5 px-3.5">Sabor / Variante</th>
                      <th className="py-3.5 px-3.5">Quantidade Demonstrativa</th>
                      <th className="py-3.5 px-3.5 text-center">Limite Alerta</th>
                      <th className="py-3.5 px-3.5">Status Calculado</th>
                      <th className="py-3.5 px-3.5">Última Atualização</th>
                      <th className="py-3.5 px-3.5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#8423DA]/15">
                    {filteredVariants.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-12 text-center text-gray-400 space-y-3">
                          <HelpCircle className="w-8 h-8 text-gray-500 mx-auto" />
                          <p className="text-sm font-semibold text-gray-300">
                            Nenhuma variante encontrada para este filtro.
                          </p>
                          <button
                            onClick={() => {
                              setVariantStatusFilter('todas');
                              setVariantSearchQuery('');
                              setVariantModelFilter('all');
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-[#8423DA]/40 text-[#00DFFF] text-xs font-bold hover:bg-[#8423DA] cursor-pointer"
                          >
                            Limpar Filtros
                          </button>
                        </td>
                      </tr>
                    ) : (
                      filteredVariants.map((item) => {
                        const isSelected = selectedVariantKeys.includes(item.key);
                        const isEditingThis = editingVariantKey === item.key;

                        return (
                          <tr
                            key={item.key}
                            className={`hover:bg-[#141838]/60 transition-colors ${
                              isSelected ? 'bg-[#181C38]/90' : ''
                            } ${item.avail.status === 'esgotado' ? 'border-l-4 border-l-rose-500' : item.avail.status === 'ultimas_unidades' ? 'border-l-4 border-l-amber-500' : ''}`}
                          >
                            {/* Checkbox */}
                            <td className="p-3.5 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedVariantKeys([...selectedVariantKeys, item.key]);
                                  } else {
                                    setSelectedVariantKeys(
                                      selectedVariantKeys.filter((k) => k !== item.key)
                                    );
                                  }
                                }}
                                className="rounded accent-[#00DFFF] cursor-pointer"
                              />
                            </td>

                            {/* Model & Brand */}
                            <td className="p-3.5">
                              <div className="flex items-center gap-3">
                                <img
                                  src={item.imageUrl}
                                  alt={item.modelName}
                                  className="w-10 h-10 rounded-xl object-contain bg-white/5 p-1 border border-[#8423DA]/20 shrink-0"
                                />
                                <div>
                                  <span className="text-[10px] font-black uppercase text-[#00DFFF] tracking-wider block">
                                    {item.brandName}
                                  </span>
                                  <p className="font-bold text-white text-xs">{item.modelName}</p>
                                  <span className="text-[10px] text-[#A5A5B8]">{item.category}</span>
                                </div>
                              </div>
                            </td>

                            {/* Flavor Name & Color */}
                            <td className="p-3.5">
                              <div className="flex items-center gap-2">
                                <span className="text-lg shrink-0">{item.flavor.iconEmoji}</span>
                                <div>
                                  <p className="font-bold text-white text-xs flex items-center gap-1.5">
                                    <span>{item.flavor.name}</span>
                                    <span
                                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                                      style={{ backgroundColor: item.flavor.colorHex }}
                                      title={item.flavor.colorHex}
                                    />
                                  </p>
                                  <span className="text-[10px] text-gray-400 font-mono">
                                    ID: {item.flavor.id}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* QUANTIDADE DEMONSTRATIVA (EDIÇÃO RÁPIDA INLINE - SECTION 9) */}
                            <td className="p-3.5">
                              {isEditingThis ? (
                                <div className="flex items-center gap-1.5 animate-in fade-in">
                                  <input
                                    type="number"
                                    min="0"
                                    value={inlineQuantity}
                                    onChange={(e) => setInlineQuantity(e.target.value)}
                                    placeholder="Sem qtd"
                                    className="w-20 px-2 py-1.5 rounded-lg bg-[#141838] border border-[#00DFFF] text-white text-xs font-black focus:outline-none"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleSaveInlineEdit(item.modelId, item.flavor.id)}
                                    disabled={isSavingInline}
                                    className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer"
                                    title="Salvar quantidade"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setEditingVariantKey(null)}
                                    className="p-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 cursor-pointer"
                                    title="Cancelar"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleStartInlineEdit(item)}
                                  className="group flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[#141838]/80 hover:bg-[#181C38] border border-[#8423DA]/30 hover:border-[#00DFFF] transition-all cursor-pointer text-left"
                                  title="Clique para edição rápida da quantidade"
                                >
                                  <div>
                                    <p className={`font-heading text-sm font-black ${item.avail.badgeText}`}>
                                      {item.flavor.demoQuantity === null || item.flavor.demoQuantity === undefined
                                        ? '—'
                                        : `${item.flavor.demoQuantity} un`}
                                    </p>
                                    <span className="text-[9px] text-gray-400 flex items-center gap-0.5 group-hover:text-[#00DFFF]">
                                      <Edit2 className="w-2.5 h-2.5" /> Editar
                                    </span>
                                  </div>
                                </button>
                              )}
                            </td>

                            {/* Limite de Alerta */}
                            <td className="p-3.5 text-center whitespace-nowrap">
                              <span className="px-2 py-1 rounded-lg bg-[#141838] border border-[#8423DA]/25 text-gray-200 font-mono text-[11px]">
                                {item.threshold} un.
                              </span>
                            </td>

                            {/* Status Calculado */}
                            <td className="p-3.5 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black border ${item.avail.badgeBg} ${item.avail.badgeBorder} ${item.avail.badgeText}`}
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ backgroundColor: item.avail.colorHex }}
                                />
                                {item.avail.label}
                              </span>
                            </td>

                            {/* Última Atualização */}
                            <td className="p-3.5 text-[#C4C6D8] text-[11px] whitespace-nowrap tabular-nums">
                              {item.flavor.updatedAt ? (
                                <span title={item.flavor.updatedAt}>
                                  {new Date(item.flavor.updatedAt).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              ) : (
                                <span className="text-gray-400">Padrão Inicial</span>
                              )}
                            </td>

                            {/* Ações */}
                            <td className="p-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleStartInlineEdit(item)}
                                  className="p-2 rounded-xl bg-[#141838] text-[#00DFFF] hover:bg-[#8423DA] hover:text-white transition-all cursor-pointer"
                                  title="Edição Rápida da Quantidade"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => handleOpenFlavorModal(item.modelId, item.flavor)}
                                  className="p-2 rounded-xl bg-[#181C38] text-purple-300 hover:bg-[#8423DA] hover:text-white transition-all cursor-pointer"
                                  title="Editar Detalhes do Sabor (Nome, Cor, Foto, Emoji, Limites)"
                                >
                                  <Sliders className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => {
                                    if (confirm(`Remover o sabor "${item.flavor.name}" do modelo ${item.modelName}?`)) {
                                      deleteFlavor(item.modelId, item.flavor.id);
                                      showToast('Sabor removido!');
                                    }
                                  }}
                                  className="p-2 rounded-xl bg-[#141838] text-rose-400 hover:bg-rose-900/60 hover:text-white transition-all cursor-pointer"
                                  title="Excluir Variante"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* BATCH ACTION MODAL (SECTION 13) */}
            {isBatchModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
                <div className="relative w-full max-w-lg rounded-3xl bg-[#0D1022] border-2 border-[#8423DA]/50 p-6 sm:p-8 shadow-2xl space-y-5">
                  <div className="flex items-center justify-between border-b border-[#8423DA]/25 pb-4">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-5 h-5 text-[#00DFFF]" />
                      <h3 className="font-heading text-lg font-black text-white">
                        Edição em Lote de Variantes
                      </h3>
                    </div>
                    <button
                      onClick={() => setIsBatchModalOpen(false)}
                      className="p-1 rounded-lg text-gray-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#141838] border border-[#8423DA]/30 text-xs text-gray-300">
                    <p className="font-bold text-[#00DFFF]">
                      {selectedVariantKeys.length} variantes selecionadas para alteração simultânea
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      As alterações serão aplicadas instantaneamente em todos os sabores selecionados com registro de auditoria.
                    </p>
                  </div>

                  {/* Batch Action Selector */}
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-gray-200">
                      Escolha a Ação em Lote:
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setBatchActionType('set_qty')}
                        className={`p-3 rounded-xl border text-xs font-bold text-left cursor-pointer transition-all ${
                          batchActionType === 'set_qty'
                            ? 'bg-[#181C38] border-[#00DFFF] text-white shadow-[0_0_10px_rgba(0,223,255,0.3)]'
                            : 'bg-[#11152A] border-transparent text-gray-400 hover:border-[#8423DA]/40'
                        }`}
                      >
                        <span className="block text-[#00DFFF] text-[11px]">1. Quantidade</span>
                        Preencher Comum
                      </button>

                      <button
                        type="button"
                        onClick={() => setBatchActionType('set_threshold')}
                        className={`p-3 rounded-xl border text-xs font-bold text-left cursor-pointer transition-all ${
                          batchActionType === 'set_threshold'
                            ? 'bg-[#181C38] border-[#00DFFF] text-white shadow-[0_0_10px_rgba(0,223,255,0.3)]'
                            : 'bg-[#11152A] border-transparent text-gray-400 hover:border-[#8423DA]/40'
                        }`}
                      >
                        <span className="block text-amber-400 text-[11px]">2. Limite Alerta</span>
                        Alterar Limite
                      </button>

                      <button
                        type="button"
                        onClick={() => setBatchActionType('clear_qty')}
                        className={`p-3 rounded-xl border text-xs font-bold text-left cursor-pointer transition-all ${
                          batchActionType === 'clear_qty'
                            ? 'bg-[#181C38] border-rose-400 text-white shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                            : 'bg-[#11152A] border-transparent text-gray-400 hover:border-[#8423DA]/40'
                        }`}
                      >
                        <span className="block text-rose-400 text-[11px]">3. Limpar</span>
                        Não Informada
                      </button>
                    </div>

                    {/* Value Inputs based on Action */}
                    {batchActionType === 'set_qty' && (
                      <div className="pt-2">
                        <label className="block text-xs font-semibold text-gray-300 mb-1">
                          Nova Quantidade Demonstrativa para todas as {selectedVariantKeys.length} variantes:
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={batchQuantityInput}
                          onChange={(e) => setBatchQuantityInput(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-[#141838] border border-[#8423DA]/30 focus:border-[#00DFFF] text-white font-bold text-sm focus:outline-none"
                        />
                      </div>
                    )}

                    {batchActionType === 'set_threshold' && (
                      <div className="pt-2">
                        <label className="block text-xs font-semibold text-gray-300 mb-1">
                          Novo Limite de Alerta (Padrão: 3 un.):
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={batchThresholdInput}
                          onChange={(e) => setBatchThresholdInput(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-[#141838] border border-[#8423DA]/30 focus:border-[#00DFFF] text-white font-bold text-sm focus:outline-none"
                        />
                      </div>
                    )}

                    {batchActionType === 'clear_qty' && (
                      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                        As variantes selecionadas ficarão com quantidade <strong>Não informada</strong> (nula), sendo reunidas automaticamente no alerta &ldquo;Precisam de atenção&rdquo;.
                      </div>
                    )}
                  </div>

                  {/* Modal Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#8423DA]/25">
                    <button
                      type="button"
                      onClick={() => setIsBatchModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-[#141838] hover:bg-gray-700 text-gray-300 text-xs font-semibold cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleExecuteBatchAction}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8423DA] via-[#007BFF] to-[#00DFFF] text-white text-xs font-black shadow-lg shadow-[#00DFFF]/20 cursor-pointer hover:opacity-95"
                    >
                      Aplicar em Lote ({selectedVariantKeys.length})
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================== TAB: CENTRAL DE AUDITORIA & LOGS DE ATIVIDADE ===================== */}
        {activeTab === 'historico' && (
          <BusinessAuditSection />
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
                Ajuste os dados da loja e suas informações de contato.
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


              </div>
            </form>
            <OwnerAdvancedSettings />
          </div>
        )}

        {/* ===================== TAB: SUPABASE & SQL (SOLICITADO PELO USUÁRIO) ===================== */}
        {activeTab === 'supabase' && <SupabaseTab />}

        {/* ===================== TAB: GESTÃO DE USUÁRIOS, ADMINS & VIPS ===================== */}
        {activeTab === 'usuarios' && (
          <UserManagementTab
            initialCustomerId={focusedCustomerIdInUsersTab}
            onClearInitialCustomer={() => setFocusedCustomerIdInUsersTab(null)}
            onNavigateToOrders={() => setActiveTab('pedidos')}
          />
        )}

        {/* ===================== TAB: CUPONS & LIMITES (SOLICITADO PELO USUÁRIO) ===================== */}
        {activeTab === 'cupons' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header with Title and Create Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-heading text-xl font-bold text-white light:text-slate-900 flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-[#00DFFF]" />
                  <span>Cupons Promocionais & Limites</span>
                </h2>
                <p className="text-xs text-[#A5A5B8]">
                  Crie cupons com desconto percentual ou fixo, restrinja a itens específicos e defina quantidade máxima de utilizações.
                </p>
              </div>

              <button
                onClick={() => handleOpenCouponModal()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00DFFF] to-[#007BFF] hover:from-[#33e5ff] hover:to-[#1a8cff] text-[#080811] text-xs font-black shadow-lg shadow-[#00DFFF]/20 transition-all cursor-pointer shrink-0 active:scale-95"
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
                  <Hash className="w-4 h-4 text-[#00DFFF]" />
                </div>
                <p className="font-heading text-2xl sm:text-3xl font-black text-[#00DFFF] light:text-[#007BFF]">
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
                              <span className="font-bold text-[#00DFFF]">
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
                                  : 'bg-gradient-to-r from-[#00DFFF] to-emerald-400'
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

      {/* ===================== MODAL: EDIT/ADD BRAND (Nome e Foto das Marcas) ===================== */}
      {isBrandModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl bg-[#0D1022] border-2 border-[#8423DA]/50 p-5 sm:p-7 space-y-5 shadow-2xl text-white">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#8423DA]/25 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#8423DA]/30 border border-[#8423DA] flex items-center justify-center text-[#00DFFF] shadow-md">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading text-lg sm:text-xl font-black text-white">
                    {editingBrand ? 'Editar Marca & Foto' : 'Nova Marca'}
                  </h3>
                  <p className="text-xs text-[#A5A5B8]">
                    Altere o nome, a foto/logo oficial e o visual do card exibido na página inicial (#9)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBrandModalOpen(false)}
                className="p-1.5 rounded-xl bg-[#141838] hover:bg-[#8423DA] text-gray-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* LIVE PREVIEW BANNER: Shows exact homepage card appearance */}
            <div className="p-4 rounded-2xl bg-[#080811] border border-[#8423DA]/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-[#00DFFF]" />
                  <span>Pré-visualização do Card na Página de Marcas (#9)</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-bold">Tempo Real</span>
              </div>

              {/* Render the actual card mockup */}
              {(() => {
                const previewTheme = BRAND_CARD_THEMES.find((t) => t.id === brandForm.cardColor) || BRAND_CARD_THEMES[0];
                return (
                  <div className="flex justify-center py-2">
                    <div className={`relative w-44 sm:w-48 h-[125px] rounded-2xl p-2.5 flex flex-col justify-between bg-gradient-to-b ${previewTheme.bg} border ${previewTheme.border} overflow-hidden shadow-2xl`}>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-white/10 pointer-events-none" />
                      <div className="relative z-10 flex-grow flex items-center justify-center p-1">
                        {brandForm.logoUrl ? (
                          <div className="flex flex-col items-center justify-center text-center space-y-1 w-full px-1">
                            <img
                              src={brandForm.logoUrl}
                              alt="Logo prévia"
                              className="max-h-12 max-w-[110px] object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
                            />
                            <span className="font-heading font-black text-xs tracking-wider text-white drop-shadow-sm truncate max-w-full">
                              {brandForm.name || 'NOME DA MARCA'}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-center space-y-1">
                            <span className="font-heading font-black text-sm tracking-wider text-white drop-shadow-md">
                              {brandForm.name || 'NOME DA MARCA'}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="relative z-10 pt-1 border-t border-white/20 flex items-center justify-between text-[10px] text-white/90">
                        <span className="font-bold opacity-80">2 modelos</span>
                        <span className="text-[#00DFFF] font-black">Ver &darr;</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <form onSubmit={handleSaveBrand} className="space-y-5 text-xs">
              {/* NOME DA MARCA */}
              <div>
                <label className="block font-bold text-gray-200 mb-1.5 flex items-center justify-between">
                  <span>Nome da Marca <span className="text-[#00DFFF]">*</span></span>
                  <span className="text-[10px] text-gray-400 font-normal">Sincroniza com todos os modelos vinculados</span>
                </label>
                <input
                  type="text"
                  value={brandForm.name}
                  onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value.toUpperCase() })}
                  placeholder="Ex: VAPORESSO, ELFBAR, IGNITE, GEEK BAR..."
                  required
                  className="w-full p-3 rounded-xl bg-[#141838] border border-[#8423DA]/35 text-white font-black text-sm uppercase tracking-wider focus:outline-none focus:border-[#00DFFF] transition-all"
                />
              </div>

              {/* FOTO / LOGO DA MARCA */}
              <div className="p-4 rounded-2xl bg-[#11152A] border border-[#8423DA]/30 space-y-3.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-gray-200 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-[#00DFFF]" />
                    <span>Foto / Imagem da Marca (Logo)</span>
                  </label>
                  {brandForm.logoUrl && (
                    <button
                      type="button"
                      onClick={() => setBrandForm((prev) => ({ ...prev, logoUrl: '' }))}
                      className="text-[10px] text-rose-400 hover:text-rose-300 font-semibold underline cursor-pointer"
                    >
                      Remover Foto Atual
                    </button>
                  )}
                </div>

                {/* Preview Box if photo is set */}
                {brandForm.logoUrl && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-[#080811] border border-[#00DFFF]/40 shadow-inner">
                    <div className="w-16 h-14 rounded-lg bg-[#141838] flex items-center justify-center p-1.5 border border-white/10 shrink-0 overflow-hidden">
                      <img
                        src={brandForm.logoUrl}
                        alt="Prévia da logo"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="text-left overflow-hidden flex-1">
                      <p className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Foto Ativa Carregada
                      </p>
                      <p className="text-[10px] text-gray-400 truncate mt-0.5">
                        {brandForm.logoUrl.startsWith('data:') ? 'Imagem comprimida salva localmente' : brandForm.logoUrl}
                      </p>
                    </div>
                  </div>
                )}

                {/* Upload File button & URL input */}
                <div className="space-y-2.5">
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <label className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#8423DA]/30 to-[#007BFF]/30 hover:from-[#8423DA]/50 hover:to-[#007BFF]/50 border border-[#00DFFF]/50 text-white text-center font-bold cursor-pointer transition flex items-center justify-center gap-2 text-xs shadow-md active:scale-95">
                      <Plus className="w-4 h-4 text-[#00DFFF]" />
                      <span>Escolher Foto do Computador / Celular</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleBrandLogoFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div>
                    <span className="text-[11px] text-gray-400 block mb-1">Ou cole uma URL direta da internet:</span>
                    <input
                      type="url"
                      value={brandForm.logoUrl.startsWith('data:') ? '' : brandForm.logoUrl}
                      onChange={(e) => setBrandForm({ ...brandForm, logoUrl: e.target.value })}
                      placeholder="https://exemplo.com/logo-oficial.png"
                      className="w-full p-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-white text-xs focus:outline-none focus:border-[#00DFFF]"
                    />
                  </div>

                  {/* Preset Logos Gallery (1-Click) */}
                  <div className="pt-2">
                    <span className="text-[11px] text-gray-400 block mb-1.5 font-semibold">
                      Ou escolha uma logo da galeria PodWave:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {BRAND_PRESET_LOGOS.map((preset, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => setBrandForm((prev) => ({ ...prev, logoUrl: preset.url }))}
                          className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                            brandForm.logoUrl === preset.url
                              ? 'bg-[#00DFFF]/20 border-[#00DFFF] text-white shadow-md'
                              : 'bg-[#141838] hover:bg-[#1a204a] border-white/10 text-gray-300'
                          }`}
                        >
                          <img src={preset.url} alt="" className="w-6 h-6 object-contain" />
                          <span className="text-[9px] font-bold truncate max-w-full">{preset.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* TEMA DE COR DO CARD (GRADIENTE) */}
              <div className="p-4 rounded-2xl bg-[#11152A] border border-[#8423DA]/30 space-y-2.5">
                <label className="font-bold text-gray-200 block">
                  Cor de Fundo do Card (Tema do Fabricante)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {BRAND_CARD_THEMES.map((themeOption) => (
                    <button
                      key={themeOption.id}
                      type="button"
                      onClick={() => setBrandForm((prev) => ({ ...prev, cardColor: themeOption.id }))}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                        brandForm.cardColor === themeOption.id
                          ? 'border-[#00DFFF] ring-2 ring-[#00DFFF]/50 bg-[#141838]'
                          : 'border-white/10 bg-[#0D1022] hover:border-white/30'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${themeOption.bg} border border-white/40 shrink-0`} />
                      <span className="text-[11px] font-bold text-gray-200 truncate">{themeOption.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* PAÍS / ORIGEM */}
              <div>
                <label className="block font-semibold mb-1 text-gray-200">País / Origem do Fabricante</label>
                <input
                  type="text"
                  value={brandForm.country}
                  onChange={(e) => setBrandForm({ ...brandForm, country: e.target.value })}
                  placeholder="Ex: Global, USA, UK"
                  className="w-full p-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-white focus:outline-none focus:border-[#00DFFF]"
                />
              </div>

              {/* DESCRIÇÃO */}
              <div>
                <label className="block font-semibold mb-1 text-gray-200">Descrição Institucional</label>
                <textarea
                  rows={2}
                  value={brandForm.description}
                  onChange={(e) => setBrandForm({ ...brandForm, description: e.target.value })}
                  placeholder="Breve descrição dos dispositivos da marca..."
                  className="w-full p-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 text-white focus:outline-none focus:border-[#00DFFF]"
                />
              </div>

              {/* ACTIONS */}
              <div className="pt-3 flex justify-end gap-2.5 border-t border-[#8423DA]/20">
                <button
                  type="button"
                  onClick={() => setIsBrandModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#181C38] text-gray-300 hover:text-white font-semibold cursor-pointer transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#8423DA] via-[#007BFF] to-[#00DFFF] hover:brightness-110 text-white font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg active:scale-95 transition-all"
                >
                  Salvar Alterações da Marca
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
                <Zap className="w-5 h-5 text-[#00DFFF]" />
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
                  <label className="block font-semibold mb-1">Preço (R$)</label>
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

              {/* Photo selector with upload, presets, and URL */}
              <div className="p-3.5 rounded-2xl bg-[#141838] border border-[#8423DA]/30 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-gray-200 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-[#00DFFF]" />
                    <span>Foto Principal do Dispositivo</span>
                  </label>
                  {modelForm.imageUrl && (
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Imagem Ativa
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="w-16 h-16 rounded-xl bg-white/10 p-1.5 border border-[#8423DA]/40 flex items-center justify-center shrink-0 overflow-hidden">
                    <img
                      src={modelForm.imageUrl || '/assets/images/logo.png'}
                      alt=""
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>

                  <div className="flex-1 w-full space-y-2">
                    {/* Botão de Estúdio de Fotos */}
                    <button
                      type="button"
                      onClick={() => handleOpenAiStudioForModel(modelForm.imageUrl, modelForm.modelName || 'Modelo')}
                      className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#8423DA] via-[#007BFF] to-[#00DFFF] hover:brightness-110 border border-[#00DFFF]/60 text-white font-black cursor-pointer transition flex items-center justify-center gap-2 text-xs shadow-[0_0_15px_rgba(0,223,255,0.3)] active:scale-95"
                    >
                      <Sparkles className="w-4 h-4 text-[#00DFFF] animate-pulse" />
                      <span>Estúdio de Fotos: 20 Estilos & Variações</span>
                    </button>

                    <label className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-[#8423DA]/30 to-[#007BFF]/30 hover:from-[#8423DA]/50 hover:to-[#007BFF]/50 border border-[#00DFFF]/50 text-white text-center font-bold cursor-pointer transition flex items-center justify-center gap-2 text-xs shadow-md active:scale-95">
                      <Plus className="w-3.5 h-3.5 text-[#00DFFF]" />
                      <span>Upload de Foto do Computador / Celular</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleModelImageFileUpload}
                        className="hidden"
                      />
                    </label>

                    <div className="flex items-center gap-2">
                      <select
                        value={availableImages.some((img) => img.url === modelForm.imageUrl) ? modelForm.imageUrl : ''}
                        onChange={(e) => {
                          if (e.target.value) setModelForm({ ...modelForm, imageUrl: e.target.value });
                        }}
                        className="flex-1 p-2 rounded-xl bg-[#0D1022] border border-[#8423DA]/30 text-white text-[11px] focus:outline-none"
                      >
                        <option value="">Galeria de Imagens de Referência...</option>
                        {availableImages.map((img) => (
                          <option key={img.url} value={img.url}>
                            {img.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <input
                      type="url"
                      value={modelForm.imageUrl.startsWith('data:') ? '' : modelForm.imageUrl}
                      onChange={(e) => setModelForm({ ...modelForm, imageUrl: e.target.value })}
                      placeholder="Ou cole uma URL direta da imagem (ex: https://...)"
                      className="w-full p-2 rounded-xl bg-[#0D1022] border border-[#8423DA]/30 text-white text-[11px] focus:outline-none focus:border-[#00DFFF]"
                    />
                  </div>
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
                <Ticket className="w-5 h-5 text-[#00DFFF]" />
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
                  Código do Cupom * (ex: PODWAVE15, VIP20, OFERTA-V55)
                </label>
                <input
                  type="text"
                  value={couponForm.code}
                  onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                  placeholder="EX: PODWAVE15"
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
                <label className="block font-bold text-[#00DFFF] flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-[#00DFFF]" />
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
                  placeholder="Ex: 15% de desconto especial em toda a região"
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
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00DFFF] to-[#007BFF] hover:from-[#33e5ff] hover:to-[#1a8cff] text-[#080811] font-black shadow-lg shadow-[#00DFFF]/20 transition-all cursor-pointer active:scale-95"
                >
                  {editingCoupon ? 'Atualizar Cupom' : 'Salvar Cupom'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL: EDIT/ADD FLAVOR (SOLICITADO PELO USUÁRIO) ===================== */}
      {isFlavorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl bg-[#0D1022] border-2 border-[#8423DA]/50 p-5 sm:p-7 space-y-4 text-white shadow-2xl my-6">
            <div className="flex items-center justify-between border-b border-[#8423DA]/25 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#8423DA]/30 border border-[#8423DA] flex items-center justify-center text-[#00DFFF] shadow-md">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-black text-white">
                    {editingFlavor ? 'Editar Sabor / Variante' : 'Novo Sabor / Variante'}
                  </h3>
                  <p className="text-[11px] text-[#A5A5B8]">
                    Configure nome, emoji, cor de identificação, foto e estoque
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFlavorModalOpen(false)}
                className="p-1.5 rounded-xl bg-[#141838] hover:bg-[#8423DA] text-gray-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* LIVE PREVIEW OF FLAVOR BADGE */}
            <div className="p-3.5 rounded-2xl bg-[#080811] border border-[#8423DA]/30 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                Prévia da Variante no Catálogo
              </span>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#141838] border border-white/10">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{flavorForm.iconEmoji || '🍇'}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs">{flavorForm.name || 'Nome do Sabor'}</span>
                      <span
                        className="w-3 h-3 rounded-full shrink-0 border border-white/30 shadow-sm"
                        style={{ backgroundColor: flavorForm.colorHex }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400">
                      {models.find((m) => m.id === flavorForm.modelId)?.modelName || 'Modelo'}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    flavorForm.demoQuantity === '' ? 'bg-slate-500/20 text-slate-300' :
                    parseInt(flavorForm.demoQuantity, 10) === 0 ? 'bg-rose-500/20 text-rose-400' :
                    parseInt(flavorForm.demoQuantity, 10) <= flavorForm.lowQuantityThreshold ? 'bg-amber-500/20 text-amber-400' :
                    'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {flavorForm.demoQuantity === '' ? 'Disponível' :
                     parseInt(flavorForm.demoQuantity, 10) === 0 ? 'Esgotado' :
                     parseInt(flavorForm.demoQuantity, 10) <= flavorForm.lowQuantityThreshold ? 'Últimas un.' :
                     `${flavorForm.demoQuantity} un`}
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveFlavor} className="space-y-4 text-xs">
              {/* MODELO VINCULADO */}
              <div>
                <label className="block font-bold text-gray-200 mb-1">
                  Dispositivo / Modelo Vinculado <span className="text-[#00DFFF]">*</span>
                </label>
                <select
                  value={flavorForm.modelId}
                  onChange={(e) => setFlavorForm({ ...flavorForm, modelId: e.target.value })}
                  disabled={!!editingFlavor}
                  className="w-full p-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/35 text-white font-bold focus:outline-none focus:border-[#00DFFF]"
                >
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      [{m.brandName}] {m.modelName} &bull; {m.puffsLabel}
                    </option>
                  ))}
                </select>
              </div>

              {/* NOME DO SABOR */}
              <div>
                <label className="block font-bold text-gray-200 mb-1">
                  Nome do Sabor <span className="text-[#00DFFF]">*</span>
                </label>
                <input
                  type="text"
                  value={flavorForm.name}
                  onChange={(e) => setFlavorForm({ ...flavorForm, name: e.target.value })}
                  placeholder="Ex: Watermelon Ice, Grape Bubblegum, Cool Mint..."
                  required
                  className="w-full p-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/35 text-white font-bold focus:outline-none focus:border-[#00DFFF]"
                />
              </div>

              {/* EMOJI DO SABOR */}
              <div className="p-3.5 rounded-2xl bg-[#141838] border border-[#8423DA]/30 space-y-2">
                <label className="block font-bold text-gray-200">
                  Emoji Representativo
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={flavorForm.iconEmoji}
                    onChange={(e) => setFlavorForm({ ...flavorForm, iconEmoji: e.target.value })}
                    maxLength={4}
                    className="w-14 p-2 text-center text-xl rounded-xl bg-[#0D1022] border border-[#8423DA]/40 text-white focus:outline-none focus:border-[#00DFFF]"
                  />
                  <div className="flex-1 flex flex-wrap gap-1">
                    {FLAVOR_PRESET_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setFlavorForm({ ...flavorForm, iconEmoji: emoji })}
                        className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition cursor-pointer ${
                          flavorForm.iconEmoji === emoji ? 'bg-[#00DFFF]/30 border border-[#00DFFF]' : 'bg-[#0D1022] hover:bg-white/10'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* COR HEXADECIMAL */}
              <div className="p-3.5 rounded-2xl bg-[#141838] border border-[#8423DA]/30 space-y-2">
                <label className="block font-bold text-gray-200">
                  Cor de Destaque do Sabor
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="color"
                    value={flavorForm.colorHex}
                    onChange={(e) => setFlavorForm({ ...flavorForm, colorHex: e.target.value })}
                    className="w-9 h-9 rounded-lg bg-transparent cursor-pointer border border-white/20"
                  />
                  <input
                    type="text"
                    value={flavorForm.colorHex}
                    onChange={(e) => setFlavorForm({ ...flavorForm, colorHex: e.target.value })}
                    placeholder="#9333EA"
                    className="flex-1 p-2 rounded-xl bg-[#0D1022] border border-[#8423DA]/30 text-white font-mono uppercase text-xs focus:outline-none focus:border-[#00DFFF]"
                  />
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                  {FLAVOR_PRESET_COLORS.map((pColor) => (
                    <button
                      key={pColor.color}
                      type="button"
                      onClick={() => setFlavorForm({ ...flavorForm, colorHex: pColor.color })}
                      className={`p-1.5 rounded-lg border text-left flex items-center gap-1.5 cursor-pointer transition ${
                        flavorForm.colorHex.toLowerCase() === pColor.color.toLowerCase()
                          ? 'border-[#00DFFF] bg-[#00DFFF]/10'
                          : 'border-white/10 bg-[#0D1022] hover:border-white/20'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: pColor.color }}
                      />
                      <span className="text-[10px] text-gray-300 truncate">{pColor.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* QUANTIDADE DEMONSTRATIVA & LIMITE DE ALERTA */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-200 mb-1">
                    Qtd. Demonstrativa (un.)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={flavorForm.demoQuantity}
                    onChange={(e) => setFlavorForm({ ...flavorForm, demoQuantity: e.target.value })}
                    placeholder="Deixe vazio p/ não inf."
                    className="w-full p-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/35 text-white font-bold text-sm focus:outline-none focus:border-[#00DFFF]"
                  />
                  <span className="text-[9px] text-gray-400 mt-0.5 block">0 un = Esgotado</span>
                </div>

                <div>
                  <label className="block font-bold text-gray-200 mb-1">
                    Limite de Alerta (un.)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={flavorForm.lowQuantityThreshold}
                    onChange={(e) => setFlavorForm({ ...flavorForm, lowQuantityThreshold: parseInt(e.target.value, 10) || 3 })}
                    className="w-full p-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/35 text-white font-bold text-sm focus:outline-none focus:border-[#00DFFF]"
                  />
                  <span className="text-[9px] text-gray-400 mt-0.5 block">Dispara &ldquo;Últimas un.&rdquo;</span>
                </div>
              </div>

              {/* FOTO ESPECÍFICA DO SABOR (OPCIONAL) */}
              <div className="p-3.5 rounded-2xl bg-[#141838] border border-[#8423DA]/30 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-gray-200 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-[#00DFFF]" />
                    <span>Foto do Sabor (Opcional)</span>
                  </label>
                  {flavorForm.customImage && (
                    <button
                      type="button"
                      onClick={() => setFlavorForm({ ...flavorForm, customImage: '' })}
                      className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                    >
                      Remover Foto
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2">
                  {flavorForm.customImage && (
                    <div className="w-12 h-12 rounded-lg bg-white/10 p-1 flex items-center justify-center shrink-0 overflow-hidden border border-white/20">
                      <img src={flavorForm.customImage} alt="" className="max-w-full max-h-full object-contain" />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenAiStudioForFlavor(flavorForm.customImage, flavorForm.name || 'Sabor')}
                    className="w-full sm:flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-[#8423DA] via-[#007BFF] to-[#00DFFF] hover:brightness-110 border border-[#00DFFF]/50 text-white font-black cursor-pointer transition flex items-center justify-center gap-1.5 text-xs shadow-md active:scale-95"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#00DFFF]" />
                    <span>Estúdio: 20 Estilos & Variações</span>
                  </button>

                  <label className="w-full sm:flex-1 py-2 px-3 rounded-xl bg-[#0D1022] hover:bg-[#181C38] border border-[#8423DA]/40 text-gray-300 hover:text-white text-center font-semibold cursor-pointer transition flex items-center justify-center gap-1.5 text-xs">
                    <Plus className="w-3.5 h-3.5 text-[#00DFFF]" />
                    <span>Upload do Arquivo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFlavorImageFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* CHECKBOX EM ESTOQUE */}
              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/20 cursor-pointer">
                <input
                  type="checkbox"
                  checked={flavorForm.inStock}
                  onChange={(e) => setFlavorForm({ ...flavorForm, inStock: e.target.checked })}
                  className="w-4 h-4 rounded text-[#8423DA] focus:ring-[#00DFFF] cursor-pointer"
                />
                <span className="text-xs font-semibold text-gray-200">
                  Sabor Ativo / Habilitado para Pedidos
                </span>
              </label>

              {/* FOOTER BUTTONS */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#8423DA]/20">
                <button
                  type="button"
                  onClick={() => setIsFlavorModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#181C38] text-gray-300 hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#8423DA] via-[#007BFF] to-[#00DFFF] hover:brightness-110 text-white font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg active:scale-95 transition-all"
                >
                  {editingFlavor ? 'Atualizar Sabor' : 'Salvar Novo Sabor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL: ESTÚDIO DE IMAGENS IA GEMINI ===================== */}
      <ImageEditorStudioModal
        isOpen={isAiStudioOpen}
        onClose={() => setIsAiStudioOpen(false)}
        initialImageUrl={aiStudioInitialUrl}
        contextTitle={aiStudioContextTitle}
        onApplyImage={handleApplyAiStudioImage}
      />
    </div>
  );
};

