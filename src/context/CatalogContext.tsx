import React, { createContext, useContext, useState, useEffect } from 'react';
import { Brand, ProductModel, FlavorVariant, BannerSlide, StoreSettings, CartItem, Coupon, OrderForm, VariantHistoryEntry } from '../types/catalog';
import { INITIAL_BRANDS, INITIAL_MODELS, INITIAL_BANNERS, INITIAL_SETTINGS, USB_C_ADDON, AVAILABLE_COUPONS } from '../data/initialData';
import { formatAttendanceRecord, generateReferenceId, getBrasiliaDateTime } from '../utils/recordFormatter';
import { openWhatsAppShare } from '../utils/whatsappShare';
import { calculateVariantAvailability } from '../utils/availability';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  User, 
  onAuthStateChanged,
  verifyOwnerPrivileges,
  CONFIGURED_OWNER_UID,
  logAuditEvent
} from '../services/firebase';

const STORAGE_KEY = 'podwave_catalog_state_v4';
const CART_STORAGE_KEY = 'podwave_cart_state_v2';
const THEME_KEY = 'podwave_theme_mode';
const ADMIN_AUTH_KEY = 'podwave_admin_authenticated';
const VARIANT_HISTORY_KEY = 'podwave_variant_history_v1';
const OWNER_UID_KEY = 'podwave_configured_owner_uid';

interface CatalogContextType {
  // Data
  brands: Brand[];
  models: ProductModel[];
  banners: BannerSlide[];
  settings: StoreSettings;
  coupons: Coupon[];

  // Auth for Admin Panel (OWNER Exclusive Protection)
  isAdminAuthenticated: boolean;
  currentUser: User | null;
  isOwner: boolean;
  isAuthChecking: boolean;
  authErrorMessage: string | null;
  configuredOwnerUid: string;
  setConfiguredOwnerUid: (uid: string) => void;
  loginWithGoogle: () => Promise<boolean>;
  adminLogin: (username: string, pass: string) => boolean;
  adminLogout: () => void;

  // Variant Availability & Inventory History
  globalLowQuantityThreshold: number;
  setGlobalLowQuantityThreshold: (val: number) => void;
  variantHistory: VariantHistoryEntry[];
  clearVariantHistory: () => void;
  updateFlavorQuantity: (modelId: string, flavorId: string, quantity: number | null, notes?: string) => void;
  updateFlavorThreshold: (modelId: string, flavorId: string, threshold: number) => void;
  bulkUpdateVariants: (
    variantKeys: { modelId: string; flavorId: string }[],
    updates: { demoQuantity?: number | null; lowQuantityThreshold?: number }
  ) => void;

  // View & Theme
  currentView: 'catalog' | 'admin';
  setCurrentView: (view: 'catalog' | 'admin') => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;

  // Filters
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedBrand: string;
  setSelectedBrand: (b: string) => void;
  selectedPuffRange: string;
  setSelectedPuffRange: (r: string) => void;
  selectedCategory: string;
  setSelectedCategory: (c: string) => void;
  selectedSort: string;
  setSelectedSort: (s: string) => void;
  clearFilters: () => void;

  // Modal
  activeModalProduct: ProductModel | null;
  setActiveModalProduct: (p: ProductModel | null) => void;
  activeSelectedFlavor: FlavorVariant | null;
  setActiveSelectedFlavor: (f: FlavorVariant | null) => void;

  // Cart & Drawers
  cart: CartItem[];
  addToCart: (product: ProductModel, flavor: FlavorVariant, quantity?: number) => void;
  removeFromCart: (cartItemId: string) => void;
  updateCartQuantity: (cartItemId: string, delta: number) => void;
  clearCart: () => void;
  totalCartItems: number;
  cartSubtotal: number;
  isUsbCableAdded: boolean;
  toggleUsbCable: (added?: boolean) => void;
  cablePrice: number;
  appliedCoupon: Coupon | null;
  applyCoupon: (codeOrCoupon: string | Coupon) => { success: boolean; message: string };
  removeCoupon: () => void;
  discountAmount: number;
  cartTotal: number;
  freeShippingGoal: number;
  freeShippingRemaining: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  isCheckoutOpen: boolean;
  setIsCheckoutOpen: (open: boolean) => void;

