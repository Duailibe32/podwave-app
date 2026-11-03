import React from 'react';
import { ProductModel, FlavorVariant } from '../types/catalog';
import { useCatalog } from '../context/CatalogContext';
import { Zap, Plus, CheckCircle2 } from 'lucide-react';
import { calculateVariantAvailability } from '../utils/availability';
import { productCardImage } from '../utils/productImage';

interface ProductCardProps {
  product: ProductModel;
  priority?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, priority = false }) => {
  const { setActiveModalProduct, setActiveSelectedFlavor, addToCart } = useCatalog();
  const originalImage = product.imageUrl || '/assets/images/logo.png';
  const cardImage = productCardImage(originalImage);

  const handleCardClick = () => {
    setActiveModalProduct(product);
  };

  const handleFlavorClick = (e: React.MouseEvent, flavor: FlavorVariant) => {
    e.stopPropagation();
    setActiveModalProduct(product);
    setActiveSelectedFlavor(flavor);
  };

  // Up to first flavor with colored dot and emoji, plus count for remaining
  const visibleFlavors = product.flavors.slice(0, 1);
  const remainingCount = product.flavors.length - visibleFlavors.length;
  const leadFlavor = visibleFlavors[0];

  // Check if all flavors of this product are sold out
  const isAllFlavorsSoldOut = product.flavors.length > 0 && product.flavors.every((f) => {
    const threshold = f.lowQuantityThreshold ?? product.lowQuantityThreshold ?? 3;
    const avail = calculateVariantAvailability(f.demoQuantity, threshold);
    return avail.status === 'esgotado' || f.demoQuantity === 0 || f.inStock === false;
  });

  // Format puff count: e.g. 15000 -> "15.000", or extract numbers from puffsLabel
  const rawPuffsNumber = product.puffs > 0 ? product.puffs.toLocaleString('pt-BR') : product.puffsLabel.replace(/[^0-9.]/g, '');

  return (
    <div
      onClick={handleCardClick}
      className="product-card group relative flex flex-col justify-between h-full rounded-[24px] sm:rounded-[26px] p-3 sm:p-4 transition-all duration-300 cursor-pointer bg-[#0A0D1E] border border-[#1E2348] hover:border-[#00DFFF]/70 hover:shadow-[0_10px_35px_rgba(0,223,255,0.22)] hover:-translate-y-1.5 overflow-hidden w-full select-none"
    >
      {/* Subtle neon gradient ambient background */}
      <div className="absolute inset-0 rounded-[24px] sm:rounded-[26px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-b from-[#00DFFF]/10 via-transparent to-[#9333EA]/10" />

      {/* TOP ZONE: Badges and White Product Box */}
      <div className="w-full">
        {/* Badges row with wrap so text never overflows the card on mobile */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2.5 w-full">
          {/* ⚡ Puffs Badge: Dark capsule with cyan bolt, white number, gray puffs text */}
          <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-[#0D1127] border border-[#232A58] shadow-sm shrink-0">
            <Zap className="w-3.5 h-3.5 text-[#00DFFF] fill-[#00DFFF] shrink-0" />
            <span className="text-white font-extrabold text-[11px] sm:text-xs tracking-tight">
              {rawPuffsNumber || product.puffsLabel}
            </span>
            <span className="text-[#8E95B8] font-medium text-[10px] sm:text-xs">
              Puffs
            </span>
          </div>

          {/* Destaque / Top Badge matching Image 2 */}
          {product.badge && (
            <div
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] sm:text-[10px] font-black tracking-wider uppercase shrink-0 shadow-md ${
                product.badge.includes('Destaque')
                  ? 'bg-gradient-to-r from-[#00DFFF] to-[#007BFF] text-[#080811] shadow-[0_0_12px_rgba(0,223,255,0.45)]'
                  : 'bg-gradient-to-r from-[#8423DA] to-[#E53CF3] text-white shadow-[0_0_10px_rgba(229,60,243,0.45)]'
              }`}
            >
              <span>{product.badge}</span>
            </div>
          )}
        </div>

        {/* Clean Centered White Product Container */}
        <div className="relative w-full aspect-square rounded-2xl bg-white p-3 sm:p-4 flex items-center justify-center overflow-hidden shadow-inner group-hover:shadow-md transition-shadow">
          <img
            src={cardImage.src}
            srcSet={cardImage.srcSet}
            sizes="(min-width: 1280px) 280px, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
            alt={`${product.brandName} ${product.modelName}`}
            width={320} height={320}
            className="w-full h-full object-contain transform transition-transform duration-500 group-hover:scale-105"
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding="async"
            onError={event => {
              const image = event.currentTarget;
              if (cardImage.src !== originalImage && image.dataset.originalFallback !== originalImage) {
                image.dataset.originalFallback = originalImage;
                image.srcset = '';
                image.src = originalImage;
              }
            }}
            referrerPolicy="no-referrer"
          />

          {/* Quick hover indicator tag */}
          <div className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-md bg-black/80 text-[9px] text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            <CheckCircle2 className="w-2.5 h-2.5 text-[#00DFFF]" />
            <span>Ver Ficha</span>
          </div>
        </div>
      </div>

      {/* MIDDLE ZONE: Brand, Model, Flavors Pill */}
      <div className="mt-3 text-center space-y-1.5 w-full overflow-hidden">
        {/* Brand Name: Vibrant Cyan, tracking-widest */}
        <p className="text-[10px] sm:text-[11px] font-black tracking-widest uppercase text-[#00DFFF] truncate">
          {product.brandName}
        </p>

        {/* Model Name: Bold crisp white */}
        <h3 className="font-heading text-sm sm:text-base md:text-lg font-black text-white tracking-tight leading-snug line-clamp-2 min-h-[2.75rem] break-words">
          {product.modelName}
        </h3>

        {/* Flavors Pill (Dark capsule with colored dot, emoji, flavor name, and cyan +X count) */}
        <div className="pt-0.5 flex justify-center w-full overflow-hidden">
          {leadFlavor ? (
            <div
              onClick={(e) => handleFlavorClick(e, leadFlavor)}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-[#131733] border border-[#232958] hover:border-[#00DFFF]/60 text-gray-200 text-[10px] sm:text-xs transition-colors max-w-full overflow-hidden cursor-pointer"
              title="Clique para ver todos os sabores deste modelo"
            >
              {/* Colored Dot */}
              <span
                className="w-2 h-2 rounded-full inline-block shrink-0 shadow-sm"
                style={{ backgroundColor: leadFlavor.colorHex }}
              />
              <span className="shrink-0">{leadFlavor.iconEmoji}</span>
              <span className="font-medium text-gray-200 truncate max-w-[65px] sm:max-w-[100px]">
                {leadFlavor.name}
              </span>
              {remainingCount > 0 && (
                <span className="text-[#00DFFF] font-bold text-[10px] sm:text-[11px] shrink-0 ml-0.5">
                  +{remainingCount}
                </span>
              )}
            </div>
          ) : (
            <span className="text-[10px] text-gray-400">Sabores sob consulta</span>
          )}
        </div>
      </div>

      {/* BOTTOM ZONE: Availability + Price and Round Gradient '+' Button */}
      <div className="mt-3.5 pt-2.5 border-t border-[#1E2348] flex items-center justify-between gap-2 w-full">
        {/* Left Side: Availability dot + Price */}
        <div className="text-left overflow-hidden min-w-0 space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full inline-block shrink-0 ${
                isAllFlavorsSoldOut
                  ? 'bg-rose-500 shadow-[0_0_6px_#EF4444]'
                  : 'bg-[#10B981] shadow-[0_0_6px_#10B981]'
              }`}
            />
            <span
              className={`text-[10px] sm:text-xs font-semibold truncate ${
                isAllFlavorsSoldOut ? 'text-rose-400 font-bold' : 'text-[#8E95B8]'
              }`}
            >
              {isAllFlavorsSoldOut ? 'Esgotado' : 'Disponível'}
            </span>
          </div>
          <p className="font-heading text-base md:text-lg font-black text-white tracking-tight leading-tight truncate">
            <span className="text-[10px] sm:text-xs text-[#8E95B8] font-bold mr-0.5">R$</span>
            {product.startingPrice.toFixed(2).replace('.', ',')}
          </p>
        </div>

        {/* Right Side: Round '+' Button with Cyan-to-Purple Neon Gradient */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (product.flavors.length === 1) {
              const singleFlavor = product.flavors[0];
              const threshold = singleFlavor.lowQuantityThreshold ?? product.lowQuantityThreshold ?? 3;
              const avail = calculateVariantAvailability(singleFlavor.demoQuantity, threshold);
              if (avail.status === 'esgotado' || singleFlavor.demoQuantity === 0 || singleFlavor.inStock === false) {
                handleCardClick();
                return;
              }
              addToCart(product, singleFlavor);
            } else {
              handleCardClick();
            }
          }}
          className={`min-w-11 min-h-11 w-11 h-11 rounded-full flex items-center justify-center text-white transition-all duration-200 cursor-pointer shrink-0 ${
            isAllFlavorsSoldOut
              ? 'bg-[#181C38] border border-rose-500/40 text-rose-400 shadow-none hover:bg-rose-950/40'
              : 'bg-gradient-to-br from-[#00DFFF] via-[#7C3AED] to-[#A855F7] shadow-[0_0_15px_rgba(0,223,255,0.4)] hover:shadow-[0_0_22px_rgba(168,85,247,0.6)] hover:scale-105 active:scale-95'
          }`}
          title={isAllFlavorsSoldOut ? 'Produto esgotado - ver detalhes' : 'Ver detalhes ou adicionar ao carrinho'}
          aria-label={`Abrir detalhes de ${product.modelName}`}
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.8]" />
        </button>
      </div>
    </div>
  );
};
