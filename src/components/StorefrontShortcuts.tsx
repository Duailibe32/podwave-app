import { ArrowRight, Gift, Flame, Package, ShoppingBag, Truck } from 'lucide-react';
import { useCatalog } from '../context/CatalogContext';
import { getUserLoyaltyCard } from '../utils/loyaltyCard';
import { ORDER_STATUS_LIST } from '../services/orderCenterService';
import { formatCurrency } from '../utils/pricing';
import type { CustomerOrderHistoryItem } from '../types/catalog';

const stages = ORDER_STATUS_LIST.filter(stage => stage.status !== 'cancelado');
const activeStages = stages.slice(0, -1);

function orderStage(order: CustomerOrderHistoryItem) {
  return activeStages.findIndex(stage => stage.status === order.status);
}

function useActiveOrders() {
  const { currentUser } = useCatalog();
  return (currentUser?.orderHistory || [])
    .filter(order => order.customerId === currentUser?.id && order._syncStatus !== 'pending_sync' && order._syncStatus !== 'sync_error' && orderStage(order) >= 0)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function MobileStorefrontBar({ inactive }: { inactive: boolean }) {
  const { currentUser, settings, totalCartItems, cartTotal, setIsCartOpen, openProfileModal, openAuthModal } = useCatalog();
  const orders = useActiveOrders();
  const card = currentUser && getUserLoyaltyCard(currentUser, settings.loyaltyGoalStamps || 10, settings.loyaltyDefaultReward);
  const open = (tab: 'orders' | 'loyalty') => currentUser ? openProfileModal(tab) : openAuthModal('login');

  return (
    <nav inert={inactive} aria-label="Atalhos da loja" className="storefront-bottom-bar">
      <a href="#catalogo" className="storefront-shortcut">
        <Flame aria-hidden="true" /> <span>Catálogo</span>
      </a>
      <button type="button" onClick={() => open('loyalty')} className="storefront-shortcut">
        <Gift aria-hidden="true" /> <span>Fidelidade</span>
        {card && <small>{card.stamps}/{card.goal} selos</small>}
      </button>
      <button type="button" onClick={() => open('orders')} className="storefront-shortcut">
        <span className="relative"><Package aria-hidden="true" />
          {orders.length > 0 && <span className="storefront-badge" aria-label={orders.length + ' em andamento'}>{orders.length}</span>}
        </span>
        <span>Meus pedidos</span>
      </button>
      <button type="button" onClick={() => setIsCartOpen(true)} className="storefront-shortcut storefront-bag" data-cart-target>
        <span className="relative"><ShoppingBag aria-hidden="true" />
          {totalCartItems > 0 && <span className="storefront-badge" aria-label={totalCartItems + ' itens'}>{totalCartItems}</span>}
        </span>
        <span>Sacola</span><small>{formatCurrency(cartTotal)}</small>
      </button>
    </nav>
  );
}

export function ActiveOrderCard() {
  const { openProfileModal } = useCatalog();
  const orders = useActiveOrders();
  const order = orders[0];
  if (!order) return null;
  const stage = orderStage(order);
  const isSent = order.status === 'enviado';
  const statusLabel = isSent
    ? order.deliveryType === 'pickup' ? 'Pronto para retirada' : 'Pedido a caminho'
    : stages[stage].shortLabel;

  return (
    <section className="rounded-2xl border border-cyan-400/30 bg-[#11182C] p-3.5 text-white shadow-[0_4px_24px_#00dfff12] sm:p-5" aria-label="Pedido em andamento">
      <button type="button" onClick={() => openProfileModal('orders')} className="flex w-full items-center gap-3 text-left" aria-label="Acompanhar pedido">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
          {isSent && order.deliveryType !== 'pickup' ? <Truck size={20} /> : <Package size={20} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs text-slate-300">Pedido #{order.referenceId}</span>
          <strong className="block text-sm sm:text-base" aria-live="polite">{statusLabel}</strong>
        </span>
        {orders.length > 1 && <small className="text-cyan-200">+{orders.length - 1}</small>}
        <ArrowRight size={18} className="shrink-0 text-cyan-300" />
      </button>
      <ol className="mt-3 grid grid-cols-5 gap-1.5" aria-label="Etapas do pedido">
        {stages.map((item, index) => (
          <li key={item.status} aria-current={index === stage ? 'step' : undefined}
            className={'h-1.5 rounded-full transition-colors ' + (index <= stage ? 'bg-cyan-400' : 'bg-slate-700')}>
            <span className="sr-only">{item.shortLabel}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
