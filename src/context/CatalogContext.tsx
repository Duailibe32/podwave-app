import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  Brand,
  ProductModel,
  FlavorVariant,
  BannerSlide,
  StoreSettings,
  CartItem,
  Coupon,
  OrderForm,
  VariantHistoryEntry,
  UserProfile,
  UserRole,
  CustomerAddress,
  CustomerOrderHistoryItem,
} from '../types/catalog';
import { INITIAL_BRANDS, INITIAL_MODELS, INITIAL_BANNERS, INITIAL_SETTINGS, USB_C_ADDON, AVAILABLE_COUPONS } from '../data/initialData';
import { formatAttendanceRecord, generateReferenceId, getBrasiliaDateTime } from '../utils/recordFormatter';
import { openWhatsAppShare } from '../utils/whatsappShare';
import { calculateVariantAvailability } from '../utils/availability';
import { 
  getSupabaseCredentials,
  saveSupabaseCredentials,
  clearSupabaseCredentials,
  testSupabaseConnection,
  fetchCatalogFromSupabase,
  syncCatalogToSupabase,
  logSupabaseAuditEvent,
  upsertCustomerProfileToSupabase,
  fetchCustomerProfileFromSupabase,
  saveCustomerOrderToSupabase,
  fetchCustomerOrdersFromSupabase,
} from '../services/supabase';

const STORAGE_KEY = 'podwave_catalog_state_v4';
const CART_STORAGE_KEY = 'podwave_cart_state_v2';
const THEME_KEY = 'podwave_theme_mode';
const ADMIN_AUTH_KEY = 'podwave_admin_authenticated';
const VARIANT_HISTORY_KEY = 'podwave_variant_history_v1';
const OWNER_UID_KEY = 'podwave_configured_owner_uid';

export interface AdminUser {
  id: string;
  email: string;
  displayName?: string;
  role?: string;
}

interface CatalogContextType {
  // Data
  brands: Brand[];
  models: ProductModel[];
  banners: BannerSlide[];
  settings: StoreSettings;
  coupons: Coupon[];

  // Supabase PostgreSQL Integration
  supabaseUrl: string;
  supabaseAnonKey: string;
  isSupabaseConfigured: boolean;
  supabaseStatus: 'connected' | 'disconnected' | 'error' | 'testing' | 'pending_migration';
  supabaseStatusMessage: string;
  updateSupabaseCredentials: (url: string, key: string) => void;
  testSupabase: () => Promise<{ success: boolean; message: string; tablesExist?: boolean }>;
  syncToSupabase: () => Promise<{ success: boolean; message: string }>;
  loadFromSupabase: () => Promise<boolean>;
  isAutoSyncEnabled: boolean;
  setIsAutoSyncEnabled: (enabled: boolean) => void;
  isAutoSyncing: boolean;
  lastSyncedAt: Date | null;

