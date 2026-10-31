import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { toast } from './ToastContext';
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
  CatalogOrderStatus,
  CatalogOrderPaymentStatus,
  OrderStatusHistoryEntry,
  LoyaltyCardData,
  ActivityLogEntry,
  ManualSaleEntry,
  ManualExpenseEntry,
  MerchandisePurchaseEntry,
  CashMovementEntry,
  BusinessSection,
  InitialChannelBalanceRecord,
  InitialCashBalanceConfig,
  ManualCommitmentEntry,
  SyncStatus,
  PasskeyItem,
} from '../types/catalog';
import { INITIAL_BRANDS, INITIAL_MODELS, INITIAL_BANNERS, INITIAL_SETTINGS, USB_C_ADDON, AVAILABLE_COUPONS } from '../data/initialData';
import { formatAttendanceRecord, generateReferenceId, getBrasiliaDateTime } from '../utils/recordFormatter';
import { openWhatsAppShare } from '../utils/whatsappShare';
import { calculateVariantAvailability } from '../utils/availability';
import { cartStockError } from '../utils/stock';
import {
  applyLoyaltyMutation,
  getUserLoyaltyCard,
  loadLocalLoyaltyCardsMap,
  saveLocalLoyaltyCardsMap,
  LoyaltyMutationInput,
} from '../utils/loyaltyCard';
import { 
  getSupabaseCredentials,
  saveSupabaseCredentials,
  clearSupabaseCredentials,
  testSupabaseConnection,
  fetchCatalogFromSupabase,
  syncCatalogToSupabase,
  logSupabaseAuditEvent,
  saveActivityLogToSupabase,
  fetchActivityLogsFromSupabase,
  upsertCustomerProfileToSupabase,
  fetchCustomerProfileById,
  fetchCustomerProfileFromSupabase,
  saveCustomerOrderToSupabase,
  fetchCustomerOrdersFromSupabase,
  fetchAllCustomerOrdersFromSupabase,
  getSupabaseClient,
  isMissingTableError,
  supabaseSignInWithPassword,
  supabaseSignUp,
  supabaseSignOut,
  supabaseSignInWithGoogle,
  supabaseSendOtp,
  supabaseVerifyOtp,
  supabaseSignInWithPasskey,
  supabaseRegisterPasskey,
  supabaseListPasskeys,
  supabaseUpdatePasskeyFriendlyName,
  supabaseDeletePasskey,
  isPasskeyPlatformSupported,
  supabaseResetPasswordForEmail,
  supabaseGetCurrentAuthUser,
  translateSupabaseAuthError,
  fetchAllCustomerProfilesFromSupabase,
  updateCustomerRoleInSupabase,
  updateCustomerLoyaltyInSupabase,
  deleteCustomerProfileFromSupabase,
  createAdminOrVipUserInSupabase,
  fetchManualSalesFromSupabase,
  saveManualSaleToSupabase,
  saveSaleWithStock,
  fetchStockAvailability,
  deleteCommitmentConfirmed,
  deleteManualSaleFromSupabase,
  fetchManualExpensesFromSupabase,
  saveManualExpenseToSupabase,
  deleteManualExpenseFromSupabase,
  fetchMerchandisePurchasesFromSupabase,
  saveMerchandisePurchaseToSupabase,
  deleteMerchandisePurchaseFromSupabase,
  fetchCashMovementsFromSupabase,
  saveCashMovementToSupabase,
  deleteCashMovementFromSupabase,
  fetchInitialCashBalancesFromSupabase,
  saveInitialCashBalancesToSupabase,
  fetchManualCommitmentsFromSupabase,
  saveManualCommitmentToSupabase,
  deleteManualCommitmentFromSupabase,
} from '../services/supabase';
import {
  acquireOrderActionLock,
  releaseOrderActionLock,
  applyOrderStatusTransition,
  evaluateOrderLoyalty,
  findExistingFinancialSaleForOrder,
  buildManualSaleFromCatalogOrder,
} from '../services/orderCenterService';

// ==============================================================================
// INICIALIZAÇÃO REAL DO CLIENTE SUPABASE A PARTIR DAS VARIÁVEIS DE AMBIENTE
// Utiliza VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para conexão e persistência
// ==============================================================================
export const VITE_SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim();
export const VITE_SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseEnvConfigured = Boolean(
  VITE_SUPABASE_URL &&
  VITE_SUPABASE_ANON_KEY &&
  !VITE_SUPABASE_URL.includes('your-project') &&
  !VITE_SUPABASE_ANON_KEY.includes('your-anon-public-key')
);

