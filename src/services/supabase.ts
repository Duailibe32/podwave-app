import { isPublicSupabaseConfig } from '../utils/publicSupabaseConfig';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Brand,
  ProductModel,
  FlavorVariant,
  BannerSlide,
  StoreSettings,
  Coupon,
  UserProfile,
  UserRole,
  LoyaltyCardData,
  CustomerOrderHistoryItem,
  CustomerAddress,
  ActivityLogEntry,
  ManualSaleEntry,
  ManualExpenseEntry,
  MerchandisePurchaseEntry,
  CashMovementEntry,
  InitialChannelBalanceRecord,
  ManualCommitmentEntry,
  PasskeyItem,
  ProgressiveDiscountConfig,
  ComplementaryAddonItem,
} from '../types/catalog';

// Storage keys for runtime Supabase credentials if configured via UI
const SUPABASE_URL_KEY = 'podwave_supabase_url';
const SUPABASE_ANON_KEY = 'podwave_supabase_anon_key';

export function getSupabaseCredentials(): { url: string; anonKey: string; isConfigured: boolean } {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const storedUrl = typeof window !== 'undefined' ? localStorage.getItem(SUPABASE_URL_KEY) || '' : '';
  const storedKey = typeof window !== 'undefined' ? localStorage.getItem(SUPABASE_ANON_KEY) || '' : '';

  const rawUrl = (envUrl || storedUrl || '').trim();
  let url = rawUrl;
  try {
    if (rawUrl) {
      url = new URL(rawUrl).origin;
    }
  } catch {
    url = rawUrl;
  }
  const anonKey = (envKey || storedKey || '').trim();

  const isConfigured = isPublicSupabaseConfig(url, anonKey);

  return { url, anonKey, isConfigured };
}

export function saveSupabaseCredentials(url: string, anonKey: string): boolean {
  let cleanUrl = url.trim();
  try {
    if (cleanUrl) {
      cleanUrl = new URL(cleanUrl).origin;
    }
  } catch {
    cleanUrl = url.trim();
  }
  const cleanKey = anonKey.trim();
  if (!isPublicSupabaseConfig(cleanUrl, cleanKey)) return false;
  let envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  try {
    if (envUrl) {
      envUrl = new URL(envUrl).origin;
    }
  } catch {
    // keep raw envUrl
  }
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
  if ((envUrl && envUrl !== cleanUrl) || (envKey && envKey !== cleanKey)) return false;
  if (typeof window !== 'undefined') {
    localStorage.setItem(SUPABASE_URL_KEY, cleanUrl);
    localStorage.setItem(SUPABASE_ANON_KEY, cleanKey);
    // getSupabaseClient replaces the cached client only when the effective configuration changes.
  }
  return true;
}

export function clearSupabaseCredentials() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SUPABASE_URL_KEY);
    localStorage.removeItem(SUPABASE_ANON_KEY);
    supabaseInstance?.auth.stopAutoRefresh();
    if (supabaseInstance) void supabaseInstance.removeAllChannels();
    supabaseInstance = null;
  }
}

let supabaseInstance: SupabaseClient | null = null;
let supabaseInstanceConfig = '';

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey, isConfigured } = getSupabaseCredentials();

  if (!isConfigured) {
    return null;
  }

  const configId = url + ':' + anonKey;
  if (!supabaseInstance || supabaseInstanceConfig !== configId) {
    if (supabaseInstance) {
      supabaseInstance.auth.stopAutoRefresh();
      void supabaseInstance.removeAllChannels();
    }
    try {
      supabaseInstanceConfig = configId;
      supabaseInstance = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    } catch (e) {
      console.warn('Falha ao inicializar cliente Supabase:', e);
      return null;
    }
  }

  return supabaseInstance;
}

/**
 * Detecta se o erro retornado pelo Supabase / PostgREST indica que a tabela ainda não foi criada
 * (por exemplo, código PGRST205 no PostgREST 12+ ou 42P01 no PostgreSQL).
 */
export function isMissingTableError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string };
  const code = String(e.code || '');
  const msg = String(e.message || '').toLowerCase();
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    msg.includes('not find the table') ||
    (msg.includes('relation') && msg.includes('does not exist'))
  );
}

export interface SupabaseTestResult {
  success: boolean;
  message: string;
  tablesExist: boolean;
}

/**
 * Testa a conexão com o Supabase verificando a tabela de configurações ou marcas
 */
export async function testSupabaseConnection(): Promise<SupabaseTestResult> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      tablesExist: false,
      message: 'Supabase não configurado. Forneça a URL do projeto e a chave anônima (anon public key).',
    };
  }

  try {
    const { error } = await client.from('brands').select('id').limit(1);
    if (error) {
      if (isMissingTableError(error)) {
        return {
          success: true,
          tablesExist: false,
          message: 'Conectado ao Supabase! As tabelas ainda precisam ser criadas. Execute a migration no SQL Editor.',
        };
      }
      return {
        success: false,
        tablesExist: false,
        message: `Erro do Supabase: ${error.message} (Código: ${error.code})`,
      };
    }

    return {
      success: true,
      tablesExist: true,
      message: 'Conexão com o Supabase estabelecida com sucesso e tabelas validadas!',
    };
  } catch (err) {
    if (isMissingTableError(err)) {
      return {
        success: true,
        tablesExist: false,
        message: 'Conectado ao Supabase! As tabelas ainda precisam ser criadas pelo SQL Editor.',
      };
    }
    return {
      success: false,
      tablesExist: false,
      message: err instanceof Error ? err.message : 'Falha na conexão com o Supabase.',
    };
  }
}

export interface SupabaseCatalogResult {
  data: {
    brands?: Brand[];
    models?: ProductModel[];
    banners?: BannerSlide[];
    coupons?: Coupon[];
    settings?: StoreSettings;
  } | null;
  tablesExist: boolean;
}

/**
 * Busca todo o catálogo a partir do Supabase (Brands, Models, Flavors, Banners, Coupons, Settings)
 */
export async function fetchCatalogFromSupabase(): Promise<SupabaseCatalogResult | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    // Buscar todas as entidades do catálogo em paralelo via Promise.all para eliminar latência em cascata
    const [
      brandsRes,
      modelsRes,
      flavorsRes,
      bannersRes,
      couponsRes,
      settingsRes,
    ] = await Promise.all([
      client.from('brands').select('*'),
      client.from('product_models').select('*'),
      client.from('flavor_variants').select('*'),
      client.from('banners').select('*'),
      client.from('coupons').select('*'),
      client
        .from('store_settings')
        .select('*'),
    ]);

    const potentialErrors = [
      brandsRes.error,
      modelsRes.error,
      flavorsRes.error,
      bannersRes.error,
      couponsRes.error,
    ].filter(Boolean);

    for (const err of potentialErrors) {
      if (err) {
        if (isMissingTableError(err)) {
          console.info('[Supabase] Conexão ativa, mas tabelas pendentes de migration.');
          return { data: null, tablesExist: false };
        }
        throw err;
      }
    }

    const brandsData = brandsRes.data;
    const modelsData = modelsRes.data;
    const flavorsData = flavorsRes.data;
    const bannersData = bannersRes.data;
    const couponsData = couponsRes.data;

    // Montar estrutura de modelos com os sabores aninhados
    const mappedBrands: Brand[] = (brandsData || []).map((b) => ({
      id: b.id,
      name: b.name,
      logoText: b.logo_text || b.name,
      featured: b.featured ?? true,
      logoUrl: b.logo_url || undefined,
      country: b.country || 'Global',
      description: b.description || '',
      cardColor: b.card_color || 'black',
    }));

    const flavorsByModel: Record<string, FlavorVariant[]> = {};
    (flavorsData || []).forEach((f) => {
      if (!flavorsByModel[f.model_id]) {
        flavorsByModel[f.model_id] = [];
      }
      flavorsByModel[f.model_id].push({
        id: f.id,
        name: f.name,
        colorHex: f.color_hex,
        iconEmoji: f.icon_emoji,
        inStock: f.in_stock,
        demoQuantity: f.demo_quantity,
        lowQuantityThreshold: f.low_quantity_threshold,
        customImage: f.custom_image || undefined,
        updatedAt: f.updated_at,
      });
    });

    const mappedModels: ProductModel[] = (modelsData || []).map((m) => ({
      id: m.id,
      brandId: m.brand_id,
      brandName: m.brand_name,
      modelName: m.model_name,
      puffs: m.puffs,
      puffsLabel: m.puffs_label,
      badge: m.badge || undefined,
      startingPrice: Number(m.starting_price),
      imageUrl: m.image_url || '/assets/images/logo.png',
      category: m.category,
      description: m.description || '',
      specs: {
        battery: m.battery || '650mAh USB-C',
        eLiquid: m.e_liquid || '16ml',
        nicotine: m.nicotine || '5% (50mg)',
        chargeType: m.charge_type || 'USB Tipo C Fast Charge',
        coil: m.coil || 'Dual Mesh Coil',
        airflow: m.airflow || undefined,
      },
      lowQuantityThreshold: m.low_quantity_threshold,
      active: m.active,
      flavors: flavorsByModel[m.id] || [],
    }));

    const mappedBanners: BannerSlide[] = (bannersData || []).map((bn) => ({
      id: bn.id,
      title: bn.title,
      subtitle: bn.subtitle,
      badge: bn.badge || undefined,
      tagline: bn.tagline || undefined,
      ctaText: bn.cta_text || 'Ver Produtos',
      ctaLink: bn.cta_link || '#catalogo',
      active: bn.active,
      imageUrl: bn.image_url,
      positionX: Number(bn.position_x) || 0,
      positionY: Number(bn.position_y) || 0,
      scale: Number(bn.scale) || 1,
      objectFit: bn.object_fit || 'contain',
      themeGradient: bn.theme_gradient || 'neon',
    }));

    const mappedCoupons: Coupon[] = (couponsData || []).map((c) => ({
      id: c.id,
      code: c.code,
      discountType: c.discount_type,
      value: Number(c.value),
      description: c.description || '',
      applicableModelId: c.applicable_model_id || 'all',
      applicableModelName: c.applicable_model_name || undefined,
      maxUses: c.max_uses || undefined,
      usedCount: c.used_count || 0,
      minOrderValue: Number(c.min_order_value) || 0,
      active: c.active,
    }));

    const settingsRows = Array.isArray(settingsRes.data)
      ? settingsRes.data
      : settingsRes.data
      ? [settingsRes.data]
      : [];
    const settingsData =
      settingsRows.find((r: any) => r.id === 'main') ||
      settingsRows.find((r: any) => r.id !== 'promotions_config') ||
      null;
    const promotionsRow = settingsRows.find((r: any) => r.id === 'promotions_config') || null;

    let parsedPromotions: {
      progressiveDiscountConfig?: ProgressiveDiscountConfig;
      complementaryAddons?: ComplementaryAddonItem[];
    } = {};

    if (promotionsRow?.legal_notice) {
      try {
        const parsed = JSON.parse(promotionsRow.legal_notice);
        if (parsed && typeof parsed === 'object') {
          parsedPromotions = parsed;
        }
      } catch {
        // ignore parse errors
      }
    }

    let mappedSettings: StoreSettings | undefined;
    if (settingsData || promotionsRow) {
      mappedSettings = {
        storeName: settingsData?.store_name || 'PodWave Catálogo',
        supportEmail: settingsData?.support_email || '',
        supportPhone: settingsData?.support_phone || '',
        whatsappNumber: settingsData?.whatsapp_number || '',
        legalNotice: settingsData?.legal_notice || '',
        themePreference: 'dark',
        progressiveDiscountConfig:
          (settingsData as any)?.progressive_discount_config ||
          parsedPromotions.progressiveDiscountConfig ||
          undefined,
        complementaryAddons:
          (settingsData as any)?.complementary_addons ||
          parsedPromotions.complementaryAddons ||
          undefined,
      };
    }

    return {
      data: {
        brands: mappedBrands,
        models: mappedModels,
        banners: mappedBanners,
        coupons: mappedCoupons,
        settings: mappedSettings,
      },
      tablesExist: true,
    };
  } catch (err) {
    if (isMissingTableError(err)) {
      console.info('[Supabase] Conexão ativa, aguardando execução da migration no SQL Editor.');
      return { data: null, tablesExist: false };
    }
    console.warn('[Supabase] Aviso ao buscar dados remotos:', err instanceof Error ? err.message : String(err));
    return null;
  }
}

/**
 * Sincroniza o catálogo local completo com as tabelas do Supabase (Upsert)
 */
export async function syncCatalogToSupabase(
  brands: Brand[],
  models: ProductModel[],
  banners: BannerSlide[],
  coupons: Coupon[],
  settings: StoreSettings
): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Supabase não conectado. Configure as credenciais na aba Supabase.',
    };
  }

  try {
    // 1. Upsert Brands
    const brandsPayload = brands.map((b) => ({
      id: b.id,
      name: b.name,
      logo_text: b.logoText || b.name,
      featured: b.featured ?? true,
      logo_url: b.logoUrl || null,
      country: b.country || 'Global',
      description: b.description || '',
      card_color: b.cardColor || 'black',
      updated_at: new Date().toISOString(),
    }));
    const { error: bErr } = await client.from('brands').upsert(brandsPayload);
    if (bErr) throw bErr;

    // 2. Upsert Models
    const modelsPayload = models.map((m) => ({
      id: m.id,
      brand_id: m.brandId,
      brand_name: m.brandName,
      model_name: m.modelName,
      puffs: m.puffs,
      puffs_label: m.puffsLabel,
      badge: m.badge || null,
      starting_price: m.startingPrice,
      image_url: m.imageUrl || null,
      category: m.category || 'Descartável Premium',
      description: m.description || '',
      battery: m.specs?.battery || '650mAh USB-C',
      e_liquid: m.specs?.eLiquid || '16ml',
      nicotine: m.specs?.nicotine || '5% (50mg)',
      charge_type: m.specs?.chargeType || 'USB Tipo C Fast Charge',
      coil: m.specs?.coil || 'Dual Mesh Coil',
      airflow: m.specs?.airflow || null,
      low_quantity_threshold: m.lowQuantityThreshold ?? 3,
      active: m.active ?? true,
      updated_at: new Date().toISOString(),
    }));
    const { error: mErr } = await client.from('product_models').upsert(modelsPayload);
    if (mErr) throw mErr;

    // 3. Upsert Flavors
    const allFlavors = models.flatMap((m) =>
      m.flavors.map((f) => ({
        id: f.id,
        model_id: m.id,
        name: f.name,
        color_hex: f.colorHex || '#9333EA',
        icon_emoji: f.iconEmoji || '🍇',
        in_stock: f.inStock !== false,
        demo_quantity: f.demoQuantity ?? null,
        low_quantity_threshold: f.lowQuantityThreshold ?? 3,
        custom_image: f.customImage || null,
        updated_at: f.updatedAt || new Date().toISOString(),
      }))
    );
    if (allFlavors.length > 0) {
      // Existing quantities are changed only by dedicated stock operations.
      // A stale catalog snapshot must never replenish products sold elsewhere.
      const { data: existing, error: readError } = await client.from('flavor_variants').select('id');
      if (readError) throw readError;
      const ids = new Set((existing || []).map((f) => f.id));
      const updates = allFlavors.filter((f) => ids.has(f.id)).map(({ demo_quantity, in_stock, ...metadata }) => metadata);
      const inserts = allFlavors.filter((f) => !ids.has(f.id));
      if (updates.length) {
        const { error } = await client.from('flavor_variants').upsert(updates);
        if (error) throw error;
      }
      if (inserts.length) {
        const { error } = await client.from('flavor_variants').insert(inserts);
        if (error) throw error;
      }
    }

    // 4. Upsert Banners
    const bannersPayload = banners.map((bn) => ({
      id: bn.id,
      title: bn.title,
      subtitle: bn.subtitle,
      badge: bn.badge || null,
      tagline: bn.tagline || null,
      cta_text: bn.ctaText || 'Ver Produtos',
      cta_link: bn.ctaLink || '#catalogo',
      active: bn.active ?? true,
      image_url: bn.imageUrl,
      position_x: bn.positionX || 0,
      position_y: bn.positionY || 0,
      scale: bn.scale || 1,
      object_fit: bn.objectFit || 'contain',
      theme_gradient: bn.themeGradient || 'neon',
      updated_at: new Date().toISOString(),
    }));
    const { error: bnErr } = await client.from('banners').upsert(bannersPayload);
    if (bnErr) throw bnErr;

    // 5. Upsert Coupons
    const couponsPayload = coupons.map((c) => ({
      id: c.id,
      code: c.code.trim().toUpperCase(),
      discount_type: c.discountType,
      value: c.value,
      description: c.description || null,
      applicable_model_id: c.applicableModelId || 'all',
      applicable_model_name: c.applicableModelName || null,
      max_uses: c.maxUses ?? null,
      used_count: c.usedCount || 0,
      min_order_value: c.minOrderValue || 0,
      active: c.active ?? true,
      updated_at: new Date().toISOString(),
    }));
    const { error: cErr } = await client.from('coupons').upsert(couponsPayload);
    if (cErr) throw cErr;

    // 6. Upsert Store Settings & Promotions Config
    const { error: sErr } = await client.from('store_settings').upsert({
      id: 'main',
      store_name: settings.storeName,
      support_email: settings.supportEmail,
      support_phone: settings.supportPhone,
      whatsapp_number: settings.whatsappNumber,
      legal_notice: settings.legalNotice,
      updated_at: new Date().toISOString(),
    });
    if (sErr) throw sErr;

    if (settings.progressiveDiscountConfig || settings.complementaryAddons) {
      await client.from('store_settings').upsert({
        id: 'promotions_config',
        store_name: 'PROMOTIONS_CONFIG',
        support_email: settings.supportEmail || '',
        support_phone: settings.supportPhone || '',
        whatsapp_number: settings.whatsappNumber || '',
        legal_notice: JSON.stringify({
          progressiveDiscountConfig: settings.progressiveDiscountConfig,
          complementaryAddons: settings.complementaryAddons,
        }),
        updated_at: new Date().toISOString(),
      });
    }

    return {
      success: true,
      message: 'Todos os dados do catálogo foram sincronizados com o Supabase com sucesso!',
    };
  } catch (err) {
    if (isMissingTableError(err)) {
      return {
        success: false,
        message: 'As tabelas ainda não foram criadas no banco Supabase! Vá até a seção "Migrations Oficiais & Execução SQL" abaixo, copie o código e execute no SQL Editor do seu projeto Supabase.',
      };
    }
    console.warn('[Supabase] Falha na sincronização:', err instanceof Error ? err.message : String(err));
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Falha na sincronização.',
    };
  }
}

/**
 * Salva as configurações da aba "Promoções" (Desconto Progressivo & Compre Junto) diretamente no banco Supabase
 */
