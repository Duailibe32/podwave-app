import React, { useState } from 'react';
import { ProductModel, FlavorVariant } from '../types/catalog';
import { useCatalog } from '../context/CatalogContext';
import { Zap, Plus, Check, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { productCardImage } from '../utils/productImage';
import { flavorColor, lastUnitsLabel } from '../utils/flavorPresentation';
import { useCartFeedback } from '../hooks/useCartFeedback';

interface ProductCardProps {
  product: ProductModel;
  priority?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, priority = false }) => {
  const { setActiveModalProduct, setActiveSelectedFlavor, addToCart } = useCatalog();
  const originalImage = product.imageUrl || '/assets/images/logo.png';
  const cardImage = productCardImage(originalImage);

  const [selectedId, setSelectedId] = useState<string>();
  const [loadedImage, setLoadedImage] = useState<string>();
  const [failedImage, setFailedImage] = useState<string>();
  const selected = product.flavors.find(flavor => flavor.id === selectedId);
  const leadFlavor = selected || product.flavors.find(flavor => flavor.inStock && flavor.demoQuantity !== 0) || product.flavors[0];
  const { added, confirm } = useCartFeedback(leadFlavor?.id);
  const flavorCount = product.flavors.length;
  const flavorIndex = product.flavors.findIndex(flavor => flavor.id === leadFlavor?.id);
  const selectedUnavailable = Boolean(leadFlavor && (!leadFlavor.inStock || leadFlavor.demoQuantity === 0));
  const canAdd = Boolean(leadFlavor && !selectedUnavailable && (selected || flavorCount === 1));
  const lastUnits = lastUnitsLabel(leadFlavor);
  const isImageReady = loadedImage === cardImage.src;
  const imageFailed = failedImage === cardImage.src;

  const handleCardClick = () => {
    setActiveSelectedFlavor(leadFlavor || null);
    setActiveModalProduct(product);
  };

  const handleFlavorClick = (event: React.MouseEvent, flavor: FlavorVariant) => {
    event.stopPropagation();
    setSelectedId(flavor.id);
  };

  const stepFlavor = (event: React.MouseEvent, direction: number) => {
    const index = (flavorIndex + direction + flavorCount) % flavorCount;
    handleFlavorClick(event, product.flavors[index]);
  };

  const actionLabel = canAdd ? 'Adicionar' : selectedUnavailable || !flavorCount ? 'Ver detalhes' : 'Ver sabores';

  // Format puff count: e.g. 15000 -> "15.000", or extract numbers from puffsLabel
  const rawPuffsNumber = product.puffs > 0 ? product.puffs.toLocaleString('pt-BR') : product.puffsLabel.replace(/[^0-9.]/g, '');

  return (
    <div
      onClick={handleCardClick}
      data-flavor-selected={selected ? 'true' : undefined}
      style={{ '--flavor-color': flavorColor(leadFlavor) } as React.CSSProperties}
      className="product-card flavor-product-card group relative flex flex-col justify-between h-full rounded-[24px] sm:rounded-[26px] p-3 sm:p-4 transition-all duration-300 cursor-pointer bg-[#0A0D1E] border border-[#1E2348] hover:border-[#00DFFF]/70 hover:shadow-[0_10px_35px_rgba(0,223,255,0.22)] hover:-translate-y-1.5 overflow-hidden w-full select-none"
    >
      {/* Subtle neon gradient ambient background */}
      <div className="flavor-hover-light absolute inset-0 rounded-[24px] sm:rounded-[26px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-b from-[#00DFFF]/10 via-transparent to-[#9333EA]/10" />

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
        <div data-loaded={isImageReady || imageFailed} className="product-photo relative w-full aspect-square rounded-2xl p-3 sm:p-4 flex items-center justify-center overflow-hidden shadow-inner group-hover:shadow-md transition-shadow">
          {imageFailed ? (
            <span className="text-center text-xs font-semibold text-slate-400">Imagem indisponível</span>
          ) : <img
            key={cardImage.src}
            onLoad={() => setLoadedImage(cardImage.src)}
            src={cardImage.src}
            srcSet={cardImage.srcSet}
            sizes="(min-width: 1280px) 280px, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
            alt={`${product.brandName} ${product.modelName}`}
            width={320} height={320}
            className="product-photo-image w-full h-full object-contain transform transition-transform duration-500 group-hover:scale-105"
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding="async"
            onError={event => {
              const image = event.currentTarget;
              if (cardImage.src !== originalImage && image.dataset.originalFallback !== originalImage) {
                image.dataset.originalFallback = originalImage;
                image.srcset = '';
                image.src = originalImage;
              } else {
                setFailedImage(cardImage.src);
              }
            }}
            referrerPolicy="no-referrer"
          />}

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
          <button type="button" onClick={event => { event.stopPropagation(); handleCardClick(); }} className="min-h-11 w-full">
            {product.modelName}
          </button>
        </h3>

        {product.flavors.length > 0 ? (
          <>
            <div className="flavor-mobile-picker sm:hidden" role="group" aria-label={'Sabores de ' + product.modelName}>
              {flavorCount > 1 && (
                <div className="flavor-mobile-stepper">
                  <button type="button" aria-label="Sabor anterior" onClick={event => stepFlavor(event, -1)}>
                    <ChevronLeft size={18} aria-hidden="true" />
                  </button>
                  <span aria-hidden="true">{flavorIndex + 1}/{flavorCount}</span>
                  <button type="button" aria-label="Próximo sabor" onClick={event => stepFlavor(event, 1)}>
                    <ChevronRight size={18} aria-hidden="true" />
                  </button>
                </div>
              )}
              <button type="button" className="flavor-mobile-name"
                onClick={event => { event.stopPropagation(); handleCardClick(); }}>
                <span className="flavor-mobile-emoji" aria-hidden="true">{leadFlavor?.iconEmoji}</span>
                <span aria-live="polite">{leadFlavor?.name}</span>
                <small>{flavorCount === 1 ? 'Ver ficha' : 'Ver opções'}</small>
              </button>
            </div>
            <div className="flavor-chip-list" role="group" aria-label="Sabores">
            {product.flavors.map(flavor => (
              <button key={flavor.id} type="button" className="flavor-chip"
                aria-pressed={leadFlavor?.id === flavor.id}
                style={{ '--chip-color': flavorColor(flavor) } as React.CSSProperties}
                onClick={event => handleFlavorClick(event, flavor)}>
                <span aria-hidden="true">{flavor.iconEmoji}</span>
                <span>{flavor.name}</span>
                {(!flavor.inStock || flavor.demoQuantity === 0) && <span className="sr-only"> (esgotado)</span>}
              </button>
            ))}
            </div>
          </>
        ) : <span className="text-[10px] text-gray-400">Sabores sob consulta</span>}
        {lastUnits && <span className="flavor-last-units" title={leadFlavor?.name}>{lastUnits}</span>}
      </div>

      {/* BOTTOM ZONE: Availability + Price and Round Gradient '+' Button */}
      <div className="flavor-card-actions mt-3.5 pt-2.5 border-t border-[#1E2348] flex items-center justify-between gap-2 w-full">
        {/* Left Side: Availability dot + Price */}
        <div className="text-left overflow-hidden min-w-0 space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full inline-block shrink-0 ${
                selectedUnavailable
                  ? 'bg-rose-500 shadow-[0_0_6px_#EF4444]'
                  : 'bg-[#10B981] shadow-[0_0_6px_#10B981]'
              }`}
            />
            <span
              className={`text-[10px] sm:text-xs font-semibold truncate ${
                selectedUnavailable ? 'text-rose-400 font-bold' : 'text-[#8E95B8]'
              }`}
            >
              {selectedUnavailable ? 'Sabor esgotado' : leadFlavor ? 'Disponível' : 'Sob consulta'}
            </span>
          </div>
          <p className="font-heading text-base md:text-lg font-black text-white tracking-tight leading-tight truncate">
            <span className="text-[10px] sm:text-xs text-[#8E95B8] font-bold mr-0.5">R$</span>
            {product.startingPrice.toFixed(2).replace('.', ',')}
          </p>
        </div>

        {/* Right Side: Round '+' Button with Cyan-to-Purple Neon Gradient */}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            if (!leadFlavor || !canAdd) {
              handleCardClick();
              return;
            }
            if (addToCart(product, leadFlavor)) confirm(event.currentTarget, leadFlavor.iconEmoji);
          }}
          className="flavor-card-action min-h-11 rounded-xl sm:w-11 sm:rounded-full flex items-center justify-center gap-1 font-bold text-xs text-white bg-[#5535a4] transition-colors cursor-pointer hover:bg-[#6845bf] active:bg-[#412783] shrink-0"
          aria-label={canAdd ? 'Adicionar ' + leadFlavor?.name + ' à sacola' : actionLabel + ' de ' + product.modelName}
        >
          {added ? <Check className="size-4 shrink-0" aria-hidden="true" />
            : canAdd ? <Plus className="size-4 shrink-0" aria-hidden="true" />
            : <ChevronRight className="size-4 shrink-0" aria-hidden="true" />}
          <span className="sm:sr-only" aria-live="polite">{added ? 'Adicionado' : actionLabel}</span>
        </button>
      </div>
    </div>
  );
};