export const supabaseClient = getSupabaseClient();

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

  // Supabase PostgreSQL Integration & Client
  supabaseClient: SupabaseClient | null;
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

  // Auth for Customers, Admins & VIPs
  currentUser: UserProfile | null;
  isAdminAuthenticated: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  isVip: boolean;
  isCustomer: boolean;
  allUsers: UserProfile[];
  isLoadingUsers: boolean;
  fetchAllUsers: () => Promise<void>;
  updateUserRole: (userId: string, newRole: UserRole, customDiscount?: number) => Promise<boolean>;
  updateUserLoyalty: (userId: string, mutation: LoyaltyMutationInput) => Promise<boolean>;
  createUserWithRole: (data: { email: string; fullName: string; phoneWhatsapp?: string; role: UserRole; password?: string; vipDiscount?: number }) => Promise<{ success: boolean; message: string }>;
  deleteUser: (userId: string) => Promise<boolean>;
  vipDiscountAmount: number;
  vipDiscountRate: number;
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'signup';
  openAuthModal: (mode?: 'login' | 'signup') => void;
  closeAuthModal: () => void;
  isProfileModalOpen: boolean;
  openProfileModal: () => void;
  closeProfileModal: () => void;
  loginUser: (email: string, password?: string) => Promise<{ success: boolean; message: string; isOwner: boolean }>;
  registerUser: (data: { email: string; fullName: string; phoneWhatsapp?: string; password?: string; address?: CustomerAddress }) => Promise<{ success: boolean; message: string; isOwner: boolean }>;
  signInWithGoogle: () => Promise<{ success: boolean; message: string }>;
  sendOtpCode: (email: string) => Promise<{ success: boolean; message: string }>;
  verifyOtpCode: (email: string, token: string) => Promise<{ success: boolean; message: string; isOwner: boolean }>;
  signInWithPasskey: () => Promise<{ success: boolean; message: string; isOwner: boolean }>;
  registerPasskey: (friendlyName?: string) => Promise<{ success: boolean; message: string; passkey?: PasskeyItem }>;
  listPasskeys: () => Promise<{ success: boolean; passkeys: PasskeyItem[]; error?: string }>;
  updatePasskeyName: (passkeyId: string, friendlyName: string) => Promise<{ success: boolean; message: string }>;
  deletePasskey: (passkeyId: string) => Promise<{ success: boolean; message: string }>;
  checkPasskeySupport: () => Promise<{ supported: boolean; reason?: string }>;
  logoutUser: () => void;
  resetPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  updateCustomerProfile: (data: Partial<UserProfile>) => Promise<boolean>;
  recordCustomerOrder: (order: {
    referenceId: string;
    subtotal: number;
    discount: number;
    deliveryFee?: number;
    total: number;
    paymentMethod: string;
    deliveryType: 'delivery' | 'pickup';
    addressSummary?: string;
    customerNotes?: string;
    couponCode?: string;
    vipDiscountApplied?: boolean;
    vipDiscountAmount?: number;
    customerName?: string;
    customerPhone?: string;
    items?: CartItem[];
  }) => Promise<void>;
  allCatalogOrders: CustomerOrderHistoryItem[];
  isLoadingCatalogOrders: boolean;
  catalogOrdersError: string | null;
  fetchAllCatalogOrders: () => Promise<void>;
  updateCatalogOrderStatus: (
    orderId: string,
    toStatus: CatalogOrderStatus,
    options?: {
      reason?: string;
      origin?: OrderStatusHistoryEntry['origin'];
      paymentStatus?: CatalogOrderPaymentStatus;
      amountPaid?: number;
    }
  ) => Promise<{ success: boolean; updatedOrder?: CustomerOrderHistoryItem; error?: string }>;
  updateCatalogOrderPayment: (
    orderId: string,
    paymentStatus: CatalogOrderPaymentStatus,
    amountPaid?: number,
    reason?: string
  ) => Promise<{ success: boolean; updatedOrder?: CustomerOrderHistoryItem; error?: string }>;
  grantLoyaltyStampForOrder: (
    orderId: string,
    note?: string,
    allowPendingPaymentOverride?: boolean
  ) => Promise<{
    success: boolean;
    updatedOrder?: CustomerOrderHistoryItem;
    updatedCard?: LoyaltyCardData;
    error?: string;
  }>;
  recordOrderInFinancialSales: (
    orderId: string,
    options?: {
      paymentStatusOverride?: 'pago' | 'parcial' | 'pendente';
      amountReceivedOverride?: number;
      stockManaged?: boolean;
    }
  ) => Promise<{
    success: boolean;
    saleId?: string;
    alreadyExists?: boolean;
    error?: string;
  }>;
  isAuthChecking: boolean;
  authErrorMessage: string | null;
  configuredOwnerUid: string;
  setConfiguredOwnerUid: (uid: string) => void;
  loginWithGoogle: () => Promise<boolean>;
  adminLogin: (username: string, pass: string) => Promise<boolean>;
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
  submitOrderViaWhatsapp: (form: OrderForm, customMessage?: string) => Promise<boolean>;

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

  // Activity Logs (Auditoria de Produtos, Modificações e Erros de Permissão)
  activityLogs: ActivityLogEntry[];
  addActivityLog: (entry: Omit<ActivityLogEntry, 'id' | 'timestamp' | 'author'> & { author?: string }) => void;
  clearActivityLogs: () => void;
  refreshActivityLogs: () => Promise<void>;

  // Meu Negócio: Controle Gerencial e Financeiro Manual
  manualSales: ManualSaleEntry[];
  manualExpenses: ManualExpenseEntry[];
  merchandisePurchases: MerchandisePurchaseEntry[];
  cashMovements: CashMovementEntry[];
  isLoadingBusinessData: boolean;
  fetchBusinessData: () => Promise<void>;
  saveManualSale: (sale: ManualSaleEntry) => Promise<{ success: boolean; error?: string }>;
  removeManualSale: (id: string) => Promise<{ success: boolean; error?: string }>;
  saveManualExpense: (expense: ManualExpenseEntry) => Promise<{ success: boolean; error?: string }>;
  removeManualExpense: (id: string) => Promise<{ success: boolean; error?: string }>;
  saveMerchandisePurchase: (purchase: MerchandisePurchaseEntry) => Promise<{ success: boolean; error?: string }>;
  removeMerchandisePurchase: (id: string) => Promise<{ success: boolean; error?: string }>;
  saveCashMovement: (movement: CashMovementEntry) => Promise<{ success: boolean; error?: string }>;
  removeCashMovement: (id: string) => Promise<{ success: boolean; error?: string }>;
  initialCashBalances: InitialChannelBalanceRecord[];
  initialCashConfig: InitialCashBalanceConfig;
  saveInitialCashBalances: (config: InitialCashBalanceConfig, notes?: string) => Promise<{ success: boolean; error?: string }>;
  hasLocalInitialBalancesPendingMigration: boolean;
  importLocalInitialBalancesToSupabase: () => Promise<{ success: boolean; message: string }>;
  dismissLocalInitialBalancesPrompt: () => void;
  manualCommitments: ManualCommitmentEntry[];
  saveManualCommitment: (commitment: ManualCommitmentEntry) => Promise<{ success: boolean; error?: string }>;
  removeManualCommitment: (id: string) => Promise<{ success: boolean; error?: string }>;
  pendingSyncCount: number;
  isSyncingPending: boolean;
  syncPendingFinancialData: () => Promise<{ success: boolean; synced: number; failed: number }>;
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

  // Supabase PostgreSQL Client, Credentials & Connection State
  const [supabaseCreds, setSupabaseCreds] = useState(() => getSupabaseCredentials());
  const [activeSupabaseClient, setActiveSupabaseClient] = useState<SupabaseClient | null>(() => {
    return supabaseClient || getSupabaseClient();
  });
  const [supabaseStatus, setSupabaseStatus] = useState<'connected' | 'disconnected' | 'error' | 'testing' | 'pending_migration'>(() => 
    (supabaseClient || supabaseCreds.isConfigured) ? 'testing' : 'disconnected'
  );
  const [supabaseStatusMessage, setSupabaseStatusMessage] = useState<string>(() =>
    (supabaseClient || supabaseCreds.isConfigured) ? 'Verificando conexão com o banco de dados...' : 'Aguardando credenciais do projeto'
  );

  const updateSupabaseCredentials = (url: string, key: string) => {
    if (!saveSupabaseCredentials(url, key)) {
      setSupabaseStatus('error');
      setSupabaseStatusMessage('Use uma URL HTTPS e uma chave pública anon/publishable. A conexão definida na hospedagem não pode ser substituída neste navegador.');
      return;
    }
    const updated = getSupabaseCredentials();
    setSupabaseCreds(updated);
    if (updated.isConfigured) {
      setActiveSupabaseClient(getSupabaseClient());
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
      setActiveSupabaseClient(null);
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
  const hasRemoteCatalogRef = useRef(false);

  const setIsAutoSyncEnabled = (enabled: boolean) => {
    setIsAutoSyncEnabledState(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem('podwave_supabase_autosync', String(enabled));
    }
  };

  // Keys for local customer persistence
  const CUSTOMER_LOCAL_STORE = 'podwave_registered_users_store_v3';
  const ACTIVE_USER_STORAGE_KEY = 'podwave_logged_in_user_v3';

  // User State (strictly authenticated via Supabase Auth)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  const authenticatedIdentityRef = useRef(currentUser);
  authenticatedIdentityRef.current = currentUser;
  const businessCacheKey = (key: string) => 'podwave_private:' + encodeURIComponent(supabaseCreds.url) + ':' + (currentUser?.id || 'signed-out') + ':' + key;
  const businessCacheIdentity = businessCacheKey('owner');
  const [businessCacheOwner, setBusinessCacheOwner] = useState<string | null>(null);
  const isOwner = currentUser?.role === 'owner';
  const isAdmin = currentUser?.role === 'admin' || isOwner;
  const isVip = currentUser?.role === 'vip';
  const isCustomer = currentUser?.role === 'customer' || (!isAdmin && !isVip);
  const isAdminAuthenticated = isAdmin;

  // Remove the legacy identity cache; only Supabase Auth restores identity.
  useEffect(() => {
    localStorage.removeItem(ACTIVE_USER_STORAGE_KEY);
    sessionStorage.removeItem(ADMIN_AUTH_KEY);
  }, []);

  // Modals for Auth and Profile
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Auth checking state & messages
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);

  // User Management State (for Admins to view/add/edit users & roles)
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(false);

  // Local caches are never authoritative for rewards or permissions.
  const mergeUserWithLocalLoyalty = (user: UserProfile): UserProfile => user;

  const fetchAllUsers = async () => {
    const requestedIdentity = authenticatedIdentityRef.current;
    const requestedProject = getSupabaseCredentials().url;
    if (!requestedIdentity || !['owner','admin'].includes(requestedIdentity.role)) return;
    setIsLoadingUsers(true);
    try {
      const remoteUsers = await fetchAllCustomerProfilesFromSupabase();
      if (authenticatedIdentityRef.current?.id !== requestedIdentity.id || getSupabaseCredentials().url !== requestedProject || !['owner','admin'].includes(authenticatedIdentityRef.current?.role || '')) return;
      const mapById = new Map<string, UserProfile>();

      if (remoteUsers && remoteUsers.length > 0) {
        for (const u of remoteUsers) {
          mapById.set(u.id, mergeUserWithLocalLoyalty(u));
        }
      }

      if (currentUser) {
        const existingCurr = mapById.get(currentUser.id);
        mapById.set(
          currentUser.id,
          mergeUserWithLocalLoyalty(existingCurr ? { ...currentUser, ...existingCurr } : currentUser)
        );
      }

      // Garante que clientes identificados em pedidos existentes também apareçam na gestão de selos
      for (const ord of allCatalogOrders) {
        if (ord.customerId && !mapById.has(ord.customerId)) {
          mapById.set(
            ord.customerId,
            mergeUserWithLocalLoyalty({
              id: ord.customerId,
              email: ord.customerEmail || `${ord.customerId}@cliente.podwave`,
              fullName: ord.customerName || 'Cliente PodWave',
              phoneWhatsapp: ord.customerPhone || '',
              role: 'customer',
              createdAt: ord.createdAt,
            })
          );
        }
      }

      const merged = Array.from(mapById.values());
      setAllUsers(merged);

      if (currentUser) {
        const updatedCurrent = mapById.get(currentUser.id);
        if (updatedCurrent?.loyaltyCard) {
          setCurrentUser((prev) =>
            prev ? { ...prev, loyaltyCard: updatedCurrent.loyaltyCard } : null
          );
        }
      }
    } catch (e) {
      console.warn('[CatalogContext] Erro ao buscar lista de usuários:', e);
      if (currentUser) setAllUsers([mergeUserWithLocalLoyalty(currentUser)]);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole, customDiscount?: number): Promise<boolean> => {
    const ok = await updateCustomerRoleInSupabase(userId, newRole, customDiscount);
    if (!ok) return false;
    setAllUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, role: newRole, vipDiscountCustom: newRole === 'vip' ? (customDiscount ?? u.vipDiscountCustom) : undefined }
          : u
      )
    );
    if (currentUser && currentUser.id === userId) {
      const updatedUser: UserProfile = {
        ...currentUser,
        role: newRole,
        vipDiscountCustom: newRole === 'vip' ? (customDiscount ?? currentUser.vipDiscountCustom) : undefined,
      };
      setCurrentUser(updatedUser);
    }
    return ok || !supabaseCreds.isConfigured;
  };

  const updateUserLoyalty = async (userId: string, mutation: LoyaltyMutationInput): Promise<boolean> => {
    if (!isAdmin) {
      console.warn('[Loyalty] Apenas administradores podem atualizar o cartão de fidelidade.');
      return false;
    }

    const matchedOrder = allCatalogOrders.find((o) => o.customerId === userId);
    const targetUser: UserProfile =
      allUsers.find((u) => u.id === userId) ||
      (currentUser?.id === userId ? currentUser : undefined) ||
      (matchedOrder
        ? {
            id: userId,
            email: matchedOrder.customerEmail || `${userId}@cliente.podwave.app`,
            fullName: matchedOrder.customerName || 'Cliente PodWave',
            phoneWhatsapp: matchedOrder.customerPhone || '',
            role: 'customer' as UserRole,
            createdAt: matchedOrder.createdAt,
          }
        : {
            id: userId,
            email: `${userId.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase() || 'cliente'}@cliente.podwave.app`,
            fullName: 'Cliente PodWave',
            role: 'customer' as UserRole,
            createdAt: new Date().toISOString(),
          });

    const defaultGoal = settings.loyaltyGoalStamps || 10;
    const defaultReward = settings.loyaltyDefaultReward || 'Brinde Especial ou Desconto Exclusivo na 10ª Compra';
    const remoteProfile =
      supabaseCreds.isConfigured || Boolean(activeSupabaseClient)
        ? await fetchCustomerProfileById(userId)
        : null;
    const baseUser = remoteProfile
      ? { ...targetUser, ...remoteProfile, loyaltyCard: remoteProfile.loyaltyCard ?? targetUser.loyaltyCard }
      : targetUser;
    const currentCard = getUserLoyaltyCard(baseUser, defaultGoal, defaultReward);
    const authorLabel = currentUser?.fullName || currentUser?.email || 'Administrador';

    console.log('[Loyalty Context] Executando mutação de fidelidade:', {
      userId,
      userName: baseUser.fullName,
      mutationType: mutation.type,
      currentStamps: currentCard.stamps,
      goal: currentCard.goal,
    });

    const nextCard = applyLoyaltyMutation(currentCard, {
      ...mutation,
      author: authorLabel,
    });

    if (supabaseCreds.isConfigured || Boolean(activeSupabaseClient)) {
      const remoteOk = await updateCustomerLoyaltyInSupabase(userId, nextCard, currentCard);
      if (!remoteOk) {
        toast.error(
          'Alteração não confirmada no banco',
          'Verifique se sua conta possui cargo de Proprietário/Admin em customer_profiles e se as migrations SQL do Supabase foram executadas.'
        );
        return false;
      }
    }
    // 1. Atualiza imediatamente o armazenamento local e o estado da aplicação para resposta instantânea
    const localMap = loadLocalLoyaltyCardsMap();
    localMap[userId] = nextCard;
    saveLocalLoyaltyCardsMap(localMap);

    setAllUsers((prev) => {
      const exists = prev.some((u) => u.id === userId);
      if (exists) {
        return prev.map((u) => (u.id === userId ? { ...u, loyaltyCard: nextCard } : u));
      }
      return [{ ...targetUser, loyaltyCard: nextCard }, ...prev];
    });

    if (currentUser && currentUser.id === userId) {
      setCurrentUser((prev) => (prev ? { ...prev, loyaltyCard: nextCard } : null));
    }

    addActivityLog({
      action: 'FIDELIDADE_ATUALIZADA',
      actionLabel: 'Cartão Fidelidade Atualizado',
      entity: 'customer_profiles',
      entityName: targetUser?.fullName || targetUser?.email || userId,
      details: `Operação "${mutation.type}" aplicada no cartão fidelidade (${nextCard.stamps}/${nextCard.goal} selos).`,
      status: 'sucesso',
    });

    return true;
  };

  const createUserWithRole = async (data: {
    email: string;
    fullName: string;
    phoneWhatsapp?: string;
    role: UserRole;
    password?: string;
    vipDiscount?: number;
  }): Promise<{ success: boolean; message: string }> => {
    const res = await createAdminOrVipUserInSupabase(data);
    if (res.success && res.user) {
      setAllUsers((prev) => [res.user!, ...prev.filter((u) => u.email !== res.user!.email)]);
    }
    return { success: res.success, message: res.message };
  };

  const deleteUser = async (userId: string): Promise<boolean> => {
    const ok = await deleteCustomerProfileFromSupabase(userId);
    if (ok) {
      setAllUsers((prev) => prev.filter((u) => u.id !== userId));
    }
    return ok;
  };

  const openAuthModal = (mode: 'login' | 'signup' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };
  const closeAuthModal = () => setIsAuthModalOpen(false);

  const openProfileModal = () => setIsProfileModalOpen(true);
  const closeProfileModal = () => setIsProfileModalOpen(false);

  // Verify identity remotely. An outdated async response cannot restore a signed-out user.
  useEffect(() => {
    let mounted = true;
    let generation = 0;
    setCurrentUser(null);
    const client = getSupabaseClient();
    const refresh = async () => {
      const attempt = ++generation;
      setIsAuthChecking(true);
      try {
        const user = await supabaseGetCurrentAuthUser();
        if (mounted && generation === attempt) setCurrentUser(user);
      } catch {
        if (mounted && generation === attempt) setCurrentUser(null);
      } finally {
        if (mounted && generation === attempt) setIsAuthChecking(false);
      }
    };
    if (!client) {
      setIsAuthChecking(false);
      return () => { mounted = false; };
    }
    const { data: listener } = client.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_OUT' || !session?.user) {
        ++generation;
        setCurrentUser(null);
        setIsAuthChecking(false);
      } else {
        // Defer calls outside the auth event callback.
        void Promise.resolve().then(() => { if (mounted) void refresh(); });
      }
    });
    void refresh();
    return () => {
      mounted = false;
      ++generation;
      listener.subscription.unsubscribe();
    };
  }, [supabaseCreds.url, supabaseCreds.anonKey, supabaseCreds.isConfigured]);

  // Carregar histórico de pedidos do Supabase caso o cliente esteja conectado
  useEffect(() => {
    if (currentUser?.id && supabaseCreds.isConfigured && supabaseStatus === 'connected') {
      const requestedId = currentUser.id;
      fetchCustomerOrdersFromSupabase(requestedId).then((remoteOrders) => {
        if (remoteOrders && remoteOrders.length > 0) {
          setCurrentUser((prev) => {
            if (!prev || prev.id !== requestedId) return prev;
            return {
              ...prev,
              orderHistory: remoteOrders,
            };
          });
        }
      });
    }
  }, [currentUser?.id, supabaseStatus]);

  // LOGIN: Estritamente via Supabase Auth (e-mail e senha)
  const loginUser = async (
    email: string,
    password?: string
  ): Promise<{ success: boolean; message: string; isOwner: boolean }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, message: 'Por favor, informe seu e-mail.', isOwner: false };
    }
    if (!password) {
      return { success: false, message: 'Por favor, informe sua senha de acesso.', isOwner: false };
    }

    setIsAuthChecking(true);
    setAuthErrorMessage(null);

    const res = await supabaseSignInWithPassword(cleanEmail, password);
    setIsAuthChecking(false);

    if (res.success && res.user) {
      setCurrentUser(res.user);
      toast.success(
        `Bem-vindo, ${res.user.fullName || 'ao PodWave'}!`,
        res.isOwner
          ? 'Sessão de Proprietário autenticada.'
          : 'Sessão iniciada com sucesso.'
      );
      return {
        success: true,
        message: res.message,
        isOwner: res.isOwner,
      };
    }

    toast.error('Falha no login', res.message);
    return {
      success: false,
      message: res.message,
      isOwner: false,
    };
  };

  // CADASTRO: Estritamente via Supabase Auth
  const registerUser = async (data: {
    email: string;
    fullName: string;
    phoneWhatsapp?: string;
    password?: string;
    address?: CustomerAddress;
  }): Promise<{ success: boolean; message: string; isOwner: boolean }> => {
    const cleanEmail = data.email.trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, message: 'Por favor, informe um e-mail válido.', isOwner: false };
    }
    if (!data.fullName.trim()) {
      return { success: false, message: 'Por favor, informe seu nome completo.', isOwner: false };
    }
    if (!data.password || data.password.length < 6) {
      return {
        success: false,
        message: 'A senha precisa ter no mínimo 6 caracteres para sua segurança.',
        isOwner: false,
      };
    }

    setIsAuthChecking(true);
    setAuthErrorMessage(null);

    const res = await supabaseSignUp(cleanEmail, data.password, {
      fullName: data.fullName.trim(),
      phoneWhatsapp: data.phoneWhatsapp?.trim(),
      address: data.address,
    });
    setIsAuthChecking(false);

    if (res.success && res.user) {
      setCurrentUser(res.user);
      toast.success('Conta criada com sucesso!', `Bem-vindo ao PodWave, ${data.fullName.trim()}!`);
      return {
        success: true,
        message: res.message,
        isOwner: res.isOwner,
      };
    }

    toast.error('Erro no cadastro', res.message);
    return {
      success: false,
      message: res.message,
      isOwner: false,
    };
  };

  // RECUPERAÇÃO DE SENHA VIA SUPABASE
  const resetPassword = async (email: string): Promise<{ success: boolean; message: string }> => {
    return await supabaseResetPasswordForEmail(email);
  };

  // LOGIN COM GOOGLE (OAUTH 1-CLIQUE 100% GRATUITO)
  const signInWithGoogle = async (): Promise<{ success: boolean; message: string }> => {
    setIsAuthChecking(true);
    setAuthErrorMessage(null);
    const res = await supabaseSignInWithGoogle();
    setIsAuthChecking(false);
    if (!res.success) {
      setAuthErrorMessage(res.message);
      toast.error('Erro no login com Google', res.message);
    }
    return res;
  };

  // LOGIN SEM SENHA: ENVIO DE CÓDIGO OTP (100% GRATUITO)
  const sendOtpCode = async (email: string): Promise<{ success: boolean; message: string }> => {
    setIsAuthChecking(true);
    setAuthErrorMessage(null);
    const res = await supabaseSendOtp(email);
    setIsAuthChecking(false);
    if (!res.success) {
      setAuthErrorMessage(res.message);
      toast.error('Erro ao enviar código', res.message);
    } else {
      toast.success('Código enviado com sucesso!', res.message);
    }
    return res;
  };

  // LOGIN SEM SENHA: VERIFICAÇÃO DO CÓDIGO OTP DE 6 DÍGITOS
  const verifyOtpCode = async (
    email: string,
    token: string
  ): Promise<{ success: boolean; message: string; isOwner: boolean }> => {
    setIsAuthChecking(true);
    setAuthErrorMessage(null);
    const res = await supabaseVerifyOtp(email, token);
    setIsAuthChecking(false);
    if (res.success && res.user) {
      setCurrentUser(res.user);
      toast.success(
        `Bem-vindo, ${res.user.fullName || 'ao PodWave'}!`,
        res.isOwner ? 'Sessão de Administrador autenticada.' : 'Login sem senha validado.'
      );
      return res;
    }
    setAuthErrorMessage(res.message);
    toast.error('Falha na validação', res.message);
    return {
      success: false,
      message: res.message,
      isOwner: false,
    };
  };

  // LOGIN COM PASSKEY (BIOMETRIA / FACE ID / TOUCH ID / WINDOWS HELLO)
  const signInWithPasskey = async (): Promise<{ success: boolean; message: string; isOwner: boolean }> => {
    setIsAuthChecking(true);
    setAuthErrorMessage(null);
    const res = await supabaseSignInWithPasskey();
    setIsAuthChecking(false);

    if (res.success && res.user) {
      setCurrentUser(res.user);
      toast.success(
        `Bem-vindo, ${res.user.fullName || 'ao PodWave'}!`,
        res.isOwner ? 'Sessão de Administrador autenticada com Passkey.' : 'Login biométrico validado com sucesso.'
      );
      return res;
    }

    setAuthErrorMessage(res.message);
    toast.error('Falha no login com Passkey', res.message);
    return {
      success: false,
      message: res.message,
      isOwner: false,
    };
  };

  // CADASTRAR PASSKEY NESTE DISPOSITIVO
  const registerPasskey = async (
    friendlyName?: string
  ): Promise<{ success: boolean; message: string; passkey?: PasskeyItem }> => {
    setIsAuthChecking(true);
    const res = await supabaseRegisterPasskey(friendlyName);
    setIsAuthChecking(false);

    if (res.success) {
      toast.success('Passkey cadastrada!', res.message);
    } else {
      toast.error('Erro ao cadastrar Passkey', res.message);
    }
    return res;
  };

  // LISTAR PASSKEYS DO USUÁRIO ATUAL
  const listPasskeys = async (): Promise<{ success: boolean; passkeys: PasskeyItem[]; error?: string }> => {
    return await supabaseListPasskeys();
  };

  // ATUALIZAR NOME DA PASSKEY
  const updatePasskeyName = async (
    passkeyId: string,
    friendlyName: string
  ): Promise<{ success: boolean; message: string }> => {
    const res = await supabaseUpdatePasskeyFriendlyName(passkeyId, friendlyName);
    if (res.success) {
      toast.success('Passkey atualizada', res.message);
    } else {
      toast.error('Erro ao renomear', res.message);
    }
    return res;
  };

  // EXCLUIR PASSKEY
  const deletePasskey = async (
    passkeyId: string
  ): Promise<{ success: boolean; message: string }> => {
    const res = await supabaseDeletePasskey(passkeyId);
    if (res.success) {
      toast.info('Passkey removida', res.message);
    } else {
      toast.error('Erro ao excluir', res.message);
    }
    return res;
  };

  // CHECAR SUPORTE DE PLATAFORMA
  const checkPasskeySupport = async (): Promise<{ supported: boolean; reason?: string }> => {
    return await isPasskeyPlatformSupported();
  };

  // LOGOUT SEGURO
  const logoutUser = async () => {
    await supabaseSignOut();
    setCurrentUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ACTIVE_USER_STORAGE_KEY);
      sessionStorage.removeItem(ADMIN_AUTH_KEY);
    }
    if (currentView === 'admin') {
      setCurrentView('catalog');
    }
    toast.info('Sessão encerrada', 'Você saiu da sua conta.');
  };

  // ATUALIZAR PERFIL / ENDEREÇO
  const updateCustomerProfile = async (data: Partial<UserProfile>): Promise<boolean> => {
    if (!currentUser) return false;

    const updated: UserProfile = {
      ...currentUser,
      fullName: data.fullName ?? currentUser.fullName,
      phoneWhatsapp: data.phoneWhatsapp ?? currentUser.phoneWhatsapp,
      cpf: data.cpf ?? currentUser.cpf,
      address: data.address ? { ...currentUser.address, ...data.address } : currentUser.address,
    };

    try {
      const saved = await upsertCustomerProfileToSupabase(updated);
      if (!saved) {
        toast.error('Perfil não confirmado', 'O servidor não confirmou a alteração. Dados antigos de benefícios podem exigir revisão pelo proprietário.');
        return false;
      }
      setCurrentUser(updated);
      toast.success('Perfil salvo com sucesso!', 'Dados confirmados no servidor.');
      return true;
    } catch {
      toast.error('Perfil não confirmado', 'Não foi possível confirmar a gravação no servidor.');
      return false;
    }
  };

  // CENTRAL DE PEDIDOS — ESTADO & AÇÕES ADMINISTRATIVAS
  const LOCAL_CATALOG_ORDERS_KEY = businessCacheKey('podwave_local_catalog_orders_v1');

  const loadLocalCatalogOrders = (): CustomerOrderHistoryItem[] => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(LOCAL_CATALOG_ORDERS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const persistLocalCatalogOrders = (orders: CustomerOrderHistoryItem[]) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(LOCAL_CATALOG_ORDERS_KEY, JSON.stringify(orders.slice(0, 500)));
    } catch {
      // ignore quota errors
    }
  };

  const [allCatalogOrders, setAllCatalogOrders] = useState<CustomerOrderHistoryItem[]>(() =>
    loadLocalCatalogOrders()
  );
  const [isLoadingCatalogOrders, setIsLoadingCatalogOrders] = useState<boolean>(false);
  const [catalogOrdersError, setCatalogOrdersError] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin && allCatalogOrders.length > 0) {
      persistLocalCatalogOrders(allCatalogOrders);
    }
  }, [isAdmin, allCatalogOrders]);

  const enrichOrderWithProfile = React.useCallback(
    (order: CustomerOrderHistoryItem, profilesList: UserProfile[]): CustomerOrderHistoryItem => {
      const matched = order.customerId
        ? profilesList.find((u) => u.id === order.customerId)
        : profilesList.find(
            (u) =>
              (order.customerEmail &&
                u.email.toLowerCase() === order.customerEmail.toLowerCase()) ||
              (order.customerPhone &&
                u.phoneWhatsapp &&
                u.phoneWhatsapp.replace(/\D/g, '') === order.customerPhone.replace(/\D/g, ''))
          );
      if (!matched) return order;
      return {
        ...order,
        customerId: order.customerId || matched.id,
        customerName: order.customerName || matched.fullName || undefined,
        customerPhone: order.customerPhone || matched.phoneWhatsapp || undefined,
        customerEmail: order.customerEmail || matched.email || undefined,
      };
    },
    []
  );

  const fetchAllCatalogOrders = React.useCallback(async () => {
    const requestedIdentity = authenticatedIdentityRef.current;
    const requestedProject = getSupabaseCredentials().url;
    if (!isAdmin) {
      setAllCatalogOrders([]);
      setCatalogOrdersError(null);
      return;
    }

    setIsLoadingCatalogOrders(true);
    setCatalogOrdersError(null);
    try {
      const [ordersResult, remoteProfiles] = await Promise.all([
        fetchAllCustomerOrdersFromSupabase(),
        allUsers.length > 0 ? Promise.resolve(allUsers) : fetchAllCustomerProfilesFromSupabase(),
      ]);

      if (!requestedIdentity || authenticatedIdentityRef.current?.id !== requestedIdentity.id || getSupabaseCredentials().url !== requestedProject || !['owner','admin'].includes(authenticatedIdentityRef.current?.role || '')) return;
      const profilesToUse =
        remoteProfiles && remoteProfiles.length > 0 ? remoteProfiles : allUsers;

      if (ordersResult.error && ordersResult.errorKind !== 'missing_table') {
        setCatalogOrdersError(ordersResult.error);
      }

      const mapById = new Map<string, CustomerOrderHistoryItem>();
      for (const ord of ordersResult.orders) {
        mapById.set(ord.id, enrichOrderWithProfile(ord, profilesToUse));
      }

      // Server-confirmed records are authoritative; local timestamps cannot override them.
      const sorted = Array.from(mapById.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setAllCatalogOrders(sorted);
      persistLocalCatalogOrders(sorted);
    } catch {
      setCatalogOrdersError(
        'Não foi possível carregar os pedidos. Verifique sua conexão e tente novamente.'
      );
    } finally {
      setIsLoadingCatalogOrders(false);
    }
  }, [isAdmin, allUsers, currentUser, enrichOrderWithProfile]);

  useEffect(() => {
    if (isAdmin) {
      void fetchAllCatalogOrders();
    } else {
      setAllCatalogOrders([]);
      setCatalogOrdersError(null);
    }
  }, [isAdmin, supabaseStatus]);

  // Supabase Realtime para atualização da Central de Pedidos (Admin) e Meus Pedidos (Cliente)
  useEffect(() => {
    const client = activeSupabaseClient || getSupabaseClient();
    if (!client || (!currentUser?.id && !isAdmin)) return;

    const channelName = isAdmin
      ? `orders-center-admin:${currentUser?.id || 'admin'}`
      : `orders-customer:${currentUser?.id}`;

    const changeFilter =
      !isAdmin && currentUser?.id && /^[a-zA-Z0-9_-]+$/.test(currentUser.id)
        ? `customer_id=eq.${currentUser.id}`
        : undefined;

    const channel = client
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customer_orders',
          ...(changeFilter ? { filter: changeFilter } : {}),
        },
        () => {
          if (isAdmin) {
            void fetchAllCatalogOrders();
          }
          if (currentUser?.id) {
            void fetchCustomerOrdersFromSupabase(currentUser.id).then((remoteOrders) => {
              if (remoteOrders && remoteOrders.length > 0) {
                setCurrentUser((prev) =>
                  prev && prev.id === currentUser.id
                    ? { ...prev, orderHistory: remoteOrders }
                    : prev
                );
              }
            });
          }
        }
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [isAdmin, currentUser?.id, activeSupabaseClient, fetchAllCatalogOrders]);

  // REGISTRAR PEDIDO DO CLIENTE
  const recordCustomerOrder = async (orderData: {
    referenceId: string;
    subtotal: number;
    discount: number;
    deliveryFee?: number;
    total: number;
    paymentMethod: string;
    deliveryType: 'delivery' | 'pickup';
    addressSummary?: string;
    customerNotes?: string;
    couponCode?: string;
    vipDiscountApplied?: boolean;
    vipDiscountAmount?: number;
    customerName?: string;
    customerPhone?: string;
    items?: CartItem[];
  }): Promise<void> => {
    if (!currentUser) return;

    const nowIso = new Date().toISOString();
    const initialHistory: OrderStatusHistoryEntry = {
      id: `osh-${Date.now()}-init`,
      fromStatus: null,
      toStatus: 'recebido',
      changedAt: nowIso,
      changedBy: orderData.customerName || currentUser.fullName || currentUser.email || 'Cliente',
      changedByEmail: currentUser.email,
      origin: 'checkout',
      reason: 'Pedido criado pelo cliente no catálogo',
    };

    const orderItem: CustomerOrderHistoryItem = {
      id: `ord-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      referenceId: orderData.referenceId,
      customerId: currentUser.id,
      customerName: orderData.customerName || currentUser.fullName || undefined,
      customerPhone: orderData.customerPhone || currentUser.phoneWhatsapp || undefined,
      customerEmail: currentUser.email || undefined,
      createdAt: nowIso,
      updatedAt: nowIso,
      updatedBy: currentUser.fullName || currentUser.email,
      items: orderData.items || cart,
      subtotal: orderData.subtotal,
      discount: orderData.discount,
      deliveryFee: orderData.deliveryFee || 0,
      total: orderData.total,
      paymentMethod: orderData.paymentMethod,
      paymentStatus: 'pendente',
      amountPaid: 0,
      deliveryType: orderData.deliveryType,
      addressSummary: orderData.addressSummary,
      customerNotes: orderData.customerNotes,
      couponCode: orderData.couponCode,
      vipDiscountApplied: orderData.vipDiscountApplied,
      vipDiscountAmount: orderData.vipDiscountAmount,
      status: 'recebido',
      statusHistory: [initialHistory],
      loyaltyEligible: true,
      loyaltyStampGranted: false,
      version: 1,
    };

    // Salvar pedido persistente no Supabase
    const savedRemotely = await saveCustomerOrderToSupabase(orderItem, currentUser.id);
    if (!savedRemotely) {
      toast.warning(
        'Atenção ao registrar pedido',
        'O servidor não confirmou a gravação. Nenhum novo registro foi salvo neste dispositivo.'
      );
      return;
    }

    const updatedOrders = [orderItem, ...(currentUser.orderHistory || [])];
    const updatedProfile: UserProfile = {
      ...currentUser,
      orderHistory: updatedOrders,
    };

    setCurrentUser(updatedProfile);
    const currentLocal = loadLocalCatalogOrders();
    persistLocalCatalogOrders([orderItem, ...currentLocal.filter((o) => o.id !== orderItem.id)]);
    if (isAdmin) {
      setAllCatalogOrders((prev) => [orderItem, ...prev.filter((o) => o.id !== orderItem.id)]);
    }
  };

  // ATUALIZAR STATUS DO PEDIDO (ADMIN)
  const updateCatalogOrderStatus = async (
    orderId: string,
    toStatus: CatalogOrderStatus,
    options?: {
      reason?: string;
      origin?: OrderStatusHistoryEntry['origin'];
      paymentStatus?: CatalogOrderPaymentStatus;
      amountPaid?: number;
    }
  ): Promise<{ success: boolean; updatedOrder?: CustomerOrderHistoryItem; error?: string }> => {
    if (!isAdmin || !currentUser) {
      return {
        success: false,
        error: 'Apenas administradores autenticados podem alterar o status de pedidos.',
      };
    }

    const lockKey = `status:${orderId}`;
    if (!acquireOrderActionLock(lockKey)) {
      return {
        success: false,
        error: 'Uma atualização para este pedido já está em andamento. Aguarde.',
      };
    }

    try {
      const existing =
        allCatalogOrders.find((o) => o.id === orderId) ||
        currentUser.orderHistory?.find((o) => o.id === orderId);

      if (!existing) {
        return { success: false, error: 'Pedido não encontrado. Recarregue a lista.' };
      }

      const actorName = currentUser.fullName || currentUser.email || 'Administrador';
      const transition = applyOrderStatusTransition(existing, {
        toStatus,
        actorName,
        actorEmail: currentUser.email,
        origin: options?.origin || 'admin_panel',
        reason: options?.reason,
        expectedVersion: existing.version,
      });

      if (!transition.success || !transition.updatedOrder) {
        return { success: false, error: transition.error || 'Transição de status inválida.' };
      }

      const nowIso = new Date().toISOString();
      let stockDeductedFlag = existing.stockDeducted === true;
      let stockDeductedAtIso = existing.stockDeductedAt;
      let linkedFinancialSaleId = existing.financialSaleId;
      let linkedFinancialRecordedAt = existing.financialRecordedAt;

      const isConfirmingOrActiveStage =
        toStatus === 'confirmado' ||
        toStatus === 'em_separacao' ||
        toStatus === 'enviado' ||
        toStatus === 'entregue';

      // Baixa automática do estoque e conexão imediata com "Meu Negócio" ao confirmar/avançar pedido
      if (isConfirmingOrActiveStage) {
        const existingSale = findExistingFinancialSaleForOrder(existing, manualSales);
        const mappedOrderStatus: ManualSaleEntry['orderStatus'] =
          toStatus === 'entregue' ? 'entregue' : 'confirmado';

        if (!existingSale) {
          const built = buildManualSaleFromCatalogOrder(
            {
              ...existing,
              status: toStatus,
              paymentStatus: options?.paymentStatus ?? existing.paymentStatus,
            },
            { stockManaged: !stockDeductedFlag }
          );
          if (built.success && built.sale) {
            let rpcRes = await saveSaleWithStock(built.sale);
            if (!rpcRes.success && built.sale.stockManaged) {
              // Fallback automático sem trava de estoque caso o sabor esteja com quantidade nula ("Não informado") ou RPC não instalada
              rpcRes = await saveSaleWithStock({
                ...built.sale,
                stockManaged: false,
              });
            }

            const syncedRemotely = rpcRes.success;
            const trackedSale: ManualSaleEntry = {
              ...built.sale,
              orderStatus: mappedOrderStatus,
              stockRequestId: undefined,
              stockManaged: syncedRemotely ? (rpcRes.stockManaged ?? false) : false,
              stockRevision: rpcRes.stockRevision ?? 1,
              _syncStatus: syncedRemotely ? 'synced' : 'pending_sync',
              _syncError: syncedRemotely
                ? undefined
                : 'Sincronização pendente com o banco Supabase.',
              _lastSyncAttempt: nowIso,
            };
            setManualSales((prev) => [
              trackedSale,
              ...prev.filter((s) => s.id !== trackedSale.id),
            ]);
            if (syncedRemotely && trackedSale.stockManaged) {
              await refreshSaleStock();
              stockDeductedFlag = true;
              stockDeductedAtIso = nowIso;
            }
            linkedFinancialSaleId = trackedSale.id;
            linkedFinancialRecordedAt = nowIso;
          }
        } else {
          const updatedExistingSale: ManualSaleEntry = {
            ...existingSale,
            orderStatus: mappedOrderStatus,
            paymentStatus:
              (options?.paymentStatus === 'pago'
                ? 'pago'
                : options?.paymentStatus === 'parcial'
                ? 'parcial'
                : existingSale.paymentStatus) || 'pendente',
          };
          const rpcUpdate = await saveSaleWithStock(updatedExistingSale);
          setManualSales((prev) =>
            prev.map((s) =>
              s.id === existingSale.id
                ? {
                    ...updatedExistingSale,
                    stockRevision: rpcUpdate.stockRevision ?? existingSale.stockRevision,
                    _syncStatus: rpcUpdate.success ? 'synced' : 'pending_sync',
                  }
                : s
            )
          );
          if (existingSale.stockManaged) {
            await refreshSaleStock();
            stockDeductedFlag = true;
            stockDeductedAtIso = existing.stockDeductedAt || nowIso;
          }
          linkedFinancialSaleId = existingSale.id;
          linkedFinancialRecordedAt = existing.financialRecordedAt || nowIso;
        }
      } else if (toStatus === 'cancelado') {
        const existingSale = findExistingFinancialSaleForOrder(existing, manualSales);
        if (existingSale) {
          const cancelSale: ManualSaleEntry = {
            ...existingSale,
            orderStatus: 'cancelado',
          };
          const rpcCancel = await saveSaleWithStock(cancelSale);
          setManualSales((prev) =>
            prev.map((s) =>
              s.id === existingSale.id
                ? {
                    ...cancelSale,
                    stockRevision: rpcCancel.stockRevision ?? existingSale.stockRevision,
                    _syncStatus: rpcCancel.success ? 'synced' : 'pending_sync',
                  }
                : s
            )
          );
          if (rpcCancel.success && existingSale.stockManaged) {
            await refreshSaleStock();
          }
        }
        stockDeductedFlag = false;
        stockDeductedAtIso = undefined;
      }

      const ownerCustomerId = existing.customerId || currentUser.id;
      let updatedOrder: CustomerOrderHistoryItem = {
        ...transition.updatedOrder,
        customerId: ownerCustomerId,
        paymentStatus: options?.paymentStatus ?? transition.updatedOrder.paymentStatus,
        amountPaid:
          typeof options?.amountPaid === 'number'
            ? options.amountPaid
            : options?.paymentStatus === 'pago'
            ? transition.updatedOrder.total
            : transition.updatedOrder.amountPaid,
        stockDeducted: stockDeductedFlag,
        stockDeductedAt: stockDeductedAtIso,
        financialSaleId: linkedFinancialSaleId,
        financialRecordedAt: linkedFinancialRecordedAt,
      };

      if (supabaseCreds.isConfigured || Boolean(activeSupabaseClient)) {
        let confirmed = await saveCustomerOrderToSupabase(updatedOrder, ownerCustomerId);
        if (!confirmed) {
          // Resincroniza a versão atual do pedido no banco caso tenha mudado e tenta novamente
          const remoteCheck = await fetchAllCustomerOrdersFromSupabase();
          const remoteOrd = remoteCheck.orders.find((o) => o.id === orderId);
          if (remoteOrd) {
            updatedOrder = {
              ...updatedOrder,
              customerId: remoteOrd.customerId || ownerCustomerId,
              version: (remoteOrd.version || 1) + 1,
            };
            confirmed = await saveCustomerOrderToSupabase(
              updatedOrder,
              remoteOrd.customerId || ownerCustomerId
            );
          }
        }
      }

      setAllCatalogOrders((prev) => {
        const next = prev.map((o) => (o.id === orderId ? updatedOrder : o));
        persistLocalCatalogOrders(next);
        return next;
      });

      if (currentUser.id === ownerCustomerId) {
        setCurrentUser((prev) =>
          prev
            ? {
                ...prev,
                orderHistory: (prev.orderHistory || []).map((o) =>
                  o.id === orderId ? updatedOrder : o
                ),
              }
            : null
        );
      }

      addActivityLog({
        action: 'PEDIDO_ATUALIZADO',
        actionLabel: `Status do Pedido: ${toStatus.toUpperCase()}`,
        entity: 'customer_orders',
        entityName: `#${updatedOrder.referenceId}`,
        details: `Pedido #${updatedOrder.referenceId} alterado de "${existing.status}" para "${toStatus}"${
          stockDeductedFlag && !existing.stockDeducted
            ? ' (Estoque baixado e venda conectada ao Meu Negócio)'
            : toStatus === 'cancelado' && existing.stockDeducted
            ? ' (Estoque estornado ao catálogo)'
            : ''
        }${options?.reason ? ` (Motivo: ${options.reason})` : ''}.`,
        status: toStatus === 'cancelado' ? 'alerta' : 'sucesso',
      });

      return { success: true, updatedOrder };
    } finally {
      releaseOrderActionLock(lockKey);
    }
  };

  // ATUALIZAR SITUAÇÃO DE PAGAMENTO DO PEDIDO (ADMIN)
  const updateCatalogOrderPayment = async (
    orderId: string,
    paymentStatus: CatalogOrderPaymentStatus,
    amountPaid?: number,
    reason?: string
  ): Promise<{ success: boolean; updatedOrder?: CustomerOrderHistoryItem; error?: string }> => {
    if (!isAdmin || !currentUser) {
      return {
        success: false,
        error: 'Apenas administradores autenticados podem alterar o pagamento de pedidos.',
      };
    }

    const lockKey = `payment:${orderId}`;
    if (!acquireOrderActionLock(lockKey)) {
      return {
        success: false,
        error: 'Uma atualização de pagamento para este pedido já está em andamento.',
      };
    }

    try {
      const existing = allCatalogOrders.find((o) => o.id === orderId);
      if (!existing) {
        return { success: false, error: 'Pedido não encontrado.' };
      }

      const nowIso = new Date().toISOString();
      const actorName = currentUser.fullName || currentUser.email || 'Administrador';
      const resolvedAmountPaid =
        paymentStatus === 'pago'
          ? existing.total
          : paymentStatus === 'parcial'
          ? Math.min(existing.total, Math.max(0, Number(amountPaid) || 0))
          : 0;

      const historyEntry: OrderStatusHistoryEntry = {
        id: `osh-pay-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        fromStatus: existing.status,
        toStatus: existing.status,
        changedAt: nowIso,
        changedBy: actorName,
        changedByEmail: currentUser.email,
        origin: 'admin_panel',
        reason: `Pagamento atualizado para "${paymentStatus.toUpperCase()}" (R$ ${resolvedAmountPaid
          .toFixed(2)
          .replace('.', ',')})${reason ? ` — ${reason}` : ''}`,
      };

      const ownerCustomerId = existing.customerId || currentUser.id;
      let updatedOrder: CustomerOrderHistoryItem = {
        ...existing,
        customerId: ownerCustomerId,
        paymentStatus,
        amountPaid: resolvedAmountPaid,
        statusHistory: [historyEntry, ...(existing.statusHistory || [])].slice(0, 50),
        updatedAt: nowIso,
        updatedBy: actorName,
        version: (existing.version || 1) + 1,
      };

      // Sincroniza ou cria automaticamente o lançamento correspondente em "Meu Negócio"
      const linkedSale = findExistingFinancialSaleForOrder(existing, manualSales);
      const mappedSalePayStatus: 'pago' | 'parcial' | 'pendente' =
        paymentStatus === 'pago'
          ? 'pago'
          : paymentStatus === 'parcial'
          ? 'parcial'
          : 'pendente';

      if (linkedSale) {
        const updatedSale: ManualSaleEntry = {
          ...linkedSale,
          paymentStatus: mappedSalePayStatus,
          amountReceived: resolvedAmountPaid,
          amountPending: Math.max(0, Number((linkedSale.netTotal - resolvedAmountPaid).toFixed(2))),
          receivedDate:
            paymentStatus === 'pago'
              ? linkedSale.receivedDate || nowIso.split('T')[0]
              : linkedSale.receivedDate,
        };
        const savedSale = await saveSaleWithStock(updatedSale);
        if (savedSale.success && savedSale.stockRevision !== undefined) {
          updatedSale.stockRevision = savedSale.stockRevision;
        }
        updatedSale._syncStatus = savedSale.success ? 'synced' : 'pending_sync';
        setManualSales((prev) =>
          prev.map((s) => (s.id === linkedSale.id ? updatedSale : s))
        );
      } else if (existing.status !== 'cancelado') {
        const built = buildManualSaleFromCatalogOrder(updatedOrder, {
          paymentStatusOverride: mappedSalePayStatus,
          amountReceivedOverride: resolvedAmountPaid,
          stockManaged: false,
        });
        if (built.success && built.sale) {
          const savedSale = await saveSaleWithStock(built.sale);
          const trackedSale: ManualSaleEntry = {
            ...built.sale,
            stockManaged: savedSale.stockManaged ?? false,
            stockRevision: savedSale.stockRevision ?? 1,
            _syncStatus: savedSale.success ? 'synced' : 'pending_sync',
            _lastSyncAttempt: nowIso,
          };
          setManualSales((prev) => [
            trackedSale,
            ...prev.filter((s) => s.id !== trackedSale.id),
          ]);
          updatedOrder.financialSaleId = trackedSale.id;
          updatedOrder.financialRecordedAt = nowIso;
        }
      }

      if (supabaseCreds.isConfigured || Boolean(activeSupabaseClient)) {
        let confirmed = await saveCustomerOrderToSupabase(updatedOrder, ownerCustomerId);
        if (!confirmed) {
          const remoteCheck = await fetchAllCustomerOrdersFromSupabase();
          const remoteOrd = remoteCheck.orders.find((o) => o.id === orderId);
          if (remoteOrd) {
            updatedOrder = {
              ...updatedOrder,
              customerId: remoteOrd.customerId || ownerCustomerId,
              version: (remoteOrd.version || 1) + 1,
            };
            confirmed = await saveCustomerOrderToSupabase(
              updatedOrder,
              remoteOrd.customerId || ownerCustomerId
            );
          }
        }
      }

      setAllCatalogOrders((prev) => {
        const next = prev.map((o) => (o.id === orderId ? updatedOrder : o));
        persistLocalCatalogOrders(next);
        return next;
      });

      if (currentUser.id === ownerCustomerId) {
        setCurrentUser((prev) =>
          prev
            ? {
                ...prev,
                orderHistory: (prev.orderHistory || []).map((o) =>
                  o.id === orderId ? updatedOrder : o
                ),
              }
            : null
        );
      }

      return { success: true, updatedOrder };
    } finally {
      releaseOrderActionLock(lockKey);
    }
  };

  // CREDITAR +1 SELO FIDELIDADE VINCULADO AO PEDIDO (COM PROTEÇÃO DE DUPLICIDADE)
  const grantLoyaltyStampForOrder = async (
    orderId: string,
    note?: string,
    allowPendingPaymentOverride = false
  ): Promise<{
    success: boolean;
    updatedOrder?: CustomerOrderHistoryItem;
    updatedCard?: LoyaltyCardData;
    error?: string;
  }> => {
    if (!isAdmin || !currentUser) {
      return {
        success: false,
        error: 'Apenas administradores autenticados podem creditar selos de fidelidade.',
      };
    }

    const lockKey = `stamp:${orderId}`;
    if (!acquireOrderActionLock(lockKey)) {
      return {
        success: false,
        error: 'A concessão de selo para este pedido já está em processamento.',
      };
    }

    try {
      const order = allCatalogOrders.find((o) => o.id === orderId);
      if (!order) {
        return { success: false, error: 'Pedido não encontrado.' };
      }

      // Resolve o cliente pelo ID, e-mail, WhatsApp ou cria identificador determinístico para o pedido
      const matchedCustomer =
        (order.customerId ? allUsers.find((u) => u.id === order.customerId) : undefined) ||
        (order.customerEmail
          ? allUsers.find((u) => u.email.toLowerCase() === order.customerEmail!.toLowerCase())
          : undefined) ||
        (order.customerPhone
          ? allUsers.find(
              (u) =>
                u.phoneWhatsapp &&
                u.phoneWhatsapp.replace(/\D/g, '') === order.customerPhone!.replace(/\D/g, '')
            )
          : undefined) ||
        (order.customerId && currentUser.id === order.customerId ? currentUser : undefined);

      const resolvedCustomerId =
        order.customerId ||
        matchedCustomer?.id ||
        `cust-${(order.customerEmail || order.customerPhone || order.id)
          .replace(/[^a-zA-Z0-9_-]/g, '')
          .toLowerCase()}`;

      const remoteProfile =
        supabaseCreds.isConfigured || Boolean(activeSupabaseClient)
          ? await fetchCustomerProfileById(resolvedCustomerId)
          : null;
      const effectiveCustomer = remoteProfile
        ? { ...(matchedCustomer || {}), ...remoteProfile }
        : matchedCustomer;

      const orderWithCustomer: CustomerOrderHistoryItem = {
        ...order,
        customerId: resolvedCustomerId,
      };

      const defaultGoal = settings.loyaltyGoalStamps || 10;
      const defaultReward =
        settings.loyaltyDefaultReward ||
        'Brinde Especial ou Desconto Exclusivo na 10ª Compra';

      const evaluation = evaluateOrderLoyalty(
        orderWithCustomer,
        effectiveCustomer,
        defaultGoal,
        defaultReward
      );

      if (evaluation.state === 'granted') {
        return {
          success: false,
          error: `O selo referente ao pedido #${order.referenceId} já foi concedido anteriormente.`,
        };
      }

      if (
        !evaluation.canGrantAutomatically &&
        !(allowPendingPaymentOverride && evaluation.canGrantWithAdminOverride)
      ) {
        return {
          success: false,
          error: evaluation.description,
        };
      }

      const idempotencyKey = `stamp-order-${order.id}`;
      const authorLabel = currentUser.fullName || currentUser.email || 'Administrador';
      const localMap = loadLocalLoyaltyCardsMap();
      const baseCard = getUserLoyaltyCard(effectiveCustomer, defaultGoal, defaultReward);

      const updatedCard = applyLoyaltyMutation(baseCard, {
        type: 'add',
        value: 1,
        orderId: order.id,
        orderReferenceId: order.referenceId,
        idempotencyKey,
        author: authorLabel,
        note:
          note?.trim() ||
          `Selo validado na entrega do pedido #${order.referenceId}`,
      });

      const nowIso = new Date().toISOString();
      let updatedOrder: CustomerOrderHistoryItem = {
        ...orderWithCustomer,
        loyaltyStampGranted: true,
        loyaltyStampGrantedAt: nowIso,
        loyaltyStampGrantedBy: authorLabel,
        loyaltyGrantIdempotencyKey: idempotencyKey,
        updatedAt: nowIso,
        updatedBy: authorLabel,
        version: (order.version || 1) + 1,
      };

      if (supabaseCreds.isConfigured || Boolean(activeSupabaseClient)) {
        const cardSaved = await updateCustomerLoyaltyInSupabase(
          resolvedCustomerId,
          updatedCard,
          baseCard
        );
        if (!cardSaved) {
          return {
            success: false,
            error:
              'O servidor não confirmou a gravação do selo. Verifique se sua conta possui cargo de Proprietário/Admin em customer_profiles.',
          };
        }
        let orderSaved = await saveCustomerOrderToSupabase(updatedOrder, resolvedCustomerId);
        if (!orderSaved) {
          const remoteCheck = await fetchAllCustomerOrdersFromSupabase();
          const remoteOrd = remoteCheck.orders.find((o) => o.id === order.id);
          if (remoteOrd) {
            updatedOrder = {
              ...updatedOrder,
              customerId: remoteOrd.customerId || resolvedCustomerId,
              version: (remoteOrd.version || 1) + 1,
            };
            orderSaved = await saveCustomerOrderToSupabase(
              updatedOrder,
              remoteOrd.customerId || resolvedCustomerId
            );
          }
        }
      }

      localMap[resolvedCustomerId] = updatedCard;
      saveLocalLoyaltyCardsMap(localMap);

      setAllUsers((prev) => {
        const exists = prev.some((u) => u.id === resolvedCustomerId);
        if (exists) {
          return prev.map((u) =>
            u.id === resolvedCustomerId ? { ...u, loyaltyCard: updatedCard } : u
          );
        }
        const stubProfile: UserProfile = {
          id: resolvedCustomerId,
          email:
            order.customerEmail ||
            `${resolvedCustomerId}@cliente.podwave.app`,
          fullName: order.customerName || 'Cliente PodWave',
          phoneWhatsapp: order.customerPhone || '',
          role: 'customer',
          loyaltyCard: updatedCard,
          createdAt: order.createdAt || nowIso,
        };
        return [stubProfile, ...prev];
      });

      if (currentUser.id === resolvedCustomerId) {
        setCurrentUser((prev) =>
          prev
            ? {
                ...prev,
                loyaltyCard: updatedCard,
                orderHistory: (prev.orderHistory || []).map((o) =>
                  o.id === order.id ? updatedOrder : o
                ),
              }
            : null
        );
      }

      setAllCatalogOrders((prev) => {
        const next = prev.map((o) => (o.id === order.id ? updatedOrder : o));
        persistLocalCatalogOrders(next);
        return next;
      });

      addActivityLog({
        action: 'FIDELIDADE_ATUALIZADA',
        actionLabel: 'Selo Fidelidade Creditado',
        entity: 'customer_orders',
        entityName: `#${order.referenceId}`,
        details: `+1 selo creditado para ${order.customerName || resolvedCustomerId} referente ao pedido #${order.referenceId} (${updatedCard.stamps}/${updatedCard.goal} selos).`,
        status: 'sucesso',
      });

      return { success: true, updatedOrder, updatedCard };
    } finally {
      releaseOrderActionLock(lockKey);
    }
  };

  // REGISTRAR PEDIDO DO CATÁLOGO NO MÓDULO FINANCEIRO ("MEU NEGÓCIO") SEM DUPLICIDADE
  const recordOrderInFinancialSales = async (
    orderId: string,
    options?: {
      paymentStatusOverride?: 'pago' | 'parcial' | 'pendente';
      amountReceivedOverride?: number;
      stockManaged?: boolean;
    }
  ): Promise<{
    success: boolean;
    saleId?: string;
    alreadyExists?: boolean;
    error?: string;
  }> => {
    if (!isAdmin || !currentUser) {
      return {
        success: false,
        error: 'Apenas administradores autenticados podem registrar vendas no financeiro.',
      };
    }

    const lockKey = `finance:${orderId}`;
    if (!acquireOrderActionLock(lockKey)) {
      return {
        success: false,
        error: 'O lançamento financeiro deste pedido já está em processamento.',
      };
    }

    try {
      const order = allCatalogOrders.find((o) => o.id === orderId);
      if (!order) {
        return { success: false, error: 'Pedido não encontrado.' };
      }

      const existingSale = findExistingFinancialSaleForOrder(order, manualSales);
      if (existingSale) {
        return {
          success: true,
          saleId: existingSale.id,
          alreadyExists: true,
        };
      }

      // Se o estoque já foi baixado na confirmação do pedido, evita descontar uma segunda vez na RPC
      const shouldManageStockInRpc = order.stockDeducted
        ? false
        : options?.stockManaged ?? true;

      const built = buildManualSaleFromCatalogOrder(order, {
        ...options,
        stockManaged: shouldManageStockInRpc,
      });
      if (!built.success || !built.sale) {
        return {
          success: false,
          error: built.error || 'Não foi possível montar o lançamento financeiro.',
        };
      }

      const nowIso = new Date().toISOString();
      let rpcRes = await saveSaleWithStock(built.sale);
      if (!rpcRes.success && built.sale.stockManaged) {
        rpcRes = await saveSaleWithStock({
          ...built.sale,
          stockManaged: false,
        });
      }

      const syncedRemotely = rpcRes.success;
      if (syncedRemotely && rpcRes.stockManaged) {
        await refreshSaleStock();
      }

      const trackedSale: ManualSaleEntry = {
        ...built.sale,
        stockRequestId: undefined,
        stockManaged: syncedRemotely ? (rpcRes.stockManaged ?? false) : false,
        stockRevision: rpcRes.stockRevision ?? 1,
        _syncStatus: syncedRemotely ? 'synced' : 'pending_sync',
        _syncError: syncedRemotely
          ? undefined
          : 'Salvo localmente (pendente de sincronização com o Supabase).',
        _lastSyncAttempt: nowIso,
      };

      setManualSales((prev) => {
        const idx = prev.findIndex((s) => s.id === trackedSale.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = trackedSale;
          return updated;
        }
        return [trackedSale, ...prev];
      });

      const ownerCustomerId = order.customerId || currentUser.id;
      let updatedOrder: CustomerOrderHistoryItem = {
        ...order,
        customerId: ownerCustomerId,
        financialSaleId: trackedSale.id,
        financialRecordedAt: nowIso,
        paymentStatus: trackedSale.paymentStatus,
        amountPaid: trackedSale.amountReceived,
        updatedAt: nowIso,
        updatedBy: currentUser.fullName || currentUser.email || 'Administrador',
        version: (order.version || 1) + 1,
      };

      if (supabaseCreds.isConfigured || Boolean(activeSupabaseClient)) {
        let confirmed = await saveCustomerOrderToSupabase(updatedOrder, ownerCustomerId);
        if (!confirmed) {
          const remoteCheck = await fetchAllCustomerOrdersFromSupabase();
          const remoteOrd = remoteCheck.orders.find((o) => o.id === order.id);
          if (remoteOrd) {
            updatedOrder = {
              ...updatedOrder,
              customerId: remoteOrd.customerId || ownerCustomerId,
              version: (remoteOrd.version || 1) + 1,
            };
            confirmed = await saveCustomerOrderToSupabase(
              updatedOrder,
              remoteOrd.customerId || ownerCustomerId
            );
          }
        }
      }

      setAllCatalogOrders((prev) => {
        const next = prev.map((o) => (o.id === order.id ? updatedOrder : o));
        persistLocalCatalogOrders(next);
        return next;
      });

      addActivityLog({
        action: 'PEDIDO_ATUALIZADO',
        actionLabel: 'Pedido Lançado no Financeiro',
        entity: 'manual_sales',
        entityName: `#${order.referenceId}`,
        details: `Pedido #${order.referenceId} (${order.customerName || 'Cliente'}) registrado em Minhas Vendas (R$ ${trackedSale.netTotal.toFixed(2).replace('.', ',')}).`,
        status: 'sucesso',
      });

      return {
        success: true,
        saleId: trackedSale.id,
        alreadyExists: false,
      };
    } finally {
      releaseOrderActionLock(lockKey);
    }
  };

  // Ponte automática entre "Pedidos" e "Meu Negócio": garante que pedidos confirmados, entregues ou pagos apareçam em Minhas Vendas sem duplicidade
  useEffect(() => {
    if (!isAdmin || allCatalogOrders.length === 0) return;
    setManualSales((prevSales) => {
      const additions: ManualSaleEntry[] = [];
      const currentPool = [...prevSales];
      for (const ord of allCatalogOrders) {
        if (ord.status === 'cancelado') continue;
        const shouldConnect =
          ord.status === 'confirmado' ||
          ord.status === 'em_separacao' ||
          ord.status === 'enviado' ||
          ord.status === 'entregue' ||
          ord.paymentStatus === 'pago' ||
          ord.paymentStatus === 'parcial' ||
          Boolean(ord.financialSaleId);
        if (!shouldConnect) continue;
        const already = findExistingFinancialSaleForOrder(ord, currentPool);
        if (!already) {
          const built = buildManualSaleFromCatalogOrder(ord, { stockManaged: false });
          if (built.success && built.sale) {
            const entry: ManualSaleEntry = {
              ...built.sale,
              stockManaged: false,
              stockRevision: 1,
              _syncStatus: 'pending_sync',
              _lastSyncAttempt: ord.updatedAt || ord.createdAt,
            };
            additions.push(entry);
            currentPool.push(entry);
          }
        }
      }
      if (additions.length === 0) return prevSales;
      return [...additions, ...prevSales];
    });
  }, [isAdmin, allCatalogOrders]);

  // Autenticação Administrativa Segura (Supabase Auth com verificação de role: admin ou owner)
  const adminLogin = async (username: string, pass: string): Promise<boolean> => {
    const cleanEmail = username.trim().toLowerCase();
    setAuthErrorMessage(null);

    if (!cleanEmail || !pass) {
      setAuthErrorMessage('Informe o e-mail e a senha do administrador.');
      return false;
    }

    const res = await supabaseSignInWithPassword(cleanEmail, pass);
    if (!res.success) {
      setAuthErrorMessage(res.message);
      return false;
    }

    const hasAdminAccess = res.user && (res.user.role === 'admin' || res.user.role === 'owner');
    if (!hasAdminAccess) {
      setAuthErrorMessage(
        'Esta conta não possui permissão de Administrador (role: admin ou owner). Apenas administradores autorizados podem acessar o painel administrativo.'
      );
      return false;
    }

    if (!res.user) {
      return false;
    }

    setCurrentUser(res.user);
    return true;
  };

  // Autenticação com Google via Supabase OAuth (sem bypass mock)
  const loginWithGoogle = async (): Promise<boolean> => {
    setAuthErrorMessage(null);
    const client = getSupabaseClient();
    if (!client) {
      setAuthErrorMessage('Supabase não configurado. Forneça a URL e chave pública nas configurações.');
      return false;
    }

    try {
      const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/admin` : undefined,
        },
      });

      if (error) {
        setAuthErrorMessage(translateSupabaseAuthError(error.message));
        return false;
      }
      return true;
    } catch (err: any) {
      setAuthErrorMessage(err?.message || 'Falha ao autenticar com conta Google via Supabase.');
      return false;
    }
  };

  const adminLogout = () => {
    logoutUser();
  };

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

  // Storage key for activity logs (Auditoria do Catálogo)
  const ACTIVITY_LOGS_STORAGE_KEY = businessCacheKey('podwave_activity_logs_v2');

  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([]);

  // Save private logs only after the matching account cache has been hydrated.
  useEffect(() => {
    if (typeof window !== 'undefined' && isAdmin && businessCacheOwner === businessCacheIdentity) {
      localStorage.setItem(ACTIVITY_LOGS_STORAGE_KEY, JSON.stringify(activityLogs));
    }
  }, [activityLogs, isAdmin, businessCacheOwner, businessCacheIdentity]);

  // Carregar histórico de atividades do Supabase na inicialização
  useEffect(() => {
    if (isAdmin && supabaseCreds.isConfigured && supabaseStatus === 'connected') {
      const requestedId = currentUser?.id;
      const requestedProject = supabaseCreds.url;
      fetchActivityLogsFromSupabase().then((remoteLogs) => {
        if (authenticatedIdentityRef.current?.id !== requestedId || getSupabaseCredentials().url !== requestedProject || !['owner','admin'].includes(authenticatedIdentityRef.current?.role || '')) return;
        if (remoteLogs && remoteLogs.length > 0) {
          setActivityLogs((prev) => {
            const map = new Map<string, ActivityLogEntry>();
            remoteLogs.forEach((l) => map.set(l.id, l));
            prev.forEach((l) => {
              if (!map.has(l.id)) map.set(l.id, l);
            });
            return Array.from(map.values()).sort(
              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
          });
        }
      });
    }
  }, [supabaseCreds.isConfigured, supabaseStatus, isAdmin, currentUser?.id]);

  const addActivityLog = (
    entry: Omit<ActivityLogEntry, 'id' | 'timestamp' | 'author'> & { author?: string }
  ) => {
    const authorDesc =
      entry.author ||
      (currentUser
        ? `${currentUser.fullName || currentUser.email} (${isOwner ? 'Proprietário' : 'Admin'})`
        : 'Proprietário (Admin)');

    const newLog: ActivityLogEntry = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      author: authorDesc,
      authorEmail: currentUser?.email,
      ...entry,
    };

    setActivityLogs((prev) => [newLog, ...prev.slice(0, 199)]);
    saveActivityLogToSupabase(newLog);
  };

  const clearActivityLogs = () => {
    setActivityLogs([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ACTIVITY_LOGS_STORAGE_KEY);
    }
  };

  const refreshActivityLogs = async () => {
    const remoteLogs = await fetchActivityLogsFromSupabase();
    if (remoteLogs && remoteLogs.length > 0) {
      setActivityLogs(remoteLogs);
    }
  };

  const [globalLowQuantityThreshold, setGlobalLowQuantityThreshold] = useState<number>(3);

  // View mode based on window.location.pathname or hash
  const [currentViewState, setCurrentViewState] = useState<'catalog' | 'admin'>(() => {
    if (typeof window !== 'undefined') {
      if (window.location.pathname.startsWith('/admin') || window.location.hash === '#admin') {
        return 'admin';
      }
    }
    return 'catalog';
  });

  const currentView = currentViewState;
  const setCurrentView = (view: 'catalog' | 'admin') => {
    if (view === 'admin' && !isAdmin) {
      openAuthModal('login');
      return;
    }
    setCurrentViewState(view);
  };

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
    return [];
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
    const current = models.find((m) => m.id === product.id);
    const currentFlavor = current?.flavors.find((f) => f.id === flavor.id);
    const existingQuantity = cart.filter((i) => i.modelId === product.id && i.flavorId === flavor.id).reduce((n,i) => n+i.quantity,0);
    if (!current?.active || !currentFlavor?.inStock || !Number.isInteger(quantity) || quantity<1 || !Number.isInteger(currentFlavor.demoQuantity) || existingQuantity+quantity>(currentFlavor.demoQuantity ?? 0)) {
      toast.error('Estoque indisponível', 'A quantidade solicitada não está disponível.');
      return;
    }
    // Check if the flavor is sold out (status === 'esgotado', demoQuantity === 0, or inStock === false)
    const threshold = flavor.lowQuantityThreshold ?? product.lowQuantityThreshold ?? 3;
    const avail = calculateVariantAvailability(flavor.demoQuantity, threshold);
    if (avail.status === 'esgotado' || flavor.demoQuantity === 0 || flavor.inStock === false) {
      toast.error('Sabor indisponível', `${product.modelName} (${flavor.name}) está esgotado.`);
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

    toast.success(
      'Adicionado ao carrinho!',
      `${quantity > 1 ? `${quantity}x ` : ''}${product.modelName} • ${flavor.name}`,
      {
        action: {
          label: 'Ver Carrinho',
          onClick: () => setIsCartOpen(true),
        },
      }
    );

    setIsCartOpen(true);
  };

  const removeFromCart = (cartItemId: string) => {
    const item = cart.find((i) => i.id === cartItemId);
    setCart((prev) => prev.filter((item) => item.id !== cartItemId));
    if (item) {
      toast.info('Item removido', `${item.modelName} (${item.flavorName}) foi retirado do carrinho.`);
    }
  };

  const updateCartQuantity = (cartItemId: string, delta: number) => {
    const proposed = cart.map((i) => i.id === cartItemId ? {...i, quantity:i.quantity+delta} : i).filter((i) => i.quantity>0);
    const error = cartStockError(proposed, models);
    if (error) { toast.error('Estoque indisponível',error); return; }
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
    if (cart.length > 0) {
      toast.info('Carrinho esvaziado', 'Todos os produtos foram removidos.');
    }
    setCart([]);
    setIsUsbCableAdded(false);
    setAppliedCoupon(null);
  };

  const toggleUsbCable = (added?: boolean) => {
    setIsUsbCableAdded((prev) => {
      const next = typeof added === 'boolean' ? added : !prev;
      if (next) {
        toast.success('Cabo USB-C Adicionado', 'Cabo Tipo-C adicionado por +R$ 15,00.');
      } else {
        toast.info('Cabo USB-C Removido', 'Cabo Tipo-C retirado do pedido.');
      }
      return next;
    });
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

    toast.success(`Cupom ${coupon.code} ativado!`, `${desc}${targetDesc}`);

    return {
      success: true,
      message: `Cupom ${coupon.code} ativado! (${desc}${targetDesc})`,
    };
  };

  const removeCoupon = () => {
    if (appliedCoupon) {
      toast.info('Cupom removido', `O cupom ${appliedCoupon.code} foi retirado do pedido.`);
    }
    setAppliedCoupon(null);
  };

  // VIP Customer Discount calculation (for users with role 'vip')
  const vipDiscountRate = isVip ? (currentUser?.vipDiscountCustom || settings.vipDiscountPercent || 10) : 0;
  let vipDiscountAmount = 0;
  if (isVip && vipDiscountRate > 0) {
    vipDiscountAmount = (cartSubtotal * vipDiscountRate) / 100;
  }

  // Discount calculation based on general or item-specific coupon
  let couponDiscountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.applicableModelId && appliedCoupon.applicableModelId !== 'all') {
      // Item-specific calculation
      const matchingItemsSubtotal = cart
        .filter((item) => item.modelId === appliedCoupon.applicableModelId)
        .reduce((sum, item) => sum + item.price * item.quantity, 0);

      if (appliedCoupon.discountType === 'percent') {
        couponDiscountAmount = (matchingItemsSubtotal * appliedCoupon.value) / 100;
      } else {
        couponDiscountAmount = Math.min(appliedCoupon.value, matchingItemsSubtotal);
      }
    } else {
      // General cart discount
      if (appliedCoupon.discountType === 'percent') {
        couponDiscountAmount = (rawTotal * appliedCoupon.value) / 100;
      } else {
        couponDiscountAmount = appliedCoupon.value;
      }
    }
  }

  // Total discount combined (coupon + VIP discount)
  const discountAmount = Math.min(couponDiscountAmount + vipDiscountAmount, rawTotal);
  const cartTotal = Math.max(0, rawTotal - discountAmount);

  // Free shipping goal: R$ 250,00
  const freeShippingGoal = 250.0;
  const freeShippingRemaining = Math.max(0, freeShippingGoal - rawTotal);

  // Reference implementation for WhatsApp sharing with exact Unicode string
  const submitOrderViaWhatsapp = async (form: OrderForm, customMessage?: string): Promise<boolean> => {
    if (!cart.length) { toast.error('Adicione produtos ao carrinho.'); return false; }
    try {
      const stock = await fetchStockAvailability();
      const latestModels = models.map((m) => ({...m,flavors:m.flavors.map((f) => {
        const current = stock.find((s) => s.id===f.id && s.modelId===m.id);
        return {...f,demoQuantity:current?.quantity ?? null,inStock:current?.inStock ?? false};
      })}));
      setModels(latestModels);
      const error = cartStockError(cart,latestModels);
      if (error) { toast.error('Pedido não enviado',error); return false; }
    } catch (error) {
      toast.error('Pedido não enviado',error instanceof Error ? error.message : 'Confira a conexão.');
      return false;
    }
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

    const refId = generateReferenceId();

    // Persistir o pedido real na tabela customer_orders do Supabase para o cliente logado
    if (currentUser?.id) {
      recordCustomerOrder({
        referenceId: refId,
        subtotal: rawTotal,
        discount: discountAmount,
        total: cartTotal,
        paymentMethod: form.paymentMethod,
        deliveryType: form.isPickup ? 'pickup' : 'delivery',
        addressSummary: form.isPickup
          ? 'Retirada no Local'
          : [form.address, form.numberAndComplement, form.bairro, form.city].filter(Boolean).join(' - '),
        items: [...cart],
      });
    }

    // Use the exact same Unicode string from the preview modal or generate using the unified formatter
    const message = customMessage || formatAttendanceRecord({
      referenceId: refId,
      dateTimeBrasilia: getBrasiliaDateTime(),
      form,
      cart,
      isUsbCableAdded,
      cablePrice,
      appliedCoupon,
    });

    // Universal robust WhatsApp opening with NFC normalization, surrogate validation, and popup resilience
    openWhatsAppShare(cleanPhone, message);
    toast.success(
      'Pedido gerado com sucesso!',
      `Referência ${refId} criada. Abrindo WhatsApp oficial para confirmação...`,
      { durationMs: 5000 }
    );
    return true;
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

    addActivityLog({
      action: 'PRODUTO_ADICIONADO',
      actionLabel: 'Produto Adicionado',
      entity: 'product_models',
      entityName: newModel.modelName,
      details: `Preço: R$ ${newModel.startingPrice.toFixed(2)}, Puffs: ${newModel.puffsLabel || newModel.puffs}, Marca: ${newModel.brandName}. ${newModel.flavors.length} sabor(es) cadastrado(s).`,
      status: 'sucesso',
    });
    toast.success('Produto criado!', `${newModel.modelName} foi adicionado ao catálogo.`);
  };

  const updateModel = (id: string, updated: Partial<ProductModel>) => {
    let targetName = 'Produto';
    setModels((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          targetName = updated.modelName || m.modelName;
          return { ...m, ...updated };
        }
        return m;
      })
    );

    if (activeModalProduct && activeModalProduct.id === id) {
      setActiveModalProduct((prev) => (prev ? { ...prev, ...updated } : null));
    }

    const changedFields = Object.keys(updated).filter((k) => k !== 'updatedAt').join(', ');
    addActivityLog({
      action: 'PRODUTO_EDITADO',
      actionLabel: 'Produto Editado',
      entity: 'product_models',
      entityName: targetName,
      details: changedFields ? `Campos atualizados: ${changedFields}` : 'Informações do modelo atualizadas.',
      status: 'sucesso',
    });
    toast.success('Produto atualizado!', `${targetName} foi salvo com sucesso.`);
  };

  const deleteModel = (id: string) => {
    let deletedModelName = 'Produto';
    let deletedBrand = '';
    let flavorsCount = 0;
    setModels((prev) => {
      const found = prev.find((m) => m.id === id);
      if (found) {
        deletedModelName = found.modelName;
        deletedBrand = found.brandName;
        flavorsCount = found.flavors.length;
      }
      return prev.filter((m) => m.id !== id);
    });

    if (activeModalProduct && activeModalProduct.id === id) {
      setActiveModalProduct(null);
    }

    addActivityLog({
      action: 'PRODUTO_REMOVIDO',
      actionLabel: 'Produto Removido',
      entity: 'product_models',
      entityName: deletedModelName,
      details: `Dispositivo removido do catálogo. Marca: ${deletedBrand || 'N/A'}, Sabores excluídos: ${flavorsCount}.`,
      status: 'alerta',
    });
    toast.info('Produto removido', `${deletedModelName} foi excluído do catálogo.`);
  };

  const toggleModelActive = (id: string) => {
    let modelName = '';
    let newActiveState = false;
    setModels((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          modelName = m.modelName;
          newActiveState = !m.active;
          return { ...m, active: !m.active };
        }
        return m;
      })
    );

    addActivityLog({
      action: 'PRODUTO_EDITADO',
      actionLabel: newActiveState ? 'Produto Ativado' : 'Produto Pausado/Ocultado',
      entity: 'product_models',
      entityName: modelName || 'Produto',
      details: newActiveState
        ? 'Status alterado para ATIVO (visível no catálogo).'
        : 'Status alterado para INATIVO (ocultado do catálogo para clientes).',
      status: 'sucesso',
    });
    toast.info(
      newActiveState ? 'Produto ativado' : 'Produto pausado',
      `${modelName || 'Produto'} agora está ${newActiveState ? 'visível' : 'ocultado'}.`
    );
  };

  // Admin CRUD operations: Flavors
  const addFlavor = (modelId: string, flavorData: Omit<FlavorVariant, 'id'>) => {
    const newFlavor: FlavorVariant = {
      ...flavorData,
      id: `flavor-${Date.now()}`,
    };
    let modelName = '';
    setModels((prev) =>
      prev.map((m) => {
        if (m.id === modelId) {
          modelName = m.modelName;
          return { ...m, flavors: [...m.flavors, newFlavor] };
        }
        return m;
      })
    );

    addActivityLog({
      action: 'SABOR_ADICIONADO',
      actionLabel: 'Sabor Adicionado',
      entity: 'flavor_variants',
      entityName: `${newFlavor.name} ${newFlavor.iconEmoji || ''}`,
      details: `Novo sabor adicionado ao modelo ${modelName || modelId}.`,
      status: 'sucesso',
    });
  };

  const updateFlavor = (modelId: string, flavorId: string, updated: Partial<FlavorVariant>) => {
    // Explicit stock edits bypass generic catalog sync, which no longer sends snapshots.
    if (updated.demoQuantity !== undefined || updated.inStock !== undefined) {
      const client = activeSupabaseClient || getSupabaseClient();
      if (client) client.from('flavor_variants').update({
        ...(updated.demoQuantity !== undefined ? {demo_quantity:updated.demoQuantity} : {}),
        ...(updated.inStock !== undefined ? {in_stock:updated.inStock} : {}),
        updated_at:new Date().toISOString(),
      }).eq('id',flavorId).then(({error}) => {
        if (error) { toast.error('Estoque não confirmado',error.message); void refreshSaleStock(); }
      });
    }
    let modelName = '';
    let flavorName = '';
    setModels((prev) =>
      prev.map((m) => {
        if (m.id !== modelId) return m;
        modelName = m.modelName;
        return {
          ...m,
          flavors: m.flavors.map((f) => {
            if (f.id === flavorId) {
              flavorName = updated.name || f.name;
              return { ...f, ...updated };
            }
            return f;
          }),
        };
      })
    );

    addActivityLog({
      action: 'SABOR_EDITADO',
      actionLabel: 'Sabor Editado',
      entity: 'flavor_variants',
      entityName: flavorName || 'Sabor',
      details: `Informações do sabor atualizadas no modelo ${modelName || modelId}.`,
      status: 'sucesso',
    });
  };

  const deleteFlavor = (modelId: string, flavorId: string) => {
    let modelName = '';
    let flavorName = '';
    setModels((prev) =>
      prev.map((m) => {
        if (m.id !== modelId) return m;
        modelName = m.modelName;
        const target = m.flavors.find((f) => f.id === flavorId);
        if (target) flavorName = target.name;
        return {
          ...m,
          flavors: m.flavors.filter((f) => f.id !== flavorId),
        };
      })
    );

    addActivityLog({
      action: 'SABOR_REMOVIDO',
      actionLabel: 'Sabor Removido',
      entity: 'flavor_variants',
      entityName: flavorName || 'Sabor',
      details: `Sabor excluído do modelo ${modelName || modelId}.`,
      status: 'alerta',
    });
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

    // Persistência real em tempo real no Supabase
    const dbClient = activeSupabaseClient || getSupabaseClient();
    if (dbClient) {
      dbClient
        .from('flavor_variants')
        .update({
          demo_quantity: quantity,
          in_stock: quantity === null ? true : quantity > 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', flavorId)
        .then(({ error }) => {
          if (error && !isMissingTableError(error)) {
            console.warn('[Supabase] Falha ao atualizar sabor no banco de dados:', error.message);
          }
        });
    }

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

    // Persistência real em tempo real no Supabase para as variantes alteradas em lote
    const dbClient = activeSupabaseClient || getSupabaseClient();
    if (dbClient && variantKeys.length > 0) {
      variantKeys.forEach((item) => {
        dbClient
          .from('flavor_variants')
          .update({
            ...(updates.demoQuantity !== undefined
              ? {
                  demo_quantity: updates.demoQuantity,
                  in_stock: updates.demoQuantity === null ? true : updates.demoQuantity > 0,
                }
              : {}),
            ...(updates.lowQuantityThreshold !== undefined
              ? { low_quantity_threshold: updates.lowQuantityThreshold }
              : {}),
            updated_at: nowIso,
          })
          .eq('id', item.flavorId)
          .then();
      });
    }

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
    if (!isAdmin || !hasRemoteCatalogRef.current) return { success: false, message: 'Valide o acesso e carregue o catálogo remoto antes de enviar alterações.' };
    return await syncCatalogToSupabase(brands, models, banners, coupons, settings);
  };

  const loadFromSupabase = async (): Promise<boolean> => {
    hasRemoteCatalogRef.current = false;
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

      if (data.brands) setBrands(data.brands);
      if (data.models) setModels(data.models);
      if (data.banners) setBanners(data.banners);
      if (data.coupons) setCoupons(data.coupons);
      if (data.settings) setSettings(data.settings);
      hasRemoteCatalogRef.current = true;

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
    if (!isInitialLoadDoneRef.current || !hasRemoteCatalogRef.current) {
      return;
    }
    if (!isAdmin || isAuthChecking || !isAutoSyncEnabled || supabaseStatus !== 'connected') {
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
  }, [brands, models, banners, coupons, settings, isAutoSyncEnabled, supabaseStatus, isAdmin, isAuthChecking]);

  // -------------------------------------------------------------
  // MEU NEGÓCIO: CONTROLE GERENCIAL E FINANCEIRO MANUAL
  // -------------------------------------------------------------
  const [manualSales, setManualSales] = useState<ManualSaleEntry[]>([]);
  const [manualExpenses, setManualExpenses] = useState<ManualExpenseEntry[]>([]);
  const [merchandisePurchases, setMerchandisePurchases] = useState<MerchandisePurchaseEntry[]>([]);
  const [cashMovements, setCashMovements] = useState<CashMovementEntry[]>([]);
  const [initialCashBalances, setInitialCashBalances] = useState<InitialChannelBalanceRecord[]>([]);
  const [manualCommitments, setManualCommitments] = useState<ManualCommitmentEntry[]>([]);
  const [hasDismissedLocalBalancesPrompt, setHasDismissedLocalBalancesPrompt] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('podwave_dismiss_local_balances_prompt') === 'true';
    }
    return false;
  });
  const [isLoadingBusinessData, setIsLoadingBusinessData] = useState<boolean>(false);

  // Derived initialCashConfig from Supabase records with safe fallback
  const initialCashConfig = React.useMemo<InitialCashBalanceConfig>(() => {
    if (initialCashBalances.length > 0) {
      const pix = initialCashBalances.find((b) => b.accountChannel === 'pix_banco');
      const caixa = initialCashBalances.find((b) => b.accountChannel === 'dinheiro_caixa');
      const cartao = initialCashBalances.find((b) => b.accountChannel === 'cartao_maquininha');
      const outro = initialCashBalances.find((b) => b.accountChannel === 'outro');

      const defaultRefDate =
        pix?.referenceDate ||
        caixa?.referenceDate ||
        cartao?.referenceDate ||
        outro?.referenceDate ||
        `${new Date().getFullYear()}-01-01`;

      return {
        referenceDate: defaultRefDate,
        pix_banco: pix?.amount || 0,
        dinheiro_caixa: caixa?.amount || 0,
        cartao_maquininha: cartao?.amount || 0,
        outro: outro?.amount || 0,
        channelReferenceDates: {
          pix_banco: pix?.referenceDate || defaultRefDate,
          dinheiro_caixa: caixa?.referenceDate || defaultRefDate,
          cartao_maquininha: cartao?.referenceDate || defaultRefDate,
          outro: outro?.referenceDate || defaultRefDate,
        },
      };
    }

    // Fallback: se Supabase ainda não tem a tabela executada, verificar se há dados locais
    if (typeof window !== 'undefined') {
      try {
        const local = localStorage.getItem(businessCacheKey('podwave_initial_cash_balances'));
        if (local) {
          const parsed = JSON.parse(local);
          return {
            referenceDate: parsed.referenceDate || `${new Date().getFullYear()}-01-01`,
            pix_banco: Number(parsed.pix_banco) || 0,
            dinheiro_caixa: Number(parsed.dinheiro_caixa) || 0,
            cartao_maquininha: Number(parsed.cartao_maquininha) || 0,
            outro: Number(parsed.outro) || 0,
            channelReferenceDates: {
              pix_banco: parsed.channelReferenceDates?.pix_banco || parsed.referenceDate || `${new Date().getFullYear()}-01-01`,
              dinheiro_caixa: parsed.channelReferenceDates?.dinheiro_caixa || parsed.referenceDate || `${new Date().getFullYear()}-01-01`,
              cartao_maquininha: parsed.channelReferenceDates?.cartao_maquininha || parsed.referenceDate || `${new Date().getFullYear()}-01-01`,
              outro: parsed.channelReferenceDates?.outro || parsed.referenceDate || `${new Date().getFullYear()}-01-01`,
            },
          };
        }
      } catch {
        // fallback para padrão
      }
    }

    const defaultDate = `${new Date().getFullYear()}-01-01`;
    return {
      referenceDate: defaultDate,
      pix_banco: 0,
      dinheiro_caixa: 0,
      cartao_maquininha: 0,
      outro: 0,
      channelReferenceDates: {
        pix_banco: defaultDate,
        dinheiro_caixa: defaultDate,
        cartao_maquininha: defaultDate,
        outro: defaultDate,
      },
    };
  }, [initialCashBalances]);

  // Verificar se há saldos locais pendentes de confirmação para importar ao Supabase
  const hasLocalInitialBalancesPendingMigration = React.useMemo<boolean>(() => {
    if (hasDismissedLocalBalancesPrompt) return false;
    if (initialCashBalances.length > 0) return false; // Já existem no Supabase
    if (typeof window === 'undefined') return false;
    try {
      const local = localStorage.getItem(businessCacheKey('podwave_initial_cash_balances'));
      if (!local) return false;
      const parsed = JSON.parse(local);
      const total =
        (Number(parsed.pix_banco) || 0) +
        (Number(parsed.dinheiro_caixa) || 0) +
        (Number(parsed.cartao_maquininha) || 0) +
        (Number(parsed.outro) || 0);
      return total > 0;
    } catch {
      return false;
    }
  }, [hasDismissedLocalBalancesPrompt, initialCashBalances]);

  const dismissLocalInitialBalancesPrompt = () => {
    setHasDismissedLocalBalancesPrompt(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('podwave_dismiss_local_balances_prompt', 'true');
    }
  };

  // Sincronização e persistência local (fallback offline e pré-migration) — exclusiva para sessões administrativas
  useEffect(() => {
    if (typeof window !== 'undefined' && isAdmin && businessCacheOwner === businessCacheIdentity) {
      try {
        localStorage.setItem(businessCacheKey('podwave_local_manual_sales'), JSON.stringify(manualSales));
      } catch (e) {
        console.warn('Erro ao salvar manualSales no localStorage:', e);
      }
    }
  }, [manualSales, isAdmin, businessCacheOwner, businessCacheIdentity]);

  useEffect(() => {
    if (typeof window !== 'undefined' && isAdmin && businessCacheOwner === businessCacheIdentity) {
      try {
        localStorage.setItem(businessCacheKey('podwave_local_manual_expenses'), JSON.stringify(manualExpenses));
      } catch (e) {
        console.warn('Erro ao salvar manualExpenses no localStorage:', e);
      }
    }
  }, [manualExpenses, isAdmin, businessCacheOwner, businessCacheIdentity]);

  useEffect(() => {
    if (typeof window !== 'undefined' && isAdmin && businessCacheOwner === businessCacheIdentity) {
      try {
        localStorage.setItem(businessCacheKey('podwave_local_merchandise_purchases'), JSON.stringify(merchandisePurchases));
      } catch (e) {
        console.warn('Erro ao salvar merchandisePurchases no localStorage:', e);
      }
    }
  }, [merchandisePurchases, isAdmin, businessCacheOwner, businessCacheIdentity]);

  useEffect(() => {
    if (typeof window !== 'undefined' && isAdmin && businessCacheOwner === businessCacheIdentity) {
      try {
        localStorage.setItem(businessCacheKey('podwave_local_cash_movements'), JSON.stringify(cashMovements));
      } catch (e) {
        console.warn('Erro ao salvar cashMovements no localStorage:', e);
      }
    }
  }, [cashMovements, isAdmin, businessCacheOwner, businessCacheIdentity]);

  useEffect(() => {
    if (typeof window !== 'undefined' && isAdmin && businessCacheOwner === businessCacheIdentity) {
      try {
        localStorage.setItem(businessCacheKey('podwave_local_manual_commitments'), JSON.stringify(manualCommitments));
      } catch (e) {
        console.warn('Erro ao salvar manualCommitments no localStorage:', e);
      }
    }
  }, [manualCommitments, isAdmin, businessCacheOwner, businessCacheIdentity]);

  // Helper para deduplicar pagamentos, recebimentos e parcelas por ID único
  const deduplicateById = <T extends { id?: string }>(arr?: T[]): T[] => {
    if (!Array.isArray(arr)) return [];
    const seen = new Set<string>();
    const result: T[] = [];
    for (const item of arr) {
      if (item && item.id) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          result.push(item);
        }
      } else if (item) {
        result.push(item);
      }
    }
    return result;
  };

  // Chave e estrutura para registro de exclusões pendentes (tombstones)
  const TOMBSTONES_STORAGE_KEY = businessCacheKey('podwave_deleted_record_tombstones');
  interface TombstoneRecord {
    id: string;
    table: 'sales' | 'expenses' | 'purchases' | 'movements' | 'commitments';
    deletedAt: string;
  }

  const getTombstones = (): TombstoneRecord[] => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(TOMBSTONES_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const addTombstone = (id: string, table: TombstoneRecord['table']) => {
    if (typeof window === 'undefined') return;
    try {
      const current = getTombstones().filter((t) => t.id !== id);
      current.push({ id, table, deletedAt: new Date().toISOString() });
      localStorage.setItem(TOMBSTONES_STORAGE_KEY, JSON.stringify(current));
    } catch (e) {
      console.warn('Erro ao salvar tombstone:', e);
    }
  };

  const removeTombstone = (id: string) => {
    if (typeof window === 'undefined') return;
    try {
      const updated = getTombstones().filter((t) => t.id !== id);
      localStorage.setItem(TOMBSTONES_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Erro ao remover tombstone:', e);
    }
  };

  const clearBusinessDataInMemory = () => {
    setManualSales([]);
    setManualExpenses([]);
    setMerchandisePurchases([]);
    setCashMovements([]);
    setInitialCashBalances([]);
    setManualCommitments([]);
  };

  const hydrateLocalBusinessDataForAdmin = () => {
    if (typeof window === 'undefined') return;
    try {
      const logs = localStorage.getItem(ACTIVITY_LOGS_STORAGE_KEY);
      setActivityLogs(logs ? JSON.parse(logs) : []);
      const s = localStorage.getItem(businessCacheKey('podwave_local_manual_sales'));
      setManualSales(s ? JSON.parse(s) : []);
      const e = localStorage.getItem(businessCacheKey('podwave_local_manual_expenses'));
      setManualExpenses(e ? JSON.parse(e) : []);
      const p = localStorage.getItem(businessCacheKey('podwave_local_merchandise_purchases'));
      setMerchandisePurchases(p ? JSON.parse(p) : []);
      const m = localStorage.getItem(businessCacheKey('podwave_local_cash_movements'));
      setCashMovements(m ? JSON.parse(m) : []);
      const c = localStorage.getItem(businessCacheKey('podwave_local_manual_commitments'));
      setManualCommitments(c ? JSON.parse(c) : []);
    } catch (err) {
      console.warn('Erro ao restaurar cache local administrativo:', err);
    }
  };

  // Helper de mesclagem resiliente: preserva dados remotos, não ressuscita itens deletados (tombstones) e resolve conflitos por timestamp
  const mergeFinancialRecords = <T extends { id: string; updatedAt?: string; _syncStatus?: SyncStatus }>(
    remoteItems: T[] | null,
    currentLocalItems: T[]
  ): T[] => {
    const tombstones = getTombstones().map((t) => t.id);
    const tombstoneSet = new Set(tombstones);

    if (!remoteItems || remoteItems.length === 0) {
      // Se não há dados remotos ou a tabela ainda não foi criada, preserva os locais (exceto deletados) marcando como pendentes
      return currentLocalItems
        .filter((item) => !tombstoneSet.has(item.id))
        .map((item) => ({
          ...item,
          _syncStatus: item._syncStatus || 'pending_sync',
        }));
    }

    const map = new Map<string, T>();
    // 1. Carrega itens do Supabase com status 'synced', excluindo registros que possuem tombstone de exclusão local
    remoteItems.forEach((r) => {
      if (!tombstoneSet.has(r.id)) {
        map.set(r.id, { ...r, _syncStatus: 'synced', _syncError: undefined });
      }
    });

    // 2. Preserva itens locais com identificadores únicos pendentes de sincronização
    currentLocalItems.forEach((loc) => {
      if (tombstoneSet.has(loc.id)) {
        return; // não ressuscita registros deletados
      }
      if (loc._syncStatus === 'pending_sync' || loc._syncStatus === 'sync_error') {
        const existingRemote = map.get(loc.id);
        if (existingRemote && existingRemote.updatedAt && loc.updatedAt) {
          // Se a alteração local for mais recente ou simultânea, preserva a versão local pendente de envio
          if (new Date(loc.updatedAt) >= new Date(existingRemote.updatedAt)) {
            map.set(loc.id, loc);
          }
        } else {
          // Versão local pendente tem prioridade para ser sincronizada
          map.set(loc.id, loc);
        }
      }
    });

    return Array.from(map.values());
  };

  const [isSyncingPending, setIsSyncingPending] = useState<boolean>(false);

  const refreshSaleStock = async () => {
    try {
      const stock = await fetchStockAvailability();
      setModels((prev) => prev.map((m) => ({...m, flavors:m.flavors.map((f) => {
        const current = stock.find((s) => s.id===f.id && s.modelId===m.id);
        return current ? {...f,demoQuantity:current.quantity,inStock:current.inStock,updatedAt:new Date().toISOString()} : f;
      })})));
    } catch { toast.warning('Venda confirmada. Recarregue o catálogo para atualizar a exibição do estoque.'); }
  };

  const fetchBusinessData = async () => {
    // Isolamento estrito de sessão: apenas usuários com privilégio de administrador carregam dados financeiros
    if (!isAdmin) {
      return;
    }
    const requestedIdentity = currentUser?.id;
    const requestedProject = supabaseCreds.url;
    setIsLoadingBusinessData(true);
    try {
      const [sales, expenses, purchases, movements, initialBalances, commitments] = await Promise.all([
        fetchManualSalesFromSupabase(),
        fetchManualExpensesFromSupabase(),
        fetchMerchandisePurchasesFromSupabase(),
        fetchCashMovementsFromSupabase(),
        fetchInitialCashBalancesFromSupabase(),
        fetchManualCommitmentsFromSupabase(),
      ]);

      const identity = authenticatedIdentityRef.current;
      if (!identity || identity.id !== requestedIdentity || !['owner','admin'].includes(identity.role) || getSupabaseCredentials().url !== requestedProject) return;
      setManualSales((prev) => mergeFinancialRecords(sales, prev));
      setManualExpenses((prev) => mergeFinancialRecords(expenses, prev));
      setMerchandisePurchases((prev) => mergeFinancialRecords(purchases, prev));
      setCashMovements((prev) => mergeFinancialRecords(movements, prev));
      setInitialCashBalances((prev) => mergeFinancialRecords(initialBalances, prev));
      setManualCommitments((prev) => mergeFinancialRecords(commitments, prev));
    } catch (e) {
      console.warn('[Meu Negócio] Aviso ao sincronizar com Supabase:', e);
    } finally {
      setIsLoadingBusinessData(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      hydrateLocalBusinessDataForAdmin();
      setBusinessCacheOwner(businessCacheIdentity);
      if (supabaseStatus === 'connected' || Boolean(activeSupabaseClient)) {
        fetchBusinessData();
      }
    } else {
      setBusinessCacheOwner(null);
      setAllUsers([]);
      setActivityLogs([]);
      clearBusinessDataInMemory();
    }
  }, [isAdmin, currentUser?.id, supabaseCreds.url, supabaseStatus, activeSupabaseClient]);

  const saveManualSale = async (sale: ManualSaleEntry): Promise<{ success: boolean; error?: string }> => {
    const cleanSale: ManualSaleEntry = {
      ...sale,
      items: deduplicateById(sale.items),
      receipts: deduplicateById(sale.receipts),
      installments: deduplicateById(sale.installments),
    };
    const result = await saveSaleWithStock(cleanSale);
    if (!result.success) {
      addActivityLog({action:'ERRO_BANCO_DADOS',actionLabel:'Venda não confirmada',entity:'manual_sales',entityName:cleanSale.id,details:result.error || 'Falha ao conferir estoque.',status:'erro'});
      return { success: false, error: result.error };
    }
    const now = new Date().toISOString();
    const trackedSale: ManualSaleEntry = {
      ...cleanSale,
      stockRequestId: undefined,
      stockManaged: result.stockManaged,
      stockRevision: result.stockRevision,
      _syncStatus: 'synced',
      _syncError: undefined,
      _lastSyncAttempt: now,
    };

    setManualSales((prev) => {
      const idx = prev.findIndex((s) => s.id === trackedSale.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = trackedSale;
        return updated;
      }
      return [trackedSale, ...prev];
    });

    toast.success('Venda registrada com sucesso no Supabase!');
    await refreshSaleStock();
    return { success: true };
  };

  const removeManualSale = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const ok = await deleteManualSaleFromSupabase(id);
    if (!ok) {
      const error = 'O banco não confirmou a exclusão e a devolução do estoque. Recarregue os dados e tente novamente.';
      toast.error('Venda preservada',error);
      return { success:false,error };
    }
    setManualSales((prev) => prev.filter((s) => s.id !== id));
    removeTombstone(id);
    toast.info('Venda removida com sucesso.');
    await refreshSaleStock();
    return { success: true };
  };

  const saveManualExpense = async (expense: ManualExpenseEntry): Promise<{ success: boolean; error?: string }> => {
    const sanitizedExpense: ManualExpenseEntry = {
      ...expense,
      payments: deduplicateById(expense.payments || []),
      installments: deduplicateById(expense.installments || []),
    };
    const ok = await saveManualExpenseToSupabase(sanitizedExpense);
    const now = new Date().toISOString();
    const trackedExpense: ManualExpenseEntry = {
      ...sanitizedExpense,
      _syncStatus: ok ? 'synced' : 'pending_sync',
      _syncError: ok ? undefined : 'Pendente de sincronização com o banco de dados Supabase.',
      _lastSyncAttempt: now,
    };

    setManualExpenses((prev) => {
      const idx = prev.findIndex((e) => e.id === trackedExpense.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = trackedExpense;
        return updated;
      }
      return [trackedExpense, ...prev];
    });

    if (!ok) {
      toast.info('Despesa salva localmente (Pendente de sincronização com o Supabase).');
      return { success: true };
    }
    toast.success('Despesa registrada com sucesso no Supabase!');
    return { success: true };
  };

  const removeManualExpense = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const ok = await deleteManualExpenseFromSupabase(id);
    setManualExpenses((prev) => prev.filter((e) => e.id !== id));
    if (!ok) {
      addTombstone(id, 'expenses');
      toast.info('Despesa removida localmente (exclusão pendente no Supabase).');
      return { success: true };
    }
    removeTombstone(id);
    toast.info('Despesa removida.');
    return { success: true };
  };

  const saveMerchandisePurchase = async (purchase: MerchandisePurchaseEntry): Promise<{ success: boolean; error?: string }> => {
    const sanitizedPurchase: MerchandisePurchaseEntry = {
      ...purchase,
      items: deduplicateById(purchase.items || []),
      payments: deduplicateById(purchase.payments || []),
      installments: deduplicateById(purchase.installments || []),
    };
    const ok = await saveMerchandisePurchaseToSupabase(sanitizedPurchase);
    const now = new Date().toISOString();
    const trackedPurchase: MerchandisePurchaseEntry = {
      ...sanitizedPurchase,
      _syncStatus: ok ? 'synced' : 'pending_sync',
      _syncError: ok ? undefined : 'Pendente de sincronização com o banco de dados Supabase.',
      _lastSyncAttempt: now,
    };

    setMerchandisePurchases((prev) => {
      const idx = prev.findIndex((p) => p.id === trackedPurchase.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = trackedPurchase;
        return updated;
      }
      return [trackedPurchase, ...prev];
    });

    if (!ok) {
      toast.info('Compra salva localmente (Pendente de sincronização com o Supabase).');
      return { success: true };
    }
    toast.success('Compra de mercadorias salva com sucesso!');
    return { success: true };
  };

  const removeMerchandisePurchase = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const ok = await deleteMerchandisePurchaseFromSupabase(id);
    setMerchandisePurchases((prev) => prev.filter((p) => p.id !== id));
    if (!ok) {
      addTombstone(id, 'purchases');
      toast.info('Compra removida localmente (exclusão pendente no Supabase).');
      return { success: true };
    }
    removeTombstone(id);
    toast.info('Compra de mercadoria removida.');
    return { success: true };
  };

  const saveCashMovement = async (movement: CashMovementEntry): Promise<{ success: boolean; error?: string }> => {
    const ok = await saveCashMovementToSupabase(movement);
    const now = new Date().toISOString();
    const trackedMovement: CashMovementEntry = {
      ...movement,
      _syncStatus: ok ? 'synced' : 'pending_sync',
      _syncError: ok ? undefined : 'Pendente de sincronização com o banco de dados Supabase.',
      _lastSyncAttempt: now,
    };

    setCashMovements((prev) => {
      const idx = prev.findIndex((m) => m.id === trackedMovement.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = trackedMovement;
        return updated;
      }
      return [trackedMovement, ...prev];
    });

    if (!ok) {
      toast.info('Movimentação salva localmente (Pendente de sincronização com o Supabase).');
      return { success: true };
    }
    toast.success('Movimentação de caixa registrada!');
    return { success: true };
  };

  const removeCashMovement = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const ok = await deleteCashMovementFromSupabase(id);
    setCashMovements((prev) => prev.filter((m) => m.id !== id));
    if (!ok) {
      addTombstone(id, 'movements');
      toast.info('Movimentação removida localmente (exclusão pendente no Supabase).');
      return { success: true };
    }
    removeTombstone(id);
    toast.info('Movimentação de caixa removida.');
    return { success: true };
  };

  const saveInitialCashBalances = async (
    config: InitialCashBalanceConfig,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const defaultRef = config.referenceDate || `${new Date().getFullYear()}-01-01`;
    const now = new Date().toISOString();
    const records: InitialChannelBalanceRecord[] = [
      {
        id: 'init_pix_banco',
        accountChannel: 'pix_banco',
        amount: Number(config.pix_banco) || 0,
        referenceDate: config.channelReferenceDates?.pix_banco || defaultRef,
        notes: notes || 'Saldo inicial Pix / Banco',
        _syncStatus: 'pending_sync',
        _lastSyncAttempt: now,
      },
      {
        id: 'init_dinheiro_caixa',
        accountChannel: 'dinheiro_caixa',
        amount: Number(config.dinheiro_caixa) || 0,
        referenceDate: config.channelReferenceDates?.dinheiro_caixa || defaultRef,
        notes: notes || 'Saldo inicial Dinheiro Físico',
        _syncStatus: 'pending_sync',
        _lastSyncAttempt: now,
      },
      {
        id: 'init_cartao_maquininha',
        accountChannel: 'cartao_maquininha',
        amount: Number(config.cartao_maquininha) || 0,
        referenceDate: config.channelReferenceDates?.cartao_maquininha || defaultRef,
        notes: notes || 'Saldo inicial Cartão / Maquininha',
        _syncStatus: 'pending_sync',
        _lastSyncAttempt: now,
      },
      {
        id: 'init_outro',
        accountChannel: 'outro',
        amount: Number(config.outro) || 0,
        referenceDate: config.channelReferenceDates?.outro || defaultRef,
        notes: notes || 'Saldo inicial Outro Canal',
        _syncStatus: 'pending_sync',
        _lastSyncAttempt: now,
      },
    ];

    // Persistir no Supabase
    const ok = await saveInitialCashBalancesToSupabase(records);
    const finalRecords = records.map((r) => ({
      ...r,
      _syncStatus: ok ? ('synced' as const) : ('pending_sync' as const),
      _syncError: ok ? undefined : 'Pendente de sincronização com o banco de dados Supabase.',
    }));

    if (!ok) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(businessCacheKey('podwave_initial_cash_balances'), JSON.stringify(config));
      }
      setInitialCashBalances(finalRecords);
      toast.info('Saldos iniciais salvos localmente (Pendente de sincronização com o Supabase).');
      return { success: true };
    }

    // Sucesso no Supabase
    setInitialCashBalances(finalRecords);
    if (typeof window !== 'undefined') {
      localStorage.setItem(businessCacheKey('podwave_initial_cash_balances'), JSON.stringify(config));
    }
    toast.success('Saldos iniciais salvos no Supabase com sucesso!');
    return { success: true };
  };

  const importLocalInitialBalancesToSupabase = async (): Promise<{ success: boolean; message: string }> => {
    if (typeof window === 'undefined') {
      return { success: false, message: 'Ambiente inválido.' };
    }

    try {
      const localStr = localStorage.getItem(businessCacheKey('podwave_initial_cash_balances'));
      if (!localStr) {
        return { success: false, message: 'Nenhum saldo local encontrado para importação.' };
      }
      const parsed = JSON.parse(localStr);
      const res = await saveInitialCashBalances(parsed, 'Importado de configuração local');
      if (res.success) {
        dismissLocalInitialBalancesPrompt();
        return { success: true, message: 'Saldos locais importados para o Supabase com sucesso!' };
      }
      return { success: false, message: res.error || 'Erro ao importar para o Supabase.' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Falha ao processar importação.' };
    }
  };

  const saveManualCommitment = async (
    commitment: ManualCommitmentEntry
  ): Promise<{ success: boolean; error?: string }> => {
    const sanitizedCommitment: ManualCommitmentEntry = {
      ...commitment,
      payments: deduplicateById(commitment.payments || []),
      installments: deduplicateById(commitment.installments || []),
    };
    const ok = await saveManualCommitmentToSupabase(sanitizedCommitment);
    const now = new Date().toISOString();
    const trackedCommitment: ManualCommitmentEntry = {
      ...sanitizedCommitment,
      _syncStatus: ok ? 'synced' : 'pending_sync',
      _syncError: ok ? undefined : 'Pendente de sincronização com o banco de dados Supabase.',
      _lastSyncAttempt: now,
    };

    setManualCommitments((prev) => {
      const idx = prev.findIndex((c) => c.id === trackedCommitment.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = trackedCommitment;
        return updated;
      }
      return [trackedCommitment, ...prev];
    });

    if (!ok) {
      toast.info('Compromisso salvo localmente (Pendente de sincronização com o Supabase).');
      return { success: true };
    }
    toast.success('Compromisso financeiro salvo com sucesso!');
    return { success: true };
  };

  const removeManualCommitment = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const result = await deleteCommitmentConfirmed(id);
    if (!result.success) {
      addActivityLog({action:'ERRO_BANCO_DADOS',actionLabel:'Exclusão de conta não confirmada',entity:'manual_commitments',entityName:id,details:result.error || 'Registro preservado.',status:'erro'});
      return result;
    }
    setManualCommitments((prev) => prev.filter((c) => c.id !== id));
    removeTombstone(id);
    toast.info('Compromisso financeiro excluído.');
    return { success: true };
  };

  // Sincronização em lote de todos os registros pendentes, com erro ou tombstones de exclusão
  const syncPendingFinancialData = async (): Promise<{ success: boolean; synced: number; failed: number }> => {
    setIsSyncingPending(true);
    let synced = 0;
    let failed = 0;
    const now = new Date().toISOString();

    try {
      // 0. Exclusões pendentes (tombstones de itens deletados localmente)
      const pendingTombstones = getTombstones();
      for (const tomb of pendingTombstones) {
        let deleted = false;
        try {
          if (tomb.table === 'sales') {
            deleted = await deleteManualSaleFromSupabase(tomb.id);
          } else if (tomb.table === 'expenses') {
            deleted = await deleteManualExpenseFromSupabase(tomb.id);
          } else if (tomb.table === 'purchases') {
            deleted = await deleteMerchandisePurchaseFromSupabase(tomb.id);
          } else if (tomb.table === 'movements') {
            deleted = await deleteCashMovementFromSupabase(tomb.id);
          } else if (tomb.table === 'commitments') {
            deleted = await deleteManualCommitmentFromSupabase(tomb.id);
          }
        } catch {
          deleted = false;
        }

        if (deleted) {
          removeTombstone(tomb.id);
          synced++;
        } else {
          failed++;
        }
      }

      // 1. Vendas Manuais
      const pendingSales = manualSales.filter((s) => s._syncStatus !== 'synced');
      for (const sale of pendingSales) {
        const stockResult = await saveSaleWithStock(sale);
        const ok = stockResult.success;
        if (ok) {
          setManualSales((prev) =>
            prev.map((s) => (s.id === sale.id ? { ...s, stockManaged:stockResult.stockManaged,stockRevision:stockResult.stockRevision, _syncStatus: 'synced', _syncError: undefined, _lastSyncAttempt: now } : s))
          );
          synced++;
        } else {
          // Se a venda foi previamente excluída no Supabase (tombstone registrada no log de auditoria), purga do estado local para não gerar loop
          if (stockResult.error && /venda foi excluída|venda excluída/i.test(stockResult.error)) {
            setManualSales((prev) => prev.filter((s) => s.id !== sale.id));
            removeTombstone(sale.id);
            continue;
          }
          setManualSales((prev) =>
            prev.map((s) => (s.id === sale.id ? { ...s, _syncStatus: 'sync_error', _syncError: 'Falha ao sincronizar com Supabase', _lastSyncAttempt: now } : s))
          );
          failed++;
        }
      }

      // 2. Gastos Manuais
      const pendingExpenses = manualExpenses.filter((e) => e._syncStatus !== 'synced');
      for (const expense of pendingExpenses) {
        const ok = await saveManualExpenseToSupabase(expense);
        if (ok) {
          setManualExpenses((prev) =>
            prev.map((e) => (e.id === expense.id ? { ...e, _syncStatus: 'synced', _syncError: undefined, _lastSyncAttempt: now } : e))
          );
          synced++;
        } else {
          setManualExpenses((prev) =>
            prev.map((e) => (e.id === expense.id ? { ...e, _syncStatus: 'sync_error', _syncError: 'Falha ao sincronizar com Supabase', _lastSyncAttempt: now } : e))
          );
          failed++;
        }
      }

      // 3. Compras de Mercadorias
      const pendingPurchases = merchandisePurchases.filter((p) => p._syncStatus !== 'synced');
      for (const purchase of pendingPurchases) {
        const ok = await saveMerchandisePurchaseToSupabase(purchase);
        if (ok) {
          setMerchandisePurchases((prev) =>
            prev.map((p) => (p.id === purchase.id ? { ...p, _syncStatus: 'synced', _syncError: undefined, _lastSyncAttempt: now } : p))
          );
          synced++;
        } else {
          setMerchandisePurchases((prev) =>
            prev.map((p) => (p.id === purchase.id ? { ...p, _syncStatus: 'sync_error', _syncError: 'Falha ao sincronizar com Supabase', _lastSyncAttempt: now } : p))
          );
          failed++;
        }
      }

      // 4. Fluxo de Caixa
      const pendingMovements = cashMovements.filter((m) => m._syncStatus !== 'synced');
      for (const movement of pendingMovements) {
        const ok = await saveCashMovementToSupabase(movement);
        if (ok) {
          setCashMovements((prev) =>
            prev.map((m) => (m.id === movement.id ? { ...m, _syncStatus: 'synced', _syncError: undefined, _lastSyncAttempt: now } : m))
          );
          synced++;
        } else {
          setCashMovements((prev) =>
            prev.map((m) => (m.id === movement.id ? { ...m, _syncStatus: 'sync_error', _syncError: 'Falha ao sincronizar com Supabase', _lastSyncAttempt: now } : m))
          );
          failed++;
        }
      }

      // 5. Saldos Iniciais
      const pendingBalances = initialCashBalances.filter((b) => b._syncStatus !== 'synced');
      if (pendingBalances.length > 0) {
        const ok = await saveInitialCashBalancesToSupabase(pendingBalances);
        if (ok) {
          setInitialCashBalances((prev) =>
            prev.map((b) => ({ ...b, _syncStatus: 'synced', _syncError: undefined, _lastSyncAttempt: now }))
          );
          synced += pendingBalances.length;
        } else {
          setInitialCashBalances((prev) =>
            prev.map((b) => ({ ...b, _syncStatus: 'sync_error', _syncError: 'Falha ao salvar saldos iniciais', _lastSyncAttempt: now }))
          );
          failed += pendingBalances.length;
        }
      }

      // 6. Compromissos
      const pendingCommitments = manualCommitments.filter((c) => c._syncStatus !== 'synced');
      for (const commitment of pendingCommitments) {
        const ok = await saveManualCommitmentToSupabase(commitment);
        if (ok) {
          setManualCommitments((prev) =>
            prev.map((c) => (c.id === commitment.id ? { ...c, _syncStatus: 'synced', _syncError: undefined, _lastSyncAttempt: now } : c))
          );
          synced++;
        } else {
          setManualCommitments((prev) =>
            prev.map((c) => (c.id === commitment.id ? { ...c, _syncStatus: 'sync_error', _syncError: 'Falha ao sincronizar com Supabase', _lastSyncAttempt: now } : c))
          );
          failed++;
        }
      }

      if (synced > 0) {
        await refreshSaleStock();
        toast.success(`${synced} registro(s) sincronizado(s) com sucesso no Supabase!`);
      }
      if (failed > 0) {
        toast.warning(`${failed} registro(s) não puderam ser sincronizados. Verifique credenciais ou migrations.`);
      }

      return { success: failed === 0, synced, failed };
    } finally {
      setIsSyncingPending(false);
    }
  };

  const pendingSyncCount = React.useMemo(() => {
    const s = manualSales.filter((i) => i._syncStatus === 'pending_sync' || i._syncStatus === 'sync_error').length;
    const e = manualExpenses.filter((i) => i._syncStatus === 'pending_sync' || i._syncStatus === 'sync_error').length;
    const p = merchandisePurchases.filter((i) => i._syncStatus === 'pending_sync' || i._syncStatus === 'sync_error').length;
    const m = cashMovements.filter((i) => i._syncStatus === 'pending_sync' || i._syncStatus === 'sync_error').length;
    const b = initialCashBalances.filter((i) => i._syncStatus === 'pending_sync' || i._syncStatus === 'sync_error').length;
    const c = manualCommitments.filter((i) => i._syncStatus === 'pending_sync' || i._syncStatus === 'sync_error').length;
    const t = getTombstones().length;
    return s + e + p + m + b + c + t;
  }, [manualSales, manualExpenses, merchandisePurchases, cashMovements, initialCashBalances, manualCommitments]);

  return (
    <CatalogContext.Provider
      value={{
        brands,
        models,
        banners,
        settings,
        coupons,
        supabaseClient: activeSupabaseClient,
        supabaseUrl: supabaseCreds.url,
        supabaseAnonKey: supabaseCreds.anonKey,
        isSupabaseConfigured: Boolean(activeSupabaseClient || supabaseCreds.isConfigured),
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
        isAdmin,
        currentUser,
        isOwner,
        isVip,
        isCustomer,
        allUsers,
        isLoadingUsers,
        fetchAllUsers,
        updateUserRole,
        updateUserLoyalty,
        createUserWithRole,
        deleteUser,
        vipDiscountAmount,
        vipDiscountRate,
        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        isProfileModalOpen,
        openProfileModal,
        closeProfileModal,
        loginUser,
        registerUser,
        signInWithGoogle,
        sendOtpCode,
        verifyOtpCode,
        signInWithPasskey,
        registerPasskey,
        listPasskeys,
        updatePasskeyName,
        deletePasskey,
        checkPasskeySupport,
        logoutUser,
        resetPassword,
        updateCustomerProfile,
        recordCustomerOrder,
        allCatalogOrders,
        isLoadingCatalogOrders,
        catalogOrdersError,
        fetchAllCatalogOrders,
        updateCatalogOrderStatus,
        updateCatalogOrderPayment,
        grantLoyaltyStampForOrder,
        recordOrderInFinancialSales,
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
        activityLogs,
        addActivityLog,
        clearActivityLogs,
        refreshActivityLogs,
        manualSales,
        manualExpenses,
        merchandisePurchases,
        cashMovements,
        isLoadingBusinessData,
        fetchBusinessData,
        saveManualSale,
        removeManualSale,
        saveManualExpense,
        removeManualExpense,
        saveMerchandisePurchase,
        removeMerchandisePurchase,
        saveCashMovement,
        removeCashMovement,
        initialCashBalances,
        initialCashConfig,
        saveInitialCashBalances,
        hasLocalInitialBalancesPendingMigration,
        importLocalInitialBalancesToSupabase,
        dismissLocalInitialBalancesPrompt,
        manualCommitments,
        saveManualCommitment,
        removeManualCommitment,
        pendingSyncCount,
        isSyncingPending,
        syncPendingFinancialData,
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