export async function savePromotionsConfigToSupabase(
  progressiveDiscountConfig?: ProgressiveDiscountConfig,
  complementaryAddons?: ComplementaryAddonItem[]
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Cliente Supabase não configurado.' };
  }

  try {
    const payload = {
      id: 'promotions_config',
      store_name: 'PROMOTIONS_CONFIG',
      support_email: '',
      support_phone: '',
      whatsapp_number: '',
      legal_notice: JSON.stringify({
        progressiveDiscountConfig,
        complementaryAddons,
      }),
      updated_at: new Date().toISOString(),
    };

    const { error } = await client.from('store_settings').upsert(payload);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export interface SupabaseProfileDiagnostic {
  operation: 'upsert_profile' | 'read_profile' | 'update_role' | 'update_loyalty' | 'delete_profile';
  category:
    | 'ok'
    | 'unconfigured'
    | 'unauthenticated'
    | 'not_found'
    | 'missing_column'
    | 'permission_denied'
    | 'conflict'
    | 'constraint'
    | 'network_or_unknown';
  code?: string;
  message: string;
}

let lastSupabaseProfileDiagnostic: SupabaseProfileDiagnostic | null = null;

export function getLastSupabaseProfileDiagnostic(): SupabaseProfileDiagnostic | null {
  return lastSupabaseProfileDiagnostic;
}

function recordProfileDiagnostic(diag: SupabaseProfileDiagnostic): void {
  lastSupabaseProfileDiagnostic = diag;
}

export function isMissingColumnError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string };
  const code = String(e.code || '');
  const msg = String(e.message || '').toLowerCase();
  return (
    code === '42703' ||
    code === 'PGRST204' ||
    (msg.includes('column') && (msg.includes('does not exist') || msg.includes('schema cache')))
  );
}

function classifyPostgrestError(
  operation: SupabaseProfileDiagnostic['operation'],
  err: unknown,
  fallbackMessage: string
): SupabaseProfileDiagnostic {
  const e = (err && typeof err === 'object' ? err : {}) as { code?: string; message?: string };
  const code = String(e.code || '');
  const rawMsg = String(e.message || fallbackMessage);
  if (isMissingColumnError(err)) {
    return {
      operation,
      category: 'missing_column',
      code: code || '42703',
      message: `Coluna ausente no banco de dados (${rawMsg}). Isso é uma diferença de esquema no banco e não falta de cargo de Proprietário.`,
    };
  }
  if (code === '42501' || rawMsg.toLowerCase().includes('permission') || rawMsg.toLowerCase().includes('somente o proprietario')) {
    return {
      operation,
      category: 'permission_denied',
      code: code || '42501',
      message: `Operação recusada pelas regras de segurança do banco (${rawMsg}).`,
    };
  }
  if (code === '23502' || code === '23505' || code === '23514') {
    return {
      operation,
      category: 'constraint',
      code,
      message: `Restrição de integridade do banco (${code}: ${rawMsg}).`,
    };
  }
  return {
    operation,
    category: 'network_or_unknown',
    code: code || undefined,
    message: rawMsg || fallbackMessage,
  };
}

export function formatSupabaseProfileErrorMessage(defaultMessage: string): string {
  if (!lastSupabaseProfileDiagnostic || lastSupabaseProfileDiagnostic.category === 'ok') {
    return defaultMessage;
  }
  return lastSupabaseProfileDiagnostic.message || defaultMessage;
}

/**
 * Grava um novo registro de auditoria no Supabase (tabela audit_logs)
 */
export async function saveActivityLogToSupabase(entry: ActivityLogEntry): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const payload = {
      action: entry.action,
      entity: entry.entity,
      details: JSON.stringify({
        actionLabel: entry.actionLabel,
        entityName: entry.entityName,
        details: entry.details,
        status: entry.status,
        errorMessage: entry.errorMessage || null,
      }),
      author: entry.author,
      timestamp: entry.timestamp || new Date().toISOString(),
    };

    const { error } = await client.from('audit_logs').insert(payload);
    if (error) {
      if (isMissingTableError(error)) return false;
      console.warn('[Supabase] Aviso ao gravar log de atividade:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Busca histórico de atividades / auditoria do Supabase
 */
export async function fetchActivityLogsFromSupabase(): Promise<ActivityLogEntry[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(150);

    if (error) {
      if (isMissingTableError(error)) return [];
      console.warn('[Supabase] Erro ao carregar logs de auditoria:', error.message);
      return [];
    }

    if (!data || !Array.isArray(data)) return [];

    return data.map((d) => {
      let parsedDetails: any = null;
      try {
        parsedDetails = JSON.parse(d.details);
      } catch {
        parsedDetails = null;
      }

      return {
        id: String(d.id),
        action: d.action,
        actionLabel: parsedDetails?.actionLabel || d.action,
        entity: d.entity,
        entityName: parsedDetails?.entityName || d.entity,
        details: parsedDetails?.details || d.details || '',
        author: d.author || 'Administrador',
        authorEmail: parsedDetails?.authorEmail,
        status: parsedDetails?.status || 'sucesso',
        errorMessage: parsedDetails?.errorMessage,
        timestamp: d.timestamp,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Registra log de auditoria no Supabase (compatibilidade)
 */
export async function logSupabaseAuditEvent(action: string, entity: string, details: string) {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    await client.from('audit_logs').insert({
      action,
      entity,
      details,
      author: 'Proprietário (Admin)',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Erro ao gravar log de auditoria no Supabase:', err);
  }
}

const LOYALTY_NOTE_PREFIX = 'podwave:loyalty:v1:';

function parseLoyaltyCardObject(parsed: any): LoyaltyCardData | undefined {
  if (!parsed || typeof parsed !== 'object') return undefined;
  const goal =
    typeof parsed.goal === 'number' && parsed.goal >= 3 && parsed.goal <= 30
      ? Math.round(parsed.goal)
      : 10;
  const stamps =
    typeof parsed.stamps === 'number' && parsed.stamps >= 0
      ? Math.min(goal, Math.max(0, Math.round(parsed.stamps)))
      : 0;
  const completedCards =
    typeof parsed.completedCards === 'number' && parsed.completedCards >= 0
      ? Math.round(parsed.completedCards)
      : 0;
  const rewardDescription =
    typeof parsed.rewardDescription === 'string' && parsed.rewardDescription.trim()
      ? parsed.rewardDescription.trim()
      : 'Brinde Especial ou Desconto Exclusivo na 10ª Compra';
  return {
    stamps,
    goal,
    completedCards,
    rewardDescription,
    featuredBadgeId: typeof parsed.featuredBadgeId === 'string' ? parsed.featuredBadgeId : undefined,
    updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : undefined,
    history: Array.isArray(parsed.history) ? parsed.history.slice(0, 25) : [],
  };
}

function parseLoyaltyCardFromBenefitNote(raw?: string | null): LoyaltyCardData | undefined {
  if (raw && typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith(LOYALTY_NOTE_PREFIX)) {
      try {
        const parsed = JSON.parse(trimmed.slice(LOYALTY_NOTE_PREFIX.length));
        const card = parseLoyaltyCardObject(parsed);
        if (card) return card;
      } catch {
        // fallback below
      }
    }
  }

  return undefined;
}

function mapRowToCustomerProfile(d: Record<string, any>): UserProfile {
  const defaultAddr =
    d.default_address && typeof d.default_address === 'object' && !Array.isArray(d.default_address)
      ? d.default_address
      : null;

  const resolvedRole: UserRole =
    d.role === 'owner' || d.role === 'admin'
      ? d.role
      : d.role === 'vip' || d.is_vip === true || d.vip_status === 'active'
      ? 'vip'
      : 'customer';

  return {
    id: String(d.id),
    email: String(d.email || ''),
    fullName: String(d.full_name || d.name || (d.email ? String(d.email).split('@')[0] : 'Cliente')),
    phoneWhatsapp: String(d.phone || defaultAddr?.phoneWhatsapp || ''),
    cpf: String(d.cpf || ''),
    role: resolvedRole,
    address: {
      cep: String(defaultAddr?.cep ?? d.address_cep ?? ''),
      street: String(defaultAddr?.street ?? d.address_street ?? ''),
      number: String(defaultAddr?.number ?? d.address_number ?? ''),
      bairro: String(defaultAddr?.bairro ?? d.address_neighborhood ?? ''),
      complement: String(defaultAddr?.complement ?? d.address_complement ?? ''),
      city: String(defaultAddr?.city ?? d.address_city ?? ''),
      state: String(defaultAddr?.state ?? d.address_state ?? ''),
      referencePoint: defaultAddr?.referencePoint ? String(defaultAddr.referencePoint) : undefined,
    },
    vipDiscountCustom: d.vip_discount_custom != null ? Number(d.vip_discount_custom) : undefined,
    loyaltyCard: parseLoyaltyCardFromBenefitNote(d.vip_benefit_note),
    createdAt: d.created_at,
  };
}

/**
 * Salva ou atualiza perfil de cliente no Supabase (compatível tanto com o esquema real flat full_name/address_* quanto com default_address)
 */
export async function upsertCustomerProfileToSupabase(profile: UserProfile): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) {
    recordProfileDiagnostic({
      operation: 'upsert_profile',
      category: 'unconfigured',
      message: 'Supabase não configurado.',
    });
    return false;
  }
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError || !authData.user) {
    recordProfileDiagnostic({
      operation: 'upsert_profile',
      category: 'unauthenticated',
      message: 'Sessão ausente ou expirada. Faça login novamente antes de salvar seu perfil.',
    });
    return false;
  }
  const { data: previous, error: previousError } = await client
    .from('customer_profiles')
    .select('*')
    .eq('id', profile.id)
    .maybeSingle();
  if (previousError) {
    recordProfileDiagnostic(
      classifyPostgrestError('upsert_profile', previousError, 'Não foi possível consultar o perfil atual.')
    );
    return false;
  }
  if (previous?.default_address?.loyaltyCard && !previous.vip_benefit_note) {
    recordProfileDiagnostic({
      operation: 'upsert_profile',
      category: 'conflict',
      message: 'Dados antigos de benefícios no endereço exigem revisão antes de sobrescrever o perfil.',
    });
    return false;
  }
  // Profile editing never carries roles, VIP benefits or loyalty, even for an admin.
  const address: Partial<CustomerAddress> = profile.address || {};
  const cleanEmail = (profile.email || authData.user.email || '').trim().toLowerCase();
  const cleanFullName = (profile.fullName || cleanEmail.split('@')[0] || 'Cliente').trim();
  const nowIso = new Date().toISOString();

  // New profiles default to the verified flat schema; only an existing legacy row selects JSON first.
  const usesRealFlatSchema =
    previous == null ||
    (('full_name' in previous || 'address_cep' in previous) && !('default_address' in previous));

  const realFlatPayload = {
    id: profile.id,
    email: cleanEmail,
    full_name: cleanFullName,
    phone: (profile.phoneWhatsapp || '').trim() || null,
    cpf: profile.cpf || null,
    address_cep: address.cep || null,
    address_street: address.street || null,
    address_number: address.number || null,
    address_neighborhood: address.bairro || null,
    address_complement: address.complement || null,
    address_city: address.city || null,
    address_state: address.state || null,
    updated_at: nowIso,
  };

  const legacyJsonPayload = {
    id: profile.id,
    email: cleanEmail,
    name: cleanFullName,
    phone: (profile.phoneWhatsapp || '').trim(),
    cpf: profile.cpf || null,
    default_address: {
      cep: address.cep || '',
      street: address.street || '',
      number: address.number || '',
      bairro: address.bairro || '',
      complement: address.complement || '',
      city: address.city || '',
      state: address.state || '',
      referencePoint: address.referencePoint || '',
    },
    updated_at: nowIso,
  };

  try {
    const primaryPayload: Record<string, unknown> = usesRealFlatSchema ? realFlatPayload : legacyJsonPayload;
    let { data, error } = await client.from('customer_profiles').upsert(primaryPayload).select('id');
    if (error && isMissingColumnError(error)) {
      // One compatibility retry for an explicitly missing column, never for permission/network errors.
      const fallbackPayload: Record<string, unknown> = usesRealFlatSchema ? legacyJsonPayload : realFlatPayload;
      const retry = await client.from('customer_profiles').upsert(fallbackPayload).select('id');
      data = retry.data;
      error = retry.error;
    }
    if (error) {
      recordProfileDiagnostic(
        classifyPostgrestError('upsert_profile', error, 'O servidor recusou a gravação do perfil.')
      );
      return false;
    }
    const confirmed = Array.isArray(data) && data.some((row) => row.id === profile.id);
    if (!confirmed) {
      recordProfileDiagnostic({
        operation: 'upsert_profile',
        category: 'permission_denied',
        message: 'Nenhuma linha foi confirmada pelo servidor (verifique permissões de RLS).',
      });
      return false;
    }
    recordProfileDiagnostic({ operation: 'upsert_profile', category: 'ok', message: 'OK' });
    return true;
  } catch (err) {
    recordProfileDiagnostic(
      classifyPostgrestError('upsert_profile', err, 'Falha de rede ao salvar o perfil.')
    );
    return false;
  }
}

export interface FetchProfileDetailedResult {
  status: 'ok' | 'not_found' | 'error' | 'unconfigured';
  profile: UserProfile | null;
  errorCode?: string;
  errorMessage?: string;
}

export async function fetchCustomerProfileByIdDetailed(userId: string): Promise<FetchProfileDetailedResult> {
  const client = getSupabaseClient();
  if (!client || !userId) {
    return { status: 'unconfigured', profile: null };
  }
  try {
    const { data, error } = await client.from('customer_profiles').select('*').eq('id', userId).maybeSingle();
    if (error) {
      return {
        status: 'error',
        profile: null,
        errorCode: String((error as any).code || ''),
        errorMessage: error.message,
      };
    }
    if (!data || data.id !== userId) {
      return { status: 'not_found', profile: null };
    }
    return { status: 'ok', profile: mapRowToCustomerProfile(data) };
  } catch (err: any) {
    return {
      status: 'error',
      profile: null,
      errorMessage: err?.message || 'Erro de conexão ao consultar perfil.',
    };
  }
}

export async function fetchCustomerProfileById(userId: string): Promise<UserProfile | null> {
  const res = await fetchCustomerProfileByIdDetailed(userId);
  return res.status === 'ok' ? res.profile : null;
}

/**
 * Busca perfil do cliente no Supabase pelo e-mail
 */
export async function fetchCustomerProfileFromSupabase(email: string): Promise<UserProfile | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('customer_profiles')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error)) return null;
      console.warn('[Supabase] Aviso ao buscar perfil do cliente:', error.message);
      return null;
    }

    if (!data) return null;

    return mapRowToCustomerProfile(data);
  } catch (err) {
    if (isMissingTableError(err)) return null;
    return null;
  }
}

/**
 * Busca TODOS os perfis de usuários (acessível por administradores)
 */
export async function fetchAllCustomerProfilesFromSupabase(): Promise<UserProfile[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('customer_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (isMissingTableError(error)) return [];
      console.warn('[Supabase] Aviso ao listar todos os usuários:', error.message);
      return [];
    }

    if (!data || !Array.isArray(data)) return [];

    return data.map((d) => mapRowToCustomerProfile(d));
  } catch (err) {
    if (isMissingTableError(err)) return [];
    return [];
  }
}

/**
 * Atualiza o cargo (role) e opcional desconto VIP de um usuário no Supabase
 * Compatível com o esquema real (role IN ('customer', 'vip', 'admin', 'owner') e vip_discount_custom)
 */
export async function updateCustomerRoleInSupabase(
  userId: string,
  newRole: UserRole,
  customVipDiscount?: number
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || !userId) return false;

  try {
    const isVipTarget = newRole === 'vip';
    const nowIso = new Date().toISOString();
    const realSchemaPayload: Record<string, any> = {
      role: newRole,
      vip_discount_custom: isVipTarget
        ? (customVipDiscount ?? 10)
        : customVipDiscount !== undefined
        ? customVipDiscount
        : null,
      updated_at: nowIso,
    };

    const { data, error } = await client
      .from('customer_profiles')
      .update(realSchemaPayload)
      .eq('id', userId)
      .select('id');

    if (error) {
      recordProfileDiagnostic(
        classifyPostgrestError('update_role', error, 'Erro ao atualizar cargo do usuário.')
      );
      console.warn('[Supabase] Erro ao atualizar cargo do usuário:', error.message);
      return false;
    }
    const confirmed = Array.isArray(data) && data.some((row) => row.id === userId);
    if (!confirmed) {
      recordProfileDiagnostic({
        operation: 'update_role',
        category: 'not_found',
        message: 'Nenhuma linha atualizada em customer_profiles (usuário inexistente ou bloqueado por RLS).',
      });
      return false;
    }
    recordProfileDiagnostic({ operation: 'update_role', category: 'ok', message: 'OK' });
    return true;
  } catch (err) {
    recordProfileDiagnostic(
      classifyPostgrestError('update_role', err, 'Falha de conexão ao atualizar cargo.')
    );
    console.warn('[Supabase] Falha ao atualizar cargo:', err);
    return false;
  }
}

/**
 * Atualiza manualmente o Cartão de Fidelidade (selos) do cliente no Supabase
 */
