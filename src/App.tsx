import React, { lazy, Suspense } from 'react';
import { useBodyScrollLock } from './hooks/useBodyScrollLock';
import { CatalogProvider, useCatalog } from './context/CatalogContext';
import { ToastProvider } from './context/ToastContext';
import { ToastContainer } from './components/ui/ToastContainer';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { BrandScroller } from './components/BrandScroller';
import { CatalogSection } from './components/CatalogSection';
import { LoyaltyHomeSection } from './components/LoyaltyHomeSection';
import { InfoSection } from './components/InfoSection';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { FloatingActions } from './components/FloatingActions';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallButton } from './components/PWAInstallButton';
import { DeferredOverlay } from './components/DeferredOverlay';
import { OrderNotificationsProvider } from './context/OrderNotificationsContext';

const ProductDetailModal = lazy(() => import('./components/ProductDetailModal').then(module => ({ default: module.ProductDetailModal })));
const CheckoutDrawer = lazy(() => import('./components/CheckoutDrawer').then(module => ({ default: module.CheckoutDrawer })));
const AuthModal = lazy(() => import('./components/auth/AuthModal').then(module => ({ default: module.AuthModal })));
const CustomerProfileModal = lazy(() => import('./components/auth/CustomerProfileModal').then(module => ({ default: module.CustomerProfileModal })));

const AdminPanel = lazy(() => import('./components/admin/AdminPanel').then((module) => ({ default: module.AdminPanel })));

const AppContent: React.FC = () => {
  const { currentView, activeModalProduct, setActiveModalProduct, isCartOpen, isCheckoutOpen,
    setIsCheckoutOpen, isAuthModalOpen, closeAuthModal, isProfileModalOpen, closeProfileModal } = useCatalog();
  const overlayOpen = !!activeModalProduct || isCartOpen || isCheckoutOpen || isAuthModalOpen || isProfileModalOpen;
  useBodyScrollLock(overlayOpen);

  return (
    <div className="min-h-screen flex flex-col bg-[#080811] text-white">
      <Header />

      <main className="flex-grow">
        {currentView === 'catalog' ? (
          <>
            <HeroBanner />
            <BrandScroller />
            <div id="modelos" tabIndex={-1} className="scroll-mt-20 focus:outline-none">
              <CatalogSection />
            </div>
            <LoyaltyHomeSection />
            <InfoSection />
          </>
        ) : (
          <Suspense fallback={<div role="status" className="p-8 text-center text-sm text-gray-300">Carregando painel...</div>}>
            <AdminPanel />
          </Suspense>
        )}
      </main>

      <Footer />
      <DeferredOverlay component={ProductDetailModal} active={!!activeModalProduct} label="Detalhes do produto" onClose={() => setActiveModalProduct(null)} />
      <CartDrawer />
      <DeferredOverlay component={CheckoutDrawer} active={isCheckoutOpen} label="Finalização do pedido" onClose={() => setIsCheckoutOpen(false)} />
      <PWAInstallButton variant="smart-banner" />
      <FloatingActions />
      <OfflineIndicator />
      <DeferredOverlay component={AuthModal} active={isAuthModalOpen} label="Acesso à conta" onClose={closeAuthModal} />
      <DeferredOverlay component={CustomerProfileModal} active={isProfileModalOpen} label="Minha conta" onClose={closeProfileModal} />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <CatalogProvider>
        <OrderNotificationsProvider><AppContent /></OrderNotificationsProvider>
      </CatalogProvider>
    </ToastProvider>
  );
}

