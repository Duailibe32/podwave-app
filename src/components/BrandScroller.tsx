import React from 'react';
import { motion } from 'motion/react';
import { useCatalog } from '../context/CatalogContext';
import { Check, RotateCcw, ArrowDown, Sparkles } from 'lucide-react';

interface BrandCardTheme {
  bgGradient: string;
  borderColor: string;
  accentColor: string;
  renderLogo: () => React.ReactNode;
}

export const BrandScroller: React.FC = () => {
  const { brands, models, selectedBrand, setSelectedBrand } = useCatalog();

  const getBrandProductCount = (brandId: string) => {
    return models.filter((m) => m.brandId === brandId && m.active).length;
  };

  const handleSelectBrand = (brandId: string) => {
    // If user clicks the already selected brand, keep it or toggle
    setSelectedBrand(brandId);

    // Smoothly scroll down to catalog section to show only the selected brand's devices
    setTimeout(() => {
      const el = document.getElementById('catalogo') || document.getElementById('modelos');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  };

  const handleClearFilter = () => {
    setSelectedBrand('all');
    setTimeout(() => {
      const el = document.getElementById('catalogo') || document.getElementById('modelos');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  };

  // Visual themes matching image_5a419201.png for each manufacturer
  const getBrandTheme = (brandId: string, brandName: string, customColor?: string): BrandCardTheme => {
    const id = brandId.toLowerCase();

    // Custom gradient override if set by admin
    if (customColor) {
      if (customColor === 'magenta') {
        return {
          bgGradient: 'bg-gradient-to-b from-[#E11D48] via-[#C026D3] to-[#7E22CE]',
          borderColor: 'border-[#F43F5E]/60',
          accentColor: '#FF2D87',
          renderLogo: () => (
            <div className="flex flex-col items-center justify-center text-center space-y-1 py-1">
              <span className="font-heading font-black text-xs sm:text-sm tracking-wider text-white drop-shadow-md truncate max-w-[95px]">
                {brandName}
              </span>
            </div>
          ),
        };
      }
      if (customColor === 'cyan') {
        return {
          bgGradient: 'bg-gradient-to-b from-[#0284C7] via-[#0369A1] to-[#0C4A6E]',
          borderColor: 'border-[#00DFFF]/60',
          accentColor: '#00DFFF',
          renderLogo: () => (
            <div className="flex flex-col items-center justify-center text-center py-2 relative overflow-hidden">
              <span className="font-heading font-black text-xs sm:text-sm tracking-tight text-white drop-shadow-[0_0_10px_#00DFFF] truncate max-w-[95px]">
                {brandName}
              </span>
              <div className="w-8 h-0.5 mt-1 rounded-full bg-[#00DFFF]/80" />
            </div>
          ),
        };
      }
      if (customColor === 'emerald') {
        return {
          bgGradient: 'bg-gradient-to-b from-[#065F46] via-[#064E3B] to-[#022C22]',
          borderColor: 'border-[#10B981]/60',
          accentColor: '#10B981',
          renderLogo: () => (
            <div className="flex flex-col items-center justify-center text-center space-y-1 py-1">
              <div className="w-7 h-7 rounded-md border-2 border-[#34D399] flex items-center justify-center text-[#A7F3D0] font-black text-xs shadow-[0_0_8px_rgba(16,185,129,0.5)]">
                {brandName.charAt(0) || 'V'}
              </div>
              <span className="font-heading font-black text-[11px] tracking-wider text-white truncate max-w-[95px]">
                {brandName}
              </span>
            </div>
          ),
        };
      }
      if (customColor === 'purple') {
        return {
          bgGradient: 'bg-gradient-to-b from-[#4C1D95] via-[#311042] to-[#0D0B18]',
          borderColor: 'border-[#8423DA]/60',
          accentColor: '#A855F7',
          renderLogo: () => (
            <div className="flex flex-col items-center justify-center text-center space-y-1 py-1">
              <Sparkles className="w-5 h-5 text-[#C084FC] mb-0.5" />
              <span className="font-heading font-black text-xs tracking-wider text-white truncate max-w-[95px]">
                {brandName}
              </span>
            </div>
          ),
        };
      }
      if (customColor === 'gold') {
        return {
          bgGradient: 'bg-gradient-to-b from-[#0D1B2A] via-[#14213D] to-[#0A1128]',
          borderColor: 'border-[#00DFFF]/60',
          accentColor: '#00DFFF',
          renderLogo: () => (
            <div className="flex flex-col items-center justify-center text-center space-y-1 py-1">
              <span className="text-[#00DFFF] font-black text-xs">⚡</span>
              <span className="font-heading font-black text-xs tracking-wider text-white truncate max-w-[95px]">
                {brandName}
              </span>
            </div>
          ),
        };
      }
      if (customColor === 'black') {
        return {
          bgGradient: 'bg-gradient-to-b from-[#1C1C24] via-[#0D0D12] to-[#050508]',
          borderColor: 'border-white/30',
          accentColor: '#FFFFFF',
          renderLogo: () => (
            <div className="flex flex-col items-center justify-center text-center space-y-1 py-1">
              <span className="font-heading font-black text-xs tracking-widest text-white truncate max-w-[95px]">
                {brandName}
              </span>
            </div>
          ),
        };
      }
    }

    if (id.includes('elfbar')) {
      return {
        bgGradient: 'bg-gradient-to-b from-[#E11D48] via-[#C026D3] to-[#7E22CE]',
        borderColor: 'border-[#F43F5E]/60',
        accentColor: '#FF2D87',
        renderLogo: () => (
          <div className="flex flex-col items-center justify-center text-center space-y-1.5 py-1">
            <span className="font-heading font-black text-xs sm:text-sm tracking-wider text-white drop-shadow-md truncate max-w-[95px]">
              {brandName}
            </span>
            {/* Visual vape silhouette hints like in reference card */}
            <div className="flex items-center gap-1.5 opacity-90 scale-90">
              <div className="w-2.5 h-6 rounded-full bg-black/40 border border-white/40" />
              <div className="w-3 h-8 rounded-full bg-black/60 border border-white/60 shadow-lg" />
              <div className="w-2.5 h-6 rounded-full bg-black/40 border border-white/40" />
            </div>
          </div>
        ),
      };
    }

    if (id.includes('lostmary')) {
      return {
        bgGradient: 'bg-gradient-to-b from-[#0284C7] via-[#0369A1] to-[#0C4A6E]',
        borderColor: 'border-[#00DFFF]/60',
        accentColor: '#00DFFF',
        renderLogo: () => (
          <div className="flex flex-col items-center justify-center text-center py-3 relative overflow-hidden">
            {/* Ambient water/smoke waves */}
            <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_50%_40%,#38BDF8,transparent_70%)]" />
            <span className="font-heading font-black text-xs sm:text-sm tracking-tight text-white drop-shadow-[0_0_10px_#00DFFF] relative z-10 truncate max-w-[95px]">
              {brandName}
            </span>
            <div className="w-8 h-0.5 mt-1.5 rounded-full bg-[#00DFFF]/80" />
          </div>
        ),
      };
    }

    if (id.includes('ignite')) {
      return {
        bgGradient: 'bg-gradient-to-b from-[#1C1C24] via-[#0D0D12] to-[#050508]',
        borderColor: 'border-white/30',
        accentColor: '#FFFFFF',
        renderLogo: () => (
          <div className="flex flex-col items-center justify-center text-center space-y-1 py-1.5">
            {/* Stylized horned bull skull icon */}
            <svg className="w-7 h-7 text-white fill-white drop-shadow-[0_0_6px_rgba(255,255,255,0.7)]" viewBox="0 0 24 24">
              <path d="M12 4C9.5 4 4 2 2 8c2.5 1 4 3 4 5 0 2.5 2 4.5 6 4.5s6-2 6-4.5c0-2 1.5-4 4-5-2-6-7.5-4-10-4zm0 2c1.8 0 5.2 1.2 7 2.5-1.5.8-2.5 2.2-2.5 3.5 0 1.5-1.5 2.5-4.5 2.5s-4.5-1-4.5-2.5c0-1.3-1-2.7-2.5-3.5C6.8 7.2 10.2 6 12 6z" />
            </svg>
            <span className="font-heading font-black text-xs tracking-widest text-white truncate max-w-[95px]">
              {brandName}
            </span>
          </div>
        ),
      };
    }

    if (id.includes('fumot')) {
      return {
        bgGradient: 'bg-gradient-to-b from-[#1E3A8A] via-[#172554] to-[#0A0F1D]',
        borderColor: 'border-[#3B82F6]/60',
        accentColor: '#3B82F6',
        renderLogo: () => (
          <div className="flex flex-col items-center justify-center text-center space-y-1 py-1.5">
            {/* FS Monogram */}
            <div className="w-7 h-7 rounded-lg border-2 border-[#60A5FA] flex items-center justify-center text-[#93C5FD] font-black text-xs tracking-tighter shadow-[0_0_8px_rgba(59,130,246,0.6)]">
              {brandName.slice(0, 2).toUpperCase()}
            </div>
            <span className="font-heading font-black text-xs tracking-wider text-white truncate max-w-[95px]">
              {brandName}
            </span>
          </div>
        ),
      };
    }

    if (id.includes('vaporesso')) {
      return {
        bgGradient: 'bg-gradient-to-b from-[#065F46] via-[#064E3B] to-[#022C22]',
        borderColor: 'border-[#10B981]/60',
        accentColor: '#10B981',
        renderLogo: () => (
          <div className="flex flex-col items-center justify-center text-center space-y-1 py-1.5">
            {/* V Shield Emblem */}
            <div className="w-7 h-7 rounded-md border-2 border-[#34D399] flex items-center justify-center text-[#A7F3D0] font-black text-sm shadow-[0_0_8px_rgba(16,185,129,0.5)]">
              {brandName.charAt(0) || 'V'}
            </div>
            <span className="font-heading font-black text-[11px] tracking-wider text-white truncate max-w-[95px]">
              {brandName}
            </span>
          </div>
        ),
      };
    }

    if (id.includes('geekbar') || id.includes('geek')) {
      return {
        bgGradient: 'bg-gradient-to-b from-[#334155] via-[#1E293B] to-[#0F172A]',
        borderColor: 'border-slate-400/50',
        accentColor: '#94A3B8',
        renderLogo: () => (
          <div className="flex flex-col items-center justify-center text-center space-y-1 py-1.5">
            {/* GS Interlocking badge */}
            <div className="w-7 h-7 rounded-md bg-white/10 border border-white/40 flex items-center justify-center text-white font-black text-xs tracking-tighter">
              {brandName.slice(0, 2).toUpperCase()}
            </div>
            <span className="font-heading font-black text-xs tracking-wider text-white truncate max-w-[95px]">
              {brandName}
            </span>
          </div>
        ),
      };
    }

    // Default Fallback
    return {
      bgGradient: 'bg-gradient-to-b from-[#1E2348] via-[#121630] to-[#0A0D1E]',
      borderColor: 'border-[#8423DA]/50',
      accentColor: '#00DFFF',
      renderLogo: () => (
        <div className="flex flex-col items-center justify-center text-center py-3">
          <Sparkles className="w-5 h-5 text-[#00DFFF] mb-1" />
          <span className="font-heading font-black text-xs tracking-wider text-white truncate max-w-[90px]">
            {brandName}
          </span>
        </div>
      ),
    };
  };

  return (
    <section id="marcas" className="py-8 bg-[#080811] border-b border-[#8423DA]/20 scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        {/* Header matching image_5a419201.png ("9. Página de marcas - Organização visual por fabricante") */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Number 9 Purple Badge */}
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-[#8423DA] to-[#A855F7] text-white font-black text-sm sm:text-base flex items-center justify-center shadow-[0_0_15px_rgba(132,35,218,0.6)] shrink-0">
              9
            </div>
            <div>
              <h2 className="font-heading text-lg sm:text-xl font-black text-white tracking-tight leading-tight">
                Página de marcas
              </h2>
              <p className="text-xs text-[#A5A5B8]">
                Organização visual por fabricante &bull; Clique para filtrar e rolar aos modelos
              </p>
            </div>
          </div>

          {/* Active Filter Indicator & Reset */}
          <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
            {selectedBrand !== 'all' ? (
              <div className="flex items-center gap-2 bg-[#121632] border border-[#00DFFF]/50 px-3 py-1.5 rounded-xl shadow-md">
                <span className="text-gray-300">Filtrando por:</span>
                <strong className="text-[#00DFFF] uppercase font-black">
                  {brands.find((b) => b.id === selectedBrand)?.name || selectedBrand}
                </strong>
                <button
                  onClick={handleClearFilter}
                  className="ml-1 text-gray-400 hover:text-white flex items-center gap-1 cursor-pointer"
                  title="Ver todas as marcas"
                >
                  <RotateCcw className="w-3 h-3 text-[#00DFFF]" /> Limpar
                </button>
              </div>
            ) : (
              <button
                onClick={handleClearFilter}
                className="px-3 py-1.5 rounded-xl bg-[#131733] text-gray-300 hover:text-white border border-[#8423DA]/25 hover:border-[#00DFFF]/60 transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <span>Exibindo Todos</span>
                <ArrowDown className="w-3.5 h-3.5 text-[#00DFFF] animate-bounce" />
              </button>
            )}
          </div>
        </div>

        {/* Visual Cards Row matching image_5a419201.png with custom brand photo support */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4 pt-1">
          {brands.map((brand) => {
            const isSelected = selectedBrand === brand.id;
            const theme = getBrandTheme(brand.id, brand.name, brand.cardColor);
            const productCount = getBrandProductCount(brand.id);

            return (
              <motion.button
                key={brand.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleSelectBrand(brand.id)}
                className={`group relative flex flex-col justify-between h-[115px] sm:h-[125px] rounded-2xl p-2.5 transition-all duration-300 cursor-pointer overflow-hidden border text-left select-none ${theme.bgGradient} ${
                  isSelected
                    ? 'ring-2 ring-[#00DFFF] scale-[1.03] shadow-[0_0_25px_rgba(0,223,255,0.5)] border-white'
                    : 'border-white/15 hover:border-white/50 hover:scale-[1.02] hover:shadow-lg opacity-90 hover:opacity-100'
                }`}
                title={`Ver modelos da ${brand.name} (${productCount} disponíveis)`}
              >
                {/* Active Selection Checkmark Badge */}
                {isSelected && (
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#00DFFF] text-black flex items-center justify-center shadow-md z-20">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}

                {/* Subtle sheen highlight */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-white/10 pointer-events-none" />

                {/* Brand Visual Logo Section (Custom photo or SVG theme) */}
                <div className="relative z-10 flex-grow flex items-center justify-center p-1">
                  {brand.logoUrl ? (
                    <div className="flex flex-col items-center justify-center text-center space-y-1 w-full px-1">
                      <img
                        src={brand.logoUrl}
                        alt={brand.name}
                        className="max-h-12 max-w-[95px] object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] transition-transform group-hover:scale-105"
                      />
                      <span className="font-heading font-black text-[11px] tracking-wider text-white drop-shadow-sm truncate max-w-full">
                        {brand.name}
                      </span>
                    </div>
                  ) : (
                    theme.renderLogo()
                  )}
                </div>

                {/* Bottom Info Row: Model Count + "Ver modelos" on hover */}
                <div className="relative z-10 pt-1 border-t border-white/20 flex items-center justify-between text-[10px] text-white/90">
                  <span className="font-bold opacity-80 group-hover:opacity-100">
                    {productCount} {productCount === 1 ? 'modelo' : 'modelos'}
                  </span>
                  <span className="text-[#00DFFF] font-black group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                    Ver &darr;
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
