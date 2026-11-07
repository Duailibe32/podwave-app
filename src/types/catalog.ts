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

export interface ImageStorageConfig {
  autoClearOnStartup?: boolean; // Purgar cache temporário de imagens ao carregar o painel
  maxImageDimension?: number; // Dimensão máxima recomendada para fotos (ex: 320, 480, 640, 800)
  compressionQuality?: number; // Qualidade de compressão JPEG/WebP (ex: 0.70, 0.80, 0.90)
  cacheRetentionDays?: number; // Dias de retenção no navegador (0 = manual apenas, 7, 15, 30)
  enableBrowserCache?: boolean; // Habilitar armazenamento offline no Cache Storage API
  lastCacheClearedAt?: string; // Data ISO da última limpeza manual
}

export interface FlashSale {
  enabled: boolean;
  modelId: string;
  flavorId?: string;
  percent: number;
  startsAt: string;
  endsAt: string;
}

export interface ProgressiveDiscountConfig {
  flashSale?: FlashSale;
  enabled: boolean;
  title: string;
  tier1Label: string; // ex: 'Catálogo'
  tier2MinUnits: number; // padrão: 2
  tier2DiscountType?: 'percent' | 'fixed'; // padrão: 'percent'
  tier2DiscountPercent?: number; // padrão: 5 (5% OFF no Nível 2)
  tier2Label: string; // ex: '5% OFF ✓'
  tier2FreeShipping: boolean; // frete grátis a partir da quantidade do nível 2
  baseDeliveryFee?: number; // taxa padrão de entrega em R$; ausente = 0
  deliveryPricingMode?: 'fixed' | 'per_km';
  deliveryOrigins?: { id: string; city: string; state: string }[];
  deliveryRatePerKm?: number;
  deliveryMinimumFee?: number;
  deliveryCities?: { id: string; originId: string; city: string; state: string; distanceKm: number }[];
  tier3MinUnits: number; // padrão: 3
  tier3DiscountType?: 'percent' | 'fixed'; // padrão: 'percent'
  tier3DiscountPercent: number; // padrão: 10 (10% OFF no Nível 3)
  tier3Label: string; // ex: '10% OFF Total 🔥'
  freeShippingGoalValue: number; // usado como Compra Mínima para Pontuar 1 Selo (R$)
  minOrderForLoyaltyStamp?: number; // Compra Mínima para Pontuar 1 Selo no Cartão Fidelidade (R$)
}

