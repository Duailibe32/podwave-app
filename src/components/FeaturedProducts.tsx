import React, { useMemo } from 'react';
import { ChevronRight, Flame } from 'lucide-react';
import { useCatalog } from '../context/CatalogContext';
import { productCardImage } from '../utils/productImage';
import { scrollToSectionById } from '../utils/anchorNavigation';
import type { ProductModel } from '../types/catalog';
import { isFlavorAvailable, pickFeaturedModels } from '../utils/featuredProducts';

const formatPrice = (value: number) => value.toFixed(2).replace('.', ',');

/** Faixa horizontal com os produtos em destaque, para aparecer já na primeira tela do celular. */
export const FeaturedProducts: React.FC = () => {
  const { models, setActiveModalProduct, setActiveSelectedFlavor } = useCatalog();
  const featured = useMemo(() => pickFeaturedModels(models), [models]);

  if (featured.length === 0) return null;

  const openProduct = (model: ProductModel) => {
    setActiveSelectedFlavor(model.flavors.find(isFlavorAvailable) || null);
    setActiveModalProduct(model);
  };

  return (
    <section aria-labelledby="mais-pedidos-titulo" className="featured-products text-left">
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <h2 id="mais-pedidos-titulo" className="flex items-center gap-1.5 font-heading text-base sm:text-lg font-black text-white">
          <Flame className="w-4 h-4 text-[#FF7A1A] fill-[#FF7A1A]/30" aria-hidden="true" />
          Mais pedidos
        </h2>
        <button
          type="button"
          onClick={() => scrollToSectionById('catalogo', { afterFrames: 2, updateHash: true, moveFocus: true })}
          className="min-h-11 inline-flex items-center gap-0.5 text-xs font-bold text-[#00DFFF] cursor-pointer"
        >
          Ver todos <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>

      {/* A chave recria a lista quando os produtos mudam (ex.: dados locais trocados pelos do banco);
          sem isso o navegador mantém o cartão "encaixado" e a faixa começa no meio. */}
      <ul key={featured.map((model) => model.id).join('|')} className="featured-products-list -mx-4 px-4 sm:mx-0 sm:px-0 flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-px-4 sm:scroll-px-0 pb-1">
        {featured.map((model) => {
          const image = productCardImage(model.imageUrl || '/assets/images/logo.png');
          return (
            <li key={model.id} className="snap-start shrink-0 w-[40%] max-w-[176px] min-w-[136px]">
              <button
                type="button"
                onClick={() => openProduct(model)}
                className="group w-full h-full flex flex-col rounded-2xl bg-[#0A0D1E] border border-[#1E2348] hover:border-[#00DFFF]/70 p-2 text-left transition cursor-pointer"
                aria-label={`${model.brandName} ${model.modelName}, R$ ${formatPrice(model.startingPrice)}. Ver sabores`}
              >
                <span className="relative block aspect-square w-full rounded-xl bg-white overflow-hidden">
                  <img
                    src={image.src}
                    srcSet={image.srcSet}
                    sizes="176px"
                    alt=""
                    loading="eager"
                    decoding="async"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {model.badge && (
                    <span className="absolute left-1.5 top-1.5 max-w-[calc(100%-12px)] truncate rounded-full bg-gradient-to-r from-[#FFE066] to-[#FFB703] px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-[#0A0A14]">
                      {model.badge.replace(/^\s*★\s*/u, '')}
                    </span>
                  )}
                </span>
                <span className="mt-2 block text-[9px] font-black uppercase tracking-[0.18em] text-[#00DFFF] truncate">{model.brandName}</span>
                <span className="block text-[13px] font-extrabold leading-tight text-white line-clamp-2 min-h-[2.2em]">{model.modelName}</span>
                <span className="mt-1 block font-heading text-base font-black text-white">
                  <small className="text-[10px] font-extrabold text-[#00DFFF] mr-0.5">R$</small>
                  {formatPrice(model.startingPrice)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