  // Checkout & WhatsApp
  submitOrderViaWhatsapp: (form: OrderForm, customMessage?: string) => void;

  // Admin Actions: Brands
  addBrand: (brand: Omit<Brand, 'id'>) => void;
  updateBrand: (id: string, brand: Partial<Brand>) => void;
  deleteBrand: (id: string) => void;

  // Admin Actions: Models
  addModel: (model: Omit<ProductModel, 'id'>) => void;
  updateModel: (id: string, model: Partial<ProductModel>) => void;
  deleteModel: (id: string) => void;
  toggleModelActive: (id: string) => void;

  // Admin Actions: Flavors
  addFlavor: (modelId: string, flavor: Omit<FlavorVariant, 'id'>) => void;
  updateFlavor: (modelId: string, flavorId: string, flavor: Partial<FlavorVariant>) => void;
  deleteFlavor: (modelId: string, flavorId: string) => void;

  // Admin Actions: Coupons
  addCoupon: (coupon: Omit<Coupon, 'id' | 'usedCount'>) => void;
  updateCoupon: (id: string, coupon: Partial<Coupon>) => void;
  deleteCoupon: (id: string) => void;
  toggleCouponActive: (id: string) => void;

  // Admin Actions: Banners
  addBanner: (banner: Omit<BannerSlide, 'id'>) => void;
  updateBanner: (id: string, banner: Partial<BannerSlide>) => void;
  deleteBanner: (id: string) => void;
  toggleBannerActive: (id: string) => void;

  // Settings & Reset
  updateSettings: (settings: Partial<StoreSettings>) => void;
  resetAllData: () => void;
}

const CatalogContext = createContext<CatalogContextType | undefined>(undefined);

