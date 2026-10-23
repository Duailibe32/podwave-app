import React, { useState } from 'react';
import { useCatalog } from '../context/CatalogContext';
import { Search, Sun, Moon, ShieldCheck, Menu, X, ArrowLeft, Sparkles, ShoppingBag } from 'lucide-react';
import { TopCarouselBar } from './TopCarouselBar';
import { PWAInstallButton } from './PWAInstallButton';

export const Header: React.FC = () => {
  const {
    settings,
    theme,
    toggleTheme,
    currentView,
    setCurrentView,
    searchQuery,
    setSearchQuery,
    setSelectedBrand,
    clearFilters,
    totalCartItems,
    setIsCartOpen,
  } = useCatalog();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);

  const navigateTo = (sectionId: string) => {
    if (currentView === 'admin') {
      setCurrentView('catalog');
      window.history.pushState({}, '', '/');
    }
    setMobileMenuOpen(false);
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const toggleAdminView = () => {
    if (currentView === 'catalog') {
      setCurrentView('admin');
      window.history.pushState({}, '', '/admin');
    } else {
      setCurrentView('catalog');
      window.history.pushState({}, '', '/');
    }
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Top Carousel Bar (as requested by user with dash indicators) */}
      <TopCarouselBar />

      <header className="sticky top-0 z-50 backdrop-blur-xl border-b transition-colors duration-200 bg-[#080811]/90 dark:bg-[#080811]/90 light:bg-white/95 border-[#8423DA]/25 light:border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 gap-4">
          {/* Zone 1: Official Logo & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setCurrentView('catalog');
                window.history.pushState({}, '', '/');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="group flex items-center gap-3 focus:outline-none"
              title={`${settings.storeName} — Início`}
            >
              <div className="relative h-14 w-14 flex items-center justify-center rounded-xl bg-gradient-to-br from-[#11152A] to-[#151932] p-1 border border-[#8423DA]/30 shadow-lg group-hover:border-[#00DFFF]/60 group-hover:shadow-[0_0_15px_rgba(0,223,255,0.3)] transition-all duration-300">
                <img
                  src="/assets/images/logo.png"
                  alt="PodWave Logo Oficial"
                  className="h-full w-full object-contain filter drop-shadow-[0_2px_8px_rgba(0,223,255,0.4)]"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="font-heading text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-[#00DFFF] to-[#E53CF3] bg-clip-text text-transparent">
                  {settings.storeName}
                </span>
                <span className="text-[10px] uppercase tracking-widest text-[#A5A5B8] font-semibold flex items-center gap-1">
                  Catálogo Digital <span className="text-[#FACC15]">⚡</span>
                </span>
              </div>
            </button>
          </div>

          {/* Zone 2: Navigation Links (Desktop) */}
          {currentView === 'catalog' ? (
            <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#A5A5B8] light:text-slate-600">
              <button
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="hover:text-[#00DFFF] transition-colors whitespace-nowrap cursor-pointer"
              >
                Início
              </button>
              <button
                onClick={() => navigateTo('catalogo')}
                className="hover:text-[#00DFFF] transition-colors whitespace-nowrap cursor-pointer"
              >
                Catálogo
              </button>
              <button
                onClick={() => navigateTo('marcas')}
                className="hover:text-[#00DFFF] transition-colors whitespace-nowrap cursor-pointer"
              >
                Marcas
              </button>
              <button
                onClick={() => navigateTo('modelos')}
                className="hover:text-[#00DFFF] transition-colors whitespace-nowrap cursor-pointer"
              >
                Modelos & Sabores
              </button>
              <button
                onClick={() => navigateTo('informacoes')}
                className="hover:text-[#00DFFF] transition-colors whitespace-nowrap cursor-pointer"
              >
                Informações
              </button>
            </nav>
          ) : (
            <div className="hidden md:flex items-center gap-3 text-sm font-semibold text-[#00DFFF]">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#11152A] border border-[#8423DA]/50 text-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-[#00DFFF]" />
                Painel Administrativo Demonstrativo
              </span>
            </div>
          )}

          {/* Zone 3: Actions (Search, Theme, Admin switch) */}
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            {/* Quick search input or toggle on catalog */}
            {currentView === 'catalog' && (
              <div className="relative flex items-center">
                {showSearchInput ? (
                  <div className="relative flex items-center animate-in fade-in duration-200">
                    <input
                      type="text"
                      placeholder="Buscar modelo ou sabor..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoFocus
                      className="w-48 sm:w-64 pl-8 pr-8 py-1.5 text-xs rounded-full bg-[#11152A] light:bg-slate-100 border border-[#8423DA]/40 focus:border-[#00DFFF] text-white light:text-slate-900 focus:outline-none transition-all placeholder:text-gray-500 shadow-inner"
                    />
                    <Search className="w-3.5 h-3.5 absolute left-2.5 text-gray-400 pointer-events-none" />
                    <button
                      onClick={() => {
                        setShowSearchInput(false);
                        setSearchQuery('');
                      }}
                      className="absolute right-2 text-gray-400 hover:text-white"
                      title="Fechar busca"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setShowSearchInput(true);
                      navigateTo('catalogo');
                    }}
                    className="p-2.5 rounded-xl bg-[#11152A] light:bg-slate-100 text-gray-300 light:text-slate-700 hover:text-[#00DFFF] hover:border-[#00DFFF]/40 border border-transparent transition-all cursor-pointer"
                    title="Buscar pod, puffs ou sabor"
                    aria-label="Buscar"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Cart Button with Counter */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 rounded-xl bg-gradient-to-br from-[#11152A] to-[#1C2245] light:bg-slate-100 hover:border-[#00DFFF] border border-[#8423DA]/40 text-white light:text-slate-900 transition-all cursor-pointer shadow-md group"
              title="Abrir carrinho de compras"
              aria-label="Carrinho"
            >
              <ShoppingBag className="w-4 h-4 text-[#00DFFF] group-hover:scale-110 transition-transform" />
              {totalCartItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-gradient-to-r from-[#FACC15] to-[#EAB308] text-[#080811] text-[11px] font-black flex items-center justify-center shadow-md animate-in zoom-in-75">
                  {totalCartItems}
                </span>
              )}
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-[#11152A] light:bg-slate-100 text-[#FACC15] hover:border-[#FACC15]/40 border border-transparent transition-all cursor-pointer"
              title={`Alternar para tema ${theme === 'dark' ? 'claro' : 'escuro'}`}
              aria-label="Alternar tema"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-[#8423DA]" />}
            </button>

            {/* PWA Install Button */}
            <PWAInstallButton variant="header" />

            {/* Admin Switcher Button */}
            <button
              onClick={toggleAdminView}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-300 cursor-pointer shadow-md ${
                currentView === 'catalog'
                  ? 'bg-gradient-to-r from-[#8423DA] to-[#007BFF] hover:from-[#9534ed] hover:to-[#00DFFF] text-white border border-[#00DFFF]/40 hover:shadow-[0_0_15px_rgba(0,223,255,0.4)]'
                  : 'bg-[#11152A] hover:bg-[#181d3d] text-white border border-[#8423DA]/60 hover:border-[#8423DA]'
              }`}
            >
              {currentView === 'catalog' ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-[#FACC15]" />
                  <span className="hidden sm:inline">Painel</span> Admin
                </>
              ) : (
                <>
                  <ArrowLeft className="w-3.5 h-3.5 text-[#00DFFF]" />
                  <span>Ver Catálogo</span>
                </>
              )}
            </button>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 md:hidden rounded-xl bg-[#11152A] light:bg-slate-100 text-gray-300 light:text-slate-800 border border-[#8423DA]/30"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#8423DA]/30 bg-[#080811]/98 light:bg-white/98 backdrop-blur-2xl px-5 py-6 space-y-4 animate-in slide-in-from-top-4 duration-200">
          <div className="flex items-center gap-3 pb-3 border-b border-[#8423DA]/20">
            <img src="/assets/images/logo.png" alt="PodWave Logo" className="h-10 w-10 object-contain" />
            <div>
              <p className="font-heading font-bold text-white light:text-slate-900">{settings.storeName}</p>
              <p className="text-xs text-[#A5A5B8]">Catálogo Digital de Dispositivos ⚡</p>
            </div>
          </div>

          <div className="space-y-1">
            <button
              onClick={() => {
                setCurrentView('catalog');
                setMobileMenuOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-gray-200 light:text-slate-700 hover:bg-[#11152A] light:hover:bg-slate-100"
            >
              Início
            </button>
            <button
              onClick={() => navigateTo('catalogo')}
              className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-gray-200 light:text-slate-700 hover:bg-[#11152A] light:hover:bg-slate-100 flex items-center justify-between"
            >
              <span>Explorar Catálogo</span>
              <span className="text-xs font-semibold text-[#FACC15]">⚡ Todos os Puffs</span>
            </button>
            <button
              onClick={() => navigateTo('marcas')}
              className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-gray-200 light:text-slate-700 hover:bg-[#11152A] light:hover:bg-slate-100"
            >
              Fabricantes & Marcas
            </button>
            <button
              onClick={() => navigateTo('modelos')}
              className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-gray-200 light:text-slate-700 hover:bg-[#11152A] light:hover:bg-slate-100"
            >
              Modelos & Sabores
            </button>
            <button
              onClick={() => navigateTo('informacoes')}
              className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-gray-200 light:text-slate-700 hover:bg-[#11152A] light:hover:bg-slate-100"
            >
              Especificações & Avisos (+18)
            </button>
          </div>

          <div className="pt-2 border-t border-[#8423DA]/20 flex flex-col gap-2">
            <PWAInstallButton variant="banner" />

            <button
              onClick={toggleAdminView}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-center bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white flex items-center justify-center gap-2 shadow-lg"
            >
              {currentView === 'catalog' ? (
                <>
                  <Sparkles className="w-4 h-4 text-[#FACC15]" />
                  Acessar Painel Administrativo
                </>
              ) : (
                <>
                  <ArrowLeft className="w-4 h-4" />
                  Voltar ao Catálogo Público
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </header>
  </>
);
};