export interface ComplementaryAddonItem {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: string;
  emoji?: string;
  active: boolean;
  themeColor?: 'cyan' | 'magenta' | 'emerald';
  applicableModelId?: string; // 'all' ou ID de um ProductModel principal vinculado
  applicableModelIds?: string[]; // Lista de IDs de produtos principais vinculados ('all' ou IDs específicos)
  applicableModelName?: string; // Nome de exibição do(s) produto(s) principal(is) vinculado(s)
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
  loyaltyGoalStamps?: number; // Meta padrão de selos do cartão fidelidade (padrão: 10)
  loyaltyDefaultReward?: string; // Recompensa padrão ao completar o cartão fidelidade
  pixKey?: string; // Chave Pix para respostas rápidas de pagamento
  pixKeyType?: 'telefone' | 'cpf' | 'cnpj' | 'email' | 'aleatoria';
  pixBeneficiary?: string; // Nome do favorecido/titular da conta Pix
  imageStorageConfig?: ImageStorageConfig; // Configuração personalizável de cache e armazenamento de imagens
  progressiveDiscountConfig?: ProgressiveDiscountConfig; // Configuração editável de Desconto Progressivo • Leve Mais, Pague Menos
  complementaryAddons?: ComplementaryAddonItem[]; // Configuração editável de Compre Junto • Acessórios Recomendados
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
  discountType: 'percent' | 'fixed' | 'free_shipping';
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
  loyaltyStampsSnapshot?: number;
  loyaltyGoalSnapshot?: number;
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

export type CatalogOrderStatus =
  | 'recebido'
  | 'confirmado'
  | 'em_separacao'
  | 'enviado'
  | 'entregue'
  | 'cancelado';

export type CatalogOrderPaymentStatus = 'pendente' | 'parcial' | 'pago' | 'estornado';

export interface OrderStatusHistoryEntry {
  id: string;
  fromStatus: CatalogOrderStatus | null;
  toStatus: CatalogOrderStatus;
  changedAt: string;
  changedBy: string;
  changedByEmail?: string;
  origin: 'checkout' | 'admin_panel' | 'customer_card' | 'system';
  reason?: string;
}

export interface CustomerOrderHistoryItem {
  id: string;
  _syncStatus?: 'synced' | 'pending_sync' | 'sync_error';
  referenceId: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  createdAt: string;
  updatedAt?: string;
  updatedBy?: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  deliveryFee?: number;
  total: number;
  paymentMethod: string;
  paymentStatus?: CatalogOrderPaymentStatus;
  amountPaid?: number;
  deliveryType: 'delivery' | 'pickup';
  destinationCity?: string;
  addressSummary?: string;
  customerNotes?: string;
  status: CatalogOrderStatus;
  cancelReason?: string;
  statusHistory?: OrderStatusHistoryEntry[];
  couponCode?: string;
  vipDiscountApplied?: boolean;
  vipDiscountAmount?: number;
  loyaltyEligible?: boolean;
  loyaltyStampGranted?: boolean;
  loyaltyStampGrantedAt?: string;
  loyaltyStampGrantedBy?: string;
  loyaltyGrantIdempotencyKey?: string;
  financialSaleId?: string;
  financialRecordedAt?: string;
  stockDeducted?: boolean;
  stockDeductedAt?: string;
  version?: number;
}

export interface LoyaltyHistoryEntry {
  id: string;
  date: string;
  action: 'add_stamp' | 'remove_stamp' | 'set_stamps' | 'redeem_reward' | 'reset_card';
  delta: number;
  stampsAfter: number;
  note?: string;
  updatedBy?: string;
  rewardTitle?: string;
  cycleNumber?: number;
  orderId?: string;
  orderReferenceId?: string;
  idempotencyKey?: string;
}

export interface LoyaltyCardData {
  stamps: number; // Quantidade atual de selos no ciclo (0 a goal)
  goal: number; // Meta de selos para prêmio (padrão: 10)
  completedCards: number; // Quantos cartões completos já foram resgatados
  rewardDescription: string; // Descrição do benefício/prêmio ao completar
  updatedAt?: string;
  history?: LoyaltyHistoryEntry[];
  featuredBadgeId?: string;
  grantedBadgeIds?: string[];
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
  loyaltyCard?: LoyaltyCardData; // Cartão de fidelidade digital controlado manualmente pelo admin
}

export interface PasskeyItem {
  id: string;
  friendlyName?: string;
  createdAt: string;
  lastUsedAt?: string;
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
  | 'PEDIDO_ATUALIZADO'
  | 'FIDELIDADE_ATUALIZADA'
  | 'CONFIGURACAO_ALTERADA'
  | 'ERRO_PERMISSAO'
  | 'ERRO_BANCO_DADOS';

export interface ActivityLogEntry {
  id: string;
  action: ActivityActionType;
  actionLabel: string;
  entity:
    | 'product_models'
    | 'flavor_variants'
    | 'brands'
    | 'coupons'
    | 'settings'
    | 'auth'
    | 'manual_sales'
    | 'manual_commitments'
    | 'customer_orders'
    | 'customer_profiles';
  entityName: string;
  details: string;
  author: string;
  authorEmail?: string;
  status: 'sucesso' | 'erro' | 'alerta';
  errorMessage?: string;
  timestamp: string;
}

// -------------------------------------------------------------
// MEU NEGÓCIO — CONTROLE GERENCIAL & FINANCEIRO MANUAL
// -------------------------------------------------------------

export type SyncStatus = 'synced' | 'pending_sync' | 'sync_error';

export interface SyncMetadata {
  _syncStatus?: SyncStatus;
  _syncError?: string;
  _lastSyncAttempt?: string;
}

export type BusinessSection =
  | 'clientes'
  | 'visao_geral'
  | 'vendas'
  | 'gastos'
  | 'compras'
  | 'fluxo_caixa'
  | 'pendentes'
  | 'relatorios';

export type PeriodPreset =
  | 'hoje'
  | 'ontem'
  | 'ultimos_7_dias'
  | 'ultimos_30_dias'
  | 'este_mes'
  | 'mes_anterior'
  | 'este_ano'
  | 'personalizado'
  | 'todo_historico';

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export interface ManualSaleItem {
  id?: string;
  productId?: string;
  flavorId?: string;
  productName: string;
  brandName?: string;
  modelName?: string;
  flavorName?: string;
  quantity: number;
  unitPrice: number;
  unitCost?: number;
  subtotal: number;
}

export interface SaleReceiptItem {
  id: string;
  amount: number;
  receiptDate: string; // YYYY-MM-DD or ISO string
  paymentMethod: string;
  notes?: string;
  createdAt?: string;
}

export interface ManualSaleEntry {
  id: string;
  stockManaged?: boolean;
  stockRevision?: number;
  stockRequestId?: string;
  saleDate: string; // ISO string
  customerName?: string;
  customerPhone?: string;
  deliveryType: 'Entrega Própria' | 'Retirada no Local' | 'Motoboy Terceirizado' | 'Correios / Envio' | string;
  deliveryFee: number;
  discount: number;
  grossTotal: number;
  netTotal: number;
  amountReceived: number;
  amountPending: number;
  paymentStatus: 'pago' | 'parcial' | 'pendente';
  paymentMethod: 'Pix' | 'Dinheiro' | 'Cartão de Débito' | 'Cartão de Crédito' | 'Fiado' | 'Misto' | string;
  orderStatus: 'pendente' | 'confirmado' | 'entregue' | 'cancelado';
  receivedDate?: string;
  dueDate?: string; // Data de vencimento prevista para pagamentos a prazo/fiado
  items: ManualSaleItem[];
  receipts?: SaleReceiptItem[];
  installments?: CommitmentInstallmentItem[];
  notes?: string;
  createdAt?: string;
  _syncStatus?: SyncStatus;
  _syncError?: string;
  _lastSyncAttempt?: string;
}

export type ExpenseCategory =
  | 'Combustível / Entregas'
  | 'Embalagens / Sacolas'
  | 'Aluguel / Ponto Físico'
  | 'Alimentação'
  | 'Manutenção / Moto'
  | 'Marketing / Divulgação'
  | 'Software / Telefonia'
  | 'Outros';

export interface ExpensePaymentItem {
  id: string;
  amount: number;
  paymentDate: string; // YYYY-MM-DD
  paymentMethod: string;
  notes?: string;
  createdAt?: string;
}

export interface ManualExpenseEntry {
  id: string;
  expenseDate: string; // YYYY-MM-DD
  category: ExpenseCategory | string;
  description: string;
  amount: number;
  amountPaid: number;
  amountPending: number;
  paymentStatus: 'pago' | 'parcial' | 'a_pagar';
  paymentMethod: 'Pix' | 'Dinheiro' | 'Cartão' | 'Boleto' | string;
  dueDate?: string;
  payments?: ExpensePaymentItem[];
  installments?: CommitmentInstallmentItem[];
  notes?: string;
  createdAt?: string;
  _syncStatus?: SyncStatus;
  _syncError?: string;
  _lastSyncAttempt?: string;
}

export interface PurchasePaymentItem {
  id: string;
  amount: number;
  paymentDate: string; // YYYY-MM-DD
  paymentMethod: string;
  notes?: string;
  createdAt?: string;
}

export interface MerchandisePurchaseItem {
  id?: string;
  productId?: string;
  name: string;
  flavorName?: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface MerchandisePurchaseEntry {
  id: string;
  purchaseDate: string; // YYYY-MM-DD
  supplierName: string;
  supplierContact?: string;
  invoiceOrRef?: string;
  itemsSubtotal: number;
  shippingCost: number;
  otherCosts: number;
  discount: number;
  totalCost: number;
  amountPaid: number;
  amountPending: number;
  paymentStatus: 'pago' | 'parcial' | 'pendente';
  paymentMethod: string;
  receivingStatus: 'aguardando' | 'parcialmente_recebido' | 'recebido';
  dueDate?: string;
  items: MerchandisePurchaseItem[];
  payments?: PurchasePaymentItem[];
  installments?: CommitmentInstallmentItem[];
  notes?: string;
  createdAt?: string;
  _syncStatus?: SyncStatus;
  _syncError?: string;
  _lastSyncAttempt?: string;
}

export type CashAccountChannel = 'pix_banco' | 'dinheiro_caixa' | 'cartao_maquininha' | 'outro';

export interface CashMovementEntry {
  id: string;
  movementDate: string; // ISO string
  type: 'entrada' | 'saida';
  originType:
    | 'venda'
    | 'despesa'
    | 'compra_estoque'
    | 'aporte_inicial'
    | 'retirada_pro_labore'
    | 'ajuste_saldo'
    | 'transferencia'
    | 'avulso';
  referenceId?: string;
  category?: string;
  accountChannel: CashAccountChannel;
  destinationAccountChannel?: CashAccountChannel; // para transferências internas
  amount: number;
  description: string;
  notes?: string;
  createdAt?: string;
  _syncStatus?: SyncStatus;
  _syncError?: string;
  _lastSyncAttempt?: string;
}

export interface InitialChannelBalanceRecord {
  id: string; // e.g. 'init_pix_banco'
  accountChannel: CashAccountChannel;
  amount: number;
  referenceDate: string; // YYYY-MM-DD
  notes?: string;
  updatedAt?: string;
  _syncStatus?: SyncStatus;
  _syncError?: string;
  _lastSyncAttempt?: string;
}

export interface InitialCashBalanceConfig {
  referenceDate: string; // YYYY-MM-DD (global de referência padrão)
  pix_banco: number;
  dinheiro_caixa: number;
  cartao_maquininha: number;
  outro: number;
  channelReferenceDates?: {
    pix_banco?: string;
    dinheiro_caixa?: string;
    cartao_maquininha?: string;
    outro?: string;
  };
}

// -------------------------------------------------------------
// MEU NEGÓCIO: ETAPA 6 — CONTAS PENDENTES & COMPROMISSOS AVULSOS
// -------------------------------------------------------------

export interface CommitmentPaymentItem {
  id: string;
  amount: number;
  paymentDate: string; // YYYY-MM-DD
  paymentMethod: string;
  accountChannel: CashAccountChannel;
  notes?: string;
  createdAt?: string;
}

export interface CommitmentInstallmentItem {
  id: string;
  installmentNumber: number;
  totalInstallments: number;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  amountPaid: number;
  amountPending: number;
  status: 'pendente' | 'parcial' | 'pago' | 'vencido';
  notes?: string;
}

export interface ManualCommitmentEntry {
  id: string;
  type: 'a_pagar' | 'a_receber';
  description: string;
  counterpartyName: string; // cliente, fornecedor ou credor
  counterpartyContact?: string;
  category: string;
  totalAmount: number;
  amountPaid: number;
  amountPending: number;
  issueDate: string; // YYYY-MM-DD
  dueDate?: string; // YYYY-MM-DD
  paymentMethod?: string;
  accountChannel?: CashAccountChannel;
  paymentStatus: 'pendente' | 'parcial' | 'pago' | 'cancelado';
  installments?: CommitmentInstallmentItem[];
  payments?: CommitmentPaymentItem[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  _syncStatus?: SyncStatus;
  _syncError?: string;
  _lastSyncAttempt?: string;
}

export type PendingAccountOrigin = 'venda' | 'despesa' | 'compra_estoque' | 'avulso';
export type PendingAccountType = 'a_pagar' | 'a_receber';
export type PendingAccountUrgency =
  | 'vencido'
  | 'vence_hoje'
  | 'vence_breve'
  | 'em_aberto'
  | 'sem_vencimento'
  | 'quitado';

export interface PendingAccountItem {
  id: string;
  originId: string;
  originType: PendingAccountOrigin;
  type: PendingAccountType;
  description: string;
  counterpartyName: string;
  counterpartyContact?: string;
  category?: string;
  issueDate?: string; // YYYY-MM-DD
  dueDate?: string; // YYYY-MM-DD
  totalAmount: number;
  amountPaid: number;
  amountPending: number;
  paymentStatus?: 'pendente' | 'parcial' | 'pago' | 'cancelado';
  paymentMethod?: string;
  accountChannel?: CashAccountChannel;
  notes?: string;
  urgency: PendingAccountUrgency;
  urgencyStatus?: PendingAccountUrgency;
  diasAtraso?: number;
  daysDifference?: number; // dias até o vencimento (negativo = dias de atraso)
  installments?: CommitmentInstallmentItem[];
  paymentsCount?: number;
  createdAt?: string;
  sourceRecord?: ManualSaleEntry | ManualExpenseEntry | MerchandisePurchaseEntry | ManualCommitmentEntry;
}