export async function updateCustomerLoyaltyInSupabase(
  userId: string,
  loyaltyCard: LoyaltyCardData,
  expectedCard: LoyaltyCardData
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || !userId) return false;
  try {
    const { data: existing, error: readError } = await client
      .from('customer_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (readError) {
      recordProfileDiagnostic(
        classifyPostgrestError('update_loyalty', readError, 'Erro ao ler perfil do cliente antes de atualizar fidelidade.')
      );
      return false;
    }
    if (!existing) {
      // Nunca realiza INSERT parcial sem os campos obrigatórios (email, full_name) nem confunde bloqueio de RLS com ausência.
      recordProfileDiagnostic({
        operation: 'update_loyalty',
        category: 'not_found',
        message: 'Cliente ainda não possui perfil cadastrado em customer_profiles (ou registro invisível por RLS).',
      });
      return false;
    }
    if (existing.default_address?.loyaltyCard && !existing.vip_benefit_note) {
      recordProfileDiagnostic({
        operation: 'update_loyalty',
        category: 'conflict',
        message: 'Registro legado de fidelidade em default_address exige migração antes de atualizar.',
      });
      return false;
    }
    const current = parseLoyaltyCardFromBenefitNote(existing.vip_benefit_note);
    if (
      (current?.stamps ?? 0) !== expectedCard.stamps ||
      (current?.completedCards ?? 0) !== expectedCard.completedCards
    ) {
      recordProfileDiagnostic({
        operation: 'update_loyalty',
        category: 'conflict',
        message: 'Os selos deste cliente foram alterados em outra sessão. Recarregue antes de tentar novamente.',
      });
      return false;
    }
    const nextNote = LOYALTY_NOTE_PREFIX + JSON.stringify(loyaltyCard);
    let query = client
      .from('customer_profiles')
      .update({
        vip_benefit_note: nextNote,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
    query =
      existing.vip_benefit_note == null
        ? query.is('vip_benefit_note', null)
        : query.eq('vip_benefit_note', existing.vip_benefit_note);
    const { data, error } = await query.select('id');
    if (error) {
      recordProfileDiagnostic(
        classifyPostgrestError('update_loyalty', error, 'O banco recusou a gravação de vip_benefit_note.')
      );
      return false;
    }
    const confirmed = Array.isArray(data) && data.some((row) => row.id === userId);
    if (!confirmed) {
      recordProfileDiagnostic({
        operation: 'update_loyalty',
        category: 'permission_denied',
        message: 'Nenhuma linha foi confirmada pelo banco ao atualizar os selos.',
      });
      return false;
    }
    recordProfileDiagnostic({ operation: 'update_loyalty', category: 'ok', message: 'OK' });
    return true;
  } catch (err) {
    recordProfileDiagnostic(
      classifyPostgrestError('update_loyalty', err, 'Falha de conexão ao atualizar selos.')
    );
    return false;
  }
}

/**
 * Exclui perfil de usuário no Supabase confirmando que a linha foi efetivamente afetada
 */
export async function deleteCustomerProfileFromSupabase(userId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || !userId) return false;

  try {
    const { data, error } = await client
      .from('customer_profiles')
      .delete()
      .eq('id', userId)
      .select('id');

    if (error) {
      if (typeof recordProfileDiagnostic === 'function' && typeof classifyPostgrestError === 'function') {
        recordProfileDiagnostic(
          classifyPostgrestError('delete_profile', error, 'Erro ao excluir perfil.')
        );
      }
      console.warn('[Supabase] Erro ao excluir perfil:', error.message);
      return false;
    }
    const deleted = Array.isArray(data) && data.some((row) => row.id === userId);
    if (!deleted) {
      if (typeof recordProfileDiagnostic === 'function') {
        recordProfileDiagnostic({
          operation: 'delete_profile',
          category: 'not_found',
          message: 'Nenhum perfil foi excluído no banco (registro inexistente ou sem permissão RLS).',
        });
      }
      return false;
    }
    if (typeof recordProfileDiagnostic === 'function') {
      recordProfileDiagnostic({ operation: 'delete_profile', category: 'ok', message: 'OK' });
    }
    return true;
  } catch (err) {
    if (typeof recordProfileDiagnostic === 'function' && typeof classifyPostgrestError === 'function') {
      recordProfileDiagnostic(
        classifyPostgrestError('delete_profile', err, 'Falha de rede ao excluir perfil.')
      );
    }
    console.warn('[Supabase] Falha ao excluir perfil:', err);
    return false;
  }
}

/**
 * Cria ou cadastra um novo usuário com cargo específico (Admin, VIP ou Cliente)
 */
export async function createAdminOrVipUserInSupabase(_data: {
  email: string; fullName: string; phoneWhatsapp?: string; role: UserRole; vipDiscount?: number; password?: string;
}): Promise<{ success: boolean; message: string; user?: UserProfile }> {
  // Browser signUp can replace the operator's session and cannot grant trusted roles.
  return { success: false, message: 'Criação administrativa pelo navegador bloqueada. Convites exigem uma operação autorizada no servidor. Nenhuma conta ou permissão foi criada.' };
}

/**
 * Empacota metadados estruturados do pedido dentro da coluna JSONB `delivery_info` de `public.customer_orders`
 */
export function buildOrderDeliveryInfoPayload(order: CustomerOrderHistoryItem, customerId?: string): Record<string, unknown> {
  return {
    deliveryType: order.deliveryType || 'delivery',
    addressSummary: order.addressSummary || null,
    deliveryFee: Number(order.deliveryFee) || 0,
    customerId: order.customerId || customerId || null,
    customerName: order.customerName || null,
    customerPhone: order.customerPhone || null,
    customerEmail: order.customerEmail || null,
    customerNotes: order.customerNotes || null,
    paymentStatus: order.paymentStatus || 'pendente',
    amountPaid: typeof order.amountPaid === 'number' ? order.amountPaid : 0,
    cancelReason: order.cancelReason || null,
    statusHistory: Array.isArray(order.statusHistory) ? order.statusHistory : [],
    couponCode: order.couponCode || null,
    vipDiscountApplied: Boolean(order.vipDiscountApplied),
    vipDiscountAmount: Number(order.vipDiscountAmount) || 0,
    loyaltyEligible: order.loyaltyEligible !== false,
    loyaltyStampGranted: order.loyaltyStampGranted === true,
    loyaltyStampGrantedAt: order.loyaltyStampGrantedAt || null,
    loyaltyStampGrantedBy: order.loyaltyStampGrantedBy || null,
    loyaltyGrantIdempotencyKey: order.loyaltyGrantIdempotencyKey || null,
    financialSaleId: order.financialSaleId || null,
    financialRecordedAt: order.financialRecordedAt || null,
    stockDeducted: order.stockDeducted === true,
    stockDeductedAt: order.stockDeductedAt || null,
    version: typeof order.version === 'number' && order.version > 0 ? order.version : 1,
    updatedAt: order.updatedAt || order.createdAt || new Date().toISOString(),
    updatedBy: order.updatedBy || null,
  };
}

/**
 * Desempacota uma linha de `public.customer_orders` (compatível com `order_code` + `delivery_info` JSONB e formato legado)
 */
export function mapSupabaseRowToCustomerOrder(row: Record<string, any>): CustomerOrderHistoryItem {
  const info =
    row.delivery_info && typeof row.delivery_info === 'object' && !Array.isArray(row.delivery_info)
      ? row.delivery_info
      : {};

  const statusRaw = String(row.status || 'recebido');
  const validStatuses = ['recebido', 'confirmado', 'em_separacao', 'enviado', 'entregue', 'cancelado'];
  const safeStatus = (validStatuses.includes(statusRaw) ? statusRaw : 'recebido') as CustomerOrderHistoryItem['status'];

  const paymentStatusRaw = String(info.paymentStatus || row.payment_status || 'pendente');
  const validPaymentStatuses = ['pendente', 'parcial', 'pago', 'estornado'];
  const safePaymentStatus = (
    validPaymentStatuses.includes(paymentStatusRaw) ? paymentStatusRaw : 'pendente'
  ) as CustomerOrderHistoryItem['paymentStatus'];

  return {
    id: String(row.id),
    referenceId: String(row.order_code || row.reference_id || row.id),
    customerId: row.customer_id ? String(row.customer_id) : info.customerId ? String(info.customerId) : undefined,
    customerName: info.customerName ? String(info.customerName) : row.customer_name ? String(row.customer_name) : undefined,
    customerPhone: info.customerPhone ? String(info.customerPhone) : row.customer_phone ? String(row.customer_phone) : undefined,
    customerEmail: info.customerEmail ? String(info.customerEmail) : row.customer_email ? String(row.customer_email) : undefined,
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: info.updatedAt ? String(info.updatedAt) : row.updated_at ? String(row.updated_at) : undefined,
    updatedBy: info.updatedBy ? String(info.updatedBy) : undefined,
    items: Array.isArray(row.items) ? row.items : [],
    subtotal: Number(row.subtotal) || 0,
    discount: Number(row.discount) || 0,
    deliveryFee: Number(info.deliveryFee ?? row.delivery_fee) || 0,
    total: Number(row.total) || 0,
    paymentMethod: String(row.payment_method || 'WhatsApp'),
    paymentStatus: safePaymentStatus,
    amountPaid:
      typeof info.amountPaid === 'number'
        ? info.amountPaid
        : typeof row.amount_paid === 'number'
        ? row.amount_paid
        : safePaymentStatus === 'pago'
        ? Number(row.total) || 0
        : 0,
    deliveryType: (info.deliveryType || row.delivery_type) === 'pickup' ? 'pickup' : 'delivery',
    addressSummary: info.addressSummary || row.address_summary || undefined,
    customerNotes: info.customerNotes || row.customer_notes || undefined,
    status: safeStatus,
    cancelReason: info.cancelReason || row.cancel_reason || undefined,
    statusHistory: Array.isArray(info.statusHistory)
      ? info.statusHistory
      : Array.isArray(row.status_history)
      ? row.status_history
      : [],
    couponCode: row.coupon_code || info.couponCode || undefined,
    vipDiscountApplied: Boolean(row.vip_discount_applied ?? info.vipDiscountApplied),
    vipDiscountAmount: Number(row.vip_discount_amount ?? info.vipDiscountAmount) || 0,
    loyaltyEligible: info.loyaltyEligible !== false,
    loyaltyStampGranted: Boolean(row.loyalty_stamp_granted ?? info.loyaltyStampGranted === true),
    loyaltyStampGrantedAt: info.loyaltyStampGrantedAt || row.loyalty_stamp_granted_at || undefined,
    loyaltyStampGrantedBy: info.loyaltyStampGrantedBy || undefined,
    loyaltyGrantIdempotencyKey: info.loyaltyGrantIdempotencyKey || undefined,
    financialSaleId: info.financialSaleId || row.financial_sale_id || undefined,
    financialRecordedAt: info.financialRecordedAt || undefined,
    stockDeducted: Boolean(row.stock_deducted ?? info.stockDeducted === true),
    stockDeductedAt: info.stockDeductedAt || undefined,
    version:
      typeof info.version === 'number' && info.version > 0
        ? info.version
        : typeof row.version === 'number' && row.version > 0
        ? row.version
        : 1,
  };
}

let customerOrdersSupportedColumnsCache: Set<string> | null = null;

/**
 * Inspeciona as colunas realmente presentes no PostgREST para a tabela customer_orders
 * Evita avisos de 'schema cache' (ex: "Não foi possível encontrar a coluna 'coupon_code'").
 */
export async function getCustomerOrdersSupportedColumns(): Promise<Set<string>> {
  if (customerOrdersSupportedColumnsCache) {
    return customerOrdersSupportedColumnsCache;
  }

  const client = getSupabaseClient();
  const baseCols = new Set([
    'id',
    'order_code',
    'customer_id',
    'created_at',
    'status',
    'items',
    'subtotal',
    'discount',
    'total',
    'payment_method',
    'delivery_info',
  ]);

  if (!client) {
    return baseCols;
  }

  try {
    // 1. Tenta inspecionar linhas existentes com select('*')
    const { data, error } = await client
      .from('customer_orders')
      .select('*')
      .limit(1);

    if (!error && Array.isArray(data) && data.length > 0) {
      const detected = new Set(Object.keys(data[0]));
      customerOrdersSupportedColumnsCache = detected;
      return detected;
    }

    // 2. Se a tabela não tiver linhas, testa se 'coupon_code' é aceito sem erro de coluna
    const { error: testErr } = await client
      .from('customer_orders')
      .select('id, coupon_code')
      .limit(0);

    if (!testErr) {
      baseCols.add('coupon_code');
      baseCols.add('vip_discount_applied');
      baseCols.add('vip_discount_amount');
    }

    customerOrdersSupportedColumnsCache = baseCols;
    return baseCols;
  } catch {
    return baseCols;
  }
}

export interface SupabaseOrderDiagnostic {
  code?: string;
  category: 'ok' | 'unconfigured' | 'missing_column' | 'foreign_key' | 'permission_denied' | 'conflict' | 'error';
  message: string;
}

let lastSupabaseOrderDiagnostic: SupabaseOrderDiagnostic | null = null;

export function getLastSupabaseOrderDiagnostic(): SupabaseOrderDiagnostic | null {
  return lastSupabaseOrderDiagnostic;
}

/**
 * Extrai o nome da coluna ausente a partir de mensagens do PostgREST (PGRST204) ou PostgreSQL (42703)
 */
function extractMissingColumnFromError(err: unknown): string | null {
  if (!err || typeof err !== 'object') return null;
  const msg = String((err as { message?: string; details?: string }).message || '');
  const pgrstMatch = msg.match(/Could not find the '([^']+)' column/i);
  if (pgrstMatch && pgrstMatch[1]) return pgrstMatch[1];
  const pgMatch = msg.match(/column "([^"]+)" of relation "[^"]+" does not exist/i);
  if (pgMatch && pgMatch[1]) return pgMatch[1];
  const pgSimpleMatch = msg.match(/column "([^"]+)" does not exist/i);
  if (pgSimpleMatch && pgSimpleMatch[1]) {
    const col = pgSimpleMatch[1];
    return col.includes('.') ? col.split('.').pop() || null : col;
  }
  return null;
}

/**
 * Extrai o nome da coluna que violou NOT NULL (código 23502)
 */
function extractNotNullColumnFromError(err: unknown): string | null {
  if (!err || typeof err !== 'object') return null;
  const msg = String((err as { message?: string; details?: string }).message || '');
  const match = msg.match(/null value in column "([^"]+)"/i);
  return match && match[1] ? match[1] : null;
}

/**
 * Converte um ID textual (ex: ord-1730...) em um UUID v4 determinístico caso a coluna id no banco seja UUID
 */
function toDeterministicUuid(input: string): string {
  const clean = String(input || '').trim();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clean)) {
    return clean.toLowerCase();
  }
  let h1 = 0xdeadbeef ^ clean.length;
  let h2 = 0x41c6ce57 ^ clean.length;
  let h3 = 0x1b873593 ^ clean.length;
  let h4 = 0x85ebca6b ^ clean.length;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 3266489909);
    h4 = Math.imul(h4 ^ ch, 668265263);
  }
  const hex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  const full = hex(h1) + hex(h2) + hex(h3) + hex(h4);
  return `${full.slice(0, 8)}-${full.slice(8, 12)}-4${full.slice(13, 16)}-a${full.slice(17, 20)}-${full.slice(20, 32)}`;
}

/**
 * Assegura que o perfil do cliente exista em customer_profiles antes de vincular chave estrangeira.
 * Usa INSERT (em vez de UPSERT) para clientes comuns a fim de respeitar a política RLS FOR INSERT sem exigir FOR UPDATE.
 */
async function ensureCustomerProfileForOrder(
  client: any,
  ownerId: string,
  order: CustomerOrderHistoryItem
): Promise<boolean> {
  if (!client || !ownerId) return false;
  try {
    const { data } = await client
      .from('customer_profiles')
      .select('id')
      .eq('id', ownerId)
      .maybeSingle();

    if (data && data.id === ownerId) {
      return true;
    }

    const cleanPhone = (order.customerPhone || '').replace(/\D/g, '');
    const guestEmail = (
      order.customerEmail ||
      (cleanPhone
        ? `guest_${cleanPhone}@podwave.local`
        : `guest_${ownerId.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase()}@podwave.local`)
    )
      .trim()
      .toLowerCase();
    const fullName = (order.customerName || 'Cliente PodWave').trim() || 'Cliente PodWave';
    const safePhone = (order.customerPhone || cleanPhone || '').trim();
    const nowIso = new Date().toISOString();

    // 1. Esquema oficial real verificado de customer_profiles (id, email, full_name, phone, updated_at)
    const activeProfilePayload: Record<string, unknown> = {
      id: ownerId,
      email: guestEmail,
      full_name: fullName,
      phone: safePhone || null,
      updated_at: nowIso,
    };

    let { error: insertErr } = await client
      .from('customer_profiles')
      .insert(activeProfilePayload);

    if (!insertErr || insertErr.code === '23505') {
      return true;
    }

    // Adaptação dinâmica caso alguma coluna tenha nome diferente
    for (let attempt = 0; attempt < 5 && insertErr; attempt++) {
      if (insertErr.code === '23505') return true;

      if (isMissingColumnError(insertErr)) {
        const missingCol = extractMissingColumnFromError(insertErr);
        if (missingCol && missingCol in activeProfilePayload) {
          delete activeProfilePayload[missingCol];
          if (missingCol === 'full_name') {
            activeProfilePayload.name = fullName;
          } else if (missingCol === 'name') {
            activeProfilePayload.full_name = fullName;
          }
        } else if ('full_name' in activeProfilePayload) {
          delete activeProfilePayload.full_name;
          activeProfilePayload.name = fullName;
        } else {
          break;
        }
        const retry = await client.from('customer_profiles').insert(activeProfilePayload);
        insertErr = retry.error;
        if (!insertErr || insertErr.code === '23505') return true;
        continue;
      }

      if (insertErr.code === '23502') {
        const notNullCol = extractNotNullColumnFromError(insertErr);
        if (notNullCol === 'name' && !('name' in activeProfilePayload)) {
          activeProfilePayload.name = fullName;
          const retry = await client.from('customer_profiles').insert(activeProfilePayload);
          insertErr = retry.error;
          if (!insertErr || insertErr.code === '23505') return true;
          continue;
        }
        if (notNullCol === 'full_name' && !('full_name' in activeProfilePayload)) {
          activeProfilePayload.full_name = fullName;
          const retry = await client.from('customer_profiles').insert(activeProfilePayload);
          insertErr = retry.error;
          if (!insertErr || insertErr.code === '23505') return true;
          continue;
        }
      }
      break;
    }

    // Última tentativa via upsert
    const { error: upsertErr } = await client
      .from('customer_profiles')
      .upsert(activeProfilePayload, { onConflict: 'id' });

    return !upsertErr;
  } catch (err) {
    console.warn('[Supabase] Aviso ao assegurar perfil para pedido:', err);
    return false;
  }
}

/**
 * Salva pedido realizado pelo cliente ou atualizado pelo administrador no Supabase.
 * Compatível com RLS (usa .insert para novos pedidos e garante customer_id = auth.uid() quando autenticado como cliente)
 * e adapta-se automaticamente às colunas reais existentes em `customer_orders` (ou `orders`).
 */
