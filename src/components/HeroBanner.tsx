import React, { useState, useEffect, useRef } from 'react';
import { useCatalog } from '../context/CatalogContext';
import { Zap, Search, ChevronRight, Layers, Sparkles, ChevronLeft, ShieldCheck, Truck, ShoppingBag, ArrowRight, Gift } from 'lucide-react';

export const HeroBanner: React.FC = () => {
  const { searchQuery, setSearchQuery, setSelectedPuffRange, banners } = useCatalog();
  const activeBanners = banners.filter((b) => b.active);

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const slideTimerRef = useRef<NodeJS.Timeout | null>(null);

  const totalSlides = activeBanners.length > 0 ? activeBanners.length : 1;
  const currentBanner = activeBanners[currentSlideIndex] || activeBanners[0] || {
    id: 'default',
    title: 'Mais que um Vape, é uma Onda.',
    subtitle: 'Sabores intensos. Tecnologia de ponta. Para quem vive novas experiências.',
    badge: '⚡ PODWAVE OFICIAL',
    tagline: 'SABORES QUE TE LEVAM MAIS LONGE',
    ctaText: 'Ver Produtos',
    ctaLink: '#catalogo',
    imageUrl: '/assets/images/logo.png',
  };

  // Auto-advance carousel every 6s unless paused by user hover
  useEffect(() => {
    if (isPaused || totalSlides <= 1) return;

    slideTimerRef.current = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % totalSlides);
    }, 6000);

    return () => {
      if (slideTimerRef.current) clearInterval(slideTimerRef.current);
    };
  }, [isPaused, totalSlides]);

  const goToNextSlide = () => {
    setCurrentSlideIndex((prev) => (prev + 1) % totalSlides);
  };

  const goToPrevSlide = () => {
    setCurrentSlideIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const scrollToCatalog = () => {
    const el = document.getElementById('catalogo') || document.getElementById('modelos');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToLoyalty = () => {
    const el = document.getElementById('fidelidade');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handlePuffQuickFilter = (range: string) => {
    setSelectedPuffRange(range);
    scrollToCatalog();
  };

  // Compute theme gradient background
  const getThemeBg = (theme?: string) => {
    switch (theme) {
      case 'cyan':
        return 'from-[#00DFFF]/20 via-[#007BFF]/15 to-transparent';
      case 'purple':
        return 'from-[#8423DA]/25 via-[#E53CF3]/15 to-transparent';
      case 'emerald':
        return 'from-[#10B981]/20 via-[#065F46]/15 to-transparent';
      case 'gold':
        return 'from-[#E53CF3]/20 via-[#00DFFF]/15 to-transparent';
      default:
        return 'from-[#00DFFF]/15 via-[#8423DA]/20 to-[#E53CF3]/15';
    }
  };

  const touchStartXRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const diff = touchStartXRef.current - e.changedTouches[0].clientX;
    if (diff > 50) {
      goToNextSlide();
    } else if (diff < -50) {
      goToPrevSlide();
    }
    touchStartXRef.current = null;
  };

  return (
    <section
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative overflow-hidden pt-8 pb-14 lg:pt-14 lg:pb-20 border-b border-[#8423DA]/20 bg-gradient-to-b from-[#080811] via-[#0D1022] to-[#080811]"
    >
      {/* Ambient Neon Glow Spheres */}
      <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-gradient-to-r ${getThemeBg(currentBanner.themeGradient)} rounded-full blur-[130px] pointer-events-none transition-all duration-700`} />
      <div className="absolute top-1/3 left-1/4 w-[350px] h-[300px] bg-[#00DFFF]/10 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 w-[380px] h-[280px] bg-[#8423DA]/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Carousel Slide Card Frame */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Carousel Headline, Badges, Search & CTAs */}
          <div className="lg:col-span-7 text-center lg:text-left space-y-5 animate-in fade-in duration-300">
            {/* Carousel Badge Row with Slide Index indicator */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#11152A]/90 border border-[#8423DA]/50 shadow-md">
                <Zap className="w-3.5 h-3.5 text-[#00DFFF] fill-[#00DFFF] animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#00DFFF]">
                  {currentBanner.badge || '⚡ PODWAVE OFICIAL'}
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>⚡ Entrega expressa em toda a região</span>
              </div>
            </div>

            {/* Title with Gradient Text */}
            <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1] break-words">
              {currentBanner.title}
            </h1>

            {/* Subtitle */}
            <p className="text-xs sm:text-base text-[#A5A5B8] max-w-2xl mx-auto lg:mx-0 leading-relaxed break-words">
              {currentBanner.subtitle}
            </p>

            {/* CTAs Row */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-1">
              <button
                onClick={scrollToCatalog}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#8423DA] via-[#007BFF] to-[#00DFFF] text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(0,223,255,0.4)] hover:shadow-[0_0_30px_rgba(0,223,255,0.6)] hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{currentBanner.ctaText || 'Explorar Sabores'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={scrollToLoyalty}
                className="px-5 py-3.5 rounded-2xl bg-[#11152A] hover:bg-[#181C38] text-gray-200 border border-[#E53CF3]/40 hover:border-[#00DFFF]/60 font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <Gift className="w-4 h-4 text-[#E53CF3]" />
                <span>Nosso Cartão Fidelidade</span>
              </button>
            </div>

            {/* Value Props Pills matching image_2de191e7.png */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#0D1022]/90 border border-[#8423DA]/20 text-left">
                <ShieldCheck className="w-4 h-4 text-[#00DFFF] shrink-0" />
                <div>
                  <p className="text-[11px] font-bold text-white leading-tight">Produtos Originais</p>
                  <p className="text-[10px] text-[#A5A5B8]">Qualidade garantida</p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#0D1022]/90 border border-[#8423DA]/20 text-left">
                <Truck className="w-4 h-4 text-[#00DFFF] shrink-0" />
                <div>
                  <p className="text-[11px] font-bold text-white leading-tight">Envio Rápido</p>
                  <p className="text-[10px] text-[#A5A5B8]">Em toda região</p>
                </div>
              </div>

              <button
                type="button"
                onClick={scrollToLoyalty}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-[#0D1022]/90 hover:bg-[#141838] border border-[#E53CF3]/30 hover:border-[#00DFFF]/50 text-left transition cursor-pointer"
              >
                <Gift className="w-4 h-4 text-[#E53CF3] shrink-0" />
                <div>
                  <p className="text-[11px] font-bold text-white leading-tight">Cartão Fidelidade</p>
                  <p className="text-[10px] text-[#A5A5B8]">Acumule selos e ganhe</p>
                </div>
              </button>
            </div>

            {/* Live Search Box inside Hero */}
            <div className="max-w-xl mx-auto lg:mx-0 pt-1 w-full">
              <div className="relative flex items-center w-full">
                <input
                  type="text"
                  placeholder="Pesquise por modelo ou sabor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') scrollToCatalog();
                  }}
                  className="w-full pl-10 sm:pl-12 pr-24 sm:pr-28 py-2.5 sm:py-3 rounded-2xl bg-[#11152A]/95 border border-[#8423DA]/40 focus:border-[#00DFFF] text-white shadow-xl focus:outline-none focus:ring-2 focus:ring-[#00DFFF]/20 text-xs sm:text-sm placeholder:text-gray-400"
                />
                <Search className="w-4 h-4 sm:w-5 sm:h-5 absolute left-3.5 sm:left-4 text-gray-400" />
                <button
                  onClick={scrollToCatalog}
                  className="absolute right-1.5 sm:right-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-xl bg-gradient-to-r from-[#007BFF] to-[#00DFFF] text-[#080811] font-bold text-[11px] sm:text-xs uppercase tracking-wide flex items-center gap-1 transition-all shadow-md cursor-pointer shrink-0"
                >
                  <span>Buscar</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Quick tags below search */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 pt-2.5 text-xs text-[#A5A5B8]">
                <span className="font-medium text-gray-400">Atalhos de Puffs:</span>
                <button
                  onClick={() => handlePuffQuickFilter('under-6k')}
                  className="px-2 py-0.5 rounded-lg bg-[#11152A] text-gray-300 hover:text-[#00DFFF] border border-[#8423DA]/20 text-[11px] cursor-pointer"
                >
                  ⚡ Até 5.000
                </button>
                <button
                  onClick={() => handlePuffQuickFilter('6k-15k')}
                  className="px-2 py-0.5 rounded-lg bg-[#11152A] text-gray-300 hover:text-[#00DFFF] border border-[#8423DA]/20 text-[11px] cursor-pointer"
                >
                  ⚡ 12.000
                </button>
                <button
                  onClick={() => handlePuffQuickFilter('over-25k')}
                  className="px-2 py-0.5 rounded-lg bg-[#11152A] text-gray-300 hover:text-[#00DFFF] border border-[#8423DA]/20 text-[11px] cursor-pointer"
                >
                  ⚡ 15.000+
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Visual Showcase with 3D device artwork */}
          <div className="lg:col-span-5 flex flex-col justify-center items-center relative">
            <div className="relative w-full max-w-lg">
              {/* Outer Glowing Neon Aura */}
              <div className="absolute inset-0 bg-gradient-to-tr from-[#00DFFF]/30 via-[#8423DA]/30 to-[#E53CF3]/30 rounded-3xl blur-2xl transform scale-105" />

              {/* Showcase Card Frame */}
              <div className="relative rounded-3xl bg-[#0D1022]/95 border-2 border-[#8423DA]/40 p-4 sm:p-6 shadow-2xl backdrop-blur-xl overflow-hidden min-h-[320px] sm:min-h-[380px] flex flex-col justify-between">
                {/* Floating Tagline Pill (Image 2 style) */}
                <div className="flex justify-between items-center z-10">
                  <span className="px-3 py-1 rounded-full bg-black/70 border border-[#00DFFF]/50 text-[#00DFFF] text-[10px] sm:text-xs font-black tracking-wider uppercase backdrop-blur-md shadow-md">
                    {currentBanner.tagline || 'SABORES QUE TE LEVAM MAIS LONGE'}
                  </span>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/60 border border-white/10 text-[10px] text-gray-300">
                    <span className={`w-1.5 h-1.5 rounded-full ${isPaused ? 'bg-amber-400' : 'bg-[#00DFFF] animate-ping'}`} />
                    <span>{currentSlideIndex + 1}/{totalSlides}</span>
                  </div>
                </div>

                {/* Banner Visual Centerpiece */}
                <div className="relative flex-grow flex items-center justify-center py-2 overflow-hidden my-auto">
                  <div className="relative w-full max-w-sm aspect-[4/3] flex items-center justify-center">
                    <img
                      src={currentBanner.imageUrl || '/assets/images/hero_podwave_3d_device.png'}
                      alt={currentBanner.title}
                      style={{
                        transform: `translate(${currentBanner.positionX || 0}%, ${currentBanner.positionY || 0}%) scale(${currentBanner.scale || 1})`,
                        objectFit: currentBanner.objectFit || 'contain',
                      }}
                      className="w-full h-full object-contain filter drop-shadow-[0_15px_35px_rgba(0,223,255,0.5)] transition-all duration-500 select-none pointer-events-none"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>

                {/* Sub-card feature highlights */}
                <div className="pt-3 border-t border-[#8423DA]/25 flex items-center justify-between text-xs z-10">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#00DFFF] animate-pulse" />
                    <span className="text-gray-300 font-medium text-[11px]">
                      Sinta a Nova Onda &bull; PodWave
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-[#00DFFF]/20 text-[#00DFFF] font-bold border border-[#00DFFF]/40 text-[10px]">
                    CARROSSEL ATIVO (6s)
                  </span>
                </div>
              </div>

              {/* Navigation Controls (< and >) */}
              {totalSlides > 1 && (
                <>
                  <button
                    onClick={goToPrevSlide}
                    className="absolute -left-3 sm:-left-4 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#0D1022]/95 hover:bg-[#8423DA] border border-[#00DFFF]/60 text-white flex items-center justify-center shadow-lg transition-all cursor-pointer z-20 active:scale-90"
                    title="Slide anterior"
                  >
                    <ChevronLeft className="w-5 h-5 text-[#00DFFF]" />
                  </button>

                  <button
                    onClick={goToNextSlide}
                    className="absolute -right-3 sm:-right-4 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#0D1022]/95 hover:bg-[#8423DA] border border-[#00DFFF]/60 text-white flex items-center justify-center shadow-lg transition-all cursor-pointer z-20 active:scale-90"
                    title="Próximo slide"
                  >
                    <ChevronRight className="w-5 h-5 text-[#00DFFF]" />
                  </button>
                </>
              )}
            </div>

            {/* Carousel Dots Pagination (Expanding Pills) */}
            {totalSlides > 1 && (
              <div className="flex items-center gap-2 mt-4 z-10">
                {activeBanners.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`h-2.5 rounded-full transition-all cursor-pointer ${
                      idx === currentSlideIndex
                        ? 'w-8 bg-gradient-to-r from-[#00DFFF] to-[#8423DA] shadow-[0_0_12px_#00DFFF]'
                        : 'w-2.5 bg-gray-600 hover:bg-gray-400'
                    }`}
                    title={`Ir para o banner ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
