import React, { lazy, Suspense } from 'react';
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
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutDrawer } from './components/CheckoutDrawer';
import { FloatingActions } from './components/FloatingActions';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallButton } from './components/PWAInstallButton';
import { AuthModal } from './components/auth/AuthModal';
import { CustomerProfileModal } from './components/auth/CustomerProfileModal';
import { OrderNotificationsProvider } from './context/OrderNotificationsContext';

const AdminPanel = lazy(() => import('./components/admin/AdminPanel').then((module) => ({ default: module.AdminPanel })));

const AppContent: React.FC = () => {
  const { currentView } = useCatalog();

  return (
    <div className="min-h-screen flex flex-col bg-[#080811] text-white">
      <Header />

      <main className="flex-grow">
        {currentView === 'catalog' ? (
          <>
            <HeroBanner />
            <BrandScroller />
            <div id="modelos">
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
      <ProductDetailModal />
      <CartDrawer />
      <CheckoutDrawer />
      <PWAInstallButton variant="smart-banner" />
      <FloatingActions />
      <OfflineIndicator />
      <AuthModal />
      <CustomerProfileModal />
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

