import React from 'react';
import { CatalogProvider, useCatalog } from './context/CatalogContext';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { BrandScroller } from './components/BrandScroller';
import { CatalogSection } from './components/CatalogSection';
import { InfoSection } from './components/InfoSection';
import { Footer } from './components/Footer';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutDrawer } from './components/CheckoutDrawer';
import { FloatingActions } from './components/FloatingActions';
import { AdminPanel } from './components/admin/AdminPanel';
import { OfflineIndicator } from './components/OfflineIndicator';
import { AuthModal } from './components/auth/AuthModal';
import { CustomerProfileModal } from './components/auth/CustomerProfileModal';

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
            <InfoSection />
          </>
        ) : (
          <AdminPanel />
        )}
      </main>

      <Footer />
      <ProductDetailModal />
      <CartDrawer />
      <CheckoutDrawer />
      <FloatingActions />
      <OfflineIndicator />
      <AuthModal />
      <CustomerProfileModal />
    </div>
  );
};

export default function App() {
  return (
    <CatalogProvider>
      <AppContent />
    </CatalogProvider>
  );
}
