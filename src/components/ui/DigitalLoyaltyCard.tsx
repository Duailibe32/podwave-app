import React, { useEffect, useRef, useState } from 'react';
import { LoyaltyCardData } from '../../types/catalog';
import {
  getLoyaltyMilestoneInfo,
} from '../../utils/loyaltyCard';
import { Gift, Sparkles, Check, Trophy, Zap, Clock, Flame } from 'lucide-react';

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

  const milestoneInfo = getLoyaltyMilestoneInfo(card);

  // Detect stamp gain or milestone transitions to trigger heightened glow/pulse celebration
  const prevStampsRef = useRef<number>(stamps);
  const [isCelebratingGain, setIsCelebratingGain] = useState(false);

  useEffect(() => {
    const prevStamps = prevStampsRef.current;

    if (stamps > prevStamps) {
      setIsCelebratingGain(true);
      const timer = setTimeout(() => {
        setIsCelebratingGain(false);
      }, 3600);
      prevStampsRef.current = stamps;
      return () => clearTimeout(timer);
    }

    prevStampsRef.current = stamps;
  }, [stamps]);

  const showMilestoneGlow = milestoneInfo.isMilestone || isCelebratingGain;
  const slots = Array.from({ length: goal }, (_, idx) => idx + 1);

  return (
    <div
      className={`relative rounded-3xl overflow-hidden border-2 transition-all duration-500 shadow-2xl ${
        isComplete
          ? 'bg-gradient-to-br from-[#122624] via-[#0D1022] to-[#1E1938] border-emerald-400/80 shadow-[0_0_38px_rgba(16,185,129,0.32)]'
          : showMilestoneGlow
          ? 'bg-gradient-to-br from-[#171B42] via-[#0D1022] to-[#231542] border-[#00DFFF]/80 shadow-[0_0_32px_rgba(0,223,255,0.28)]'
          : 'bg-gradient-to-br from-[#141838] via-[#0D1022] to-[#191536] border-[#8423DA]/50 shadow-[0_12px_35px_rgba(0,0,0,0.5)]'
      } ${compact ? 'p-4 sm:p-5' : 'p-5 sm:p-6'}`}
    >
      {/* Smooth Pulsing Milestone Aura Ring */}
      {showMilestoneGlow && (
        <div
          className={`absolute inset-0 rounded-3xl pointer-events-none border-2 animate-pulse ${
            isComplete
              ? 'border-emerald-300/60 shadow-[inset_0_0_28px_rgba(16,185,129,0.25)]'
              : 'border-[#00DFFF]/50 shadow-[inset_0_0_26px_rgba(0,223,255,0.22)]'
          }`}
        />
      )}

      {/* Ambient Neon Glow */}
      <div
        className={`absolute -right-10 -top-10 w-48 h-48 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
          isComplete
            ? 'bg-emerald-400/25 animate-pulse'
            : showMilestoneGlow
            ? 'bg-[#00DFFF]/25 animate-pulse'
            : 'bg-[#00DFFF]/15'
        }`}
      />
      <div
        className={`absolute -left-10 -bottom-10 w-48 h-48 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
          showMilestoneGlow ? 'bg-[#E53CF3]/25 animate-pulse' : 'bg-[#8423DA]/20'
        }`}
      />

      <div className="relative z-10 space-y-4">
        {/* Card Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#8423DA]/25 border border-[#8423DA]/50 text-[#00DFFF] text-[10px] font-black uppercase tracking-widest">
                <Zap className="w-3 h-3 text-[#00DFFF]" />
                <span>Cartão Fidelidade PodWave</span>
              </div>
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
              className={`px-3 py-1.5 rounded-2xl border font-heading font-black text-xs sm:text-sm tabular-nums flex items-center gap-1.5 transition-all duration-300 ${
                isComplete
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.35)] animate-pulse'
                  : showMilestoneGlow
                  ? 'bg-[#121633] border-[#00DFFF] text-[#00DFFF] shadow-[0_0_16px_rgba(0,223,255,0.35)]'
                  : 'bg-[#121633] border-[#00DFFF]/40 text-[#00DFFF]'
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${showMilestoneGlow ? 'animate-spin' : ''}`} />
              <span>
                {stamps} / {goal} SELOS
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-1.5">
              {card.completedCards > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/40 text-amber-300 text-[10px] font-bold">
                  <Trophy className="w-3 h-3 text-amber-400" />
                  {card.completedCards}{' '}
                  {card.completedCards === 1 ? 'cartão concluído' : 'cartões concluídos'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Milestone Celebration Banner */}
        {(milestoneInfo.isMilestone || isCelebratingGain) && (
          <div
            className={`p-2.5 sm:p-3 rounded-2xl border flex items-center justify-between gap-2.5 transition-all duration-500 ${
              isComplete
                ? 'bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-amber-400/20 border-emerald-400/60 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                : 'bg-gradient-to-r from-[#8423DA]/30 via-[#00DFFF]/15 to-[#E53CF3]/25 border-[#00DFFF]/60 text-white shadow-[0_0_20px_rgba(0,223,255,0.2)]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 animate-pulse ${
                  isComplete
                    ? 'bg-emerald-400/25 border border-emerald-300 text-emerald-200'
                    : 'bg-[#00DFFF]/20 border border-[#00DFFF] text-[#00DFFF]'
                }`}
              >
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-heading font-black uppercase tracking-wide block">
                  {milestoneInfo.isMilestone
                    ? milestoneInfo.title
                    : '✨ Novo Selo Creditado com Sucesso!'}
                </span>
                <span className="text-[10px] text-gray-200 block leading-snug">
                  {milestoneInfo.isMilestone
                    ? milestoneInfo.subtitle
                    : `Seu cartão avançou para ${stamps}/${goal} selos. Continue acumulando!`}
                </span>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-[9px] font-black uppercase tracking-wider text-[#00DFFF] shrink-0 animate-pulse">
              Marco Ativo
            </span>
          </div>
        )}

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
                  ? 'bg-gradient-to-r from-emerald-400 via-[#00DFFF] to-amber-300 shadow-[0_0_12px_rgba(16,185,129,0.6)]'
                  : showMilestoneGlow
                  ? 'bg-gradient-to-r from-[#8423DA] via-[#00DFFF] to-[#E53CF3] shadow-[0_0_12px_rgba(0,223,255,0.6)]'
                  : 'bg-gradient-to-r from-[#8423DA] via-[#007BFF] to-[#00DFFF]'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* 10-Stamp Visual Grid */}
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5 pt-1">
          {slots.map((slotNum) => {
            const isStamped = slotNum <= stamps;
            const isLatestStamp = slotNum === stamps && stamps > 0;
            const isFinalSlot = slotNum === goal;
            const isMilestoneSlot = milestoneInfo.milestoneSlots.includes(slotNum);
            const paddedNum = `#${String(slotNum).padStart(2, '0')}`;

            const handleSlotClick = () => {
              if (!interactive || !onSelectStampSlot) return;
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
                aria-label={
                  interactive
                    ? `Definir ${slotNum === stamps ? slotNum - 1 : slotNum} selos no cartão`
                    : isStamped
                    ? `Selo ${paddedNum} validado${isMilestoneSlot ? ' (Marco de Fidelidade)' : ''}`
                    : `Selo ${paddedNum} pendente${isMilestoneSlot ? ' (Marco de Fidelidade)' : ''}`
                }
                title={
                  interactive
                    ? `Clique para definir ${slotNum === stamps ? slotNum - 1 : slotNum} selo(s)`
                    : isStamped
                    ? `Selo ${paddedNum} validado${isMilestoneSlot ? ' (Marco de Fidelidade)' : ''}`
                    : `Selo ${paddedNum} pendente${isMilestoneSlot ? ' (Marco de Fidelidade)' : ''}`
                }
                className={`group relative rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 flex flex-col justify-between items-center gap-1 sm:gap-1.5 min-h-[86px] sm:min-h-[122px] transition-all duration-300 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00DFFF] ${
                  interactive ? 'cursor-pointer hover:scale-[1.03] active:scale-95' : 'cursor-default'
                } ${
                  isStamped
                    ? isLatestStamp && showMilestoneGlow
                      ? 'border-2 border-[#00DFFF] bg-gradient-to-b from-[#082236] via-[#061828] to-[#040E18] shadow-[0_0_22px_rgba(0,223,255,0.45)] ring-2 ring-[#00DFFF]/40'
                      : 'border-2 border-[#00DFFF] bg-gradient-to-b from-[#071D2E] via-[#051523] to-[#040E18] shadow-[0_0_16px_rgba(0,223,255,0.28)]'
                    : isFinalSlot
                    ? 'border border-dashed border-amber-400/40 bg-[#060E1A]/85 hover:border-amber-400/60'
                    : isMilestoneSlot
                    ? 'border border-dashed border-[#00DFFF]/35 bg-[#060E1A]/80 hover:border-[#00DFFF]/55'
                    : 'border border-dashed border-white/15 bg-[#060E1A]/75 hover:border-white/25'
                }`}
              >
                {/* Top Row: #01 on left + Glowing Cyan Dot on right */}
                <div className="w-full flex items-center justify-between px-0.5">
                  <span
                    className={`font-mono text-[10px] sm:text-[13px] font-extrabold tracking-tight leading-none ${
                      isStamped
                        ? 'text-[#5CE1E6]'
                        : isFinalSlot
                        ? 'text-amber-300/70'
                        : 'text-slate-500'
                    }`}
                  >
                    {paddedNum}
                  </span>

                  {isStamped ? (
                    <span
                      className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#00DFFF] shadow-[0_0_8px_#00DFFF] shrink-0"
                      aria-hidden="true"
                    />
                  ) : isFinalSlot ? (
                    <Gift className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400/70 shrink-0" aria-hidden="true" />
                  ) : (
                    <span
                      className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full border border-slate-600/80 bg-slate-800/50 shrink-0"
                      aria-hidden="true"
                    />
                  )}
                </div>

                {/* Center: Official PodWave Logo Stamp */}
                <div className="my-auto flex items-center justify-center py-0.5">
                  <img
                    src="/assets/images/logo.png"
                    alt={isStamped ? `Selo PodWave ${paddedNum} Validado` : ''}
                    aria-hidden={!isStamped}
                    className={`w-8 h-8 sm:w-12 sm:h-12 object-contain select-none pointer-events-none transition-all duration-300 ${
                      isStamped
                        ? 'drop-shadow-[0_2px_10px_rgba(0,223,255,0.42)] scale-100'
                        : 'opacity-20 grayscale scale-95'
                    }`}
                  />
                </div>

                {/* Bottom Status Pill: VALIDADO / PENDENTE / PRÊMIO */}
                <div
                  className={`w-full py-0.5 sm:py-1 px-0.5 sm:px-1.5 rounded-md sm:rounded-lg border text-center transition-colors ${
                    isStamped
                      ? 'border-[#00DFFF]/45 bg-[#08263A]/90 text-[#66E8FA] shadow-[inset_0_0_8px_rgba(0,223,255,0.15)]'
                      : isFinalSlot
                      ? 'border-amber-400/30 bg-amber-500/10 text-amber-300/75'
                      : isMilestoneSlot
                      ? 'border-[#00DFFF]/25 bg-[#00DFFF]/5 text-[#00DFFF]/65'
                      : 'border-white/10 bg-white/[0.02] text-slate-500'
                  }`}
                >
                  <span className="block text-[7px] sm:text-[10px] font-black uppercase tracking-tight sm:tracking-wider leading-none truncate">
                    {isStamped ? 'VALIDADO' : isFinalSlot ? 'PRÊMIO' : isMilestoneSlot ? 'MARCO' : 'PENDENTE'}
                  </span>
                </div>
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

