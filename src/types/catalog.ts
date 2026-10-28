export type AvailabilityStatus = 'disponivel' | 'ultimas_unidades' | 'esgotado' | 'nao_informado';

export interface VariantAvailabilityInfo {
  status: AvailabilityStatus;
  label: string;
  badgeLabel: string;
  colorHex: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  icon: string;
  quantityText: string;
}

export interface VariantHistoryEntry {
  id: string;
  timestamp: string;
  modelId: string;
  modelName: string;
  brandName?: string;
  flavorId: string;
  flavorName: string;
  flavorEmoji: string;
  previousQuantity: number | null | undefined;
  newQuantity: number | null | undefined;
  updatedBy: string;
  changeType: 'quick_edit' | 'bulk_edit' | 'threshold_change' | 'reset';
  notes?: string;
}

export interface FlavorVariant {
  id: string;
  name: string;
  colorHex: string;
  iconEmoji: string;
  inStock: boolean;
  demoQuantity?: number | null; // Demonstrative quantity per flavor
  lowQuantityThreshold?: number; // Specific threshold for this flavor (default: 3)
  updatedAt?: string; // ISO string of last edit
  customImage?: string;
}

export interface ProductSpecs {
  battery: string;
  eLiquid: string;
  nicotine: string;
  chargeType: string;
  coil: string;
  airflow?: string;
}

export interface ProductModel {
  id: string;
  brandId: string;
  brandName: string;
  modelName: string;
  puffs: number;
  puffsLabel: string;
  badge?: '★ TOP' | 'LANÇAMENTO' | 'DESTAQUE' | 'PREMIUM' | 'NOVO' | string;
  startingPrice: number;
  imageUrl: string;
  additionalImages?: string[];
  flavors: FlavorVariant[];
  specs: ProductSpecs;
  description: string;
  category: string;
  active: boolean;
  lowQuantityThreshold?: number; // Optional model-level threshold override
}

export interface Brand {
  id: string;
  name: string;
  logoText?: string;
  logoUrl?: string;
  featured: boolean;
  country?: string;
  description?: string;
  cardColor?: string;
}

export interface BannerSlide {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  ctaText: string;
  ctaLink: string;
  active: boolean;
  imageUrl?: string;
  mobileImageUrl?: string;
  positionX?: number; // -100 to 100 (% offset)
  positionY?: number; // -100 to 100 (% offset)
  scale?: number; // 0.5 to 2.5
  objectFit?: 'cover' | 'contain' | 'fill';
  themeGradient?: 'neon' | 'cyan' | 'purple' | 'emerald' | 'gold' | string;
  tagline?: string;
  createdAt?: string;
}

export interface StoreSettings {
  storeName: string;
  legalNotice: string;
  supportEmail: string;
  supportPhone: string;
  whatsappNumber: string;
  themePreference: 'dark' | 'light';
  adminPassword?: string;
  vipDiscountPercent?: number; // Desconto padrão (%) para clientes com cargo 'vip' (ex: 10)
}

export interface CartItem {
  id: string; // unique item id: modelId + '-' + flavorId
  modelId: string;
  brandName: string;
  modelName: string;
  flavorId: string;
  flavorName: string;
  flavorColor: string;
  flavorEmoji: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percent' | 'fixed';
  value: number;
  description: string;
  minOrderValue?: number;
  applicableModelId?: string; // ID of specific model or 'all'
  applicableModelName?: string; // Display name of specific model
  maxUses?: number; // Maximum number of uses (undefined or 0 for unlimited)
  usedCount: number; // Number of times used
  active: boolean;
  createdAt?: string;
}

export interface OrderForm {
  fullName: string;
  phoneWhatsapp: string;
  address: string;
  bairro?: string;
  city?: string;
  numberAndComplement?: string;
  referencePoint?: string;
  isPickup: boolean;
  paymentMethod: string;
  notes: string;
  wantsLoyaltyCard: boolean;
  gpsMapsUrl?: string;
}

export type UserRole = 'customer' | 'vip' | 'admin' | 'owner';

export interface CustomerAddress {
  cep?: string;
  street: string;
  number: string;
  bairro: string;
  complement?: string;
  city: string;
  state?: string;
  referencePoint?: string;
}

export interface CustomerOrderHistoryItem {
  id: string;
  referenceId: string;
  createdAt: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  deliveryType: 'delivery' | 'pickup';
  addressSummary?: string;
  status: 'recebido' | 'em_separacao' | 'enviado' | 'entregue';
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phoneWhatsapp?: string;
  cpf?: string;
  role: UserRole;
  address?: CustomerAddress;
  orderHistory?: CustomerOrderHistoryItem[];
  createdAt?: string;
  vipDiscountCustom?: number; // Desconto VIP exclusivo personalizado para este cliente
}

export type ActivityActionType =
  | 'PRODUTO_ADICIONADO'
  | 'PRODUTO_EDITADO'
  | 'PRODUTO_REMOVIDO'
  | 'SABOR_ADICIONADO'
  | 'SABOR_EDITADO'
  | 'SABOR_REMOVIDO'
  | 'MARCA_ADICIONADA'
  | 'MARCA_EDITADA'
  | 'MARCA_REMOVIDA'
  | 'CUPOM_CRIADO'
  | 'CUPOM_EDITADO'
  | 'CUPOM_REMOVIDO'
  | 'ERRO_PERMISSAO'
  | 'ERRO_BANCO_DADOS';

export interface ActivityLogEntry {
  id: string;
  action: ActivityActionType;
  actionLabel: string;
  entity: 'product_models' | 'flavor_variants' | 'brands' | 'coupons' | 'settings' | 'auth';
  entityName: string;
  details: string;
  author: string;
  authorEmail?: string;
  status: 'sucesso' | 'erro' | 'alerta';
  errorMessage?: string;
  timestamp: string;
}