  // Auth for Customers & Owner (Differentiation & Persistence)
  currentUser: UserProfile | null;
  isAdminAuthenticated: boolean;
  isOwner: boolean;
  isCustomer: boolean;
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'signup';
  openAuthModal: (mode?: 'login' | 'signup') => void;
  closeAuthModal: () => void;
  isProfileModalOpen: boolean;
  openProfileModal: () => void;
  closeProfileModal: () => void;
  loginUser: (email: string, password?: string, forceRole?: UserRole) => Promise<{ success: boolean; message: string; isOwner: boolean }>;
  registerUser: (data: { email: string; fullName: string; phoneWhatsapp?: string; password?: string; role?: UserRole; address?: CustomerAddress }) => Promise<{ success: boolean; message: string; isOwner: boolean }>;
  logoutUser: () => void;
  updateCustomerProfile: (data: Partial<UserProfile>) => Promise<boolean>;
  recordCustomerOrder: (order: { referenceId: string; subtotal: number; discount: number; total: number; paymentMethod: string; deliveryType: 'delivery' | 'pickup'; addressSummary?: string; items?: CartItem[] }) => Promise<void>;
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
  // Configured Owner UID state (local or legacy)
  const [configuredOwnerUid, setConfiguredOwnerUidState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(OWNER_UID_KEY) || 'owner-master-podwave';
    }
    return 'owner-master-podwave';
  });

  const setConfiguredOwnerUid = (uid: string) => {
    setConfiguredOwnerUidState(uid);
    if (typeof window !== 'undefined') {
      localStorage.setItem(OWNER_UID_KEY, uid);
    }
  };

  // Supabase PostgreSQL Credentials & Connection State
  const [supabaseCreds, setSupabaseCreds] = useState(() => getSupabaseCredentials());
  const [supabaseStatus, setSupabaseStatus] = useState<'connected' | 'disconnected' | 'error' | 'testing' | 'pending_migration'>(() => 
    supabaseCreds.isConfigured ? 'testing' : 'disconnected'
  );
  const [supabaseStatusMessage, setSupabaseStatusMessage] = useState<string>(() =>
    supabaseCreds.isConfigured ? 'Verificando conexão...' : 'Aguardando credenciais do projeto'
  );

  const updateSupabaseCredentials = (url: string, key: string) => {
    saveSupabaseCredentials(url, key);
    const updated = getSupabaseCredentials();
    setSupabaseCreds(updated);
    if (updated.isConfigured) {
      setSupabaseStatus('testing');
      setSupabaseStatusMessage('Verificando conexão...');
      testSupabaseConnection().then((res) => {
        if (res.success) {
          if (!res.tablesExist) {
            setSupabaseStatus('pending_migration');
            setSupabaseStatusMessage(res.message);
          } else {
            setSupabaseStatus('connected');
            setSupabaseStatusMessage(res.message);
            loadFromSupabase();
          }
        } else {
          setSupabaseStatus('error');
          setSupabaseStatusMessage(res.message);
        }
      });
    } else {
      setSupabaseStatus('disconnected');
      setSupabaseStatusMessage('Não configurado');
    }
  };

  const testSupabase = async () => {
    setSupabaseStatus('testing');
    const res = await testSupabaseConnection();
    if (res.success) {
      if (!res.tablesExist) {
        setSupabaseStatus('pending_migration');
        setSupabaseStatusMessage(res.message);
      } else {
        setSupabaseStatus('connected');
        setSupabaseStatusMessage(res.message);
      }
    } else {
      setSupabaseStatus('error');
      setSupabaseStatusMessage(res.message);
    }
    return res;
  };

  // Sincronização Automática com Supabase (Auto-Sync)
  const [isAutoSyncEnabled, setIsAutoSyncEnabledState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('podwave_supabase_autosync');
      return stored === null ? true : stored === 'true';
    }
    return true;
  });
  const [isAutoSyncing, setIsAutoSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const isInitialLoadDoneRef = useRef(false);

  const setIsAutoSyncEnabled = (enabled: boolean) => {
    setIsAutoSyncEnabledState(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem('podwave_supabase_autosync', String(enabled));
    }
  };

  // Keys for local customer persistence
  const CUSTOMER_LOCAL_STORE = 'podwave_registered_users_store_v3';
  const ACTIVE_USER_STORAGE_KEY = 'podwave_logged_in_user_v3';

  const isOwnerAccount = (email: string, configuredUid: string): boolean => {
    const norm = email.trim().toLowerCase();
    const ownerEmails = [
      'duailibe32@gmail.com',
      'proprietario@podwave.com',
      'admin@podwave.com',
      'admin',
    ];
    if (configuredUid && norm === configuredUid.trim().toLowerCase()) return true;
    return ownerEmails.includes(norm);
  };

  // User State (supports both Customer and Owner)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(ACTIVE_USER_STORAGE_KEY);
        if (stored) return JSON.parse(stored);
      } catch {
        // ignore
      }
      if (sessionStorage.getItem(ADMIN_AUTH_KEY) === 'true') {
        return {
          id: 'owner-master-podwave',
          email: 'duailibe32@gmail.com',
          fullName: 'Proprietário PodWave',
          role: 'owner',
        };
      }
    }
    return null;
  });

  const isOwner = currentUser?.role === 'owner';
  const isCustomer = currentUser?.role === 'customer';
  const isAdminAuthenticated = isOwner;

  // Modals for Auth and Profile
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const openAuthModal = (mode: 'login' | 'signup' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };
  const closeAuthModal = () => setIsAuthModalOpen(false);

  const openProfileModal = () => setIsProfileModalOpen(true);
  const closeProfileModal = () => setIsProfileModalOpen(false);

  // Sync user state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (currentUser) {
        localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(currentUser));
        if (currentUser.role === 'owner') {
          sessionStorage.setItem(ADMIN_AUTH_KEY, 'true');
        } else {
          sessionStorage.removeItem(ADMIN_AUTH_KEY);
        }
      } else {
        localStorage.removeItem(ACTIVE_USER_STORAGE_KEY);
        sessionStorage.removeItem(ADMIN_AUTH_KEY);
      }
    }
  }, [currentUser]);

  // Carregar histórico de pedidos do Supabase caso o cliente esteja conectado
  useEffect(() => {
    if (currentUser?.id && supabaseCreds.isConfigured && supabaseStatus === 'connected') {
      fetchCustomerOrdersFromSupabase(currentUser.id).then((remoteOrders) => {
        if (remoteOrders && remoteOrders.length > 0) {
          setCurrentUser((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              orderHistory: remoteOrders,
            };
          });
        }
      });
    }
  }, [currentUser?.id, supabaseStatus]);

  // LOGIN: Customer or Owner
  const loginUser = async (
    email: string,
    password?: string,
    forceRole?: UserRole
  ): Promise<{ success: boolean; message: string; isOwner: boolean }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, message: 'Por favor, informe seu e-mail.', isOwner: false };
    }

    const isIdentifiedOwner = forceRole === 'owner' || isOwnerAccount(cleanEmail, configuredOwnerUid);

    // 1. Tentar carregar perfil remoto do Supabase
    let profile: UserProfile | null = null;
    try {
      profile = await fetchCustomerProfileFromSupabase(cleanEmail);
    } catch {
      // fallback local
    }

    // 2. Se não encontrou no Supabase, buscar no banco local
    if (!profile && typeof window !== 'undefined') {
      try {
        const storedUsersRaw = localStorage.getItem(CUSTOMER_LOCAL_STORE);
        if (storedUsersRaw) {
          const storedUsers: UserProfile[] = JSON.parse(storedUsersRaw);
          const found = storedUsers.find((u) => u.email.toLowerCase() === cleanEmail);
          if (found) profile = found;
        }
      } catch {
        // ignore
      }
    }

    // 3. Se for Dono e ainda não tem cadastro, criar perfil de Dono automaticamente
    if (!profile) {
      if (isIdentifiedOwner) {
        profile = {
          id: `owner-${Date.now()}`,
          email: cleanEmail,
          fullName: 'Proprietário PodWave',
          role: 'owner',
        };
      } else {
        // Criar perfil padrão para cliente que fez login direto
        profile = {
          id: `cust-${Date.now()}`,
          email: cleanEmail,
          fullName: cleanEmail.split('@')[0],
          role: 'customer',
        };
      }
    }

    // Forçar papel de dono se aplicável
    if (isIdentifiedOwner) {
      profile.role = 'owner';
    }

    // Atualizar no Supabase e em cache
    setCurrentUser(profile);
    upsertCustomerProfileToSupabase(profile);

    return {
      success: true,
      message: isIdentifiedOwner
        ? 'Login realizado com sucesso! Bem-vindo de volta ao Painel do Proprietário.'
        : `Olá, ${profile.fullName}! Seus dados foram carregados para compras futuras.`,
      isOwner: isIdentifiedOwner,
    };
  };

  // CADASTRO: Customer or Owner
  const registerUser = async (data: {
    email: string;
    fullName: string;
    phoneWhatsapp?: string;
    password?: string;
    role?: UserRole;
    address?: CustomerAddress;
  }): Promise<{ success: boolean; message: string; isOwner: boolean }> => {
    const cleanEmail = data.email.trim().toLowerCase();
    const isIdentifiedOwner = data.role === 'owner' || isOwnerAccount(cleanEmail, configuredOwnerUid);

    const newProfile: UserProfile = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      email: cleanEmail,
      fullName: data.fullName.trim(),
      phoneWhatsapp: data.phoneWhatsapp?.trim() || undefined,
      role: isIdentifiedOwner ? 'owner' : 'customer',
      address: data.address,
      orderHistory: [],
      createdAt: new Date().toISOString(),
    };

    // Salvar no estado ativo
    setCurrentUser(newProfile);

    // Salvar no Supabase
    await upsertCustomerProfileToSupabase(newProfile);

    // Salvar no registro local de clientes
    if (typeof window !== 'undefined') {
      try {
        const storedUsersRaw = localStorage.getItem(CUSTOMER_LOCAL_STORE);
        const storedUsers: UserProfile[] = storedUsersRaw ? JSON.parse(storedUsersRaw) : [];
        const filtered = storedUsers.filter((u) => u.email.toLowerCase() !== cleanEmail);
        filtered.push(newProfile);
        localStorage.setItem(CUSTOMER_LOCAL_STORE, JSON.stringify(filtered));
      } catch {
        // ignore
      }
    }

    return {
      success: true,
      message: isIdentifiedOwner
        ? 'Conta de Proprietário criada com sucesso! Você tem acesso completo ao Painel Admin.'
        : `Conta criada com sucesso! Seus dados de entrega estão salvos para suas próximas compras.`,
      isOwner: isIdentifiedOwner,
    };
  };

  // LOGOUT
  const logoutUser = () => {
    setCurrentUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ACTIVE_USER_STORAGE_KEY);
      sessionStorage.removeItem(ADMIN_AUTH_KEY);
    }
    if (currentView === 'admin') {
      setCurrentView('catalog');
    }
  };

  // ATUALIZAR PERFIL / ENDEREÇO
  const updateCustomerProfile = async (data: Partial<UserProfile>): Promise<boolean> => {
    if (!currentUser) return false;

    const updated: UserProfile = {
      ...currentUser,
      ...data,
      address: data.address ? { ...currentUser.address, ...data.address } : currentUser.address,
    };

    setCurrentUser(updated);

    // Salvar no Supabase
    await upsertCustomerProfileToSupabase(updated);

    // Salvar no local store
    if (typeof window !== 'undefined') {
      try {
        const storedUsersRaw = localStorage.getItem(CUSTOMER_LOCAL_STORE);
        const storedUsers: UserProfile[] = storedUsersRaw ? JSON.parse(storedUsersRaw) : [];
        const filtered = storedUsers.filter((u) => u.id !== updated.id);
        filtered.push(updated);
        localStorage.setItem(CUSTOMER_LOCAL_STORE, JSON.stringify(filtered));
      } catch {
        // ignore
      }
    }

    return true;
  };

  // REGISTRAR PEDIDO DO CLIENTE
  const recordCustomerOrder = async (orderData: {
    referenceId: string;
    subtotal: number;
    discount: number;
    total: number;
    paymentMethod: string;
    deliveryType: 'delivery' | 'pickup';
    addressSummary?: string;
    items?: CartItem[];
  }): Promise<void> => {
    if (!currentUser) return;

    const orderItem: CustomerOrderHistoryItem = {
      id: `ord-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      referenceId: orderData.referenceId,
      createdAt: new Date().toISOString(),
      items: orderData.items || cart,
      subtotal: orderData.subtotal,
      discount: orderData.discount,
      total: orderData.total,
      paymentMethod: orderData.paymentMethod,
      deliveryType: orderData.deliveryType,
      addressSummary: orderData.addressSummary,
      status: 'recebido',
    };

    const updatedOrders = [orderItem, ...(currentUser.orderHistory || [])];
    const updatedProfile: UserProfile = {
      ...currentUser,
      orderHistory: updatedOrders,
    };

    setCurrentUser(updatedProfile);

    // Salvar pedido no Supabase
    await saveCustomerOrderToSupabase(orderItem, currentUser.id);

    // Atualizar no local storage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(updatedProfile));
      } catch {
        // ignore
      }
    }
  };

  // Compatibilidade com telas antigas de admin
  const adminLogin = (username: string, pass: string): boolean => {
    const validUser = username.trim().toLowerCase() === 'admin' || isOwnerAccount(username, configuredOwnerUid);
    const validPass = pass === '123' || pass.length >= 4;

    if (validUser && validPass) {
      const ownerProfile: UserProfile = {
        id: configuredOwnerUid || 'owner-master-podwave',
        email: 'duailibe32@gmail.com',
        fullName: 'Proprietário PodWave',
        role: 'owner',
      };
      setCurrentUser(ownerProfile);
      return true;
    }
    return false;
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    const ownerProfile: UserProfile = {
      id: configuredOwnerUid || 'owner-master-podwave',
      email: 'duailibe32@gmail.com',
      fullName: 'Proprietário Autorizado',
      role: 'owner',
    };
    setCurrentUser(ownerProfile);
    return true;
  };

  const adminLogout = () => {
    logoutUser();
  };

  const [isAuthChecking] = useState<boolean>(false);
  const [authErrorMessage] = useState<string | null>(null);

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

    logSupabaseAuditEvent('UPDATE_VARIANT_QUANTITY', `${targetModelName} - ${targetFlavorName}`, `Alterado de ${prevQty ?? 'Não informado'} para ${quantity ?? 'Não informado'}`);
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

    logSupabaseAuditEvent('BULK_UPDATE_VARIANTS', `${variantKeys.length} variantes`, `Edição em lote executada`);
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
    setIsUsbCableAdded(false);
    setAppliedCoupon(null);
  };

  const syncToSupabase = async () => {
    return await syncCatalogToSupabase(brands, models, banners, coupons, settings);
  };

  const loadFromSupabase = async (): Promise<boolean> => {
    try {
      const result = await fetchCatalogFromSupabase();
      if (!result) return false;

      if (!result.tablesExist) {
        setSupabaseStatus('pending_migration');
        setSupabaseStatusMessage('Conectado ao Supabase! As tabelas ainda precisam ser criadas. Execute a migration no SQL Editor.');
        return false;
      }

      const { data } = result;
      if (!data) return false;

      if (data.brands && data.brands.length > 0) setBrands(data.brands);
      if (data.models && data.models.length > 0) setModels(data.models);
      if (data.banners && data.banners.length > 0) setBanners(data.banners);
      if (data.coupons && data.coupons.length > 0) setCoupons(data.coupons);
      if (data.settings) setSettings(data.settings);

      setSupabaseStatus('connected');
      setSupabaseStatusMessage('Conectado ao Supabase e catálogo sincronizado com sucesso!');
      isInitialLoadDoneRef.current = true;
      return true;
    } catch {
      isInitialLoadDoneRef.current = true;
      return false;
    }
  };

  // Carregar dados remotos do Supabase na inicialização caso configurado e validado
  useEffect(() => {
    if (supabaseCreds.isConfigured) {
      testSupabaseConnection().then((res) => {
        if (res.success) {
          if (!res.tablesExist) {
            setSupabaseStatus('pending_migration');
            setSupabaseStatusMessage(res.message);
            isInitialLoadDoneRef.current = true;
          } else {
            setSupabaseStatus('connected');
            setSupabaseStatusMessage(res.message);
            loadFromSupabase().finally(() => {
              isInitialLoadDoneRef.current = true;
            });
          }
        } else {
          setSupabaseStatus('error');
          setSupabaseStatusMessage(res.message);
          isInitialLoadDoneRef.current = true;
        }
      });
    } else {
      isInitialLoadDoneRef.current = true;
    }
  }, []);

  // Sincronização Automática em segundo plano com o Supabase quando há alterações locais
  useEffect(() => {
    if (!isInitialLoadDoneRef.current) {
      return;
    }
    if (!isAutoSyncEnabled || supabaseStatus !== 'connected') {
      return;
    }

    const timer = setTimeout(async () => {
      setIsAutoSyncing(true);
      try {
        const res = await syncCatalogToSupabase(brands, models, banners, coupons, settings);
        if (res.success) {
          setLastSyncedAt(new Date());
        }
      } catch {
        // Silencioso
      } finally {
        setIsAutoSyncing(false);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [brands, models, banners, coupons, settings, isAutoSyncEnabled, supabaseStatus]);

  return (
    <CatalogContext.Provider
      value={{
        brands,
        models,
        banners,
        settings,
        coupons,
        supabaseUrl: supabaseCreds.url,
        supabaseAnonKey: supabaseCreds.anonKey,
        isSupabaseConfigured: supabaseCreds.isConfigured,
        supabaseStatus,
        supabaseStatusMessage,
        updateSupabaseCredentials,
        testSupabase,
        syncToSupabase,
        loadFromSupabase,
        isAutoSyncEnabled,
        setIsAutoSyncEnabled,
        isAutoSyncing,
        lastSyncedAt,
        isAdminAuthenticated,
        currentUser,
        isOwner,
        isCustomer,
        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        isProfileModalOpen,
        openProfileModal,
        closeProfileModal,
        loginUser,
        registerUser,
        logoutUser,
        updateCustomerProfile,
        recordCustomerOrder,
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
