import React, { useState, useEffect } from 'react';
import { useCatalog } from '../context/CatalogContext';
import {
  MessageCircle,
  ShieldCheck,
  MapPin,
  Zap,
  Gift,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
} from 'lucide-react';
import { buildWhatsAppUrl } from '../utils/whatsappShare';

interface AnnouncementSlide {
  id: number;
  badge: string;
  badgeColorClass: string;
  dotColorClass: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  actionLabel?: string;
  actionType?: 'whatsapp' | 'section';
  targetSection?: string;
}

export const TopCarouselBar: React.FC = () => {
  const { settings, currentView, setCurrentView } = useCatalog();
  const whatsappNumber = settings.whatsappNumber || '5586999014685';

  const whatsappUrl = buildWhatsAppUrl(
    whatsappNumber,
    'Olá! Estou no catálogo digital da PodWave e gostaria de falar com um atendente.'
  );

  const slides: AnnouncementSlide[] = [
    {
      id: 1,
      badge: 'COMPRA 100% SEGURA',
      badgeColorClass:
        'bg-emerald-500/15 text-emerald-300 border-emerald-400/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]',
      dotColorClass: 'bg-emerald-400 shadow-[0_0_8px_#34D399]',
      icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />,
      title: 'Evite golpes, você pode pagar na hora do recebimento!',
      subtitle: 'Aceitamos PIX, Cartão ou Dinheiro diretamente na entrega ou retirada.',
      actionLabel: 'Tirar Dúvidas',
      actionType: 'whatsapp',
    },
    {
      id: 2,
      badge: 'ENTREGA EXPRESSA',
      badgeColorClass:
        'bg-[#00DFFF]/15 text-[#00DFFF] border-[#00DFFF]/40 shadow-[0_0_12px_rgba(0,223,255,0.2)]',
      dotColorClass: 'bg-[#00DFFF] shadow-[0_0_8px_#00DFFF]',
      icon: <Zap className="w-3.5 h-3.5 text-[#00DFFF] shrink-0" />,
      title: 'Entrega rápida em até 45 minutos em toda a região!',
      subtitle: 'Acompanhe o status do seu pedido em tempo real direto na sua conta.',
      actionLabel: 'Ver Produtos',
      actionType: 'section',
      targetSection: 'catalogo',
    },
    {
      id: 3,
      badge: 'PONTO DE RETIRADA',
      badgeColorClass:
        'bg-purple-500/20 text-purple-200 border-purple-400/40 shadow-[0_0_12px_rgba(168,85,247,0.2)]',
      dotColorClass: 'bg-purple-400 shadow-[0_0_8px_#C084FC]',
      icon: <MapPin className="w-3.5 h-3.5 text-purple-300 shrink-0" />,
      title: 'Temos local de retirada rápida com atendimento imediato!',
      subtitle: 'Faça seu pedido no site e retire sem fila com total comodidade.',
      actionLabel: 'Como Funciona',
      actionType: 'section',
      targetSection: 'informacoes',
    },
    {
      id: 4,
      badge: 'CLUBE FIDELIDADE',
      badgeColorClass:
        'bg-amber-500/15 text-amber-200 border-amber-400/40 shadow-[0_0_12px_rgba(245,158,11,0.2)]',
      dotColorClass: 'bg-amber-400 shadow-[0_0_8px_#FBBF24]',
      icon: <Gift className="w-3.5 h-3.5 text-amber-300 shrink-0" />,
      title: 'Acumule selos nas suas compras e ganhe prêmios exclusivos!',
      subtitle: 'Cartão Fidelidade Digital integrado com vantagens para clientes VIP.',
      actionLabel: 'Ver Fidelidade',
      actionType: 'section',
      targetSection: 'fidelidade',
    },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [slides.length, isPaused]);

  const activeSlide = slides[currentIndex];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  const handleSlideAction = (slide: AnnouncementSlide) => {
    if (slide.actionType === 'whatsapp') {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (slide.actionType === 'section' && slide.targetSection) {
      if (currentView === 'admin') {
        setCurrentView('catalog');
        window.history.pushState({}, '', '/');
      }
      setTimeout(() => {
        const el = document.getElementById(slide.targetSection!);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 80);
    }
  };

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative w-full max-w-full overflow-hidden border-b border-[#00DFFF]/25 bg-gradient-to-r from-[#070914] via-[#0D1229] to-[#070914] text-white"
    >
      {/* Subtle Top Cyber Glow Line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00DFFF]/60 to-transparent" />

      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left Navigation Arrow (Desktop/Tablet) */}
        <button
          type="button"
          onClick={handlePrev}
          className="hidden md:flex items-center justify-center w-7 h-7 rounded-lg bg-[#11152A]/90 hover:bg-[#8423DA]/40 border border-white/10 hover:border-[#00DFFF]/50 text-gray-300 hover:text-white transition-all cursor-pointer shrink-0"
          title="Aviso anterior"
          aria-label="Aviso anterior"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Main Announcement Content */}
        <div className="flex-1 min-w-0 flex flex-col items-center md:items-start justify-center overflow-hidden">
          <div className="w-full flex flex-wrap sm:flex-nowrap items-center justify-center md:justify-start gap-2 sm:gap-2.5 min-w-0">
            {/* Glowing Live Indicator + Category Pill */}
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-heading font-black uppercase tracking-wider shrink-0 transition-all duration-300 ${activeSlide.badgeColorClass}`}
            >
              <span className="relative flex h-2 w-2 items-center justify-center shrink-0">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${activeSlide.dotColorClass}`}
                />
                <span
                  className={`relative inline-flex rounded-full h-1.5 w-1.5 ${activeSlide.dotColorClass}`}
                />
              </span>
              {activeSlide.icon}
              <span>{activeSlide.badge}</span>
            </div>

            {/* Primary & Secondary Copy */}
            <div className="min-w-0 flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 text-center sm:text-left overflow-hidden">
              <p className="font-heading font-extrabold text-xs sm:text-[13px] md:text-sm text-white tracking-tight leading-snug">
                {activeSlide.title}
              </p>
              <span className="hidden xl:inline text-white/25 text-xs">•</span>
              <span className="hidden lg:inline text-[11px] text-[#B4B6C8] font-medium truncate">
                {activeSlide.subtitle}
              </span>
            </div>

            {/* Contextual Quick Action Link */}
            {activeSlide.actionLabel && (
              <button
                type="button"
                onClick={() => handleSlideAction(activeSlide)}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-white/5 hover:bg-[#00DFFF]/15 border border-white/10 hover:border-[#00DFFF]/40 text-[11px] font-bold text-[#00DFFF] transition-all cursor-pointer shrink-0 ml-auto md:ml-1"
              >
                <span>{activeSlide.actionLabel}</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Mobile Subtitle + Interactive Progress Indicators */}
          <div className="w-full flex items-center justify-between sm:justify-center md:justify-start gap-3 mt-1.5">
            <div className="flex items-center gap-1.5" role="tablist" aria-label="Avisos da loja">
              {slides.map((slide, idx) => {
                const isCurrent = idx === currentIndex;
                return (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-1 rounded-full transition-all duration-300 cursor-pointer ${
                      isCurrent
                        ? 'w-7 sm:w-10 bg-gradient-to-r from-[#00DFFF] to-[#8423DA] shadow-[0_0_8px_#00DFFF]'
                        : 'w-3.5 sm:w-6 bg-white/15 hover:bg-white/35'
                    }`}
                    title={slide.title}
                    aria-label={`Slide ${idx + 1}: ${slide.badge}`}
                    aria-selected={isCurrent}
                    role="tab"
                  />
                );
              })}
            </div>

            <span className="text-[10px] text-[#A5A5B8] font-medium sm:hidden truncate max-w-[200px]">
              {activeSlide.subtitle}
            </span>
          </div>
        </div>

        {/* Right Controls: Next Arrow + Direct WhatsApp CTA */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleNext}
            className="hidden md:flex items-center justify-center w-7 h-7 rounded-lg bg-[#11152A]/90 hover:bg-[#8423DA]/40 border border-white/10 hover:border-[#00DFFF]/50 text-gray-300 hover:text-white transition-all cursor-pointer"
            title="Próximo aviso"
            aria-label="Próximo aviso"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#25D366]/20 to-emerald-500/15 hover:from-[#25D366]/30 hover:to-emerald-500/25 border border-[#25D366]/45 text-[#25D366] text-xs font-heading font-extrabold transition-all shadow-[0_0_12px_rgba(37,211,102,0.15)] active:scale-95 whitespace-nowrap cursor-pointer"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Fale com Atendente</span>
          </a>
        </div>
      </div>
    </div>
  );
};
