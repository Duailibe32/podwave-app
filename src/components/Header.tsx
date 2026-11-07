import React, { useState } from 'react';
import { useCatalog } from '../context/CatalogContext';
import { Search, ShieldCheck, Menu, X, ArrowLeft, Sparkles, ShoppingBag, User, Crown } from 'lucide-react';
import { TopCarouselBar } from './TopCarouselBar';
import { PWAInstallButton } from './PWAInstallButton';
import { scrollToSectionById, scrollToTop } from '../utils/anchorNavigation';

export const Header: React.FC = () => {
  const {
    settings,
    currentView,
    setCurrentView,
    searchQuery,
    setSearchQuery,
    setSelectedBrand,
    clearFilters,
    totalCartItems,
    setIsCartOpen,
    currentUser,
    isOwner,
    isAdmin,
    isVip,
    openAuthModal,
    openProfileModal,
  } = useCatalog();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);

  const navigateTo = (sectionId: string, event?: React.MouseEvent<HTMLElement>) => {
    if (event) {
      event.preventDefault();
    }
    const wasAdmin = currentView === 'admin';
    if (wasAdmin) {
      setCurrentView('catalog');
      window.history.pushState({}, '', '/');
    }
    setMobileMenuOpen(false);
    scrollToSectionById(sectionId, {
      afterFrames: wasAdmin ? 3 : 2,
      updateHash: true,
      moveFocus: true,
    });
  };

  const handleGoHome = (event?: React.MouseEvent<HTMLElement>) => {
    if (event) {
      event.preventDefault();
    }
    if (currentView === 'admin') {
      setCurrentView('catalog');
      window.history.pushState({}, '', '/');
    }
    setMobileMenuOpen(false);
    scrollToTop({ updateHash: true });
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
    <div id="topo" className="w-full">
      {/* Top Carousel Bar */}
      <TopCarouselBar />

      <header className="relative z-40 border-b transition-colors duration-200 bg-[#080811] border-[#8423DA]/25">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 gap-2 sm:gap-4">
          {/* Zone 1: Official Logo & Brand */}
          <div className="flex items-center gap-3">
            <a
              href="#topo"
              onClick={handleGoHome}
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
                  Catálogo Digital <span className="text-[#00DFFF]">⚡</span>
                </span>
              </div>
            </a>
          </div>

          {/* Zone 2: Navigation Links (Desktop) matching Image 2 */}
          {currentView === 'catalog' ? (
            <nav aria-label="Navegação principal" className="hidden lg:flex items-center gap-6 xl:gap-8 text-sm font-semibold text-[#A5A5B8]">
              <a
                href="#topo"
                onClick={handleGoHome}
                className="relative text-[#00DFFF] hover:text-white transition-colors whitespace-nowrap cursor-pointer py-1"
              >
                Início
                {/* Cyan Neon active indicator line */}
                <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#00DFFF] shadow-[0_0_8px_#00DFFF] rounded-full" />
              </a>
              <a
                href="#catalogo"
                onClick={(e) => navigateTo('catalogo', e)}
                className="hover:text-[#00DFFF] transition-colors whitespace-nowrap cursor-pointer py-1"
              >
                Produtos
              </a>
              <a
                href="#marcas"
                onClick={(e) => navigateTo('marcas', e)}
                className="hover:text-[#00DFFF] transition-colors whitespace-nowrap cursor-pointer py-1"
              >
                Marcas
              </a>
              <a
                href="#modelos"
                onClick={(e) => navigateTo('modelos', e)}
                className="hover:text-[#00DFFF] transition-colors whitespace-nowrap cursor-pointer py-1"
              >
                Sabores
              </a>
              <a
                href="#fidelidade"
                onClick={(e) => navigateTo('fidelidade', e)}
                className="hover:text-[#00DFFF] transition-colors whitespace-nowrap cursor-pointer py-1"
              >
                Fidelidade
              </a>
              <a
                href="#informacoes"
                onClick={(e) => navigateTo('informacoes', e)}
                className="hover:text-[#00DFFF] transition-colors whitespace-nowrap cursor-pointer py-1"
              >
                Sobre
              </a>
            </nav>
          ) : (
            <div className="hidden md:flex items-center gap-3 text-sm font-semibold text-[#00DFFF]">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#11152A] border border-[#8423DA]/50 text-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-[#00DFFF]" />
                Painel Administrativo
              </span>
            </div>
          )}

          {/* Zone 3: Actions (Search, Cart, Admin switch — No light/dark toggle) */}
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-3.5">
            {/* Quick search input or toggle on catalog */}
            {currentView === 'catalog' && (
              <div className="static sm:relative flex items-center">
                {showSearchInput ? (
                  <div className="absolute inset-x-4 top-full z-40 flex items-center animate-in fade-in duration-200 sm:static">
                    <input
                      type="text"
                      placeholder="Buscar produtos, marcas ou sabores..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoFocus
                      className="min-w-0 w-full sm:w-64 min-h-11 sm:min-h-0 pl-8 pr-8 py-1.5 text-base sm:text-xs rounded-full bg-[#11152A] border border-[#8423DA]/40 focus:border-[#00DFFF] text-white focus:outline-none transition-all placeholder:text-gray-500 shadow-inner"
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
                    className="p-2.5 rounded-xl bg-[#11152A] text-gray-300 hover:text-[#00DFFF] hover:border-[#00DFFF]/40 border border-transparent transition-all cursor-pointer"
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
              className="relative p-2.5 rounded-xl bg-gradient-to-br from-[#11152A] to-[#1C2245] hover:border-[#00DFFF] border border-[#8423DA]/40 text-white transition-all cursor-pointer shadow-md group"
              title="Abrir carrinho de compras"
              aria-label="Carrinho"
            >
              <ShoppingBag className="w-4 h-4 text-[#00DFFF] group-hover:scale-110 transition-transform" />
              {totalCartItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-gradient-to-r from-[#00DFFF] to-[#007BFF] text-[#080811] text-[11px] font-black flex items-center justify-center shadow-md animate-in zoom-in-75">
                  {totalCartItems}
                </span>
              )}
            </button>

            {/* User Account Button (Customer / Owner) */}
            {currentUser ? (
              <button
                onClick={() => openProfileModal()}
                className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-[#11152A] hover:bg-[#181D3D] border border-[#8423DA]/35 hover:border-[#00DFFF]/50 text-white transition-all cursor-pointer shadow-md group"
                title="Minha Conta, Dados Salvos e Pedidos"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#8423DA] to-[#007BFF] flex items-center justify-center font-heading font-black text-xs text-white shrink-0">
                  {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="hidden md:flex flex-col text-left leading-tight">
                  <span className="text-xs font-bold text-gray-200 truncate max-w-[90px]">
                    {currentUser.fullName?.split(' ')[0] || 'Conta'}
                  </span>
                  <span className="text-[9px] font-bold flex items-center gap-0.5">
                    {isOwner ? (
                      <>
                        <Crown className="w-2.5 h-2.5 text-amber-400" />
                        <span className="text-amber-300">Dono</span>
                      </>
                    ) : currentUser.role === 'admin' ? (
                      <>
                        <Crown className="w-2.5 h-2.5 text-[#00DFFF]" />
                        <span className="text-[#00DFFF]">Admin</span>
                      </>
                    ) : isVip ? (
                      <>
                        <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                        <span className="text-amber-300">VIP</span>
                      </>
                    ) : (
                      <span className="text-gray-300">Cliente</span>
                    )}
                  </span>
                </div>
              </button>
            ) : (
              <button
                onClick={() => openAuthModal('login')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#11152A] hover:bg-[#181D3D] text-gray-300 hover:text-white border border-[#8423DA]/40 hover:border-[#00DFFF]/50 text-xs font-semibold transition cursor-pointer shadow-md"
                title="Entrar ou criar conta de cliente"
              >
                <User className="w-3.5 h-3.5 text-[#00DFFF]" />
                <span className="hidden sm:inline">Entrar</span>
              </button>
            )}

            {/* PWA Install Button */}
            <PWAInstallButton variant="header" />

            {/* Admin Switcher Button (ACESSO PARA ADMINISTRADORES E PROPRIETÁRIO) */}
            {isAdmin && (
              <button
                onClick={toggleAdminView}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-300 cursor-pointer shadow-md ${
                  currentView === 'catalog'
                    ? 'bg-gradient-to-r from-[#8423DA] to-[#007BFF] hover:from-[#9534ed] hover:to-[#00DFFF] text-white border border-[#00DFFF]/40 hover:shadow-[0_0_15px_rgba(0,223,255,0.4)]'
                    : 'bg-[#11152A] hover:bg-[#181d3d] text-white border border-[#8423DA]/60 hover:border-[#8423DA]'
                }`}
                title="Painel Administrativo"
              >
                {currentView === 'catalog' ? (
                  <>
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden sm:inline">Painel</span> Admin
                  </>
                ) : (
                  <>
                    <ArrowLeft className="w-3.5 h-3.5 text-[#00DFFF]" />
                    <span>Ver Catálogo</span>
                  </>
                )}
              </button>
            )}

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 lg:hidden rounded-xl bg-[#11152A] text-gray-300 border border-[#8423DA]/30"
              aria-label="Menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation-drawer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu — absolute overlay so opening/closing never shifts <main> height */}
      {mobileMenuOpen && (
        <div
          id="mobile-navigation-drawer"
          className="lg:hidden absolute top-full left-0 right-0 z-50 border-t border-b border-[#8423DA]/40 bg-[#080811]/98 backdrop-blur-2xl px-5 py-6 space-y-4 shadow-[0_24px_48px_rgba(0,0,0,0.85)] animate-in slide-in-from-top-2 duration-150"
        >
          <div className="flex items-center gap-3 pb-3 border-b border-[#8423DA]/20">
            <img src="/assets/images/logo.png" alt="PodWave Logo" className="h-10 w-10 object-contain" />
            <div>
              <p className="font-heading font-bold text-white">{settings.storeName}</p>
              <p className="text-xs text-[#A5A5B8]">Catálogo Digital de Dispositivos ⚡</p>
            </div>
          </div>

          <nav aria-label="Navegação móvel" className="space-y-1 flex flex-col">
            <a
              href="#topo"
              onClick={handleGoHome}
              className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-200 hover:bg-[#11152A]"
            >
              Início
            </a>
            <a
              href="#catalogo"
              onClick={(e) => navigateTo('catalogo', e)}
              className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-200 hover:bg-[#11152A] flex items-center justify-between"
            >
              <span>Produtos & Catálogo</span>
              <span className="text-xs font-semibold text-[#00DFFF]">⚡ Todos</span>
            </a>
            <a
              href="#marcas"
              onClick={(e) => navigateTo('marcas', e)}
              className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-200 hover:bg-[#11152A]"
            >
              Fabricantes & Marcas
            </a>
            <a
              href="#modelos"
              onClick={(e) => navigateTo('modelos', e)}
              className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-200 hover:bg-[#11152A]"
            >
              Sabores & Modelos
            </a>
            <a
              href="#fidelidade"
              onClick={(e) => navigateTo('fidelidade', e)}
              className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-200 hover:bg-[#11152A]"
            >
              Cartão Fidelidade
            </a>
            <a
              href="#informacoes"
              onClick={(e) => navigateTo('informacoes', e)}
              className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-200 hover:bg-[#11152A]"
            >
              Sobre & Avisos (+18)
            </a>
          </nav>

          <div className="pt-2 border-t border-[#8423DA]/20 flex flex-col gap-2">
            {/* Mobile User Profile / Login */}
            {currentUser ? (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  openProfileModal();
                }}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-center bg-[#141838] hover:bg-[#181D3D] text-white border border-[#8423DA]/40 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-[#8423DA] flex items-center justify-center font-bold text-white text-[10px]">
                    {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span>Minha Conta ({currentUser.fullName?.split(' ')[0]})</span>
                </div>
                {isOwner ? (
                  <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                    <Crown className="w-3 h-3 text-amber-400" /> Dono
                  </span>
                ) : currentUser.role === 'admin' ? (
                  <span className="text-[10px] text-[#00DFFF] font-bold flex items-center gap-1">
                    <Crown className="w-3 h-3 text-[#00DFFF]" /> Admin
                  </span>
                ) : isVip ? (
                  <span className="text-[10px] text-amber-300 font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" /> VIP
                  </span>
                ) : null}
              </button>
            ) : (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  openAuthModal('login');
                }}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-center bg-[#141838] hover:bg-[#181D3D] text-white border border-[#00DFFF]/40 flex items-center justify-center gap-2"
              >
                <User className="w-3.5 h-3.5 text-[#00DFFF]" />
                <span>Entrar ou Criar Conta</span>
              </button>
            )}

            <PWAInstallButton variant="banner" />

            {/* Mobile Admin button - ACESSO PARA ADMINISTRADORES E PROPRIETÁRIO */}
            {isAdmin && (
              <button
                onClick={toggleAdminView}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-center bg-gradient-to-r from-[#8423DA] to-[#007BFF] text-white flex items-center justify-center gap-2 shadow-lg"
              >
                {currentView === 'catalog' ? (
                  <>
                    <Crown className="w-4 h-4 text-amber-400" />
                    <span>Acessar Painel Administrativo</span>
                  </>
                ) : (
                  <>
                    <ArrowLeft className="w-4 h-4" />
                    <span>Voltar ao Catálogo Público</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  </div>
);
};

