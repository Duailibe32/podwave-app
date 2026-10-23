export interface FlavorVariant {
  id: string;
  name: string;
  colorHex: string;
  iconEmoji: string;
  inStock: boolean;
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
}

export interface Brand {
  id: string;
  name: string;
  logoText?: string;
  logoUrl?: string;
  featured: boolean;
  country?: string;
  description?: string;
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
  isPickup: boolean;
  paymentMethod: string;
  notes: string;
  wantsLoyaltyCard: boolean;
  gpsMapsUrl?: string;
}
