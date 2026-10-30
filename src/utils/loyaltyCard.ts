import { LoyaltyCardData, LoyaltyHistoryEntry, UserProfile } from '../types/catalog';

export const DEFAULT_LOYALTY_GOAL = 10;
export const DEFAULT_LOYALTY_REWARD = 'Brinde Especial ou Desconto Exclusivo na 10ª Compra';
export const LOYALTY_STORAGE_KEY = 'podwave_loyalty_cards_v1';
const LOYALTY_NOTE_PREFIX = 'podwave:loyalty:v1:';

export function normalizeLoyaltyCard(
  raw?: Partial<LoyaltyCardData> | null,
  defaultGoal = DEFAULT_LOYALTY_GOAL,
  defaultReward = DEFAULT_LOYALTY_REWARD
): LoyaltyCardData {
  const safeGoal =
    typeof raw?.goal === 'number' && Number.isFinite(raw.goal) && raw.goal >= 3 && raw.goal <= 30
      ? Math.round(raw.goal)
      : defaultGoal;

  const safeStamps =
    typeof raw?.stamps === 'number' && Number.isFinite(raw.stamps) && raw.stamps >= 0
      ? Math.min(safeGoal, Math.max(0, Math.round(raw.stamps)))
      : 0;

  const safeCompleted =
    typeof raw?.completedCards === 'number' && Number.isFinite(raw.completedCards) && raw.completedCards >= 0
      ? Math.round(raw.completedCards)
      : 0;

  const safeReward =
    typeof raw?.rewardDescription === 'string' && raw.rewardDescription.trim().length > 0
      ? raw.rewardDescription.trim()
      : defaultReward;

  const safeHistory: LoyaltyHistoryEntry[] = Array.isArray(raw?.history)
    ? raw!.history
        .filter((h): h is LoyaltyHistoryEntry => Boolean(h && typeof h === 'object' && typeof h.id === 'string'))
        .slice(0, 40)
    : [];

  const safeGrantedBadges: string[] = Array.isArray(raw?.grantedBadgeIds)
    ? Array.from(new Set(raw!.grantedBadgeIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)))
    : [];

  return {
    stamps: safeStamps,
    goal: safeGoal,
    completedCards: safeCompleted,
    rewardDescription: safeReward,
    updatedAt: typeof raw?.updatedAt === 'string' ? raw.updatedAt : undefined,
    history: safeHistory,
    featuredBadgeId: typeof raw?.featuredBadgeId === 'string' ? raw.featuredBadgeId : undefined,
    grantedBadgeIds: safeGrantedBadges,
  };
}

export function encodeLoyaltyToBenefitNote(card: LoyaltyCardData): string {
  const normalized = normalizeLoyaltyCard(card);
  return `${LOYALTY_NOTE_PREFIX}${JSON.stringify(normalized)}`;
}

export function decodeLoyaltyFromBenefitNote(
  rawNote?: string | null,
  defaultGoal = DEFAULT_LOYALTY_GOAL,
  defaultReward = DEFAULT_LOYALTY_REWARD
): LoyaltyCardData | undefined {
  if (!rawNote || typeof rawNote !== 'string') return undefined;
  const trimmed = rawNote.trim();
  if (!trimmed.startsWith(LOYALTY_NOTE_PREFIX)) return undefined;

  try {
    const jsonPart = trimmed.slice(LOYALTY_NOTE_PREFIX.length);
    const parsed = JSON.parse(jsonPart);
    return normalizeLoyaltyCard(parsed, defaultGoal, defaultReward);
  } catch {
    return undefined;
  }
}

export function getUserLoyaltyCard(
  user?: UserProfile | null,
  defaultGoal = DEFAULT_LOYALTY_GOAL,
  defaultReward = DEFAULT_LOYALTY_REWARD
): LoyaltyCardData {
  return normalizeLoyaltyCard(user?.loyaltyCard, defaultGoal, defaultReward);
}

export interface LoyaltyMutationInput {
  type: 'add' | 'remove' | 'set' | 'redeem' | 'reset' | 'toggle_badge' | 'feature_badge';
  value?: number;
  goal?: number;
  rewardDescription?: string;
  note?: string;
  author?: string;
  badgeId?: string;
  orderId?: string;
  orderReferenceId?: string;
  idempotencyKey?: string;
}