export async function saveCustomerOrderToSupabase(
  order: CustomerOrderHistoryItem,
  customerId: string
): Promise<boolean> {
  const client = getSupabaseClient();
  const fallbackGuestId = order.customerPhone
    ? `guest-${order.customerPhone.replace(/\D/g, '')}`
    : `guest-${order.referenceId || order.id || Date.now()}`;

  let authUserId: string | null = null;
  let authUserEmail: string | null = null;
  if (client) {
    try {
      const { data: sessionData } = await client.auth.getSession();
      authUserId = sessionData?.session?.user?.id || null;
      authUserEmail = sessionData?.session?.user?.email || null;
    } catch {
      // ignore session lookup errors
    }
  }

  const rawRequestedId = (customerId || order.customerId || '').trim();
  // Se houver sessão autenticada e o ID solicitado for vazio, guest-* ou igual ao authUserId, usa authUserId para satisfazer RLS (customer_id = auth.uid())
  const ownerId =
    !rawRequestedId || rawRequestedId.startsWith('guest-')
      ? authUserId || rawRequestedId || fallbackGuestId
      : rawRequestedId;

  const enrichedOrder: CustomerOrderHistoryItem = {
    ...order,
    customerId: ownerId,
    customerEmail: order.customerEmail || authUserEmail || undefined,
  };

  if (!client || !ownerId || !order.id) {
    lastSupabaseOrderDiagnostic = {
      category: 'unconfigured',
      message: 'Cliente Supabase não configurado neste dispositivo ou pedido sem identificador.',
    };
    return false;
  }

  try {
    // 1. Assegura que o customer_profile exista no banco para satisfazer a Foreign Key (customer_orders_customer_id_fkey)
    await ensureCustomerProfileForOrder(client, ownerId, enrichedOrder);

    const { data: existing, error: selectErr } = await client
      .from('customer_orders')
      .select('*')
      .eq('id', order.id)
      .maybeSingle();

    const targetTable = selectErr && isMissingTableError(selectErr) ? 'orders' : 'customer_orders';

    const cols = existing
      ? new Set(Object.keys(existing))
      : targetTable === 'customer_orders'
      ? await getCustomerOrdersSupportedColumns()
      : new Set([
          'id',
          'order_code',
          'customer_id',
          'created_at',
          'status',
          'items',
          'subtotal',
          'discount',
          'total',
          'payment_method',
          'delivery_info',
        ]);
    const hasDeliveryInfoCol = cols.has('delivery_info');
    const hasOrderCodeCol = cols.has('order_code');

    const payload: Record<string, unknown> = {
      id: order.id,
      customer_id: existing?.customer_id || ownerId,
      created_at: order.createdAt || existing?.created_at || new Date().toISOString(),
      status: order.status || 'recebido',
      items: order.items || [],
      subtotal: Number(order.subtotal) || 0,
      discount: Number(order.discount) || 0,
      total: Number(order.total) || 0,
      payment_method: order.paymentMethod || 'Pix na Entrega',
    };

    if (hasOrderCodeCol) {
      payload.order_code = order.referenceId || order.id;
    } else if (cols.has('reference_id')) {
      payload.reference_id = order.referenceId || order.id;
    }

    if (hasDeliveryInfoCol) {
      payload.delivery_info = buildOrderDeliveryInfoPayload(
        enrichedOrder,
        (payload.customer_id as string) || ownerId
      );
    }

    // Se a tabela tiver colunas flat adicionais já detectadas, preenche também
    if (cols.has('customer_name')) payload.customer_name = enrichedOrder.customerName || 'Cliente';
    if (cols.has('customer_phone')) payload.customer_phone = enrichedOrder.customerPhone || '';
    if (cols.has('customer_email')) payload.customer_email = enrichedOrder.customerEmail || '';
    if (cols.has('delivery_type')) payload.delivery_type = enrichedOrder.deliveryType || 'delivery';
    if (cols.has('delivery_fee')) payload.delivery_fee = Number(enrichedOrder.deliveryFee) || 0;
    if (cols.has('address_summary')) payload.address_summary = enrichedOrder.addressSummary || '';
    if (cols.has('payment_status')) payload.payment_status = enrichedOrder.paymentStatus || 'pendente';

    if (cols.has('coupon_code')) payload.coupon_code = order.couponCode || null;
    if (cols.has('vip_discount_applied'))
      payload.vip_discount_applied = Boolean(order.vipDiscountApplied);
    if (cols.has('vip_discount_amount'))
      payload.vip_discount_amount = Number(order.vipDiscountAmount) || 0;

    // Função auxiliar que tenta inserir o pedido adaptando dinamicamente colunas ausentes, NOT NULL ou tipo UUID
    const executeAdaptiveInsert = async (initialPayload: Record<string, unknown>) => {
      const workingPayload: Record<string, unknown> = { ...initialPayload };
      const fallbackRemoveOrder = [
        'coupon_code',
        'vip_discount_applied',
        'vip_discount_amount',
        'delivery_info',
        'order_code',
        'reference_id',
        'discount',
        'subtotal',
        'payment_method',
      ];
      let res = await client.from(targetTable).insert(workingPayload).select('id');

      for (let step = 0; step < 10 && res.error; step++) {
        const err = res.error;
        const code = String((err as any).code || '');

        // A) Coluna inexistente no schema remoto (PGRST204 ou 42703)
        if (isMissingColumnError(err)) {
          const missingCol = extractMissingColumnFromError(err);
          if (missingCol && missingCol in workingPayload) {
            delete workingPayload[missingCol];
            if (customerOrdersSupportedColumnsCache) {
              customerOrdersSupportedColumnsCache.delete(missingCol);
            }
            if (missingCol === 'order_code' && !('reference_id' in workingPayload)) {
              // Não força reference_id a menos que seja exigido por NOT NULL
            }
          } else {
            const nextToRemove = fallbackRemoveOrder.find((k) => k in workingPayload);
            if (!nextToRemove) break;
            delete workingPayload[nextToRemove];
          }
          res = await client.from(targetTable).insert(workingPayload).select('id');
          continue;
        }

        // B) Coluna obrigatória NOT NULL ausente no payload (23502)
        if (code === '23502') {
          const reqCol = extractNotNullColumnFromError(err);
          if (reqCol && !(reqCol in workingPayload)) {
            if (reqCol === 'reference_id' || reqCol === 'order_code') {
              workingPayload[reqCol] = order.referenceId || order.id;
            } else if (reqCol === 'customer_name') {
              workingPayload[reqCol] = enrichedOrder.customerName || 'Cliente';
            } else if (reqCol === 'customer_phone') {
              workingPayload[reqCol] = enrichedOrder.customerPhone || '';
            } else if (reqCol === 'customer_email') {
              workingPayload[reqCol] = enrichedOrder.customerEmail || '';
            } else if (reqCol === 'delivery_type') {
              workingPayload[reqCol] = enrichedOrder.deliveryType || 'delivery';
            } else if (reqCol === 'address_summary') {
              workingPayload[reqCol] = enrichedOrder.addressSummary || '';
            } else if (reqCol === 'payment_status') {
              workingPayload[reqCol] = enrichedOrder.paymentStatus || 'pendente';
            } else if (reqCol === 'delivery_fee') {
              workingPayload[reqCol] = Number(enrichedOrder.deliveryFee) || 0;
            } else if (reqCol === 'delivery_info') {
              workingPayload[reqCol] = buildOrderDeliveryInfoPayload(enrichedOrder, ownerId);
            } else {
              workingPayload[reqCol] = '';
            }
            res = await client.from(targetTable).insert(workingPayload).select('id');
            continue;
          }
          break;
        }

        // C) Caso a coluna id no banco remoto seja do tipo UUID (22P02 invalid input syntax for type uuid)
        if (code === '22P02' && /uuid/i.test(err.message || '')) {
          const uuidId = toDeterministicUuid(String(workingPayload.id || order.id));
          if (workingPayload.id !== uuidId) {
            workingPayload.id = uuidId;
            res = await client.from(targetTable).insert(workingPayload).select('id');
            continue;
          }
          break;
        }

        break;
      }

      return { data: res.data, error: res.error, finalPayload: workingPayload };
    };

    // Se o pedido ainda não existe, usa INSERT puro (evita falha 42501 da política UPDATE RLS para clientes!)
    if (!existing) {
      let { data, error, finalPayload } = await executeAdaptiveInsert(payload);

      // Se falhar por RLS (42501) porque o customer_id difere do auth.uid() da sessão ativa, alinha com authUserId
      if (error && error.code === '42501' && authUserId && finalPayload.customer_id !== authUserId) {
        await ensureCustomerProfileForOrder(client, authUserId, enrichedOrder);
        finalPayload.customer_id = authUserId;
        if ('delivery_info' in finalPayload) {
          finalPayload.delivery_info = buildOrderDeliveryInfoPayload(enrichedOrder, authUserId);
        }
        const retryAuth = await executeAdaptiveInsert(finalPayload);
        data = retryAuth.data;
        error = retryAuth.error;
        finalPayload = retryAuth.finalPayload;
      }

      // Se falhar por foreign key (23503), assegura perfil do authUserId
      if (error && error.code === '23503') {
        if (authUserId) {
          await ensureCustomerProfileForOrder(client, authUserId, enrichedOrder);
          finalPayload.customer_id = authUserId;
          if ('delivery_info' in finalPayload) {
            finalPayload.delivery_info = buildOrderDeliveryInfoPayload(enrichedOrder, authUserId);
          }
          const retryFkAuth = await executeAdaptiveInsert(finalPayload);
          data = retryFkAuth.data;
          error = retryFkAuth.error;
          finalPayload = retryFkAuth.finalPayload;
        }
        // Apenas se ainda falhar por FK (ex: trigger bloqueando criação de perfil em customer_profiles)
        if (error && error.code === '23503') {
          const { data: firstProf } = await client
            .from('customer_profiles')
            .select('id')
            .limit(1)
            .maybeSingle();

          if (firstProf && firstProf.id) {
            finalPayload.customer_id = firstProf.id;
            if ('delivery_info' in finalPayload) {
              finalPayload.delivery_info = buildOrderDeliveryInfoPayload(enrichedOrder, ownerId);
            }
            const retry = await executeAdaptiveInsert(finalPayload);
            data = retry.data;
            error = retry.error;
            finalPayload = retry.finalPayload;
          }
        }
      }

      // Se o registro já existia (23505 duplicate key), faz update
      if (error && error.code === '23505') {
        const { id, created_at, customer_id, order_code, reference_id, ...updateFields } = finalPayload;
        const retryUpd = await client
          .from(targetTable)
          .update(updateFields)
          .eq('id', String(finalPayload.id || order.id))
          .select('id');
        data = retryUpd.data;
        error = retryUpd.error;
      }

      if (error) {
        const code = String((error as any).code || '');
        console.warn('[Supabase] Falha ao gravar pedido em customer_orders:', {
          orderId: order.id,
          referenceId: order.referenceId,
          customerId: finalPayload.customer_id,
          authUserId,
          code,
          message: error.message,
        });
        lastSupabaseOrderDiagnostic = {
          code,
          category:
            code === '23503'
              ? 'foreign_key'
              : isMissingColumnError(error)
              ? 'missing_column'
              : code === '42501'
              ? 'permission_denied'
              : 'error',
          message: error.message || 'O banco recusou a gravação do pedido.',
        };
        return false;
      }

      const targetId = String(finalPayload.id || order.id);
      const ok = Array.isArray(data) && data.some((row) => String(row.id) === targetId);
      lastSupabaseOrderDiagnostic = ok
        ? { category: 'ok', message: 'OK' }
        : { category: 'ok', message: 'Pedido gravado no banco.' };
      return true;
    }

    // Se já existe, atualiza os campos do pedido de forma limpa e direta
    const { id, created_at, customer_id, order_code, reference_id, ...updateFields } = payload;
    let { error: updateError } = await client
      .from(targetTable)
      .update(updateFields)
      .eq('id', order.id)
      .select('id');

    for (let step = 0; step < 6 && updateError && isMissingColumnError(updateError); step++) {
      const missingCol = extractMissingColumnFromError(updateError);
      if (missingCol && missingCol in updateFields) {
        delete (updateFields as Record<string, unknown>)[missingCol];
      } else {
        break;
      }
      const retryUpd = await client
        .from(targetTable)
        .update(updateFields)
        .eq('id', order.id)
        .select('id');
      updateError = retryUpd.error;
    }

    if (updateError) {
      const code = String((updateError as any).code || '');
      lastSupabaseOrderDiagnostic = {
        code,
        category: isMissingColumnError(updateError)
          ? 'missing_column'
          : code === '42501'
          ? 'permission_denied'
          : 'error',
        message: updateError.message || 'O banco recusou a atualização do pedido.',
      };
      return false;
    }

    lastSupabaseOrderDiagnostic = { category: 'ok', message: 'OK' };
    return true;
  } catch (err: any) {
    lastSupabaseOrderDiagnostic = {
      category: 'error',
      message: err?.message || 'Erro de conexão ao salvar pedido.',
    };
    return false;
  }
}

/**
 * Exclui pedido da tabela customer_orders (e orders se existir) no Supabase
 */
export async function deleteCustomerOrderFromSupabase(
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase não conectado.' };
  }
  try {
    const { error } = await client.from('customer_orders').delete().eq('id', orderId);
    if (error && isMissingTableError(error)) {
      const { error: fallbackErr } = await client.from('orders').delete().eq('id', orderId);
      if (fallbackErr && !isMissingTableError(fallbackErr)) {
        return { success: false, error: fallbackErr.message };
      }
      return { success: true };
    }
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao remover pedido no banco.' };
  }
}

/**
 * Retorna a data/hora em que um pedido foi cancelado (a partir do statusHistory, updatedAt ou createdAt)
 */
export function getCancelledOrderTimestampMs(order: CustomerOrderHistoryItem): number {
  if (Array.isArray(order.statusHistory) && order.statusHistory.length > 0) {
    const cancelEntry = [...order.statusHistory]
      .reverse()
      .find((h) => h.toStatus === 'cancelado');
    if (cancelEntry?.changedAt) {
      const parsed = new Date(cancelEntry.changedAt).getTime();
      if (!Number.isNaN(parsed)) return parsed;
    }
  }
  const fallbackIso = order.updatedAt || order.createdAt;
  const parsedFallback = fallbackIso ? new Date(fallbackIso).getTime() : Date.now();
  return Number.isNaN(parsedFallback) ? Date.now() : parsedFallback;
}

/**
 * Exclui automaticamente do Supabase (customer_orders / orders) os pedidos com status 'cancelado'
 * que já ultrapassaram o tempo de retenção (padrão: 24 horas; se retentionHours <= 0, exclui todos os cancelados).
 */
export async function cleanupExpiredCancelledOrdersInSupabase(
  ordersList: CustomerOrderHistoryItem[],
  retentionHours = 24
): Promise<{ deletedIds: string[]; errors: string[] }> {
  const client = getSupabaseClient();
  const deletedIds: string[] = [];
  const errors: string[] = [];

  const nowMs = Date.now();
  const thresholdMs = Math.max(0, retentionHours) * 60 * 60 * 1000;

  const expiredCancelledOrders = (ordersList || []).filter((ord) => {
    if (ord.status !== 'cancelado') return false;
    if (retentionHours <= 0) return true;
    const cancelledAtMs = getCancelledOrderTimestampMs(ord);
    return nowMs - cancelledAtMs >= thresholdMs;
  });

  if (client) {
    // 1. Dispara também a função SQL de limpeza automática se estiver instalada no banco
    try {
      await client.rpc('cleanup_cancelled_orders', {
        p_hours: Math.max(0, Math.floor(retentionHours)),
      });
    } catch {
      // Ignora silenciosamente se a RPC ainda não tiver sido criada no SQL Editor
    }
  }

  for (const ord of expiredCancelledOrders) {
    if (client) {
      const res = await deleteCustomerOrderFromSupabase(ord.id);
      if (res.success) {
        deletedIds.push(ord.id);
      } else if (res.error) {
        errors.push(`${ord.referenceId}: ${res.error}`);
      }
    } else {
      deletedIds.push(ord.id);
    }
  }

  if (deletedIds.length > 0) {
    console.info(
      `🧹 [PodWave Auto-Cleanup] ${deletedIds.length} pedido(s) cancelado(s) removido(s) automaticamente do banco de dados (retenção: ${retentionHours}h).`
    );
  }

  return { deletedIds, errors };
}

/**
 * Busca histórico de pedidos de um cliente específico no Supabase.
 * Além de filtrar por `customer_id`, também recupera pedidos visíveis na sessão cujo
 * `delivery_info` contenha o mesmo `customerId`, `customerEmail` ou `customerPhone`.
 */
