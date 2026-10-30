import React from 'react';
import { LoyaltyCardData } from '../../types/catalog';
import { Gift, Sparkles, Check, Trophy, Zap, Clock } from 'lucide-react';

interface DigitalLoyaltyCardProps {
  customerName: string;
  customerEmail?: string;
  card: LoyaltyCardData;
  interactive?: boolean;
  onSelectStampSlot?: (targetStamps: number) => void;
  compact?: boolean;
}

export const DigitalLoyaltyCard: React.FC<DigitalLoyaltyCardProps> = ({
  customerName,
  customerEmail,
  card,
  interactive = false,
  onSelectStampSlot,
  compact = false,
}) => {
  const goal = Math.max(3, Math.min(30, card.goal || 10));
  const stamps = Math.max(0, Math.min(goal, card.stamps || 0));
  const isComplete = stamps >= goal;
  const remaining = Math.max(0, goal - stamps);
  const progressPercent = Math.min(100, Math.round((stamps / goal) * 100));

  const slots = Array.from({ length: goal }, (_, idx) => idx + 1);

  return (
    <div
      className={`relative rounded-3xl overflow-hidden border-2 transition-all duration-300 shadow-2xl ${
        isComplete
          ? 'bg-gradient-to-br from-[#122624] via-[#0D1022] to-[#1E1938] border-emerald-400/60 shadow-[0_0_30px_rgba(16,185,129,0.2)]'
          : 'bg-gradient-to-br from-[#141838] via-[#0D1022] to-[#191536] border-[#8423DA]/50 shadow-[0_12px_35px_rgba(0,0,0,0.5)]'
      } ${compact ? 'p-4 sm:p-5' : 'p-5 sm:p-6'}`}
    >
      {/* Ambient Neon Glow */}
      <div
        className={`absolute -right-10 -top-10 w-44 h-44 rounded-full blur-3xl pointer-events-none ${
          isComplete ? 'bg-emerald-400/20' : 'bg-[#00DFFF]/15'
        }`}
      />
      <div className="absolute -left-10 -bottom-10 w-44 h-44 bg-[#8423DA]/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-4">
        {/* Card Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#8423DA]/25 border border-[#8423DA]/50 text-[#00DFFF] text-[10px] font-black uppercase tracking-widest">
              <Zap className="w-3 h-3 text-[#00DFFF]" />
              <span>PodWave Club • Cartão Fidelidade</span>
            </div>
            <h4 className="font-heading text-base sm:text-lg font-black text-white mt-1.5">
              {customerName || 'Cliente PodWave'}
            </h4>
            {customerEmail && (
              <p className="text-[11px] text-[#A5A5B8] font-mono">{customerEmail}</p>
            )}
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <div
              className={`px-3 py-1.5 rounded-2xl border font-heading font-black text-xs sm:text-sm tabular-nums flex items-center gap-1.5 ${
                isComplete
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  : 'bg-[#121633] border-[#00DFFF]/40 text-[#00DFFF]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {stamps} / {goal} SELOS
              </span>
            </div>

            {card.completedCards > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/40 text-amber-300 text-[10px] font-bold">
                <Trophy className="w-3 h-3 text-amber-400" />
                {card.completedCards}{' '}
                {card.completedCards === 1 ? 'cartão concluído' : 'cartões concluídos'}
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#C4C6D8] font-semibold">
              {isComplete ? (
                <span className="text-emerald-300 font-black">
                  🎉 Cartão completo! Recompensa desbloqueada!
                </span>
              ) : stamps === 0 ? (
                'Acumule selos a cada compra confirmada'
              ) : (
                `Falta${remaining === 1 ? '' : 'm'} apenas ${remaining} ${
                  remaining === 1 ? 'selo' : 'selos'
                } para sua recompensa`
              )}
            </span>
            <span className="font-mono font-bold text-[#00DFFF] tabular-nums">
              {progressPercent}%
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-[#080811] border border-white/10 overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isComplete
                  ? 'bg-gradient-to-r from-emerald-400 via-[#00DFFF] to-amber-300'
                  : 'bg-gradient-to-r from-[#8423DA] via-[#007BFF] to-[#00DFFF]'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* 10-Stamp Visual Grid */}
        <div className="grid grid-cols-5 gap-2 sm:gap-2.5 pt-1">
          {slots.map((slotNum) => {
            const isStamped = slotNum <= stamps;
            const isFinalSlot = slotNum === goal;

            const handleSlotClick = () => {
              if (!interactive || !onSelectStampSlot) return;
              // Clicking the current top stamp toggles it off (stamps - 1), otherwise sets to slotNum
              if (slotNum === stamps) {
                onSelectStampSlot(slotNum - 1);
              } else {
                onSelectStampSlot(slotNum);
              }
            };

            return (
              <button
                key={slotNum}
                type="button"
                disabled={!interactive}
                onClick={handleSlotClick}
                title={
                  interactive
                    ? `Clique para definir ${slotNum === stamps ? slotNum - 1 : slotNum} selo(s)`
                    : isStamped
                    ? `Selo #${slotNum} conquistado`
                    : `Selo #${slotNum} pendente`
                }
                className={`relative aspect-square rounded-2xl border flex flex-col items-center justify-center transition-all select-none ${
                  interactive ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-default'
                } ${
                  isStamped
                    ? isFinalSlot
                      ? 'bg-gradient-to-br from-amber-400/30 via-emerald-500/25 to-[#00DFFF]/30 border-amber-300 text-amber-200 shadow-[0_0_18px_rgba(251,191,36,0.35)]'
                      : 'bg-gradient-to-br from-[#8423DA]/40 to-[#00DFFF]/25 border-[#00DFFF] text-white shadow-[0_0_12px_rgba(0,223,255,0.25)]'
                    : isFinalSlot
                    ? 'bg-[#080811]/90 border-dashed border-amber-400/40 text-amber-300/60'
                    : 'bg-[#080811]/80 border-dashed border-white/15 text-gray-500'
                }`}
              >
                <span className="text-[9px] font-mono font-bold opacity-75 mb-0.5">
                  #{String(slotNum).padStart(2, '0')}
                </span>

                {isStamped ? (
                  isFinalSlot ? (
                    <Gift className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300 drop-shadow" />
                  ) : (
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#00DFFF]/20 border border-[#00DFFF]/60 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00DFFF] stroke-[3]" />
                    </div>
                  )
                ) : isFinalSlot ? (
                  <Gift className="w-4 h-4 sm:w-5 sm:h-5 opacity-50" />
                ) : (
                  <div className="w-5 h-5 rounded-full border border-white/10 flex items-center justify-center text-[10px] opacity-40">
                    •
                  </div>
                )}

                {isStamped && (
                  <span className="text-[8px] font-black uppercase tracking-wider text-[#00DFFF] mt-0.5">
                    {isFinalSlot ? 'PRÊMIO' : 'OK'}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Reward Box */}
        <div
          className={`p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
            isComplete
              ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
              : 'bg-[#080811]/80 border-[#8423DA]/30 text-gray-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                isComplete
                  ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/40'
                  : 'bg-[#E53CF3]/15 text-[#E53CF3] border border-[#E53CF3]/30'
              }`}
            >
              <Gift className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#A5A5B8] block">
                Recompensa ao completar {goal} selos:
              </span>
              <span className="font-bold text-white text-xs">
                {card.rewardDescription || 'Brinde Especial ou Desconto Exclusivo na 10ª Compra'}
              </span>
            </div>
          </div>

          {card.updatedAt && (
            <span
              className="text-[10px] text-[#A5A5B8] hidden sm:flex items-center gap-1 shrink-0"
              title="Última atualização pelo administrador"
            >
              <Clock className="w-3 h-3 text-[#00DFFF]" />
              {new Date(card.updatedAt).toLocaleDateString('pt-BR')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
