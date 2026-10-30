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
        .slice(0, 25)
    : [];

  return {
    stamps: safeStamps,
    goal: safeGoal,
    completedCards: safeCompleted,
    rewardDescription: safeReward,
    updatedAt: typeof raw?.updatedAt === 'string' ? raw.updatedAt : undefined,
    history: safeHistory,
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
  type: 'add' | 'remove' | 'set' | 'redeem' | 'reset';
  value?: number;
  goal?: number;
  rewardDescription?: string;
  note?: string;
  author?: string;
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
  };

  return {
    stamps: nextStamps,
    goal: nextGoal,
    completedCards: nextCompleted,
    rewardDescription: nextReward,
    updatedAt: nowIso,
    history: [historyEntry, ...(base.history || [])].slice(0, 25),
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