export async function fetchCustomerOrdersFromSupabase(
  customerId: string,
  customerEmail?: string,
  customerPhone?: string
): Promise<CustomerOrderHistoryItem[]> {
  const client = getSupabaseClient();
  if (!client || !customerId) return [];

  const cleanEmail = (customerEmail || '').trim().toLowerCase();
  const cleanPhone = (customerPhone || '').replace(/\D/g, '');

  const matchesCustomerIdentity = (order: CustomerOrderHistoryItem): boolean => {
    if (order.customerId === customerId) return true;
    if (cleanEmail && order.customerEmail && order.customerEmail.trim().toLowerCase() === cleanEmail) {
      return true;
    }
    if (cleanPhone && cleanPhone.length >= 8 && order.customerPhone) {
      const ordPhone = order.customerPhone.replace(/\D/g, '');
      if (ordPhone && (ordPhone === cleanPhone || ordPhone.endsWith(cleanPhone.slice(-8)))) {
        return true;
      }
    }
    return false;
  };

  const isDiagnosticProbeRow = (row: Record<string, unknown>): boolean => {
    const idStr = String(row.id || '');
    const codeStr = String(row.order_code || row.reference_id || '');
    return idStr.startsWith('diag-rls-probe-') || codeStr.startsWith('DIAG-RLS-');
  };

  try {
    const { data, error } = await client
      .from('customer_orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    const combinedRows: Record<string, unknown>[] = [];
    const seenIds = new Set<string>();

    if (!error && Array.isArray(data)) {
      if (data.length > 0) {
        customerOrdersSupportedColumnsCache = new Set(Object.keys(data[0]));
      }
      for (const row of data) {
        if (!row || isDiagnosticProbeRow(row)) continue;
        const idKey = String(row.id || '');
        if (idKey && !seenIds.has(idKey)) {
          seenIds.add(idKey);
          combinedRows.push(row);
        }
      }
    }

    // Consulta complementar em 'orders' (caso exista como tabela ou view separada)
    try {
      const { data: ordersData, error: ordersErr } = await client
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (!ordersErr && Array.isArray(ordersData)) {
        for (const row of ordersData) {
          if (!row || isDiagnosticProbeRow(row)) continue;
          const idKey = String(row.id || '');
          if (idKey && !seenIds.has(idKey)) {
            seenIds.add(idKey);
            combinedRows.push(row);
          }
        }
      }
    } catch {
      // ignora se a tabela 'orders' não existir
    }

    if (error && combinedRows.length === 0 && !isMissingTableError(error)) {
      console.warn('[Supabase] Aviso ao buscar pedidos do cliente:', error.message);
      return [];
    }

    return combinedRows
      .map((row) => mapSupabaseRowToCustomerOrder(row))
      .filter(matchesCustomerIdentity);
  } catch (err) {
    if (isMissingTableError(err)) return [];
    return [];
  }
}

/**
 * Busca todos os pedidos registrados em `customer_orders` e `orders` para a Central de Pedidos Administrativa
 */
export async function fetchAllCustomerOrdersFromSupabase(): Promise<{
  orders: CustomerOrderHistoryItem[];
  error?: string;
  errorKind?: 'connection' | 'permission' | 'missing_table';
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { orders: [] };
  }

  const isDiagnosticProbeRow = (row: Record<string, unknown>): boolean => {
    const idStr = String(row.id || '');
    const codeStr = String(row.order_code || row.reference_id || '');
    return idStr.startsWith('diag-rls-probe-') || codeStr.startsWith('DIAG-RLS-');
  };

  try {
    const { data, error } = await client
      .from('customer_orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    const combinedRows: Record<string, unknown>[] = [];
    const seenIds = new Set<string>();

    if (!error && Array.isArray(data)) {
      if (data.length > 0) {
        customerOrdersSupportedColumnsCache = new Set(Object.keys(data[0]));
      }
      for (const row of data) {
        if (!row || isDiagnosticProbeRow(row)) continue;
        const idKey = String(row.id || '');
        if (idKey && !seenIds.has(idKey)) {
          seenIds.add(idKey);
          combinedRows.push(row);
        }
      }
    }

    // Consulta complementar na tabela/view 'orders' para unificar registros
    let ordersFallbackWorked = false;
    try {
      const { data: fallbackOrders, error: fallbackErr } = await client
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (!fallbackErr && Array.isArray(fallbackOrders)) {
        ordersFallbackWorked = true;
        for (const row of fallbackOrders) {
          if (!row || isDiagnosticProbeRow(row)) continue;
          const idKey = String(row.id || '');
          if (idKey && !seenIds.has(idKey)) {
            seenIds.add(idKey);
            combinedRows.push(row);
          }
        }
      }
    } catch {
      // ignora se 'orders' não existir
    }

    if (error && !ordersFallbackWorked) {
      if (isMissingTableError(error)) {
        return {
          orders: [],
          error: 'Tabelas customer_orders e orders ainda não instaladas no banco.',
          errorKind: 'missing_table',
        };
      }
      const isPerm = error.code === '42501' || /permission|policy|rls/i.test(error.message || '');
      return {
        orders: [],
        error: isPerm
          ? 'Sua sessão não possui permissão administrativa no banco para listar todos os pedidos.'
          : 'Não foi possível consultar os pedidos no servidor. Verifique sua conexão e tente novamente.',
        errorKind: isPerm ? 'permission' : 'connection',
      };
    }

    return {
      orders: combinedRows.map((row) => mapSupabaseRowToCustomerOrder(row)),
    };
  } catch {
    return {
      orders: [],
      error: 'Falha de conexão ao buscar pedidos. Verifique a internet e tente novamente.',
      errorKind: 'connection',
    };
  }
}

export interface SupabaseOrdersRLSDiagnosticReport {
  timestamp: string;
  supabaseConfigured: boolean;
  supabaseUrl: string;
  authenticated: boolean;
  authUserId: string | null;
  authUserEmail: string | null;
  jwtRole: string | null;
  profileExists: boolean;
  profileRole: string | null;
  profileAutoRepaired: boolean;
  ordersTable: {
    tableName: 'orders';
    exists: boolean;
    rlsSelectAllowed: boolean;
    visibleRowCount: number;
    columns: string[];
    errorCode?: string;
    errorMessage?: string;
  };
  customerOrdersTable: {
    tableName: 'customer_orders';
    exists: boolean;
    rlsSelectAllowed: boolean;
    visibleRowCount: number;
    columns: string[];
    errorCode?: string;
    errorMessage?: string;
  };
  activeTargetTable: 'customer_orders' | 'orders' | 'none';
  rlsWriteTest: {
    attempted: boolean;
    targetTable: string;
    insertAllowed: boolean;
    cleanupDeleted: boolean;
    errorCode?: string;
    errorMessage?: string;
  };
  reconciledLocalOrders: {
    foundLocal: number;
    syncedNow: number;
    failedNow: number;
  };
  overallStatus: 'healthy' | 'warning' | 'error';
  summaryMessage: string;
  recommendations: string[];
}

/**
 * Função de diagnóstico detalhado que investiga a conexão entre o cliente e o Supabase,
 * verifica se as tabelas 'orders' e 'customer_orders' estão acessíveis, valida se as
 * políticas de RLS estão permitindo leitura (SELECT) e escrita (INSERT) para usuários
 * autenticados, repara perfis ausentes e reconcilia pedidos locais pendentes.
 * Exibe todos os resultados em um console.log estruturado.
 */
export async function diagnoseSupabaseOrdersConnectionAndRLS(options?: {
  localOrdersToReconcile?: CustomerOrderHistoryItem[];
  runWriteProbe?: boolean;
}): Promise<SupabaseOrdersRLSDiagnosticReport> {
  const timestamp = new Date().toISOString();
  const creds = getSupabaseCredentials();
  const client = getSupabaseClient();
  const recommendations: string[] = [];

  const report: SupabaseOrdersRLSDiagnosticReport = {
    timestamp,
    supabaseConfigured: Boolean(creds.isConfigured && client),
    supabaseUrl: creds.url || '(não configurado)',
    authenticated: false,
    authUserId: null,
    authUserEmail: null,
    jwtRole: null,
    profileExists: false,
    profileRole: null,
    profileAutoRepaired: false,
    ordersTable: {
      tableName: 'orders',
      exists: false,
      rlsSelectAllowed: false,
      visibleRowCount: 0,
      columns: [],
    },
    customerOrdersTable: {
      tableName: 'customer_orders',
      exists: false,
      rlsSelectAllowed: false,
      visibleRowCount: 0,
      columns: [],
    },
    activeTargetTable: 'none',
    rlsWriteTest: {
      attempted: false,
      targetTable: 'customer_orders',
      insertAllowed: false,
      cleanupDeleted: false,
    },
    reconciledLocalOrders: {
      foundLocal: 0,
      syncedNow: 0,
      failedNow: 0,
    },
    overallStatus: 'healthy',
    summaryMessage: '',
    recommendations,
  };

  console.group('🔍 [PodWave Supabase Orders & RLS Diagnostic]');
  console.log('⏱️ Início do diagnóstico:', timestamp);
  console.log('🌐 Endpoint Supabase:', report.supabaseUrl, '| Configurado:', report.supabaseConfigured);

  if (!client || !creds.isConfigured) {
    report.overallStatus = 'error';
    report.summaryMessage = 'Cliente Supabase não inicializado. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.';
    recommendations.push('Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas variáveis de ambiente.');
    console.error('❌ [1/5] Cliente Supabase não configurado:', report);
    console.groupEnd();
    return report;
  }

  // 1. Verificar Sessão Autenticada (Supabase Auth)
  try {
    const { data: sessionData, error: sessionErr } = await client.auth.getSession();
    const user = sessionData?.session?.user || null;
    if (sessionErr) {
      console.warn('⚠️ [2/5] Aviso ao ler sessão Supabase Auth:', sessionErr.message);
    }
    if (user) {
      report.authenticated = true;
      report.authUserId = user.id;
      report.authUserEmail = user.email || null;
      report.jwtRole = user.role || 'authenticated';
    }
  } catch (e: any) {
    console.warn('⚠️ [2/5] Exceção ao inspecionar sessão Auth:', e?.message || e);
  }

  console.log('👤 [2/5] Sessão Supabase Auth:', {
    authenticated: report.authenticated,
    authUserId: report.authUserId,
    authUserEmail: report.authUserEmail,
    jwtRole: report.jwtRole,
  });

  if (!report.authenticated || !report.authUserId) {
    recommendations.push(
      'Faça login em uma conta autenticada (Cliente ou Admin) para testar políticas RLS de INSERT/SELECT vinculadas a auth.uid().'
    );
  }

  // 2. Verificar Perfil em public.customer_profiles (exigido pela Foreign Key de pedidos)
  if (report.authUserId) {
    try {
      const { data: profData, error: profErr } = await client
        .from('customer_profiles')
        .select('*')
        .eq('id', report.authUserId)
        .maybeSingle();

      if (!profErr && profData) {
        report.profileExists = true;
        report.profileRole = String(profData.role || 'customer');
      } else {
        // Tenta auto-reparar criando o perfil do usuário autenticado
        const repaired = await ensureCustomerProfileForOrder(client, report.authUserId, {
          customerName: report.authUserEmail?.split('@')[0] || 'Cliente PodWave',
          customerEmail: report.authUserEmail || undefined,
          customerPhone: '',
        });
        if (repaired) {
          report.profileExists = true;
          report.profileAutoRepaired = true;
          report.profileRole = 'customer';
        } else if (profErr) {
          recommendations.push(
            `Perfil ausente em public.customer_profiles e bloqueado no auto-reparo (${profErr.code}: ${profErr.message}). Execute o script SQL de reparo no Supabase.`
          );
        }
      }
    } catch (e: any) {
      console.warn('⚠️ [3/5] Erro ao verificar customer_profiles:', e?.message || e);
    }
  }

  console.log('🪪 [3/5] Perfil em public.customer_profiles (FK de pedidos):', {
    profileExists: report.profileExists,
    profileRole: report.profileRole,
    profileAutoRepaired: report.profileAutoRepaired,
  });

  // 3. Testar Acessibilidade e Leitura RLS (SELECT) na tabela 'orders' e 'customer_orders'
  const inspectTableSelect = async (tableName: 'orders' | 'customer_orders') => {
    try {
      const { data, error } = await client
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(25);

      if (error) {
        const missing = isMissingTableError(error);
        const isRls = error.code === '42501' || /permission|policy|rls/i.test(error.message || '');
        return {
          tableName,
          exists: !missing,
          rlsSelectAllowed: false,
          visibleRowCount: 0,
          columns: [] as string[],
          errorCode: String(error.code || ''),
          errorMessage: error.message || (missing ? `Tabela '${tableName}' não existe.` : isRls ? 'Bloqueado por RLS.' : 'Erro de leitura.'),
        };
      }

      const rows = Array.isArray(data) ? data : [];
      const cols = rows.length > 0 && rows[0] && typeof rows[0] === 'object' ? Object.keys(rows[0]) : [];
      return {
        tableName,
        exists: true,
        rlsSelectAllowed: true,
        visibleRowCount: rows.filter((r: any) => !String(r?.id || '').startsWith('diag-rls-probe-')).length,
        columns: cols,
      };
    } catch (err: any) {
      return {
        tableName,
        exists: false,
        rlsSelectAllowed: false,
        visibleRowCount: 0,
        columns: [] as string[],
        errorCode: 'EXCEPTION',
        errorMessage: err?.message || 'Exceção ao consultar tabela.',
      };
    }
  };

  report.ordersTable = await inspectTableSelect('orders');
  report.customerOrdersTable = await inspectTableSelect('customer_orders');

  if (report.customerOrdersTable.exists && report.customerOrdersTable.rlsSelectAllowed) {
    report.activeTargetTable = 'customer_orders';
  } else if (report.ordersTable.exists && report.ordersTable.rlsSelectAllowed) {
    report.activeTargetTable = 'orders';
  } else if (report.customerOrdersTable.exists) {
    report.activeTargetTable = 'customer_orders';
  } else if (report.ordersTable.exists) {
    report.activeTargetTable = 'orders';
  }

  console.log('📊 [4/5] Verificação de Tabelas e Políticas RLS de Leitura (SELECT):');
  console.table({
    orders: {
      Existe: report.ordersTable.exists ? 'SIM' : 'NÃO (use VIEW SQL ou fallback)',
      'SELECT Permitido (RLS)': report.ordersTable.rlsSelectAllowed ? '✅ SIM' : '❌ NÃO',
      'Pedidos Visíveis': report.ordersTable.visibleRowCount,
      Código: report.ordersTable.errorCode || 'OK',
      Detalhe: report.ordersTable.errorMessage || 'Leitura autenticada OK',
    },
    customer_orders: {
      Existe: report.customerOrdersTable.exists ? 'SIM' : 'NÃO',
      'SELECT Permitido (RLS)': report.customerOrdersTable.rlsSelectAllowed ? '✅ SIM' : '❌ NÃO',
      'Pedidos Visíveis': report.customerOrdersTable.visibleRowCount,
      Código: report.customerOrdersTable.errorCode || 'OK',
      Detalhe: report.customerOrdersTable.errorMessage || 'Leitura autenticada OK',
    },
  });

  if (!report.ordersTable.exists && report.customerOrdersTable.exists) {
    recommendations.push(
      'A tabela principal ativa no banco é "public.customer_orders". Para que consultas diretas em "public.orders" também funcionem sem fallback, execute o script SQL que cria a VIEW atualizável public.orders -> public.customer_orders.'
    );
  }

  // 4. Testar Escrita RLS (INSERT) para usuário autenticado
  const shouldRunWriteProbe = options?.runWriteProbe !== false && report.authenticated && Boolean(report.authUserId);
  if (shouldRunWriteProbe && report.activeTargetTable !== 'none') {
    const target = report.activeTargetTable;
    const probeId = `diag-rls-probe-${Date.now()}`;
    report.rlsWriteTest.attempted = true;
    report.rlsWriteTest.targetTable = target;

    const probeOrder: CustomerOrderHistoryItem = {
      id: probeId,
      referenceId: `DIAG-RLS-${Date.now().toString().slice(-4)}`,
      customerId: report.authUserId!,
      customerName: 'Diagnóstico RLS PodWave',
      customerEmail: report.authUserEmail || undefined,
      customerPhone: '',
      createdAt: timestamp,
      updatedAt: timestamp,
      items: [],
      subtotal: 0,
      discount: 0,
      deliveryFee: 0,
      total: 0,
      paymentMethod: 'Diagnóstico RLS',
      paymentStatus: 'pendente',
      deliveryType: 'pickup',
      status: 'recebido',
      version: 1,
    };

    const insertOk = await saveCustomerOrderToSupabase(probeOrder, report.authUserId!);
    const diag = getLastSupabaseOrderDiagnostic();
    report.rlsWriteTest.insertAllowed = insertOk;

    if (!insertOk) {
      report.rlsWriteTest.errorCode = diag?.code || diag?.category || 'INSERT_FAILED';
      report.rlsWriteTest.errorMessage =
        diag?.message || 'A política RLS ou constraint impediu o INSERT na tabela de pedidos.';
      recommendations.push(
        `Falha no teste de escrita RLS em "${target}" (${report.rlsWriteTest.errorCode}): ${report.rlsWriteTest.errorMessage}. Execute o script SQL de reparo.`
      );
    } else {
      // Limpa imediatamente o registro de sonda para não poluir a base
      try {
        const { error: delErr } = await client.from(target).delete().eq('id', probeId);
        report.rlsWriteTest.cleanupDeleted = !delErr;
      } catch {
        report.rlsWriteTest.cleanupDeleted = false;
      }
    }
  }

  console.log('✍️ [5/5] Teste de Escrita RLS (INSERT) para Usuário Autenticado:', report.rlsWriteTest);

  // 5. Reconciliar automaticamente pedidos locais pendentes para o Supabase
  const localOrders = (options?.localOrdersToReconcile || []).filter(
    (o) => o && o.id && !o.id.startsWith('diag-rls-probe-')
  );
  report.reconciledLocalOrders.foundLocal = localOrders.length;

  if (report.authenticated && report.authUserId && localOrders.length > 0) {
    const remoteCheck = await fetchAllCustomerOrdersFromSupabase();
    const existingIds = new Set((remoteCheck.orders || []).map((o) => o.id));
    const existingRefs = new Set((remoteCheck.orders || []).map((o) => o.referenceId));

    for (const ord of localOrders) {
      if (existingIds.has(ord.id) || (ord.referenceId && existingRefs.has(ord.referenceId))) {
        continue;
      }
      const targetCustomerId =
        !ord.customerId || ord.customerId.startsWith('guest-')
          ? report.authUserId
          : ord.customerId;
      const ok = await saveCustomerOrderToSupabase(
        { ...ord, customerId: targetCustomerId },
        targetCustomerId
      );
      if (ok) {
        report.reconciledLocalOrders.syncedNow++;
      } else {
        report.reconciledLocalOrders.failedNow++;
      }
    }

    console.log('🔄 [Reconciliação Automática de Pedidos Locais -> Supabase]:', report.reconciledLocalOrders);
  }

  // 6. Status Geral
  const selectOk = report.customerOrdersTable.rlsSelectAllowed || report.ordersTable.rlsSelectAllowed;
  const writeOk = !report.rlsWriteTest.attempted || report.rlsWriteTest.insertAllowed;

  if (!selectOk || !writeOk) {
    report.overallStatus = 'error';
    report.summaryMessage = !selectOk
      ? 'Leitura bloqueada ou tabela inacessível no Supabase. Execute o script SQL de organização e RLS.'
      : `Escrita (INSERT) recusada pelo banco (${report.rlsWriteTest.errorCode || 'RLS'}): ${report.rlsWriteTest.errorMessage}`;
  } else if (!report.ordersTable.exists || !report.authenticated) {
    report.overallStatus = 'warning';
    report.summaryMessage = !report.authenticated
      ? 'Conectado ao Supabase, mas sem usuário autenticado na sessão atual.'
      : 'Leitura e escrita funcionando em "customer_orders"! Para habilitar também o alias direto "orders", rode o SQL de unificação.';
  } else {
    report.overallStatus = 'healthy';
    report.summaryMessage =
      'Conexão Supabase, tabelas "orders" / "customer_orders" e políticas RLS (SELECT e INSERT) 100% operacionais!';
  }

  console.log('✅ Resultado Final do Diagnóstico:', {
    overallStatus: report.overallStatus,
    summaryMessage: report.summaryMessage,
    recommendations: report.recommendations,
  });
  console.groupEnd();

  return report;
}

if (typeof window !== 'undefined') {
  (window as any).diagnoseSupabaseOrders = diagnoseSupabaseOrdersConnectionAndRLS;
}

// ==============================================================================
// MÉTODOS DE AUTENTICAÇÃO REAL DO SUPABASE (E-MAIL E SENHA)
// ==============================================================================

/**
 * Traduz mensagens de erro do Supabase Auth para português amigável e seguro
 */
export function translateSupabaseAuthError(errorMsg: string): string {
  const msg = (errorMsg || '').toLowerCase();
  if (msg.includes('notallowederror') || msg.includes('user cancelled') || msg.includes('user canceled') || msg.includes('operation was not allowed') || msg.includes('abort') || msg.includes('cancel')) {
    return 'Autenticação biométrica cancelada pelo usuário ou fechada no dispositivo.';
  }
  if (msg.includes('notfounderror') || msg.includes('credential_not_found') || msg.includes('no credential found') || msg.includes('webauthn_credential_not_found')) {
    return 'Nenhuma Passkey encontrada para este dispositivo. Acesse sua conta por senha ou código e cadastre sua Passkey em Minha Conta → Segurança.';
  }
  if (msg.includes('webauthn_challenge_expired') || msg.includes('challenge expired') || msg.includes('timeout')) {
    return 'O tempo limite da leitura biométrica expirou. Tente novamente.';
  }
  if (msg.includes('passkey') && (msg.includes('disabled') || msg.includes('not enabled') || msg.includes('unsupported') || msg.includes('not supported'))) {
    return 'O suporte a Passkeys precisa estar ativado no painel do Supabase (Authentication → Passkeys / WebAuthn).';
  }
  if (msg.includes('invalid path specified in request url') || msg.includes('requested path is invalid')) {
    return 'Endereço de autenticação ou rota WebAuthn não disponível no Supabase. Verifique: (1) em Authentication → URL Configuration se o Site URL não tem "/**" no final, e (2) se tentar usar Passkey, ative Passkeys no painel do Supabase.';
  }
  if (msg.includes('securityerror') || msg.includes('relying party') || msg.includes('rp id') || msg.includes('origin')) {
    return 'Domínio WebAuthn não autorizado. Verifique se o endereço HTTPS da aplicação está cadastrado como Relying Party ID no Supabase.';
  }
  if (msg.includes('notsupportederror') || msg.includes('not supported on this device') || msg.includes('authenticator not available')) {
    return 'Seu navegador ou dispositivo não possui suporte a biometria/Passkey (WebAuthn).';
  }
  if (msg.includes('session missing') || msg.includes('authsessionmissingerror')) {
    return 'Sessão expirada. Entre com sua senha ou código antes de cadastrar uma Passkey.';
  }
  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
    return 'E-mail ou senha incorretos. Verifique suas credenciais.';
  }
  if (msg.includes('email not confirmed')) {
    return 'E-mail ainda não confirmado. Verifique a caixa de entrada do seu e-mail para confirmar seu cadastro.';
  }
  if (msg.includes('user already registered') || msg.includes('already registered') || msg.includes('already exists')) {
    return 'Este e-mail já está cadastrado no sistema. Faça login com sua senha.';
  }
  if (msg.includes('password should be at least') || msg.includes('password is too short')) {
    return 'A senha precisa ter no mínimo 6 caracteres para sua segurança.';
  }
  if (msg.includes('rate limit') || msg.includes('too many requests') || msg.includes('over_email_send_rate_limit')) {
    return 'Muitas tentativas em pouco tempo. Por segurança, aguarde alguns instantes antes de tentar novamente.';
  }
  if (msg.includes('error sending magic link email') || msg.includes('error sending confirmation email') || msg.includes('error sending recovery email')) {
    return 'O Supabase não conseguiu enviar o e-mail agora (o plano gratuito do Supabase limita a 2 a 4 e-mails por hora, ou o servidor SMTP personalizado precisa de ajuste). Use o login com E-mail e Senha ou aguarde alguns minutos.';
  }
  if (msg.includes('token has expired') || msg.includes('otp expired')) {
    return 'O código de verificação expirou. Solicite um novo código por e-mail.';
  }
  if (msg.includes('token is invalid') || msg.includes('invalid token') || msg.includes('token_not_found') || (msg.includes('token') && msg.includes('invalid'))) {
    return 'Código de verificação incorreto ou expirado. Verifique os 6 dígitos recebidos e tente novamente.';
  }
  if (msg.includes('unsupported provider') || msg.includes('provider is not enabled') || msg.includes('provider not supported')) {
    return 'O login com Google precisa estar ativado no painel do Supabase (Authentication > Providers > Google).';
  }
  if (msg.includes('network') || msg.includes('failed to fetch')) {
    return 'Falha na conexão com o servidor de autenticação. Verifique sua conexão de internet.';
  }
  return errorMsg || 'Ocorreu um erro durante a autenticação.';
}

