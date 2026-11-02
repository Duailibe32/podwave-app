import React from 'react';
import { Gift, Sparkles, CheckCircle2, Trophy, ShieldCheck, ArrowRight, UserCheck } from 'lucide-react';
import { useCatalog } from '../context/CatalogContext';
import { getUserLoyaltyCard, normalizeLoyaltyCard } from '../utils/loyaltyCard';
import { DigitalLoyaltyCard } from './ui/DigitalLoyaltyCard';

export const LoyaltyHomeSection: React.FC = () => {
  const { currentUser, settings, openProfileModal, openAuthModal } = useCatalog();

  const defaultGoal = settings.loyaltyGoalStamps || 10;
  const defaultReward =
    settings.loyaltyDefaultReward || 'Brinde Especial ou Desconto Exclusivo na 10ª Compra';

  const activeLoyaltyCard = currentUser
    ? getUserLoyaltyCard(currentUser, defaultGoal, defaultReward)
    : normalizeLoyaltyCard(
        {
          stamps: Math.min(defaultGoal, 4),
          goal: defaultGoal,
          completedCards: 0,
          rewardDescription: defaultReward,
        },
        defaultGoal,
        defaultReward
      );

  const handleOpenLoyalty = () => {
    if (currentUser) {
      openProfileModal();
      setTimeout(() => {
        window.dispatchEvent(new Event('podwave:open-loyalty'));
      }, 30);
    } else {
      openAuthModal('login');
    }
  };

  const steps = [
    {
      step: '01',
      title: 'Identifique sua conta nos pedidos',
      description:
        'Crie sua conta gratuita na PodWave e faça seus pedidos normalmente pelo catálogo ou WhatsApp.',
    },
    {
      step: '02',
      title: 'Receba selos validados pela equipe',
      description:
        'A cada compra concluída ou visita confirmada, nossa administração credita +1 selo digital no seu perfil.',
    },
    {
      step: '03',
      title: `Complete ${defaultGoal} selos e resgate seu brinde`,
      description:
        'A cada ciclo fechado, você escolhe seu brinde especial ou desconto exclusivo na sua próxima compra.',
    },
  ];

  return (
    <section
      id="fidelidade"
      tabIndex={-1}
      className="relative py-14 sm:py-20 bg-gradient-to-b from-[#080811] via-[#0D1022] to-[#080811] border-t border-b border-[#8423DA]/25 overflow-hidden scroll-mt-20 focus:outline-none"
    >
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-[#8423DA]/15 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-[#00DFFF]/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Text & Explanation about Our Loyalty Card */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#11152A] border border-[#E53CF3]/40 text-[#00DFFF] text-xs font-extrabold uppercase tracking-wider shadow-md">
              <Gift className="w-4 h-4 text-[#E53CF3]" />
              <span>Programa Oficial • Nosso Cartão Fidelidade</span>
            </div>

            <div className="space-y-3">
              <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.12]">
                Sua fidelidade vale{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00DFFF] via-[#8423DA] to-[#E53CF3]">
                  Prêmios e Brindes
                </span>{' '}
                na PodWave
              </h2>
              <p className="text-sm sm:text-base text-[#A5A5B8] leading-relaxed max-w-2xl">
                Criamos o <strong className="text-white">Cartão de Fidelidade Digital PodWave</strong> para
                valorizar quem está sempre com a gente. Sem papel para perder e sem burocracia: seus selos
                ficam salvos diretamente no seu perfil da loja, destravando recompensas exclusivas a cada {defaultGoal} selos completados.
              </p>
            </div>

            {/* 3 Steps */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
              {steps.map((item) => (
                <div
                  key={item.step}
                  className="p-4 rounded-2xl bg-[#0D1022]/90 border border-[#8423DA]/30 hover:border-[#00DFFF]/45 transition-all space-y-2 shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black text-[#00DFFF] tracking-wider">
                      PASSO {item.step}
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-[#E53CF3]" />
                  </div>
                  <h3 className="font-heading font-extrabold text-sm text-white leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#A5A5B8] leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>

            {/* Reward Highlight & CTA */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#121633] via-[#151836] to-[#1A1438] border border-[#8423DA]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0 mt-0.5">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-300 block">
                    Recompensa Oficial do Ciclo ({defaultGoal} Selos)
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-white mt-0.5">
                    {defaultReward}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenLoyalty}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#8423DA] via-[#007BFF] to-[#00DFFF] hover:brightness-110 text-white font-heading font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(0,223,255,0.3)] flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <Gift className="w-4 h-4" />
                <span>
                  {currentUser
                    ? `Ver Meu Cartão (${activeLoyaltyCard.stamps}/${activeLoyaltyCard.goal})`
                    : 'Acessar Meu Cartão Fidelidade'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Column: Live Digital Loyalty Card Visual Component */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="w-full max-w-lg space-y-3">
              <div className="flex items-center justify-between px-2 text-xs text-[#A5A5B8]">
                <span className="flex items-center gap-1.5 font-semibold text-gray-300">
                  <Sparkles className="w-3.5 h-3.5 text-[#00DFFF]" />
                  {currentUser
                    ? 'Seu Cartão de Fidelidade em Tempo Real'
                    : 'Prévia do Cartão Digital no Perfil do Cliente'}
                </span>
                <span className="font-mono text-[11px] text-[#00DFFF] font-bold">
                  {currentUser ? 'CONTA CONECTADA' : 'DEMONSTRAÇÃO VISUAL'}
                </span>
              </div>

              <DigitalLoyaltyCard
                customerName={currentUser?.fullName || 'Cliente PodWave'}
                customerEmail={currentUser?.email}
                card={activeLoyaltyCard}
              />

              <div className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-[#0D1022]/80 border border-white/10 text-[11px] text-[#A5A5B8]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#00DFFF] shrink-0" />
                  <span>
                    Controle validado pelo administrador a cada pedido finalizado.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleOpenLoyalty}
                  className="text-[#00DFFF] hover:underline font-bold shrink-0 cursor-pointer flex items-center gap-1"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>{currentUser ? 'Abrir Perfil' : 'Entrar'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