export function hasOrderStampInCard(
  card?: Partial<LoyaltyCardData> | null,
  orderId?: string | null,
  idempotencyKey?: string | null
): boolean {
  const normalized = normalizeLoyaltyCard(card);
  const history = normalized.history || [];
  if (!orderId && !idempotencyKey) return false;
  return history.some(
    (h) =>
      h.action === 'add_stamp' &&
      ((orderId && h.orderId === orderId) || (idempotencyKey && h.idempotencyKey === idempotencyKey))
  );
}

export function applyLoyaltyMutation(
  current: LoyaltyCardData,
  mutation: LoyaltyMutationInput,
  nowIso = new Date().toISOString()
): LoyaltyCardData {
  const base = normalizeLoyaltyCard(current);
  const nextGoal =
    typeof mutation.goal === 'number' && mutation.goal >= 3 && mutation.goal <= 30
      ? Math.round(mutation.goal)
      : base.goal;
  const nextReward =
    typeof mutation.rewardDescription === 'string' && mutation.rewardDescription.trim().length > 0
      ? mutation.rewardDescription.trim()
      : base.rewardDescription;

  if (mutation.type === 'feature_badge') {
    return {
      ...base,
      featuredBadgeId: mutation.badgeId || undefined,
      updatedAt: nowIso,
    };
  }

  if (mutation.type === 'toggle_badge' && mutation.badgeId) {
    const currentGranted = new Set(base.grantedBadgeIds || []);
    if (currentGranted.has(mutation.badgeId)) {
      currentGranted.delete(mutation.badgeId);
    } else {
      currentGranted.add(mutation.badgeId);
    }
    return {
      ...base,
      grantedBadgeIds: Array.from(currentGranted),
      updatedAt: nowIso,
    };
  }

  // Idempotency protection: never grant a second stamp for the same orderId or idempotencyKey
  if (
    mutation.type === 'add' &&
    (mutation.orderId || mutation.idempotencyKey) &&
    hasOrderStampInCard(base, mutation.orderId, mutation.idempotencyKey)
  ) {
    return base;
  }

  let nextStamps = Math.min(nextGoal, base.stamps);
  let nextCompleted = base.completedCards;
  let actionType: LoyaltyHistoryEntry['action'] = 'set_stamps';
  let delta = 0;

  if (mutation.type === 'add') {
    const step = typeof mutation.value === 'number' && mutation.value > 0 ? Math.round(mutation.value) : 1;
    nextStamps = Math.min(nextGoal, base.stamps + step);
    delta = nextStamps - base.stamps;
    actionType = 'add_stamp';
  } else if (mutation.type === 'remove') {
    const step = typeof mutation.value === 'number' && mutation.value > 0 ? Math.round(mutation.value) : 1;
    nextStamps = Math.max(0, base.stamps - step);
    delta = nextStamps - base.stamps;
    actionType = 'remove_stamp';
  } else if (mutation.type === 'set') {
    const target = typeof mutation.value === 'number' ? Math.round(mutation.value) : base.stamps;
    nextStamps = Math.min(nextGoal, Math.max(0, target));
    delta = nextStamps - base.stamps;
    actionType = 'set_stamps';
  } else if (mutation.type === 'redeem') {
    nextCompleted = base.completedCards + 1;
    delta = -base.stamps;
    nextStamps = 0;
    actionType = 'redeem_reward';
  } else if (mutation.type === 'reset') {
    delta = -base.stamps;
    nextStamps = 0;
    actionType = 'reset_card';
  }

  const historyEntry: LoyaltyHistoryEntry = {
    id: `loy-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    date: nowIso,
    action: actionType,
    delta,
    stampsAfter: nextStamps,
    note: mutation.note?.trim() || undefined,
    updatedBy: mutation.author?.trim() || undefined,
    rewardTitle: actionType === 'redeem_reward' ? nextReward : undefined,
    cycleNumber: actionType === 'redeem_reward' ? nextCompleted : undefined,
    orderId: mutation.orderId?.trim() || undefined,
    orderReferenceId: mutation.orderReferenceId?.trim() || undefined,
    idempotencyKey:
      mutation.idempotencyKey?.trim() ||
      (mutation.orderId ? `stamp-order-${mutation.orderId.trim()}` : undefined),
  };

  return {
    stamps: nextStamps,
    goal: nextGoal,
    completedCards: nextCompleted,
    rewardDescription: nextReward,
    updatedAt: nowIso,
    history: [historyEntry, ...(base.history || [])].slice(0, 40),
    featuredBadgeId: base.featuredBadgeId,
    grantedBadgeIds: base.grantedBadgeIds,
  };
}

export function loadLocalLoyaltyCardsMap(): Record<string, LoyaltyCardData> {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LOYALTY_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const result: Record<string, LoyaltyCardData> = {};
    for (const [userId, card] of Object.entries(parsed)) {
      if (userId && card && typeof card === 'object') {
        result[userId] = normalizeLoyaltyCard(card as Partial<LoyaltyCardData>);
      }
    }
    return result;
  } catch {
    return {};
  }
}

export function saveLocalLoyaltyCardsMap(map: Record<string, LoyaltyCardData>): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LOYALTY_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore storage errors
  }
}

export type LoyaltyTierId = 'bronze' | 'silver' | 'gold';

export interface LoyaltyTierInfo {
  id: LoyaltyTierId;
  name: string;
  shortLabel: string;
  rangeLabel: string;
  minStamps: number;
  maxStamps: number | null;
  tagline: string;
  benefits: string[];
  badgeClass: string;
  cardBorderClass: string;
  accentTextClass: string;
  progressBarClass: string;
}

export const LOYALTY_TIERS: LoyaltyTierInfo[] = [
  {
    id: 'bronze',
    name: 'Nível Bronze',
    shortLabel: 'Bronze',
    rangeLabel: '0 a 9 selos acumulados',
    minStamps: 0,
    maxStamps: 9,
    tagline: 'Entrada oficial no Clube PodWave com recompensas garantidas a cada ciclo.',
    benefits: [
      'Acúmulo oficial de 1 selo digital a cada pedido confirmado e entregue',
      'Brinde especial ou desconto exclusivo ao completar o ciclo de 10 selos',
      'Histórico digital de selos salvo diretamente no perfil da loja',
    ],
    badgeClass: 'bg-amber-700/25 border-amber-500/50 text-amber-300',
    cardBorderClass: 'border-amber-500/40 bg-gradient-to-br from-amber-950/30 via-[#121633] to-[#0D1022]',
    accentTextClass: 'text-amber-300',
    progressBarClass: 'from-amber-500 via-orange-400 to-amber-300',
  },
  {
    id: 'silver',
    name: 'Nível Prata',
    shortLabel: 'Prata',
    rangeLabel: '10 a 24 selos acumulados',
    minStamps: 10,
    maxStamps: 24,
    tagline: 'Vantagens aceleradas para clientes recorrentes que já completaram seu 1º cartão.',
    benefits: [
      'Todos os benefícios do Nível Bronze garantidos',
      'Prioridade na separação e confirmação de pedidos via WhatsApp',
      'Acesso antecipado aos novos sabores e lançamentos da semana',
      'Mimo especial surpresa em compras realizadas no mês de aniversário',
    ],
    badgeClass: 'bg-slate-300/20 border-cyan-300/60 text-cyan-200',
    cardBorderClass: 'border-cyan-400/50 bg-gradient-to-br from-slate-800/40 via-[#121633] to-[#0D1022]',
    accentTextClass: 'text-cyan-200',
    progressBarClass: 'from-slate-300 via-[#00DFFF] to-cyan-200',
  },
  {
    id: 'gold',
    name: 'Nível Ouro',
    shortLabel: 'Ouro',
    rangeLabel: '25+ selos acumulados',
    minStamps: 25,
    maxStamps: null,
    tagline: 'Status máximo de fidelidade PodWave com tratamento VIP e prêmios superiores.',
    benefits: [
      'Todos os benefícios dos níveis Bronze e Prata incluídos',
      'Upgrade de recompensa ao fechar a cartela (Brinde Premium ou Super Desconto)',
      'Condição especial na taxa de entrega em pedidos elegíveis',
      'Acesso a promoções relâmpago e lotes limitados exclusivos para clientes Ouro',
    ],
    badgeClass: 'bg-yellow-400/20 border-yellow-300/70 text-yellow-200 shadow-[0_0_15px_rgba(250,204,21,0.25)]',
    cardBorderClass: 'border-yellow-400/60 bg-gradient-to-br from-yellow-950/35 via-[#161538] to-[#0D1022]',
    accentTextClass: 'text-yellow-300',
    progressBarClass: 'from-yellow-400 via-amber-300 to-[#00DFFF]',
  },
];

export function getTotalAccumulatedStamps(card?: Partial<LoyaltyCardData> | null): number {
  const normalized = normalizeLoyaltyCard(card);
  return normalized.completedCards * normalized.goal + normalized.stamps;
}

export interface LoyaltyTierProgress {
  currentTier: LoyaltyTierInfo;
  nextTier: LoyaltyTierInfo | null;
  totalStamps: number;
  stampsIntoTier: number;
  stampsNeededForNext: number;
  progressToNextPercent: number;
}

export function getLoyaltyTierProgress(card?: Partial<LoyaltyCardData> | null): LoyaltyTierProgress {
  const totalStamps = getTotalAccumulatedStamps(card);

  let currentIndex = 0;
  for (let i = LOYALTY_TIERS.length - 1; i >= 0; i--) {
    if (totalStamps >= LOYALTY_TIERS[i].minStamps) {
      currentIndex = i;
      break;
    }
  }

  const currentTier = LOYALTY_TIERS[currentIndex];
  const nextTier = currentIndex < LOYALTY_TIERS.length - 1 ? LOYALTY_TIERS[currentIndex + 1] : null;

  if (!nextTier) {
    return {
      currentTier,
      nextTier: null,
      totalStamps,
      stampsIntoTier: totalStamps - currentTier.minStamps,
      stampsNeededForNext: 0,
      progressToNextPercent: 100,
    };
  }

  const tierSpan = Math.max(1, nextTier.minStamps - currentTier.minStamps);
  const stampsIntoTier = Math.max(0, totalStamps - currentTier.minStamps);
  const stampsNeededForNext = Math.max(0, nextTier.minStamps - totalStamps);
  const progressToNextPercent = Math.min(100, Math.round((stampsIntoTier / tierSpan) * 100));

  return {
    currentTier,
    nextTier,
    totalStamps,
    stampsIntoTier,
    stampsNeededForNext,
    progressToNextPercent,
  };
}

export interface LoyaltyMilestoneInfo {
  isMilestone: boolean;
  milestoneType: 'first_stamp' | 'halfway' | 'almost_there' | 'complete' | 'tier_up' | null;
  title: string;
  subtitle: string;
  milestoneSlots: number[];
}

export function getLoyaltyMilestoneInfo(card?: Partial<LoyaltyCardData> | null): LoyaltyMilestoneInfo {
  const normalized = normalizeLoyaltyCard(card);
  const { stamps, goal } = normalized;
  const totalStamps = getTotalAccumulatedStamps(normalized);
  const halfwaySlot = Math.max(2, Math.floor(goal / 2));
  const almostSlot = Math.max(halfwaySlot + 1, goal - 2);
  const milestoneSlots = Array.from(new Set([halfwaySlot, almostSlot, goal]));

  if (stamps >= goal) {
    return {
      isMilestone: true,
      milestoneType: 'complete',
      title: 'Marco Máximo Atingido: Cartão Completo!',
      subtitle: `Você alcançou ${goal}/${goal} selos! Solicite o resgate da sua recompensa no próximo pedido.`,
      milestoneSlots,
    };
  }

  if (totalStamps === 10 || totalStamps === 25) {
    const tierName = totalStamps >= 25 ? 'Nível Ouro' : 'Nível Prata';
    return {
      isMilestone: true,
      milestoneType: 'tier_up',
      title: `Novo Patamar Desbloqueado: ${tierName}!`,
      subtitle: `Com ${totalStamps} selos acumulados no total, seus benefícios exclusivos de ${tierName} já estão ativos.`,
      milestoneSlots,
    };
  }

  if (stamps === almostSlot) {
    const remaining = goal - stamps;
    return {
      isMilestone: true,
      milestoneType: 'almost_there',
      title: 'Marco de Reta Final Atingido!',
      subtitle: `Faltam apenas ${remaining} ${remaining === 1 ? 'selo' : 'selos'} para desbloquear sua recompensa do cartão!`,
      milestoneSlots,
    };
  }

  if (stamps === halfwaySlot) {
    return {
      isMilestone: true,
      milestoneType: 'halfway',
      title: 'Marco de 50% do Cartão Concluído!',
      subtitle: `Você já conquistou metade dos selos (${stamps}/${goal}). Continue acumulando para liberar seu prêmio!`,
      milestoneSlots,
    };
  }

  if (stamps === 1 && normalized.completedCards === 0) {
    return {
      isMilestone: true,
      milestoneType: 'first_stamp',
      title: '1º Selo Conquistado no Clube PodWave!',
      subtitle: 'Sua jornada de fidelidade começou! Acumule selos a cada pedido confirmado.',
      milestoneSlots,
    };
  }

  return {
    isMilestone: false,
    milestoneType: null,
    title: '',
    subtitle: '',
    milestoneSlots,
  };
}

export interface RedeemedRewardRecord {
  id: string;
  date: string;
  cycleNumber: number;
  rewardTitle: string;
  stampsRedeemed: number;
  note?: string;
  updatedBy?: string;
  isEstimated?: boolean;
}

export function getRedeemedRewardsHistory(card?: Partial<LoyaltyCardData> | null): RedeemedRewardRecord[] {
  const normalized = normalizeLoyaltyCard(card);
  const history = normalized.history || [];

  const explicitRedemptions = history.filter((entry) => entry.action === 'redeem_reward');
  const records: RedeemedRewardRecord[] = explicitRedemptions.map((entry, idx) => ({
    id: entry.id,
    date: entry.date,
    cycleNumber:
      typeof entry.cycleNumber === 'number' && entry.cycleNumber > 0
        ? entry.cycleNumber
        : Math.max(1, normalized.completedCards - idx),
    rewardTitle: entry.rewardTitle || normalized.rewardDescription || DEFAULT_LOYALTY_REWARD,
    stampsRedeemed: entry.delta ? Math.abs(entry.delta) : normalized.goal,
    note: entry.note,
    updatedBy: entry.updatedBy,
    isEstimated: false,
  }));

  if (normalized.completedCards > records.length) {
    const missingCount = normalized.completedCards - records.length;
    const fallbackDate = normalized.updatedAt || new Date().toISOString();
    for (let i = missingCount; i >= 1; i--) {
      records.push({
        id: `legacy-redeem-${i}`,
        date: fallbackDate,
        cycleNumber: i,
        rewardTitle: normalized.rewardDescription || DEFAULT_LOYALTY_REWARD,
        stampsRedeemed: normalized.goal,
        note: 'Ciclo concluído e validado anteriormente no programa de fidelidade',
        isEstimated: true,
      });
    }
  }

  return records.sort((a, b) => b.cycleNumber - a.cycleNumber);
}

export type LoyaltyBadgeRarity = 'comum' | 'rara' | 'epica' | 'lendaria';

export interface LoyaltyBadgeDefinition {
  id: string;
  title: string;
  description: string;
  requirementLabel: string;
  iconEmoji: string;
  rarity: LoyaltyBadgeRarity;
  rarityLabel: string;
  rarityBadgeClass: string;
  cardBorderClass: string;
  unlockedBorderClass: string;
  unlockedGlowClass: string;
}

export interface UnlockedLoyaltyBadge extends LoyaltyBadgeDefinition {
  unlocked: boolean;
  unlockedAt?: string;
  progressCurrent: number;
  progressTarget: number;
  progressPercent: number;
  isManualGrant?: boolean;
  isFeatured?: boolean;
}

export const LOYALTY_BADGES: LoyaltyBadgeDefinition[] = [
  {
    id: 'first_wave',
    title: 'Primeira Onda',
    description: 'Conquistou o 1º selo validado no Cartão de Fidelidade PodWave.',
    requirementLabel: 'Acumular 1 selo',
    iconEmoji: '🌊',
    rarity: 'comum',
    rarityLabel: 'Comum',
    rarityBadgeClass: 'bg-cyan-500/15 border-cyan-400/40 text-cyan-200',
    cardBorderClass: 'border-cyan-400/45 bg-gradient-to-br from-cyan-950/35 via-[#121633] to-[#0D1022]',
    unlockedBorderClass: 'border-cyan-400/50 bg-gradient-to-br from-cyan-950/35 via-[#121633] to-[#0D1022]',
    unlockedGlowClass: 'shadow-[0_0_14px_rgba(0,223,255,0.18)]',
  },
  {
    id: 'high_frequency',
    title: 'Ritmo Constante',
    description: 'Atingiu a metade da cartela com 5 selos acumulados.',
    requirementLabel: 'Acumular 5 selos',
    iconEmoji: '⚡',
    rarity: 'comum',
    rarityLabel: 'Comum',
    rarityBadgeClass: 'bg-purple-500/15 border-purple-400/40 text-purple-200',
    cardBorderClass: 'border-purple-400/45 bg-gradient-to-br from-purple-950/35 via-[#121633] to-[#0D1022]',
    unlockedBorderClass: 'border-purple-400/50 bg-gradient-to-br from-purple-950/35 via-[#121633] to-[#0D1022]',
    unlockedGlowClass: 'shadow-[0_0_14px_rgba(132,35,218,0.22)]',
  },
  {
    id: 'first_reward',
    title: 'Caçador de Recompensas',
    description: 'Completou um ciclo inteiro de 10 selos ou resgatou seu 1º prêmio oficial.',
    requirementLabel: '10 selos ou 1 prêmio resgatado',
    iconEmoji: '🏆',
    rarity: 'rara',
    rarityLabel: 'Rara',
    rarityBadgeClass: 'bg-emerald-500/15 border-emerald-400/45 text-emerald-200',
    cardBorderClass: 'border-emerald-400/50 bg-gradient-to-br from-emerald-950/35 via-[#121633] to-[#0D1022]',
    unlockedBorderClass: 'border-emerald-400/55 bg-gradient-to-br from-emerald-950/35 via-[#121633] to-[#0D1022]',
    unlockedGlowClass: 'shadow-[0_0_16px_rgba(16,185,129,0.22)]',
  },
  {
    id: 'silver_guardian',
    title: 'Guardião Prata',
    description: 'Alcançou o Nível Prata e já resgatou pelo menos 2 cartões completos.',
    requirementLabel: '2 cartões resgatados (20+ selos)',
    iconEmoji: '🛡️',
    rarity: 'epica',
    rarityLabel: 'Épica',
    rarityBadgeClass: 'bg-sky-400/20 border-sky-300/60 text-sky-100',
    cardBorderClass: 'border-sky-300/55 bg-gradient-to-br from-sky-950/40 via-[#121633] to-[#0D1022]',
    unlockedBorderClass: 'border-sky-300/60 bg-gradient-to-br from-sky-950/40 via-[#121633] to-[#0D1022]',
    unlockedGlowClass: 'shadow-[0_0_16px_rgba(56,189,248,0.25)]',
  },
  {
    id: 'gold_legend',
    title: 'Lenda Ouro PodWave',
    description: 'Atingiu o cobiçado Nível Ouro com 25 ou mais selos acumulados na trajetória.',
    requirementLabel: 'Alcançar Nível Ouro (25+ selos)',
    iconEmoji: '👑',
    rarity: 'lendaria',
    rarityLabel: 'Lendária',
    rarityBadgeClass: 'bg-amber-400/20 border-amber-300/70 text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.25)]',
    cardBorderClass: 'border-amber-400/65 bg-gradient-to-br from-amber-950/40 via-[#161538] to-[#0D1022]',
    unlockedBorderClass: 'border-amber-400/65 bg-gradient-to-br from-amber-950/40 via-[#161538] to-[#0D1022]',
    unlockedGlowClass: 'shadow-[0_0_18px_rgba(251,191,36,0.28)]',
  },
  {
    id: 'vip_founder',
    title: 'Embaixador VIP',
    description: 'Insígnia de honra para membros VIP ou concedida especialmente pela administração.',
    requirementLabel: 'Status Cliente VIP ou Honraria Admin',
    iconEmoji: '💎',
    rarity: 'lendaria',
    rarityLabel: 'Especial VIP',
    rarityBadgeClass: 'bg-[#E53CF3]/20 border-[#E53CF3]/60 text-pink-200 shadow-[0_0_12px_rgba(229,60,243,0.25)]',
    cardBorderClass: 'border-[#E53CF3]/60 bg-gradient-to-br from-fuchsia-950/40 via-[#161538] to-[#0D1022]',
    unlockedBorderClass: 'border-[#E53CF3]/65 bg-gradient-to-br from-fuchsia-950/40 via-[#161538] to-[#0D1022]',
    unlockedGlowClass: 'shadow-[0_0_18px_rgba(229,60,243,0.28)]',
  },
];

export function getUserLoyaltyBadges(
  user?: UserProfile | null,
  cardOverride?: Partial<LoyaltyCardData> | null
): UnlockedLoyaltyBadge[] {
  const card = normalizeLoyaltyCard(cardOverride ?? user?.loyaltyCard);
  const totalStamps = getTotalAccumulatedStamps(card);
  const grantedSet = new Set(card.grantedBadgeIds || []);
  const isVipOrHigher = user?.role === 'vip' || user?.role === 'admin' || user?.role === 'owner';

  const historyAsc = [...(card.history || [])].reverse();
  const firstStampEntry = historyAsc.find((h) => h.action === 'add_stamp' || h.stampsAfter >= 1);
  const firstRedeemEntry = historyAsc.find((h) => h.action === 'redeem_reward');

  return LOYALTY_BADGES.map((badge) => {
    const isManualGrant = grantedSet.has(badge.id);
    let progressCurrent = 0;
    let progressTarget = 1;
    let unlockedAuto = false;
    let unlockedAt: string | undefined = card.updatedAt;

    switch (badge.id) {
      case 'first_wave':
        progressTarget = 1;
        progressCurrent = Math.min(1, totalStamps);
        unlockedAuto = totalStamps >= 1;
        unlockedAt = firstStampEntry?.date || card.updatedAt;
        break;
      case 'high_frequency':
        progressTarget = 5;
        progressCurrent = Math.min(5, totalStamps);
        unlockedAuto = totalStamps >= 5;
        break;
      case 'first_reward':
        progressTarget = card.goal;
        progressCurrent = card.completedCards >= 1 ? card.goal : Math.min(card.goal, totalStamps);
        unlockedAuto = card.completedCards >= 1 || totalStamps >= card.goal;
        unlockedAt = firstRedeemEntry?.date || card.updatedAt;
        break;
      case 'silver_guardian':
        progressTarget = 2;
        progressCurrent = Math.min(2, card.completedCards);
        unlockedAuto = card.completedCards >= 2 || totalStamps >= 20;
        break;
      case 'gold_legend':
        progressTarget = 25;
        progressCurrent = Math.min(25, totalStamps);
        unlockedAuto = totalStamps >= 25;
        break;
      case 'vip_founder':
        progressTarget = 1;
        progressCurrent = isVipOrHigher || isManualGrant ? 1 : 0;
        unlockedAuto = Boolean(isVipOrHigher);
        break;
    }

    const unlocked = unlockedAuto || isManualGrant;
    const progressPercent = unlocked
      ? 100
      : Math.min(99, Math.round((progressCurrent / Math.max(1, progressTarget)) * 100));

    return {
      ...badge,
      unlocked,
      unlockedAt: unlocked ? unlockedAt : undefined,
      progressCurrent: unlocked ? progressTarget : progressCurrent,
      progressTarget,
      progressPercent,
      isManualGrant,
      isFeatured: card.featuredBadgeId === badge.id,
    };
  });
}