export interface SupabaseAuthResponse {
  success: boolean;
  message: string;
  user?: UserProfile;
  isOwner: boolean;
}

/**
 * Realiza login estritamente via Supabase Auth (e-mail e senha)
 */
export async function supabaseSignInWithPassword(
  email: string,
  password: string
): Promise<SupabaseAuthResponse> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'O Supabase não está configurado. Conecte sua URL e chave anônima (anon public key) nas configurações do sistema.',
      isOwner: false,
    };
  }

  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !password) {
    return {
      success: false,
      message: 'Por favor, informe e-mail e senha para realizar o login.',
      isOwner: false,
    };
  }

  try {
    const { data, error } = await client.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      return {
        success: false,
        message: translateSupabaseAuthError(error.message),
        isOwner: false,
      };
    }

    if (!data.user) {
      return {
        success: false,
        message: 'Nenhum usuário retornado pelo Supabase.',
        isOwner: false,
      };
    }

    // Busca o perfil na tabela customer_profiles diferenciando 'not_found' de erro de leitura
    const profileLookup = await fetchCustomerProfileByIdDetailed(data.user.id);
    let profile = profileLookup.profile;

    if (!profile) {
      profile = {
        id: data.user.id,
        email: cleanEmail,
        fullName: data.user.user_metadata?.full_name || cleanEmail.split('@')[0],
        phoneWhatsapp: data.user.user_metadata?.phone || '',
        role: 'customer',
        createdAt: data.user.created_at,
      };

      // Só cria registro inicial no banco se comprovadamente não existir ('not_found')
      if (profileLookup.status === 'not_found') {
        await upsertCustomerProfileToSupabase(profile);
      }
    }

    const isOwner = profile.role === 'owner';
    const isAdmin = profile.role === 'admin' || isOwner;

    return {
      success: true,
      message: isAdmin
        ? 'Login realizado com sucesso! Bem-vindo de volta ao Painel Administrativo.'
        : `Olá, ${profile.fullName}! Login realizado com sucesso.`,
      user: profile,
      isOwner,
    };
  } catch (err: any) {
    return {
      success: false,
      message: translateSupabaseAuthError(err?.message || 'Falha ao autenticar no Supabase.'),
      isOwner: false,
    };
  }
}

/**
 * Realiza cadastro real de cliente estritamente via Supabase Auth (e-mail, senha e metadados)
 */
export async function supabaseSignUp(
  email: string,
  password: string,
  userData: {
    fullName: string;
    phoneWhatsapp?: string;
    address?: CustomerAddress;
  }
): Promise<SupabaseAuthResponse> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'O Supabase não está configurado. Conecte sua URL e chave anônima (anon public key) nas configurações do sistema.',
      isOwner: false,
    };
  }

  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !password || password.length < 6) {
    return {
      success: false,
      message: 'Por favor, informe um e-mail válido e senha com no mínimo 6 caracteres.',
      isOwner: false,
    };
  }

  try {
    const { data, error } = await client.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: userData.fullName.trim(),
          phone: userData.phoneWhatsapp?.trim() || null,
        },
      },
    });

    if (error) {
      return {
        success: false,
        message: translateSupabaseAuthError(error.message),
        isOwner: false,
      };
    }

    if (!data.user) {
      return {
        success: false,
        message: 'Falha ao criar usuário no Supabase Auth.',
        isOwner: false,
      };
    }

    // Salva perfil persistente na tabela customer_profiles associado ao UUID real do Auth
    const newProfile: UserProfile = {
      id: data.user.id,
      email: cleanEmail,
      fullName: userData.fullName.trim(),
      phoneWhatsapp: userData.phoneWhatsapp?.trim() || undefined,
      role: 'customer',
      address: userData.address,
      orderHistory: [],
      createdAt: new Date().toISOString(),
    };

    await upsertCustomerProfileToSupabase(newProfile);

    // Se o Supabase exigir confirmação de e-mail e não retornar sessão imediata:
    const requiresConfirmation = !data.session;

    return {
      success: true,
      message: requiresConfirmation
        ? 'Cadastro realizado! Se a confirmação de e-mail estiver ativa no seu projeto Supabase, verifique sua caixa de entrada.'
        : 'Cadastro realizado com sucesso via Supabase Auth!',
      user: newProfile,
      isOwner: false,
    };
  } catch (err: any) {
    return {
      success: false,
      message: translateSupabaseAuthError(err?.message || 'Falha ao registrar usuário no Supabase.'),
      isOwner: false,
    };
  }
}

/**
 * Encerra a sessão real no Supabase Auth
 */
export async function supabaseSignOut(): Promise<void> {
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.auth.signOut();
    } catch (e) {
      console.warn('[Supabase] Erro ao encerrar sessão:', e);
    }
  }
}

/**
 * Envia e-mail de recuperação de senha pelo Supabase Auth
 */
export async function supabaseResetPasswordForEmail(
  email: string
): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'O Supabase não está configurado.',
    };
  }

  const cleanEmail = email.trim().toLowerCase();
  try {
    const { error } = await client.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
    });

    if (error) {
      return {
        success: false,
        message: translateSupabaseAuthError(error.message),
      };
    }

    return {
      success: true,
      message: 'E-mail de recuperação enviado com sucesso! Verifique sua caixa de entrada e pasta de spam.',
    };
  } catch (err: any) {
    return {
      success: false,
      message: translateSupabaseAuthError(err?.message || 'Falha ao enviar e-mail de recuperação.'),
    };
  }
}

/**
 * Recupera o usuário autenticado atualmente na sessão real do Supabase
 */
export async function supabaseGetCurrentAuthUser(): Promise<UserProfile | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client.auth.getUser();
    if (error || !data.user?.email) return null;
    const profileLookup = await fetchCustomerProfileByIdDetailed(data.user.id);
    if (profileLookup.profile) return profileLookup.profile;
    // Se houve falha temporária de leitura no banco ('error'), não sobrescreve perfil existente
    if (profileLookup.status === 'error') return null;
    const fallback: UserProfile = {
      id: data.user.id, email: data.user.email.trim().toLowerCase(),
      fullName: data.user.user_metadata?.full_name || data.user.email.split('@')[0],
      phoneWhatsapp: data.user.user_metadata?.phone || '', role: 'customer',
      createdAt: data.user.created_at,
    };
    if (profileLookup.status === 'not_found') {
      await upsertCustomerProfileToSupabase(fallback);
    }
    return fallback;
  } catch { return null; }
}

/**
 * Inicia o fluxo de Login com Google via Supabase OAuth (100% gratuito)
 */
export async function supabaseSignInWithGoogle(): Promise<{ success: boolean; message: string; url?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'O Supabase não está configurado. Conecte sua URL e chave anônima (anon public key) nas configurações do sistema.',
    };
  }

  try {
    const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      return {
        success: false,
        message: translateSupabaseAuthError(error.message),
      };
    }

    if (data?.url && typeof window !== 'undefined') {
      window.location.href = data.url;
    }

    return {
      success: true,
      message: 'Redirecionando para a conta Google com segurança...',
      url: data?.url,
    };
  } catch (err: any) {
    return {
      success: false,
      message: translateSupabaseAuthError(err?.message || 'Falha ao iniciar autenticação com o Google.'),
    };
  }
}

/**
 * Envia código OTP numérico de 6 dígitos ou link mágico para o e-mail do usuário (sem senha)
 */
export async function supabaseSendOtp(
  email: string
): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'O Supabase não está configurado. Conecte sua URL e chave anônima (anon public key) nas configurações do sistema.',
    };
  }

  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return {
      success: false,
      message: 'Por favor, informe um endereço de e-mail válido.',
    };
  }

  try {
    const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;
    const { error } = await client.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      return {
        success: false,
        message: translateSupabaseAuthError(error.message),
      };
    }

    return {
      success: true,
      message: 'Código de 6 dígitos enviado! Verifique sua caixa de entrada e spam.',
    };
  } catch (err: any) {
    return {
      success: false,
      message: translateSupabaseAuthError(err?.message || 'Falha ao despachar código por e-mail.'),
    };
  }
}

/**
 * Valida o código OTP de 6 dígitos enviado por e-mail e autentica o usuário
 */
export async function supabaseVerifyOtp(
  email: string,
  token: string
): Promise<SupabaseAuthResponse> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'O Supabase não está configurado. Conecte sua URL e chave anônima (anon public key) nas configurações do sistema.',
      isOwner: false,
    };
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanToken = token.trim().replace(/\s+/g, '');

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return {
      success: false,
      message: 'Por favor, informe um endereço de e-mail válido.',
      isOwner: false,
    };
  }

  if (!cleanToken || cleanToken.length < 6) {
    return {
      success: false,
      message: 'Por favor, informe o código de 6 dígitos recebido no e-mail.',
      isOwner: false,
    };
  }

  try {
    const { data, error } = await client.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: 'email',
    });

    if (error) {
      return {
        success: false,
        message: translateSupabaseAuthError(error.message),
        isOwner: false,
      };
    }

    if (!data.user) {
      return {
        success: false,
        message: 'Nenhum usuário retornado após validação do código.',
        isOwner: false,
      };
    }

    // Busca ou cria perfil na tabela customer_profiles apenas se comprovadamente inexistente
    const profileLookup = await fetchCustomerProfileByIdDetailed(data.user.id);
    let profile = profileLookup.profile;
    if (!profile) {
      profile = {
        id: data.user.id,
        email: cleanEmail,
        fullName: data.user.user_metadata?.full_name || cleanEmail.split('@')[0],
        phoneWhatsapp: data.user.user_metadata?.phone || '',
        role: 'customer',
        createdAt: data.user.created_at || new Date().toISOString(),
      };
      if (profileLookup.status === 'not_found') {
        await upsertCustomerProfileToSupabase(profile);
      }
    }

    const isOwner = profile.role === 'owner';
    const isAdmin = profile.role === 'admin' || isOwner;

    return {
      success: true,
      message: isAdmin
        ? 'Login realizado com sucesso! Bem-vindo de volta ao Painel Administrativo.'
        : `Olá, ${profile.fullName}! Acesso validado com sucesso.`,
      user: profile,
      isOwner,
    };
  } catch (err: any) {
    return {
      success: false,
      message: translateSupabaseAuthError(err?.message || 'Falha ao validar código OTP.'),
      isOwner: false,
    };
  }
}

// ==============================================================================
// AUTENTICAÇÃO COM PASSKEY (WEBAUTHN / BIOMETRIA / FACE ID / TOUCH ID)
// Utiliza a API oficial do Supabase Auth:
// - supabase.auth.signInWithPasskey()
// - supabase.auth.registerPasskey()
// - supabase.auth.passkey.list()
// - supabase.auth.passkey.update()
// - supabase.auth.passkey.delete()
// ==============================================================================

/**
 * Verifica se o dispositivo e navegador atual oferecem suporte a Passkeys e WebAuthn
 */
export async function isPasskeyPlatformSupported(): Promise<{ supported: boolean; reason?: string }> {
  if (typeof window === 'undefined') {
    return { supported: false, reason: 'Ambiente não suportado (SSR).' };
  }
  if (!window.isSecureContext) {
    return {
      supported: false,
      reason: 'Passkeys exigem conexão segura HTTPS ou localhost.',
    };
  }
  if (
    typeof window.PublicKeyCredential === 'undefined' ||
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== 'function'
  ) {
    return {
      supported: false,
      reason: 'Este navegador não suporta a tecnologia WebAuthn / Passkeys.',
    };
  }
  try {
    const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return {
      supported: Boolean(available),
      reason: available
        ? undefined
        : 'Nenhum autenticador biométrico local (Face ID, Touch ID, Windows Hello ou PIN) detectado neste dispositivo.',
    };
  } catch {
    return {
      supported: true,
    };
  }
}

/**
 * Realiza autenticação com Face ID, Digital ou Passkey via API oficial do Supabase Auth
 * supabase.auth.signInWithPasskey()
 */
export async function supabaseSignInWithPasskey(): Promise<SupabaseAuthResponse> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'O Supabase não está configurado. Conecte sua URL e chave anônima (anon public key) nas configurações.',
      isOwner: false,
    };
  }

  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return {
      success: false,
      message: 'Passkeys exigem conexão segura HTTPS ou localhost. Acesse a aplicação por um endereço seguro.',
      isOwner: false,
    };
  }

  try {
    const { data, error } = await client.auth.signInWithPasskey();

    if (error) {
      return {
        success: false,
        message: translateSupabaseAuthError(error.message || String(error)),
        isOwner: false,
      };
    }

    if (!data?.user) {
      return {
        success: false,
        message: 'Nenhum usuário retornado após leitura da Passkey.',
        isOwner: false,
      };
    }

    const email = data.user.email?.toLowerCase().trim();
    if (!email) {
      return {
        success: false,
        message: 'A Passkey autenticou, mas o e-mail associado não foi identificado.',
        isOwner: false,
      };
    }

    // Recupera o perfil real no Supabase (sem confiar em dados administrativos do localStorage)
    const profileLookup = await fetchCustomerProfileByIdDetailed(data.user.id);
    let profile = profileLookup.profile;
    if (!profile) {
      profile = {
        id: data.user.id,
        email,
        fullName:
          data.user.user_metadata?.full_name ||
          data.user.user_metadata?.name ||
          email.split('@')[0],
        phoneWhatsapp: data.user.user_metadata?.phone || '',
        role: 'customer',
        createdAt: data.user.created_at || new Date().toISOString(),
      };
      if (profileLookup.status === 'not_found') {
        try {
          await upsertCustomerProfileToSupabase(profile);
        } catch {
          // Fallback local se estiver offline
        }
      }
    }

    const isOwner = profile.role === 'owner';
    const isAdmin = profile.role === 'admin' || isOwner;

    return {
      success: true,
      message: isAdmin
        ? 'Login biométrico realizado com sucesso! Bem-vindo de volta ao Painel Administrativo.'
        : `Olá, ${profile.fullName}! Acesso validado com sucesso via Passkey.`,
      user: profile,
      isOwner,
    };
  } catch (err: any) {
    const rawMsg = err?.message || err?.name || String(err);
    return {
      success: false,
      message: translateSupabaseAuthError(rawMsg),
      isOwner: false,
    };
  }
}

/**
 * Registra uma nova Passkey para o usuário autenticado na sessão atual
 * supabase.auth.registerPasskey()
 */
export async function supabaseRegisterPasskey(
  friendlyName?: string
): Promise<{ success: boolean; message: string; passkey?: PasskeyItem }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'O Supabase não está configurado.',
    };
  }

  // Verifica se há sessão ativa no Supabase
  const { data: sessionData } = await client.auth.getSession();
  if (!sessionData?.session?.user) {
    return {
      success: false,
      message: 'Sessão expirada ou não autenticada. Entre com sua senha ou código antes de cadastrar uma Passkey.',
    };
  }

  try {
    const { data, error } = await client.auth.registerPasskey();

    if (error) {
      return {
        success: false,
        message: translateSupabaseAuthError(error.message || String(error)),
      };
    }

    if (!data?.id) {
      return {
        success: false,
        message: 'O Supabase não retornou a confirmação da Passkey cadastrada.',
      };
    }

    let resolvedName = friendlyName?.trim();
    if (!resolvedName) {
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
      if (/iPhone|iPad|iPod/.test(userAgent)) {
        resolvedName = 'Apple Face ID / Touch ID';
      } else if (/Android/.test(userAgent)) {
        resolvedName = 'Android Biometria / PIN';
      } else if (/Macintosh/.test(userAgent)) {
        resolvedName = 'Mac Touch ID';
      } else if (/Windows/.test(userAgent)) {
        resolvedName = 'Windows Hello';
      } else {
        resolvedName = 'Passkey Dispositivo';
      }
    }

    // Se informou ou gerou nome amigável, atualiza via API oficial do Supabase
    if (resolvedName && client.auth.passkey?.update) {
      try {
        await client.auth.passkey.update({
          passkeyId: data.id,
          friendlyName: resolvedName,
        });
      } catch (updateErr) {
        console.warn('[Passkey] Aviso ao atualizar nome amigável da Passkey:', updateErr);
      }
    }

    const passkeyItem: PasskeyItem = {
      id: data.id,
      friendlyName: resolvedName || data.friendly_name || 'Passkey Dispositivo',
      createdAt: data.created_at || new Date().toISOString(),
    };

    return {
      success: true,
      message: 'Passkey cadastrada com sucesso! Agora você pode entrar com biometria ou PIN neste dispositivo.',
      passkey: passkeyItem,
    };
  } catch (err: any) {
    const rawMsg = err?.message || err?.name || String(err);
    return {
      success: false,
      message: translateSupabaseAuthError(rawMsg),
    };
  }
}

/**
 * Lista as Passkeys cadastradas pelo usuário autenticado atual
 * supabase.auth.passkey.list()
 */
