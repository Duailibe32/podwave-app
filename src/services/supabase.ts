import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Brand, ProductModel, FlavorVariant, BannerSlide, StoreSettings, Coupon, UserProfile, CustomerOrderHistoryItem } from '../types/catalog';

// Storage keys for runtime Supabase credentials if configured via UI
const SUPABASE_URL_KEY = 'podwave_supabase_url';
const SUPABASE_ANON_KEY = 'podwave_supabase_anon_key';

export function getSupabaseCredentials(): { url: string; anonKey: string; isConfigured: boolean } {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const storedUrl = typeof window !== 'undefined' ? localStorage.getItem(SUPABASE_URL_KEY) || '' : '';
  const storedKey = typeof window !== 'undefined' ? localStorage.getItem(SUPABASE_ANON_KEY) || '' : '';

  const url = (storedUrl || envUrl || '').trim();
  const anonKey = (storedKey || envKey || '').trim();

  const isConfigured = Boolean(
    url && 
    anonKey && 
    !url.includes('your-project') && 
    !anonKey.includes('your-anon-public-key')
  );

  return { url, anonKey, isConfigured };
}

export function saveSupabaseCredentials(url: string, anonKey: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SUPABASE_URL_KEY, url.trim());
    localStorage.setItem(SUPABASE_ANON_KEY, anonKey.trim());
    supabaseInstance = null; // Reset cached client instance
  }
}

export function clearSupabaseCredentials() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SUPABASE_URL_KEY);
    localStorage.removeItem(SUPABASE_ANON_KEY);
    supabaseInstance = null;
  }
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey, isConfigured } = getSupabaseCredentials();

  if (!isConfigured) {
    return null;
  }

  if (!supabaseInstance) {
    try {
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
    msg.includes('schema cache') ||
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
    // 1. Marcas
    const { data: brandsData, error: brandsError } = await client.from('brands').select('*');
    if (brandsError) {
      if (isMissingTableError(brandsError)) {
        console.info('[Supabase] Conexão ativa, mas as tabelas ainda não foram criadas. Execute o script de Migration no SQL Editor.');
        return { data: null, tablesExist: false };
      }
      throw brandsError;
    }

    // 2. Modelos
    const { data: modelsData, error: modelsError } = await client.from('product_models').select('*');
    if (modelsError) {
      if (isMissingTableError(modelsError)) {
        return { data: null, tablesExist: false };
      }
      throw modelsError;
    }

    // 3. Sabores
    const { data: flavorsData, error: flavorsError } = await client.from('flavor_variants').select('*');
    if (flavorsError) {
      if (isMissingTableError(flavorsError)) {
        return { data: null, tablesExist: false };
      }
      throw flavorsError;
    }

    // 4. Banners
    const { data: bannersData, error: bannersError } = await client.from('banners').select('*');
    if (bannersError) {
      if (isMissingTableError(bannersError)) {
        return { data: null, tablesExist: false };
      }
      throw bannersError;
    }

    // 5. Cupons
    const { data: couponsData, error: couponsError } = await client.from('coupons').select('*');
    if (couponsError) {
      if (isMissingTableError(couponsError)) {
        return { data: null, tablesExist: false };
      }
      throw couponsError;
    }

    // 6. Configurações
    const { data: settingsData } = await client.from('store_settings').select('*').limit(1).maybeSingle();

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

    let mappedSettings: StoreSettings | undefined;
    if (settingsData) {
      mappedSettings = {
        storeName: settingsData.store_name,
        supportEmail: settingsData.support_email,
        supportPhone: settingsData.support_phone,
        whatsappNumber: settingsData.whatsapp_number,
        legalNotice: settingsData.legal_notice,
        themePreference: 'dark',
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
      const { error: fErr } = await client.from('flavor_variants').upsert(allFlavors);
      if (fErr) throw fErr;
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

    // 6. Upsert Store Settings
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
 * Registra log de auditoria no Supabase
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

/**
 * Salva ou atualiza perfil de cliente no Supabase (com endereço e dados cadastrais)
 */
export async function upsertCustomerProfileToSupabase(profile: UserProfile): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const payload = {
      id: profile.id,
      email: profile.email.toLowerCase().trim(),
      full_name: profile.fullName,
      phone: profile.phoneWhatsapp || null,
      cpf: profile.cpf || null,
      role: profile.role,
      address_cep: profile.address?.cep || null,
      address_street: profile.address?.street || null,
      address_number: profile.address?.number || null,
      address_neighborhood: profile.address?.bairro || null,
      address_complement: profile.address?.complement || null,
      address_city: profile.address?.city || null,
      address_state: profile.address?.state || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await client.from('customer_profiles').upsert(payload);
    if (error) {
      if (isMissingTableError(error)) {
        return false;
      }
      console.warn('[Supabase] Aviso ao salvar perfil do cliente:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    if (isMissingTableError(err)) return false;
    console.warn('[Supabase] Falha ao salvar perfil:', err);
    return false;
  }
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

    return {
      id: data.id,
      email: data.email,
      fullName: data.full_name,
      phoneWhatsapp: data.phone || '',
      cpf: data.cpf || '',
      role: (data.role as 'customer' | 'owner') || 'customer',
      address: {
        cep: data.address_cep || '',
        street: data.address_street || '',
        number: data.address_number || '',
        bairro: data.address_neighborhood || '',
        complement: data.address_complement || '',
        city: data.address_city || '',
        state: data.address_state || '',
      },
      createdAt: data.created_at,
    };
  } catch (err) {
    if (isMissingTableError(err)) return null;
    return null;
  }
}

/**
 * Salva pedido realizado pelo cliente no Supabase
 */
export async function saveCustomerOrderToSupabase(
  order: CustomerOrderHistoryItem,
  customerId: string
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const payload = {
      id: order.id,
      customer_id: customerId,
      reference_id: order.referenceId,
      items: order.items,
      subtotal: order.subtotal,
      discount: order.discount,
      total: order.total,
      payment_method: order.paymentMethod,
      delivery_type: order.deliveryType,
      address_summary: order.addressSummary || null,
      status: order.status || 'recebido',
      created_at: order.createdAt || new Date().toISOString(),
    };

    const { error } = await client.from('customer_orders').upsert(payload);
    if (error) {
      if (isMissingTableError(error)) return false;
      console.warn('[Supabase] Aviso ao salvar pedido do cliente:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    if (isMissingTableError(err)) return false;
    return false;
  }
}

/**
 * Busca histórico de pedidos do cliente no Supabase
 */
export async function fetchCustomerOrdersFromSupabase(
  customerId: string
): Promise<CustomerOrderHistoryItem[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('customer_orders')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      if (isMissingTableError(error)) return [];
      console.warn('[Supabase] Aviso ao buscar pedidos do cliente:', error.message);
      return [];
    }

    if (!data || !Array.isArray(data)) return [];

    return data.map((o) => ({
      id: o.id,
      referenceId: o.reference_id,
      createdAt: o.created_at,
      items: o.items || [],
      subtotal: Number(o.subtotal) || 0,
      discount: Number(o.discount) || 0,
      total: Number(o.total) || 0,
      paymentMethod: o.payment_method || 'WhatsApp',
      deliveryType: o.delivery_type || 'delivery',
      addressSummary: o.address_summary || undefined,
      status: o.status || 'recebido',
    }));
  } catch (err) {
    if (isMissingTableError(err)) return [];
    return [];
  }
}

