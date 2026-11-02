import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useCatalog } from '../context/CatalogContext';
import { ProductCard } from './ProductCard';
import { Search, Zap, SlidersHorizontal, RotateCcw, PackageX } from 'lucide-react';

export const CatalogSection: React.FC = () => {
  const {
    models,
    brands,
    searchQuery,
    setSearchQuery,
    selectedBrand,
    setSelectedBrand,
    selectedPuffRange,
    setSelectedPuffRange,
    selectedCategory,
    setSelectedCategory,
    selectedSort,
    setSelectedSort,
    clearFilters,
  } = useCatalog();

  // Filter and sort products
  const filteredModels = useMemo(() => {
    return models
      .filter((model) => {
        // Active filter
        if (!model.active) return false;

        // Search filter (searches modelName, brandName, or flavors)
        if (searchQuery.trim() !== '') {
          const query = searchQuery.toLowerCase().trim();
          const matchesName = model.modelName.toLowerCase().includes(query);
          const matchesBrand = model.brandName.toLowerCase().includes(query);
          const matchesCategory = model.category.toLowerCase().includes(query);
          const matchesFlavor = model.flavors.some((f) =>
            f.name.toLowerCase().includes(query)
          );
          if (!matchesName && !matchesBrand && !matchesCategory && !matchesFlavor) {
            return false;
          }
        }

        // Brand filter
        if (selectedBrand !== 'all' && model.brandId !== selectedBrand) {
          return false;
        }

        // Category filter
        if (selectedCategory !== 'all' && model.category !== selectedCategory) {
          return false;
        }

        // Puff range filter
        if (selectedPuffRange === 'under-6k' && model.puffs > 6000) {
          return false;
        }
        if (
          selectedPuffRange === '6k-15k' &&
          (model.puffs < 6000 || model.puffs > 15000)
        ) {
          return false;
        }
        if (
          selectedPuffRange === '15k-25k' &&
          (model.puffs < 15000 || model.puffs > 25000)
        ) {
          return false;
        }
        if (selectedPuffRange === 'over-25k' && model.puffs <= 25000) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (selectedSort === 'puffs-desc') {
          return b.puffs - a.puffs;
        }
        if (selectedSort === 'puffs-asc') {
          return a.puffs - b.puffs;
        }
        if (selectedSort === 'price-asc') {
          return a.startingPrice - b.startingPrice;
        }
        if (selectedSort === 'price-desc') {
          return b.startingPrice - a.startingPrice;
        }
        if (selectedSort === 'name-asc') {
          return a.modelName.localeCompare(b.modelName);
        }
        // Relevance default (featured badges first)
        const badgeScore = (badge?: string) => (badge === '★ TOP' ? 2 : badge ? 1 : 0);
        return badgeScore(b.badge) - badgeScore(a.badge);
      });
  }, [models, searchQuery, selectedBrand, selectedPuffRange, selectedCategory, selectedSort]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    models.forEach((m) => {
      if (m.category) set.add(m.category);
    });
    return Array.from(set);
  }, [models]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedBrand !== 'all' ||
    selectedPuffRange !== 'all' ||
    selectedCategory !== 'all' ||
    selectedSort !== 'relevance';

  return (
    <section id="catalogo" tabIndex={-1} className="py-12 sm:py-16 scroll-mt-20 focus:outline-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Title & Section Introduction matching Image 2 */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#00DFFF] mb-2">
              <Zap className="w-4 h-4 text-[#00DFFF] fill-[#00DFFF]" />
              Catálogo Oficial PodWave
            </div>
            <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
              Produtos em Destaque
            </h2>
            <p className="text-sm text-[#A5A5B8] mt-1">
              Confira nossa seleção exclusiva dos pods mais procurados
            </p>
          </div>

          <div className="text-xs text-[#A5A5B8] flex items-center gap-2">
            <span>
              Exibindo <strong className="text-white">{filteredModels.length}</strong> de{' '}
              {models.filter((m) => m.active).length} modelos
            </span>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-[#00DFFF] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Limpar filtros
              </button>
            )}
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#0D1022] border border-[#8423DA]/25 shadow-xl space-y-4">
          {/* Top row: Search input & Sort */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* Search */}
            <div className="sm:col-span-8 relative">
              <input
                type="text"
                placeholder="Filtrar por nome de modelo, sabor ou marca..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#141838] border border-[#8423DA]/30 focus:border-[#00DFFF] text-white text-xs sm:text-sm focus:outline-none"
              />
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-3 text-gray-400 hover:text-white"
                >
                  &times;
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="sm:col-span-4 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <select
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/30 focus:border-[#00DFFF] text-white light:text-slate-900 text-xs sm:text-sm focus:outline-none cursor-pointer"
              >
                <option value="relevance">Classificação: Relevância / TOP</option>
                <option value="puffs-desc">Maior quantidade de Puffs ⚡</option>
                <option value="puffs-asc">Menor quantidade de Puffs</option>
                <option value="price-asc">Menor Preço</option>
                <option value="price-desc">Maior Preço</option>
                <option value="name-asc">Ordem Alfabética (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Bottom row: Puffs Buttons Range Filters */}
          <div className="pt-2 border-t border-[#8423DA]/15 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[#A5A5B8] font-bold flex items-center gap-1 mr-1">
              <Zap className="w-3.5 h-3.5 text-[#00DFFF]" /> Faixa de Puffs:
            </span>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedPuffRange('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                selectedPuffRange === 'all'
                  ? 'bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white shadow-sm'
                  : 'bg-[#151936] light:bg-slate-100 text-gray-300 light:text-slate-700 hover:text-white'
              }`}
            >
              Todos
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedPuffRange('under-6k')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                selectedPuffRange === 'under-6k'
                  ? 'bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white shadow-sm'
                  : 'bg-[#151936] light:bg-slate-100 text-gray-300 light:text-slate-700 hover:text-white'
              }`}
            >
              ⚡ Até 6.000 Puffs
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedPuffRange('6k-15k')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                selectedPuffRange === '6k-15k'
                  ? 'bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white shadow-sm'
                  : 'bg-[#151936] light:bg-slate-100 text-gray-300 light:text-slate-700 hover:text-white'
              }`}
            >
              ⚡ 6.000 a 15.000 Puffs
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedPuffRange('15k-25k')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                selectedPuffRange === '15k-25k'
                  ? 'bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white shadow-sm'
                  : 'bg-[#151936] light:bg-slate-100 text-gray-300 light:text-slate-700 hover:text-white'
              }`}
            >
              ⚡ 15.000 a 25.000 Puffs
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedPuffRange('over-25k')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                selectedPuffRange === 'over-25k'
                  ? 'bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white shadow-sm'
                  : 'bg-[#151936] light:bg-slate-100 text-gray-300 light:text-slate-700 hover:text-white'
              }`}
            >
              ⚡ 30.000+ Puffs Max
            </motion.button>

            {/* Category Filter Chips */}
            <div className="hidden lg:flex items-center gap-1.5 ml-auto">
              <span className="text-[#A5A5B8] mr-1">Categoria:</span>
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={() => setSelectedCategory('all')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-[#00DFFF] text-black font-bold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Todas
              </motion.button>
              {categories.map((cat) => (
                <motion.button
                  key={cat}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    selectedCategory === cat
                      ? 'bg-[#00DFFF] text-black font-bold'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {cat}
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        {/* Product Cards Grid: 2 columns on smartphone, 3 to 4 on desktop with smooth Framer Motion transitions */}
        <AnimatePresence mode="wait">
          {filteredModels.length > 0 ? (
            <motion.div
              key={`product-grid-${selectedBrand}-${selectedCategory}-${selectedPuffRange}`}
              initial={{ opacity: 0.92 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
            >
              {filteredModels.map((product, index) => (
                <div
                  key={product.id}
                  className="h-full flex flex-col animate-card-fade-slide-up"
                >
                  <ProductCard product={product} priority={index < 2} />
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="empty-state"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="py-16 text-center rounded-3xl bg-[#0D1022] light:bg-white border border-[#8423DA]/30 p-8 space-y-4"
            >
              <PackageX className="w-12 h-12 text-[#E53CF3] mx-auto opacity-70" />
              <h3 className="font-heading text-xl font-bold text-white light:text-slate-900">
                Nenhum modelo encontrado
              </h3>
              <p className="text-sm text-[#A5A5B8] max-w-md mx-auto">
                Nenhum dispositivo atende aos filtros selecionados. Tente ajustar a busca, a marca ou a faixa de puffs.
              </p>
              <button
                onClick={clearFilters}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white font-bold text-xs uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer"
              >
                Restaurar Todos os Filtros
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};