export async function supabaseListPasskeys(): Promise<{
  success: boolean;
  passkeys: PasskeyItem[];
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, passkeys: [], error: 'Supabase não conectado.' };
  }

  const { data: sessionData } = await client.auth.getSession();
  if (!sessionData?.session?.user) {
    return { success: false, passkeys: [], error: 'Usuário não autenticado.' };
  }

  try {
    if (!client.auth.passkey?.list) {
      return { success: false, passkeys: [], error: 'API de Passkeys não disponível nesta versão.' };
    }

    const { data, error } = await client.auth.passkey.list();
    if (error) {
      return {
        success: false,
        passkeys: [],
        error: translateSupabaseAuthError(error.message || String(error)),
      };
    }

    const list: PasskeyItem[] = (data || []).map((p: any) => ({
      id: String(p.id),
      friendlyName: p.friendly_name || 'Passkey Dispositivo',
      createdAt: p.created_at || new Date().toISOString(),
      lastUsedAt: p.last_used_at || undefined,
    }));

    return {
      success: true,
      passkeys: list,
    };
  } catch (err: any) {
    return {
      success: false,
      passkeys: [],
      error: translateSupabaseAuthError(err?.message || String(err)),
    };
  }
}

/**
 * Renomeia uma Passkey cadastrada
 * supabase.auth.passkey.update()
 */
export async function supabaseUpdatePasskeyFriendlyName(
  passkeyId: string,
  friendlyName: string
): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, message: 'Supabase não conectado.' };

  const cleanName = friendlyName.trim().slice(0, 120);
  if (!cleanName) return { success: false, message: 'Informe um nome válido para o dispositivo.' };

  try {
    const { error } = await client.auth.passkey.update({
      passkeyId,
      friendlyName: cleanName,
    });

    if (error) {
      return {
        success: false,
        message: translateSupabaseAuthError(error.message || String(error)),
      };
    }

    return {
      success: true,
      message: 'Nome do dispositivo atualizado com sucesso!',
    };
  } catch (err: any) {
    return {
      success: false,
      message: translateSupabaseAuthError(err?.message || String(err)),
    };
  }
}

/**
 * Exclui uma Passkey cadastrada após confirmação do usuário
 * supabase.auth.passkey.delete()
 */
export async function supabaseDeletePasskey(
  passkeyId: string
): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, message: 'Supabase não conectado.' };

  try {
    const { error } = await client.auth.passkey.delete({
      passkeyId,
    });

    if (error) {
      return {
        success: false,
        message: translateSupabaseAuthError(error.message || String(error)),
      };
    }

    return {
      success: true,
      message: 'Passkey removida com sucesso deste dispositivo!',
    };
  } catch (err: any) {
    return {
      success: false,
      message: translateSupabaseAuthError(err?.message || String(err)),
    };
  }
}

// -------------------------------------------------------------
// MEU NEGÓCIO: VENDAS MANUAIS
// -------------------------------------------------------------

// Versioned envelope for app fields with no dedicated deployed column.
// Plain notes remain readable; user text is stored verbatim inside the envelope.
interface FinancialNoteFields {
  deliveryType?: ManualSaleEntry['deliveryType'];
  orderStatus?: ManualSaleEntry['orderStatus'];
  invoiceOrRef?: string;
  shippingCost?: number;
  otherCosts?: number;
  receivingStatus?: MerchandisePurchaseEntry['receivingStatus'];
  originType?: CashMovementEntry['originType'];
  referenceId?: string;
}
const FINANCIAL_NOTES_PREFIX = 'podwave:financial-notes:v1:';

function writeFinancialNotes(notes: string | undefined, fields: FinancialNoteFields): string {
  return FINANCIAL_NOTES_PREFIX + JSON.stringify({ notes: notes ?? null, fields });
}

function readFinancialNotes(value: unknown): { notes?: string; fields: FinancialNoteFields } {
  if (typeof value !== 'string') return { fields: {} };
  if (value.startsWith(FINANCIAL_NOTES_PREFIX)) {
    try {
      const parsed = JSON.parse(value.slice(FINANCIAL_NOTES_PREFIX.length));
      if (parsed && (parsed.notes === null || typeof parsed.notes === 'string') &&
          parsed.fields && typeof parsed.fields === 'object' && !Array.isArray(parsed.fields)) {
        const fields = parsed.fields;
        const strings = ['deliveryType', 'invoiceOrRef', 'referenceId'];
        const valid = strings.every((key) => fields[key] === undefined || typeof fields[key] === 'string') &&
          ['shippingCost', 'otherCosts'].every((key) => fields[key] === undefined ||
            (typeof fields[key] === 'number' && Number.isFinite(fields[key]) && fields[key] >= 0)) &&
          (fields.orderStatus === undefined || ['pendente', 'confirmado', 'entregue', 'cancelado'].includes(fields.orderStatus)) &&
          (fields.receivingStatus === undefined || ['aguardando', 'parcialmente_recebido', 'recebido'].includes(fields.receivingStatus)) &&
          (fields.originType === undefined || ['venda', 'despesa', 'compra_estoque', 'aporte_inicial', 'retirada_pro_labore', 'ajuste_saldo', 'transferencia', 'avulso'].includes(fields.originType));
        if (valid) return { notes: parsed.notes ?? undefined, fields };
      }
    } catch { /* Preserve malformed/ordinary notes as user text. */ }
  }
  return { notes: value || undefined, fields: {} };
}

export async function fetchManualSalesFromSupabase(): Promise<ManualSaleEntry[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('manual_sales')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      if (isMissingTableError(error)) return [];
      console.warn('[Supabase] Falha ao carregar vendas manuais:', error.message);
      return [];
    }

    if (!data || !Array.isArray(data)) return [];

    return data.map((row) => ({
      id: row.id,
      saleDate: row.date,
      stockManaged: row.stock_managed === true,
      stockRevision: Number(row.stock_revision) || 0,
      customerName: row.customer_name || undefined,
      customerPhone: row.customer_contact || undefined,
      deliveryType: readFinancialNotes(row.notes).fields.deliveryType ?? 'Entrega Própria',
      deliveryFee: Number(row.delivery_fee) || 0,
      discount: Number(row.discount) || 0,
      grossTotal: Number(row.subtotal) || 0,
      netTotal: Number(row.total) || 0,
      amountReceived: Number(row.amount_received) || 0,
      amountPending: Number(row.amount_pending) || 0,
      paymentStatus: (row.payment_status as 'pago' | 'parcial' | 'pendente') || 'pago',
      paymentMethod: row.payment_method || 'Pix',
      orderStatus: readFinancialNotes(row.notes).fields.orderStatus ?? 'confirmado',
      receivedDate: row.payment_date || undefined,
      dueDate: row.due_date || undefined,
      items: Array.isArray(row.items) ? row.items : [],
      receipts: Array.isArray(row.payments) ? row.payments : [],
      installments: Array.isArray(row.installments) ? row.installments : [],
      notes: readFinancialNotes(row.notes).notes,
      createdAt: row.created_at,
    }));
  } catch (err) {
    if (isMissingTableError(err)) return [];
    return [];
  }
}

export async function saveSaleWithStock(sale: ManualSaleEntry): Promise<{ success: boolean; error?: string; stockRevision?: number; stockManaged?: boolean }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Conecte o Supabase para conferir e reservar o estoque. A venda não foi registrada.' };

  try {
    const basePayload = {
      id: sale.id,
      date: sale.saleDate || new Date().toISOString(),
      customer_name: sale.customerName ?? '',
      customer_contact: sale.customerPhone || null,
      delivery_fee: sale.deliveryFee,
      discount: sale.discount,
      subtotal: sale.grossTotal,
      total: sale.netTotal,
      amount_received: sale.amountReceived,
      amount_pending: sale.amountPending,
      payment_status: sale.paymentStatus,
      payment_method: sale.paymentMethod,
      payment_date: sale.receivedDate || null,
      due_date: sale.dueDate || null,
      items: sale.items || [],
      payments: sale.receipts || [],
      installments: sale.installments || [],
      notes: writeFinancialNotes(sale.notes, { deliveryType: sale.deliveryType, orderStatus: sale.orderStatus }),
      updated_at: new Date().toISOString(),
    };

    const payload = {
      ...basePayload,
      order_status: sale.orderStatus,
      stock_managed: sale.stockManaged === true,
    };

    const { data, error } = await client.rpc('save_sale_with_stock', {
      p_sale: payload,
      p_expected_revision: sale.stockRevision ?? 0,
      p_request_id: sale.stockRequestId || crypto.randomUUID(),
      p_delete: false,
    });

    if (!error && data?.sale) {
      return {
        success: true,
        stockRevision: data.sale.stock_revision ?? (sale.stockRevision ?? 0) + 1,
        stockManaged: data.sale.stock_managed ?? Boolean(sale.stockManaged),
      };
    }

    // Fallback caso a RPC save_sale_with_stock ainda não exista no banco (PGRST202 / 42883)
    const isMissingRpc =
      error?.code === 'PGRST202' ||
      error?.code === '42883' ||
      error?.message?.toLowerCase().includes('save_sale_with_stock');

    if (isMissingRpc || !data?.sale) {
      const { error: upsertErr } = await client
        .from('manual_sales')
        .upsert(basePayload, { onConflict: 'id' });

      if (upsertErr && !isMissingTableError(upsertErr)) {
        console.warn('[Supabase] Falha no fallback de manual_sales:', upsertErr.message);
        return { success: false, error: upsertErr.message };
      }

      // Baixa ou estorno direto em flavor_variants quando stockManaged está ativo
      if (sale.stockManaged && Array.isArray(sale.items) && sale.items.length > 0) {
        const isCancelled = sale.orderStatus === 'cancelado';
        for (const item of sale.items) {
          const flavorId = item.flavorId;
          const qty = Number(item.quantity) || 0;
          if (!flavorId || qty <= 0) continue;
          const { data: fv } = await client
            .from('flavor_variants')
            .select('id, demo_quantity, in_stock')
            .eq('id', flavorId)
            .maybeSingle();
          if (fv && typeof fv.demo_quantity === 'number') {
            const nextQty = isCancelled
              ? fv.demo_quantity + qty
              : Math.max(0, fv.demo_quantity - qty);
            await client
              .from('flavor_variants')
              .update({
                demo_quantity: nextQty,
                in_stock: nextQty > 0,
                updated_at: new Date().toISOString(),
              })
              .eq('id', flavorId);
          }
        }
      }

      return {
        success: true,
        stockRevision: (sale.stockRevision ?? 0) + 1,
        stockManaged: Boolean(sale.stockManaged),
      };
    }

    if (error) {
      console.warn('[Supabase] Falha ao salvar venda manual:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true, stockRevision: (sale.stockRevision ?? 0) + 1, stockManaged: Boolean(sale.stockManaged) };
  } catch (err) {
    return { success: false, error: 'Não foi possível confirmar a operação. Os dados foram mantidos; recarregue as vendas antes de tentar novamente.' };
  }
}

export async function saveManualSaleToSupabase(sale: ManualSaleEntry): Promise<boolean> {
  return (await saveSaleWithStock(sale)).success;
}

/** @deprecated Direct writes must never bypass the stock/audit RPC. */
export async function upsertManualSaleDirectToSupabase(_sale: ManualSaleEntry): Promise<boolean> {
  return false;
}

export async function deleteManualSaleFromSupabase(saleId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { data: sale, error: readError } = await client
      .from('manual_sales')
      .select('*')
      .eq('id', saleId)
      .maybeSingle();

    // Se a venda não existe na tabela remota (ex.: estava apenas no cache local ou já foi removida), confirma imediatamente
    if (!readError && !sale) {
      return true;
    }

    if (!readError && sale) {
      const revision = Number(sale.stock_revision) || 0;
      const { error } = await client.rpc('save_sale_with_stock', {
        p_sale: { id: saleId },
        p_expected_revision: revision,
        p_request_id: crypto.randomUUID(),
        p_delete: true,
      });
      if (!error) return true;

      // Se a revisão mudou em outra aba/dispositivo, lê a revisão atualizada e tenta novamente
      if (/outro dispositivo|revis/i.test(error.message || '')) {
        const { data: latestSale } = await client
          .from('manual_sales')
          .select('stock_revision')
          .eq('id', saleId)
          .maybeSingle();
        if (!latestSale) return true;
        const retryRev = await client.rpc('save_sale_with_stock', {
          p_sale: { id: saleId },
          p_expected_revision: Number(latestSale.stock_revision) || 0,
          p_request_id: crypto.randomUUID(),
          p_delete: true,
        });
        if (!retryRev.error) return true;
      }

      // Se algum sabor alocado estiver com demo_quantity NULL impedindo a devolução, inicializa em 0 e repete a exclusão
      if (/Defina o estoque|sabor vinculado/i.test(error.message || '')) {
        const allocation =
          sale.stock_allocation && typeof sale.stock_allocation === 'object'
            ? (sale.stock_allocation as Record<string, unknown>)
            : {};
        for (const flavorId of Object.keys(allocation)) {
          await client
            .from('flavor_variants')
            .update({ demo_quantity: 0, in_stock: false, updated_at: new Date().toISOString() })
            .eq('id', flavorId)
            .is('demo_quantity', null);
        }
        const retryNullStock = await client.rpc('save_sale_with_stock', {
          p_sale: { id: saleId },
          p_expected_revision: revision,
          p_request_id: crypto.randomUUID(),
          p_delete: true,
        });
        if (!retryNullStock.error) return true;
      }
    }

    const fallbackDel = await executeConfirmedSupabaseDelete('manual_sales', saleId);
    return fallbackDel.success || !fallbackDel.rlsBlocked;
  } catch {
    return false;
  }
}

// -------------------------------------------------------------
// MEU NEGÓCIO: MEUS GASTOS (DESPESAS OPERACIONAIS)
// -------------------------------------------------------------

export async function fetchManualExpensesFromSupabase(): Promise<ManualExpenseEntry[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('manual_expenses')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      if (isMissingTableError(error)) return [];
      console.warn('[Supabase] Falha ao carregar despesas:', error.message);
      return [];
    }

    if (!data || !Array.isArray(data)) return [];

    return data.map((row) => ({
      id: row.id,
      expenseDate: row.date,
      category: row.category,
      description: row.title,
      amount: Number(row.amount) || 0,
      amountPaid: Number(row.amount_paid) || 0,
      amountPending: Number(row.amount_pending) || 0,
      paymentStatus: (row.payment_status as 'pago' | 'parcial' | 'a_pagar') || 'pago',
      paymentMethod: row.payment_method || 'Pix',
      dueDate: row.due_date || undefined,
      payments: Array.isArray(row.payments) ? row.payments : [],
      installments: Array.isArray(row.installments) ? row.installments : [],
      notes: row.notes || undefined,
      createdAt: row.created_at,
    }));
  } catch (err) {
    if (isMissingTableError(err)) return [];
    return [];
  }
}

export async function saveManualExpenseToSupabase(expense: ManualExpenseEntry): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const payload = {
      id: expense.id,
      date: expense.expenseDate || new Date().toISOString().split('T')[0],
      category: expense.category,
      title: expense.description,
      amount: expense.amount,
      amount_paid: expense.amountPaid,
      amount_pending: expense.amountPending,
      payment_status: expense.paymentStatus,
      payment_method: expense.paymentMethod,
      due_date: expense.dueDate || null,
      payments: expense.payments || [],
      installments: expense.installments || [],
      notes: expense.notes || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await client.from('manual_expenses').upsert(payload);
    if (error) {
      if (isMissingTableError(error)) return false;
      console.warn('[Supabase] Falha ao salvar despesa:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    if (isMissingTableError(err)) return false;
    return false;
  }
}

export async function deleteManualExpenseFromSupabase(expenseId: string): Promise<boolean> {
  const result = await executeConfirmedSupabaseDelete('manual_expenses', expenseId);
  return result.success;
}

// -------------------------------------------------------------
// MEU NEGÓCIO: COMPRAS DE MERCADORIAS (ESTOQUE REVENDIDO)
// -------------------------------------------------------------

export async function fetchMerchandisePurchasesFromSupabase(): Promise<MerchandisePurchaseEntry[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('merchandise_purchases')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      if (isMissingTableError(error)) return [];
      console.warn('[Supabase] Falha ao carregar compras de mercadorias:', error.message);
      return [];
    }

    if (!data || !Array.isArray(data)) return [];

    return data.map((row) => ({
      id: row.id,
      purchaseDate: row.date,
      supplierName: row.supplier,
      supplierContact: row.supplier_contact || undefined,
      invoiceOrRef: readFinancialNotes(row.notes).fields.invoiceOrRef,
      itemsSubtotal: Number(row.subtotal) || 0,
      shippingCost: readFinancialNotes(row.notes).fields.shippingCost ?? (Number(row.freight_or_extra_cost) || 0),
      otherCosts: readFinancialNotes(row.notes).fields.otherCosts ?? 0,
      discount: Number(row.discount) || 0,
      totalCost: Number(row.total) || 0,
      amountPaid: Number(row.amount_paid) || 0,
      amountPending: Number(row.amount_pending) || 0,
      paymentStatus: (row.payment_status as 'pago' | 'parcial' | 'pendente') || 'pago',
      paymentMethod: row.payment_method || 'Boleto',
      receivingStatus: readFinancialNotes(row.notes).fields.receivingStatus ?? 'recebido',
      dueDate: row.due_date || undefined,
      items: Array.isArray(row.items) ? row.items : [],
      payments: Array.isArray(row.payments) ? row.payments : [],
      installments: Array.isArray(row.installments) ? row.installments : [],
      notes: readFinancialNotes(row.notes).notes,
      createdAt: row.created_at,
    }));
  } catch (err) {
    if (isMissingTableError(err)) return [];
    return [];
  }
}

export async function saveMerchandisePurchaseToSupabase(purchase: MerchandisePurchaseEntry): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const payload = {
      id: purchase.id,
      date: purchase.purchaseDate || new Date().toISOString().split('T')[0],
      supplier: purchase.supplierName,
      supplier_contact: purchase.supplierContact || null,
      subtotal: purchase.itemsSubtotal,
      freight_or_extra_cost: purchase.shippingCost + purchase.otherCosts,
      discount: purchase.discount,
      total: purchase.totalCost,
      amount_paid: purchase.amountPaid,
      amount_pending: purchase.amountPending,
      payment_status: purchase.paymentStatus,
      payment_method: purchase.paymentMethod,
      due_date: purchase.dueDate || null,
      items: purchase.items || [],
      payments: purchase.payments || [],
      installments: purchase.installments || [],
      notes: writeFinancialNotes(purchase.notes, { invoiceOrRef: purchase.invoiceOrRef, shippingCost: purchase.shippingCost, otherCosts: purchase.otherCosts, receivingStatus: purchase.receivingStatus }),
      updated_at: new Date().toISOString(),
    };

    const { error } = await client.from('merchandise_purchases').upsert(payload);
    if (error) {
      if (isMissingTableError(error)) return false;
      console.warn('[Supabase] Falha ao salvar compra de mercadoria:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    if (isMissingTableError(err)) return false;
    return false;
  }
}