export const CatalogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Configured Owner UID state
  const [configuredOwnerUid, setConfiguredOwnerUidState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(OWNER_UID_KEY) || CONFIGURED_OWNER_UID || '';
    }
    return CONFIGURED_OWNER_UID || '';
  });

  const setConfiguredOwnerUid = (uid: string) => {
    setConfiguredOwnerUidState(uid);
    if (typeof window !== 'undefined') {
      localStorage.setItem(OWNER_UID_KEY, uid);
    }
  };

  // Firebase Auth State & Owner Role verification
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);

  // Variant History State
  const [variantHistory, setVariantHistory] = useState<VariantHistoryEntry[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(VARIANT_HISTORY_KEY);
        if (stored) return JSON.parse(stored);
      } catch {
        // ignore
      }
    }
    return [];
  });

  const clearVariantHistory = () => {
    setVariantHistory([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(VARIANT_HISTORY_KEY);
    }
  };

  const [globalLowQuantityThreshold, setGlobalLowQuantityThreshold] = useState<number>(3);

  // Admin Authentication State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(ADMIN_AUTH_KEY) === 'true';
    }
    return false;
  });

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsAuthChecking(true);
      setCurrentUser(user);
      if (user) {
        const check = await verifyOwnerPrivileges(user);
        setIsOwner(check.isOwner);
        if (check.isOwner) {
          setIsAdminAuthenticated(true);
          sessionStorage.setItem(ADMIN_AUTH_KEY, 'true');
          setAuthErrorMessage(null);
        } else {
          // A common authenticated user is strictly blocked from /admin
          setIsAdminAuthenticated(false);
          sessionStorage.removeItem(ADMIN_AUTH_KEY);
          setAuthErrorMessage(check.errorMessage || 'Conta sem privilégios de Proprietário (OWNER).');
        }
      } else {
        setIsOwner(false);
        // If not logged in via Firebase, check if local developer session is active
        const localActive = sessionStorage.getItem(ADMIN_AUTH_KEY) === 'true';
        setIsAdminAuthenticated(localActive);
      }
      setIsAuthChecking(false);
    });

    return () => unsubscribe();
  }, [configuredOwnerUid]);

  const loginWithGoogle = async (): Promise<boolean> => {
    setAuthErrorMessage(null);
    setIsAuthChecking(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const check = await verifyOwnerPrivileges(result.user);
      setIsOwner(check.isOwner);
      if (check.isOwner) {
        setIsAdminAuthenticated(true);
        sessionStorage.setItem(ADMIN_AUTH_KEY, 'true');
        setIsAuthChecking(false);
        return true;
      } else {
        setIsAdminAuthenticated(false);
        sessionStorage.removeItem(ADMIN_AUTH_KEY);
        setAuthErrorMessage(check.errorMessage || 'Acesso negado: Somente a conta pessoal autorizada do Proprietário possui acesso ao painel.');
        setIsAuthChecking(false);
        return false;
      }
    } catch (err) {
      setIsAuthChecking(false);
      setAuthErrorMessage(err instanceof Error ? err.message : 'Falha ao autenticar com Google.');
      return false;
    }
  };

  const adminLogin = (username: string, pass: string): boolean => {
    const validUser = username.trim().toLowerCase() === 'admin';
    const validPass = pass === '123';

    if (validUser && validPass) {
      setIsAdminAuthenticated(true);
      setIsOwner(true);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(ADMIN_AUTH_KEY, 'true');
      }
      return true;
    }
    return false;
  };

  const adminLogout = () => {
    setIsAdminAuthenticated(false);
    setIsOwner(false);
    setCurrentUser(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(ADMIN_AUTH_KEY);
    }
    try {
      signOut(auth);
    } catch {
      // ignore
    }
  };

  // View mode based on window.location.pathname or hash
  const [currentView, setCurrentView] = useState<'catalog' | 'admin'>(() => {
    if (typeof window !== 'undefined') {
      if (window.location.pathname.startsWith('/admin') || window.location.hash === '#admin') {
        return 'admin';
      }
    }
    return 'catalog';
  });

  // Theme mode locked permanently to dark mode as requested
  const theme = 'dark' as const;

  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
    try {
      localStorage.setItem(THEME_KEY, 'dark');
    } catch {
      // ignore
    }
  }, []);

  const toggleTheme = () => {
    // Theme is locked to dark mode
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  };

  // State data
  const [brands, setBrands] = useState<Brand[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.brands) return parsed.brands;
      }
    } catch {
      // fallback
    }
    return INITIAL_BRANDS;
  });

  const [models, setModels] = useState<ProductModel[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.models) return parsed.models;
      }
    } catch {
      // fallback
    }
    return INITIAL_MODELS;
  });

  const [banners, setBanners] = useState<BannerSlide[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.banners && Array.isArray(parsed.banners)) return parsed.banners;
      }
    } catch {
      // fallback
    }
    return INITIAL_BANNERS;
  });

  const [settings, setSettings] = useState<StoreSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.settings) return parsed.settings;
      }
    } catch {
      // fallback
    }
    return INITIAL_SETTINGS;
  });

  // Coupons state (persisted)
  const [coupons, setCoupons] = useState<Coupon[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.coupons && Array.isArray(parsed.coupons)) return parsed.coupons;
      }
    } catch {
      // fallback
    }
    return AVAILABLE_COUPONS;
  });

  // Save to localStorage when state changes
  useEffect(() => {
    try {
      const payload = {
        brands,
        models,
        settings,
        coupons,
        banners,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('Failed to save state to localStorage', e);
    }
  }, [brands, models, settings, coupons, banners]);

  // Sync route / hash changes
  useEffect(() => {
    const handleLocationChange = () => {
      if (window.location.pathname.startsWith('/admin') || window.location.hash === '#admin') {
        setCurrentView('admin');
      } else {
        setCurrentView('catalog');
      }
    };
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [selectedPuffRange, setSelectedPuffRange] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSort, setSelectedSort] = useState('relevance');

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedBrand('all');
    setSelectedPuffRange('all');
    setSelectedCategory('all');
    setSelectedSort('relevance');
  };

  // Modal detail states
  const [activeModalProduct, setActiveModalProduct] = useState<ProductModel | null>(null);
  const [activeSelectedFlavor, setActiveSelectedFlavor] = useState<FlavorVariant | null>(null);

  useEffect(() => {
    if (activeModalProduct && activeModalProduct.flavors.length > 0) {
      setActiveSelectedFlavor(activeModalProduct.flavors[0]);
    } else {
      setActiveSelectedFlavor(null);
    }
  }, [activeModalProduct]);

  // ================= CART STATE =================
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // fallback
    }
    return [
      // Preload with 1 item for instant preview fidelity (BC15K Passion Fruit)
      {
        id: 'elfbar-bc15k-f-sakura-grape',
        modelId: 'elfbar-bc15k',
        brandName: 'ELFBAR',
        modelName: 'BC15K',
        flavorId: 'f-sakura-grape',
        flavorName: 'Passion Fruit Orange Guava',
        flavorColor: '#F59E0B',
        flavorEmoji: '🍑',
        price: 99.99,
        quantity: 1,
        imageUrl: '/assets/images/pod_oxbar_maze_1792699228586.jpg',
      },
    ];
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isUsbCableAdded, setIsUsbCableAdded] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

  // Save cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.warn('Failed to save cart to localStorage', e);
    }
  }, [cart]);

  const addToCart = (product: ProductModel, flavor: FlavorVariant, quantity = 1) => {
    // Check if the flavor is sold out (status === 'esgotado', demoQuantity === 0, or inStock === false)
    const threshold = flavor.lowQuantityThreshold ?? product.lowQuantityThreshold ?? 3;
    const avail = calculateVariantAvailability(flavor.demoQuantity, threshold);
    if (avail.status === 'esgotado' || flavor.demoQuantity === 0 || flavor.inStock === false) {
      return;
    }

    const itemId = `${product.id}-${flavor.id}`;
    setCart((prev) => {
      const existing = prev.find((item) => item.id === itemId);
      if (existing) {
        return prev.map((item) =>
          item.id === itemId ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      const newItem: CartItem = {
        id: itemId,
        modelId: product.id,
        brandName: product.brandName,
        modelName: product.modelName,
        flavorId: flavor.id,
        flavorName: flavor.name,
        flavorColor: flavor.colorHex,
        flavorEmoji: flavor.iconEmoji,
        price: product.startingPrice,
        quantity,
        imageUrl: flavor.customImage || product.imageUrl,
      };
      return [newItem, ...prev];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (cartItemId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== cartItemId));
  };

  const updateCartQuantity = (cartItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === cartItemId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const clearCart = () => {
    setCart([]);
    setIsUsbCableAdded(false);
    setAppliedCoupon(null);
  };

  const toggleUsbCable = (added?: boolean) => {
    setIsUsbCableAdded((prev) => (typeof added === 'boolean' ? added : !prev));
  };

  // Cart Calculations
  const totalCartItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartSubtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const cablePrice = isUsbCableAdded ? USB_C_ADDON.price : 0;
  const rawTotal = cartSubtotal + cablePrice;

  // Coupon application logic with specific model restriction and maximum uses limit
  const applyCoupon = (codeOrCoupon: string | Coupon) => {
    let coupon: Coupon | undefined;
    if (typeof codeOrCoupon === 'string') {
      const trimmed = codeOrCoupon.trim().toUpperCase();
      coupon = coupons.find((c) => c.code.toUpperCase() === trimmed);
      if (!coupon) {
        return { success: false, message: `Cupom "${trimmed}" não encontrado ou expirado.` };
      }
    } else {
      coupon = codeOrCoupon;
    }

    // 1. Check if coupon is active
    if (coupon.active === false) {
      return { success: false, message: `O cupom ${coupon.code} está inativo no momento.` };
    }

    // 2. Check maximum uses limit
    if (coupon.maxUses && coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
      return {
        success: false,
        message: `O cupom ${coupon.code} atingiu o limite máximo de ${coupon.maxUses} usos e está esgotado.`,
      };
    }

    // 3. Check minimum order value
    if (coupon.minOrderValue && cartSubtotal < coupon.minOrderValue) {
      return {
        success: false,
        message: `O cupom ${coupon.code} é válido apenas para pedidos a partir de R$ ${coupon.minOrderValue.toFixed(2).replace('.', ',')}.`,
      };
    }

    // 4. Check specific model restriction
    if (coupon.applicableModelId && coupon.applicableModelId !== 'all') {
      const hasSpecificModel = cart.some((item) => item.modelId === coupon.applicableModelId);
      if (!hasSpecificModel) {
        const modelName = coupon.applicableModelName || 'específico';
        return {
          success: false,
          message: `O cupom ${coupon.code} é exclusivo para o modelo "${modelName}". Adicione-o ao carrinho para validar o desconto.`,
        };
      }
    }

    setAppliedCoupon(coupon);

    const desc =
      coupon.discountType === 'percent'
        ? `${coupon.value}% OFF`
        : `R$ ${coupon.value.toFixed(2).replace('.', ',')} OFF`;

    const targetDesc =
      coupon.applicableModelId && coupon.applicableModelId !== 'all'
        ? ` no modelo ${coupon.applicableModelName}`
        : '';

    return {
      success: true,
      message: `Cupom ${coupon.code} ativado! (${desc}${targetDesc})`,
    };
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
  };

  // Discount calculation based on general or item-specific coupon
  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.applicableModelId && appliedCoupon.applicableModelId !== 'all') {
      // Item-specific calculation
      const matchingItemsSubtotal = cart
        .filter((item) => item.modelId === appliedCoupon.applicableModelId)
        .reduce((sum, item) => sum + item.price * item.quantity, 0);

      if (appliedCoupon.discountType === 'percent') {
        discountAmount = (matchingItemsSubtotal * appliedCoupon.value) / 100;
      } else {
        discountAmount = Math.min(appliedCoupon.value, matchingItemsSubtotal);
      }
    } else {
      // General cart discount
      if (appliedCoupon.discountType === 'percent') {
        discountAmount = (rawTotal * appliedCoupon.value) / 100;
      } else {
        discountAmount = appliedCoupon.value;
      }
    }
  }

  discountAmount = Math.min(discountAmount, rawTotal);
  const cartTotal = Math.max(0, rawTotal - discountAmount);

  // Free shipping goal: R$ 250,00
  const freeShippingGoal = 250.0;
  const freeShippingRemaining = Math.max(0, freeShippingGoal - rawTotal);

  // Reference implementation for WhatsApp sharing with exact Unicode string
  const submitOrderViaWhatsapp = (form: OrderForm, customMessage?: string) => {
    const phone = settings.whatsappNumber || '5586999014685';
    const cleanPhone = phone.replace(/\D/g, '');

    // If coupon used, increment its count
    if (appliedCoupon) {
      setCoupons((prev) =>
        prev.map((c) =>
          c.code.toUpperCase() === appliedCoupon.code.toUpperCase()
            ? { ...c, usedCount: c.usedCount + 1 }
            : c
        )
      );
    }

    // Use the exact same Unicode string from the preview modal or generate using the unified formatter
    const message = customMessage || formatAttendanceRecord({
      referenceId: generateReferenceId(),
      dateTimeBrasilia: getBrasiliaDateTime(),
      form,
      cart,
      isUsbCableAdded,
      cablePrice,
      appliedCoupon,
    });

    // Universal robust WhatsApp opening with NFC normalization, surrogate validation, and popup resilience
    openWhatsAppShare(cleanPhone, message);
  };

  // Admin CRUD operations: Brands
  const addBrand = (brandData: Omit<Brand, 'id'>) => {
    const newBrand: Brand = {
      ...brandData,
      id: `brand-${Date.now()}`,
    };
    setBrands((prev) => [...prev, newBrand]);
  };

  const updateBrand = (id: string, updated: Partial<Brand>) => {
    setBrands((prev) => prev.map((b) => (b.id === id ? { ...b, ...updated } : b)));
    if (updated.name) {
      setModels((prev) =>
        prev.map((m) => (m.brandId === id ? { ...m, brandName: updated.name! } : m))
      );
    }
  };

  const deleteBrand = (id: string) => {
    setBrands((prev) => prev.filter((b) => b.id !== id));
  };

  // Admin CRUD operations: Models
  const addModel = (modelData: Omit<ProductModel, 'id'>) => {
    const newModel: ProductModel = {
      ...modelData,
      id: `model-${Date.now()}`,
    };
    setModels((prev) => [newModel, ...prev]);
  };

  const updateModel = (id: string, updated: Partial<ProductModel>) => {
    setModels((prev) => prev.map((m) => (m.id === id ? { ...m, ...updated } : m)));
    if (activeModalProduct && activeModalProduct.id === id) {
      setActiveModalProduct((prev) => (prev ? { ...prev, ...updated } : null));
    }
  };

  const deleteModel = (id: string) => {
    setModels((prev) => prev.filter((m) => m.id !== id));
    if (activeModalProduct && activeModalProduct.id === id) {
      setActiveModalProduct(null);
    }
  };

  const toggleModelActive = (id: string) => {
    setModels((prev) =>
      prev.map((m) => (m.id === id ? { ...m, active: !m.active } : m))
    );
  };

  // Admin CRUD operations: Flavors
  const addFlavor = (modelId: string, flavorData: Omit<FlavorVariant, 'id'>) => {
    const newFlavor: FlavorVariant = {
      ...flavorData,
      id: `flavor-${Date.now()}`,
    };
    setModels((prev) =>
      prev.map((m) =>
        m.id === modelId ? { ...m, flavors: [...m.flavors, newFlavor] } : m
      )
    );
  };

  const updateFlavor = (modelId: string, flavorId: string, updated: Partial<FlavorVariant>) => {
    setModels((prev) =>
      prev.map((m) => {
        if (m.id !== modelId) return m;
        return {
          ...m,
          flavors: m.flavors.map((f) => (f.id === flavorId ? { ...f, ...updated } : f)),
        };
      })
    );
  };

  const deleteFlavor = (modelId: string, flavorId: string) => {
    setModels((prev) =>
      prev.map((m) => {
        if (m.id !== modelId) return m;
        return {
          ...m,
          flavors: m.flavors.filter((f) => f.id !== flavorId),
        };
      })
    );
  };

  // Dedicated Intelligent Variant Availability Actions
  const updateFlavorQuantity = (modelId: string, flavorId: string, quantity: number | null, notes?: string) => {
    let prevQty: number | null | undefined = null;
    let targetFlavorName = '';
    let targetFlavorEmoji = '🍇';
    let targetModelName = '';
    let targetBrandName = '';

    setModels((prevModels) =>
      prevModels.map((m) => {
        if (m.id !== modelId) return m;
        targetModelName = m.modelName;
        targetBrandName = m.brandName;
        return {
          ...m,
          flavors: m.flavors.map((f) => {
            if (f.id !== flavorId) return f;
            prevQty = f.demoQuantity;
            targetFlavorName = f.name;
            targetFlavorEmoji = f.iconEmoji;
            return {
              ...f,
              demoQuantity: quantity,
              inStock: quantity === null ? true : quantity > 0,
              updatedAt: new Date().toISOString(),
            };
          }),
        };
      })
    );

    // Record in history log
    const entry: VariantHistoryEntry = {
      id: `vh-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      modelId,
      modelName: targetModelName,
      brandName: targetBrandName,
      flavorId,
      flavorName: targetFlavorName,
      flavorEmoji: targetFlavorEmoji,
      previousQuantity: prevQty,
      newQuantity: quantity,
      updatedBy: currentUser?.email || 'Proprietário (OWNER)',
      changeType: 'quick_edit',
      notes,
    };

    setVariantHistory((prev) => {
      const next = [entry, ...prev].slice(0, 100);
      try {
        localStorage.setItem(VARIANT_HISTORY_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });

    logAuditEvent('UPDATE_VARIANT_QUANTITY', `${targetModelName} - ${targetFlavorName}`, `Alterado de ${prevQty ?? 'Não informado'} para ${quantity ?? 'Não informado'}`);
  };

  const updateFlavorThreshold = (modelId: string, flavorId: string, threshold: number) => {
    setModels((prev) =>
      prev.map((m) => {
        if (m.id !== modelId) return m;
        return {
          ...m,
          flavors: m.flavors.map((f) =>
            f.id === flavorId
              ? { ...f, lowQuantityThreshold: threshold, updatedAt: new Date().toISOString() }
              : f
          ),
        };
      })
    );
  };

  const bulkUpdateVariants = (
    variantKeys: { modelId: string; flavorId: string }[],
    updates: { demoQuantity?: number | null; lowQuantityThreshold?: number }
  ) => {
    const keySet = new Set(variantKeys.map((k) => `${k.modelId}:::${k.flavorId}`));
    const nowIso = new Date().toISOString();

    setModels((prevModels) =>
      prevModels.map((m) => {
        return {
          ...m,
          flavors: m.flavors.map((f) => {
            if (keySet.has(`${m.id}:::${f.id}`)) {
              return {
                ...f,
                ...(updates.demoQuantity !== undefined
                  ? {
                      demoQuantity: updates.demoQuantity,
                      inStock: updates.demoQuantity === null ? true : updates.demoQuantity > 0,
                    }
                  : {}),
                ...(updates.lowQuantityThreshold !== undefined
                  ? { lowQuantityThreshold: updates.lowQuantityThreshold }
                  : {}),
                updatedAt: nowIso,
              };
            }
            return f;
          }),
        };
      })
    );

    // Record bulk history entry
    const entry: VariantHistoryEntry = {
      id: `vh-bulk-${Date.now()}`,
      timestamp: nowIso,
      modelId: 'múltiplos',
      modelName: `${variantKeys.length} variantes atualizadas`,
      flavorId: 'bulk',
      flavorName: 'Edição em Lote',
      flavorEmoji: '⚡',
      previousQuantity: null,
      newQuantity: updates.demoQuantity,
      updatedBy: currentUser?.email || 'Proprietário (OWNER)',
      changeType: 'bulk_edit',
      notes: `Atualizadas ${variantKeys.length} variantes selecionadas`,
    };

    setVariantHistory((prev) => {
      const next = [entry, ...prev].slice(0, 100);
      try {
        localStorage.setItem(VARIANT_HISTORY_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });

    logAuditEvent('BULK_UPDATE_VARIANTS', `${variantKeys.length} variantes`, `Edição em lote executada`);
  };

  // Admin CRUD operations: Coupons
  const addCoupon = (couponData: Omit<Coupon, 'id' | 'usedCount'>) => {
    const newCoupon: Coupon = {
      ...couponData,
      id: `coupon-${Date.now()}`,
      code: couponData.code.trim().toUpperCase(),
      usedCount: 0,
      active: true,
      createdAt: new Date().toISOString(),
    };
    setCoupons((prev) => [newCoupon, ...prev]);
  };

  const updateCoupon = (id: string, updated: Partial<Coupon>) => {
    setCoupons((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              ...updated,
              code: updated.code ? updated.code.trim().toUpperCase() : c.code,
            }
          : c
      )
    );
  };

  const deleteCoupon = (id: string) => {
    setCoupons((prev) => prev.filter((c) => c.id !== id));
    if (appliedCoupon && appliedCoupon.id === id) {
      setAppliedCoupon(null);
    }
  };

  const toggleCouponActive = (id: string) => {
    setCoupons((prev) =>
      prev.map((c) => (c.id === id ? { ...c, active: !c.active } : c))
    );
  };

  // Admin CRUD operations: Banners
  const addBanner = (bannerData: Omit<BannerSlide, 'id'>) => {
    const newBanner: BannerSlide = {
      ...bannerData,
      id: `banner-${Date.now()}`,
      active: true,
      createdAt: new Date().toISOString(),
    };
    setBanners((prev) => [newBanner, ...prev]);
  };

  const updateBanner = (id: string, updated: Partial<BannerSlide>) => {
    setBanners((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updated } : b))
    );
  };

  const deleteBanner = (id: string) => {
    setBanners((prev) => prev.filter((b) => b.id !== id));
  };

  const toggleBannerActive = (id: string) => {
    setBanners((prev) =>
      prev.map((b) => (b.id === id ? { ...b, active: !b.active } : b))
    );
  };

  // Settings & Reset
  const updateSettings = (updated: Partial<StoreSettings>) => {
    setSettings((prev) => ({ ...prev, ...updated }));
  };

  const resetAllData = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(CART_STORAGE_KEY);
    setBrands(INITIAL_BRANDS);
    setModels(INITIAL_MODELS);
    setCoupons(AVAILABLE_COUPONS);
    setBanners(INITIAL_BANNERS);
    setSettings(INITIAL_SETTINGS);
    setCart([]);
    setIsUsbCableAdded(false);
    setAppliedCoupon(null);
  };

  return (
    <CatalogContext.Provider
      value={{
        brands,
        models,
        banners,
        settings,
        coupons,
        isAdminAuthenticated,
        currentUser,
        isOwner,
        isAuthChecking,
        authErrorMessage,
        configuredOwnerUid,
        setConfiguredOwnerUid,
        loginWithGoogle,
        adminLogin,
        adminLogout,
        globalLowQuantityThreshold,
        setGlobalLowQuantityThreshold,
        variantHistory,
        clearVariantHistory,
        updateFlavorQuantity,
        updateFlavorThreshold,
        bulkUpdateVariants,
        currentView,
        setCurrentView,
        theme,
        toggleTheme,
        searchQuery,
        setSearchQuery,
        selectedBrand,
        setSelectedBrand,
        selectedPuffRange,
        setSelectedPuffRange,
        selectedCategory,
        setSelectedCategory,
        selectedSort,
        setSelectedSort,
        clearFilters,
        activeModalProduct,
        setActiveModalProduct,
        activeSelectedFlavor,
        setActiveSelectedFlavor,
        cart,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        totalCartItems,
        cartSubtotal,
        isUsbCableAdded,
        toggleUsbCable,
        cablePrice,
        appliedCoupon,
        applyCoupon,
        removeCoupon,
        discountAmount,
        cartTotal,
        freeShippingGoal,
        freeShippingRemaining,
        isCartOpen,
        setIsCartOpen,
        isCheckoutOpen,
        setIsCheckoutOpen,
        submitOrderViaWhatsapp,
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
        addBanner,
        updateBanner,
        deleteBanner,
        toggleBannerActive,
        updateSettings,
        resetAllData,
      }}
    >
      {children}
    </CatalogContext.Provider>
  );
};

export const useCatalog = () => {
  const context = useContext(CatalogContext);
  if (!context) {
    throw new Error('useCatalog must be used within a CatalogProvider');
  }
  return context;
};