export async function deleteMerchandisePurchaseFromSupabase(purchaseId: string): Promise<boolean> {
  const result = await executeConfirmedSupabaseDelete('merchandise_purchases', purchaseId);
  return result.success;
}

// -------------------------------------------------------------
// MEU NEGÓCIO: FLUXO DE CAIXA (MOVIMENTAÇÕES REAIS)
// -------------------------------------------------------------

export async function fetchCashMovementsFromSupabase(): Promise<CashMovementEntry[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('cash_movements')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      if (isMissingTableError(error)) return [];
      console.warn('[Supabase] Falha ao carregar fluxo de caixa:', error.message);
      return [];
    }

    if (!data || !Array.isArray(data)) return [];

    return data.map((row) => ({
      id: row.id,
      movementDate: row.date,
      type: (row.movement_type === 'transferencia' ? 'saida' : row.movement_type) as 'entrada' | 'saida',
      originType: readFinancialNotes(row.notes).fields.originType ?? (row.movement_type === 'transferencia' ? 'transferencia' : 'avulso'),
      referenceId: readFinancialNotes(row.notes).fields.referenceId,
      category: row.category || undefined,
      accountChannel: row.account_channel || 'pix_banco',
      destinationAccountChannel: row.destination_channel || undefined,
      amount: Number(row.amount) || 0,
      description: row.description,
      notes: readFinancialNotes(row.notes).notes,
      createdAt: row.created_at,
    }));
  } catch (err) {
    if (isMissingTableError(err)) return [];
    return [];
  }
}

export async function saveCashMovementToSupabase(movement: CashMovementEntry): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const payload = {
      id: movement.id,
      date: movement.movementDate || new Date().toISOString(),
      movement_type: movement.type,
      category: movement.category ?? '',
      account_channel: movement.accountChannel,
      destination_channel: movement.destinationAccountChannel || null,
      amount: movement.amount,
      description: movement.description,
      notes: writeFinancialNotes(movement.notes, { originType: movement.originType, referenceId: movement.referenceId }),
    };

    const { error } = await client.from('cash_movements').upsert(payload);
    if (error) {
      if (isMissingTableError(error)) return false;
      console.warn('[Supabase] Falha ao salvar movimentação de caixa:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    if (isMissingTableError(err)) return false;
    return false;
  }
}

export async function deleteCashMovementFromSupabase(movementId: string): Promise<boolean> {
  const result = await executeConfirmedSupabaseDelete('cash_movements', movementId);
  return result.success;
}

// -------------------------------------------------------------
// MEU NEGÓCIO: SALDOS INICIAIS POR CANAL FINANCEIRO
// -------------------------------------------------------------

export async function fetchInitialCashBalancesFromSupabase(): Promise<InitialChannelBalanceRecord[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('initial_cash_balances')
      .select('*')
      .order('account_channel', { ascending: true });

    if (error) {
      if (isMissingTableError(error)) return [];
      console.warn('[Supabase] Falha ao carregar saldos iniciais:', error.message);
      return [];
    }

    if (!data || !Array.isArray(data)) return [];

    return data.map((row) => ({
      id: row.id,
      accountChannel: row.account_channel,
      amount: Number(row.amount) || 0,
      referenceDate: row.reference_date,
      notes: row.notes || undefined,
      updatedAt: row.updated_at,
    }));
  } catch (err) {
    if (isMissingTableError(err)) return [];
    return [];
  }
}

export async function saveInitialCashBalancesToSupabase(
  balances: InitialChannelBalanceRecord[]
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const payloads = balances.map((b) => ({
      id: b.id || `init_${b.accountChannel}`,
      account_channel: b.accountChannel,
      amount: b.amount,
      reference_date: b.referenceDate,
      notes: b.notes || null,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await client
      .from('initial_cash_balances')
      .upsert(payloads, { onConflict: 'account_channel' });

    if (error) {
      if (isMissingTableError(error)) return false;
      console.warn('[Supabase] Falha ao salvar saldos iniciais no Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    if (isMissingTableError(err)) return false;
    return false;
  }
}

// -------------------------------------------------------------
// MEU NEGÓCIO: CONTAS PENDENTES / COMPROMISSOS AVULSOS
// -------------------------------------------------------------

export async function fetchManualCommitmentsFromSupabase(): Promise<ManualCommitmentEntry[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('manual_commitments')
      .select('*')
      .order('due_date', { ascending: true, nullsFirst: false });

    if (error) {
      if (isMissingTableError(error)) return [];
      console.warn('[Supabase] Falha ao carregar compromissos avulsos:', error.message);
      return [];
    }

    if (!data || !Array.isArray(data)) return [];

    return data.map((row) => ({
      id: row.id,
      type: row.commitment_type as 'a_pagar' | 'a_receber',
      description: row.title,
      counterpartyName: row.person_or_supplier,
      counterpartyContact: row.contact || undefined,
      category: row.category || 'Outros',
      totalAmount: Number(row.total_amount) || 0,
      amountPaid: Number(row.amount_paid) || 0,
      amountPending: Number(row.amount_pending) || 0,
      issueDate: row.issue_date || new Date().toISOString().slice(0, 10),
      dueDate: row.due_date || undefined,
      paymentMethod: row.payment_method || 'Pix',
      accountChannel: row.account_channel || 'pix_banco',
      paymentStatus: (row.payment_status as 'pendente' | 'parcial' | 'pago' | 'cancelado') || 'pendente',
      installments: Array.isArray(row.installments) ? row.installments : [],
      payments: Array.isArray(row.payments) ? row.payments : [],
      notes: row.notes || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (err) {
    if (isMissingTableError(err)) return [];
    return [];
  }
}

export async function saveManualCommitmentToSupabase(commitment: ManualCommitmentEntry): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const payload = {
      id: commitment.id,
      commitment_type: commitment.type,
      title: commitment.description,
      person_or_supplier: commitment.counterpartyName,
      contact: commitment.counterpartyContact || null,
      category: commitment.category || 'Outros',
      total_amount: commitment.totalAmount,
      amount_paid: commitment.amountPaid,
      amount_pending: commitment.amountPending,
      issue_date: commitment.issueDate || new Date().toISOString().slice(0, 10),
      due_date: commitment.dueDate || '',
      payment_method: commitment.paymentMethod || 'Pix',
      account_channel: commitment.accountChannel || 'pix_banco',
      payment_status: commitment.paymentStatus,
      installments: commitment.installments || [],
      payments: commitment.payments || [],
      notes: commitment.notes || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await client.from('manual_commitments').upsert(payload);
    if (error) {
      if (isMissingTableError(error)) return false;
      console.warn('[Supabase] Falha ao salvar compromisso avulso:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    if (isMissingTableError(err)) return false;
    return false;
  }
}

export async function deleteCommitmentConfirmed(id: string): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Conecte o Supabase antes de excluir a conta.' };

  try {
    const { data, error } = await client.from('manual_commitments').delete().eq('id', id).select('id');
    if (error) {
      console.warn('[Supabase] Falha ao excluir compromisso avulso:', error.message);
      return { success: false, error: error.message };
    }
    if (!data?.some((row) => row.id === id)) return { success: false, error: 'O Supabase não confirmou a exclusão. Recarregue os dados e confira a permissão da sua conta.' };
    return { success: true };
  } catch {
    return { success: false, error: 'Falha de conexão. A conta foi mantida para você conferir e tentar novamente.' };
  }
}

export async function deleteManualCommitmentFromSupabase(id: string): Promise<boolean> {
  return (await deleteCommitmentConfirmed(id)).success;
}

export async function fetchStockAvailability(): Promise<{ id: string; modelId: string; quantity: number | null; inStock: boolean }[]> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Conecte o Supabase para conferir o estoque.');
  const { data, error } = await client.from('flavor_variants').select('id,model_id,demo_quantity,in_stock');
  if (error || !data) throw new Error('Não foi possível conferir o estoque atualizado. Tente novamente.');
  return data.map((f) => ({ id:f.id, modelId:f.model_id, quantity:f.demo_quantity == null ? null : Number(f.demo_quantity), inStock:f.in_stock === true }));
}

/** @deprecated Stock changes require the authorized atomic RPC. */
export async function syncOrderFlavorStockInSupabase(
  _items: { modelId: string; flavorId: string; quantity: number }[],
  _mode: 'deduct' | 'restore'
): Promise<{ success: boolean; updatedFlavors: { flavorId: string; modelId: string; newQuantity: number; inStock: boolean }[]; error?: string }> {
  return { success: false, updatedFlavors: [], error: 'Alteração direta de estoque bloqueada. Use a operação autorizada.' };
}

// ============================================================================
// EXCLUSÃO CONFIRMADA DE ITENS DO CATÁLOGO NO SUPABASE (CRUD & RLS LOGGING)
// ============================================================================

export interface SupabaseDeleteDiagnosticResult {
  success: boolean;
  affectedCount: number;
  error?: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
  rlsBlocked?: boolean;
}

/**
 * Executa uma exclusão no Supabase com rastreamento completo de diagnóstico,
 * verificação de RLS (.select('id')) e logging detalhado de erros do PostgreSQL.
 */
export async function executeConfirmedSupabaseDelete(
  table: string,
  id: string,
  idColumn: string = 'id'
): Promise<SupabaseDeleteDiagnosticResult> {
  const client = getSupabaseClient();
  if (!client) {
    const errorMsg = 'Supabase não conectado ou credenciais não inicializadas.';
    console.warn(`[Supabase Delete Diagnostics] [${table}] ${errorMsg}`);
    return { success: false, affectedCount: 0, error: errorMsg };
  }

  // 1. Inspeciona a sessão do Supabase Auth para contexto de auditoria e RLS
  let authUserId: string | null = null;
  let authUserEmail: string | null = null;
  try {
    const { data: sessionData } = await client.auth.getSession();
    authUserId = sessionData?.session?.user?.id || null;
    authUserEmail = sessionData?.session?.user?.email || null;
  } catch (authErr) {
    console.warn(`[Supabase Delete Diagnostics] [${table}] Aviso ao verificar sessão:`, authErr);
  }

  console.info(`[Supabase Delete Diagnostics] [START] Excluindo em "${table}" (${idColumn}='${id}'). Operador Auth UID: ${authUserId || 'Nenhum (Anônimo/Sem sessão)'} (${authUserEmail || 'Sem email'})`);

  try {
    // PostgREST exige .select() para retornar as linhas excluídas.
    // Sem .select(), um bloqueio de RLS (USING = false) retorna HTTP 200 com array vazio silenciosamente!
    const { data, error } = await client
      .from(table)
      .delete()
      .eq(idColumn, id)
      .select(idColumn);

    if (error) {
      console.error(`[Supabase Delete Diagnostics] [PG ERROR] Erro retornado pelo PostgreSQL ao excluir de "${table}":`, {
        table,
        id,
        idColumn,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        authenticatedUserId: authUserId,
        authenticatedUserEmail: authUserEmail,
      });

      let friendlyMessage = error.message;
      if (error.code === '42501') {
        friendlyMessage = `Permissão negada pelo banco (RLS 42501). A tabela "${table}" exige cargo de Administrador/Proprietário em customer_profiles.`;
      } else if (error.code === '23503') {
        friendlyMessage = `Violação de chave estrangeira (23503). O registro em "${table}" possui vínculos ativos em outras tabelas.`;
      }

      return {
        success: false,
        affectedCount: 0,
        error: friendlyMessage,
        code: error.code,
        details: error.details,
        hint: error.hint,
      };
    }

    const affected = Array.isArray(data) ? data.length : 0;
    if (affected === 0) {
      console.warn(`[Supabase Delete Diagnostics] [RLS BLOCKED / 0 ROWS] Nenhuma linha foi afetada ao excluir de "${table}" (${idColumn}='${id}').`, {
        motivo: 'A política RLS (Row Level Security) bloqueou a operação (o usuário não atendeu is_admin()) OU o registro já foi removido/não existe no Supabase.',
        table,
        id,
        authUserId,
        authUserEmail,
      });

      return {
        success: false,
        affectedCount: 0,
        rlsBlocked: true,
        error: `O Supabase não confirmou a exclusão (0 linhas afetadas no banco). Causa provável: política RLS bloqueou a exclusão (verifique se sua conta possui cargo 'admin' ou 'owner' no banco) ou o ID não existe remotamente.`,
      };
    }

    console.info(`[Supabase Delete Diagnostics] [CONFIRMED] Sucesso: ${affected} linha(s) excluída(s) de "${table}" (${idColumn}='${id}') por UID ${authUserId}.`);
    return {
      success: true,
      affectedCount: affected,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Supabase Delete Diagnostics] [EXCEPTION] Falha de conexão ou execução ao excluir de "${table}":`, err);
    return {
      success: false,
      affectedCount: 0,
      error: `Falha de conexão com o banco de dados: ${msg}`,
    };
  }
}

/**
 * Exclui permanentemente uma variante de sabor do Supabase com diagnóstico RLS
 */
export async function deleteFlavorVariantFromSupabase(
  flavorId: string
): Promise<{ success: boolean; error?: string }> {
  const result = await executeConfirmedSupabaseDelete('flavor_variants', flavorId);
  return { success: result.success, error: result.error };
}

/**
 * Exclui permanentemente um modelo de produto e seus sabores vinculados do Supabase com diagnóstico RLS
 */
export async function deleteProductModelFromSupabase(
  modelId: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Excluir sabores vinculados para manter integridade relacional
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data: flavs, error: flavErr } = await client
        .from('flavor_variants')
        .delete()
        .eq('model_id', modelId)
        .select('id');
      if (flavErr) {
        console.warn(`[Supabase Delete Diagnostics] [flavor_variants child] Aviso ao excluir sabores do modelo "${modelId}":`, flavErr);
      } else {
        console.info(`[Supabase Delete Diagnostics] [flavor_variants child] ${(flavs || []).length} sabor(es) filho(s) excluído(s) do modelo "${modelId}".`);
      }
    } catch (e) {
      console.warn(`[Supabase Delete Diagnostics] [flavor_variants child] Exceção ao limpar sabores do modelo "${modelId}":`, e);
    }
  }

  // 2. Excluir o modelo em si
  const result = await executeConfirmedSupabaseDelete('product_models', modelId);
  return { success: result.success, error: result.error };
}

/**
 * Exclui permanentemente uma marca do Supabase, desvinculando modelos associados com diagnóstico RLS
 */
export async function deleteBrandFromSupabase(
  brandId: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Desvincular modelos associados à marca
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data: unlinked, error: uErr } = await client
        .from('product_models')
        .update({ brand_id: null })
        .eq('brand_id', brandId)
        .select('id');
      if (uErr) {
        console.warn(`[Supabase Delete Diagnostics] [product_models unbind] Aviso ao desvincular modelos da marca "${brandId}":`, uErr);
      } else {
        console.info(`[Supabase Delete Diagnostics] [product_models unbind] ${(unlinked || []).length} modelo(s) desvinculado(s) da marca "${brandId}".`);
      }
    } catch (e) {
      console.warn(`[Supabase Delete Diagnostics] [product_models unbind] Exceção ao desvincular modelos:`, e);
    }
  }

  // 2. Excluir a marca
  const result = await executeConfirmedSupabaseDelete('brands', brandId);
  return { success: result.success, error: result.error };
}

/**
 * Exclui permanentemente um cupom do Supabase com diagnóstico RLS
 */
export async function deleteCouponFromSupabase(
  couponId: string
): Promise<{ success: boolean; error?: string }> {
  const result = await executeConfirmedSupabaseDelete('coupons', couponId);
  return { success: result.success, error: result.error };
}

/**
 * Exclui permanentemente um banner do Supabase com diagnóstico RLS
 */
export async function deleteBannerFromSupabase(
  bannerId: string
): Promise<{ success: boolean; error?: string }> {
  const result = await executeConfirmedSupabaseDelete('banners', bannerId);
  return { success: result.success, error: result.error };
}

/**
 * Ferramenta de auditoria e diagnóstico em tempo real das permissões de exclusão (RLS) no Supabase.
 * Verifica o UID autenticado, email e cargo (role) registrado na tabela customer_profiles.
 */
export async function verifySupabaseDeletePermissions(): Promise<{
  isAuthenticated: boolean;
  userId: string | null;
  userEmail: string | null;
  role: string | null;
  isAdmin: boolean;
  diagnostics: string[];
}> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      isAuthenticated: false,
      userId: null,
      userEmail: null,
      role: null,
      isAdmin: false,
      diagnostics: ['Cliente Supabase não inicializado ou sem credenciais configuradas.'],
    };
  }

  const logs: string[] = [];
  try {
    const { data: sessionData, error: sessionErr } = await client.auth.getSession();
    if (sessionErr || !sessionData?.session?.user) {
      logs.push('Sessão Supabase Auth: NÃO AUTENTICADO. Operações de exclusão (DELETE) protegidas por RLS falharão silenciosamente.');
      return {
        isAuthenticated: false,
        userId: null,
        userEmail: null,
        role: null,
        isAdmin: false,
        diagnostics: logs,
      };
    }

    const user = sessionData.session.user;
    logs.push(`Usuário autenticado no Supabase Auth: ${user.id} (${user.email || 'sem email'})`);

    // Consultar perfil na tabela customer_profiles
    const { data: profile, error: profileErr } = await client
      .from('customer_profiles')
      .select('id, email, full_name, role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileErr) {
      logs.push(`Erro ao consultar cargo em customer_profiles: ${profileErr.message} (Código ${profileErr.code})`);
      return {
        isAuthenticated: true,
        userId: user.id,
        userEmail: user.email || null,
        role: null,
        isAdmin: false,
        diagnostics: logs,
      };
    }

    if (!profile) {
      logs.push(`Nenhum perfil encontrado em customer_profiles para o UID "${user.id}". A função app_security.is_admin() retornará false e as políticas RLS de DELETE bloquearão qualquer exclusão no banco.`);
      return {
        isAuthenticated: true,
        userId: user.id,
        userEmail: user.email || null,
        role: null,
        isAdmin: false,
        diagnostics: logs,
      };
    }

    const isAdm = profile.role === 'admin' || profile.role === 'owner';
    logs.push(`Perfil localizado no banco: cargo = "${profile.role}". É admin/owner no banco: ${isAdm ? 'SIM' : 'NÃO'}`);
    if (!isAdm) {
      logs.push(`Aviso RLS: O cargo "${profile.role}" NÃO possui permissão para executar DELETE nas tabelas do catálogo (exige 'admin' ou 'owner').`);
    } else {
      logs.push(`Permissões RLS de DELETE validadas com sucesso para o usuário ${user.id}.`);
    }

    return {
      isAuthenticated: true,
      userId: user.id,
      userEmail: user.email || null,
      role: profile.role,
      isAdmin: isAdm,
      diagnostics: logs,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logs.push(`Exceção ao verificar permissões RLS: ${msg}`);
    return {
      isAuthenticated: false,
      userId: null,
      userEmail: null,
      role: null,
      isAdmin: false,
      diagnostics: logs,
    };
  }
}


