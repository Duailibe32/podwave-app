import React, { useEffect, useRef, useState } from 'react';
import { Bell, Check, CircleAlert, Copy, Download, Gift, MapPin, MessageCircle, Package, ReceiptText, Share2, Truck, X, Zap } from 'lucide-react';
import { useCatalog } from '../context/CatalogContext';
import { useOrderNotifications } from '../context/OrderNotificationsContext';
import { getSupabaseClient, mapSupabaseRowToCustomerOrder } from '../services/supabase';
import type { CustomerOrderHistoryItem } from '../types/catalog';
import { getUserLoyaltyCard } from '../utils/loyaltyCard';
import { formatCurrency } from '../utils/pricing';
import { formatTicketDate, newestTicketOrder, ticketDelivery, ticketItemLabel, ticketStages, ticketStatus, ticketSummary } from '../utils/orderTicket';
import { buildWhatsAppUrl } from '../utils/whatsappShare';
import { downloadOrderTicket } from '../utils/downloadOrderTicket';
import './OrderTicketModal.css';

export function OrderTicketModal() {
  const { activeOrderTicket: selected, closeOrderTicket, currentUser, settings, supabaseClient } = useCatalog();
  const alerts = useOrderNotifications();
  const dialog = useRef<HTMLDialogElement>(null);
  const [verified, setVerified] = useState<CustomerOrderHistoryItem | null>(null);
  const [connection, setConnection] = useState<'checking' | 'live' | 'offline'>('checking');
  const [feedback, setFeedback] = useState('');
  const [manualCopy, setManualCopy] = useState('');
  const [downloading, setDownloading] = useState(false);
  const orderId = selected?.id;
  const customerId = currentUser?.id;

  useEffect(() => {
    const element = dialog.current;
    if (orderId && element && !element.open) element.showModal();
    return () => { if (element?.open) element.close(); };
  }, [orderId]);

  useEffect(() => {
    setFeedback('');
    setManualCopy('');
    setVerified(null);
    setConnection('checking');
    if (!orderId || !customerId) return;
    const client = supabaseClient || getSupabaseClient();
    if (!client) { setConnection('offline'); return; }

    let active = true;
    let reading = false;
    const abort = new AbortController();
    const refresh = async () => {
      if (reading || document.visibilityState === 'hidden') return;
      reading = true;
      try {
        const { data, error } = await client.from('customer_orders').select('*')
          .eq('id', orderId).eq('customer_id', customerId).abortSignal(abort.signal).maybeSingle();
        if (!active) return;
        if (error || !data || String(data.customer_id) !== customerId) {
          setConnection('offline');
          return;
        }
        const next = mapSupabaseRowToCustomerOrder(data);
        setVerified(previous => previous ? newestTicketOrder(previous, next) : next);
        setConnection('live');
      } catch {
        if (active) setConnection('offline');
      } finally {
        reading = false;
      }
    };
    const offline = () => setConnection('offline');
    void refresh();
    const interval = window.setInterval(refresh, 30000);
    window.addEventListener('online', refresh);
    window.addEventListener('offline', offline);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      active = false;
      abort.abort();
      window.clearInterval(interval);
      window.removeEventListener('online', refresh);
      window.removeEventListener('offline', offline);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [orderId, customerId, supabaseClient]);

  if (!selected || !currentUser || selected.customerId !== customerId) return null;
  // The account's existing Realtime feed updates this immediately. The visible-ticket
  // refresh covers reconnections and projects with Realtime disabled.
  const fromHistory = currentUser.orderHistory?.find(order => order.id === orderId);
  const order = newestTicketOrder(newestTicketOrder(selected, verified), fromHistory);
  const reference = '#' + order.referenceId.replace(/^#/, '');
  const delivery = ticketDelivery(order, settings.progressiveDiscountConfig);
  const currentStage = ticketStages.findIndex(([stage]) => stage === order.status);
  const isClosed = order.status === 'cancelado' || order.status === 'entregue';
  const card = getUserLoyaltyCard(currentUser, settings.loyaltyGoalStamps || 10, settings.loyaltyDefaultReward);
  const stamps = card.stamps + '/' + card.goal + ' selos';
  const orderAlertsEnabled = alerts.isEnabledForOrder(order.id);
  const storePhone = settings.whatsappNumber || '5586999014685';
  const whatsapp = buildWhatsAppUrl(storePhone, ticketSummary(order, true));

  const copy = async (value: string, success: string) => {
    setManualCopy('');
    try {
      await navigator.clipboard.writeText(value);
      setFeedback(success);
    } catch {
      setManualCopy(value);
      setFeedback('Selecione e copie o texto abaixo.');
    }
  };

  const share = async () => {
    if (!navigator.share) { await copy(ticketSummary(order), 'Resumo copiado.'); return; }
    try {
      await navigator.share({ title: 'Ticket PodWave ' + reference, text: ticketSummary(order) });
    } catch (error) {
      if ((error as Error).name !== 'AbortError') await copy(ticketSummary(order), 'Resumo copiado.');
    }
  };

  const download = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadOrderTicket(order, delivery.title, stamps);
      setFeedback('Comprovante PNG gerado.');
    } catch {
      setFeedback('Não consegui gerar o PNG. Você pode copiar o resumo.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <dialog ref={dialog} aria-labelledby="ticket-dialog-title" className="order-ticket-dialog"
      onCancel={event => { event.preventDefault(); closeOrderTicket(); }}
      onClick={event => { if (event.target === event.currentTarget) closeOrderTicket(); }}>
      <div className="order-ticket-shell">
        <article className="order-ticket">
          <header className="order-ticket-head">
            <div className="order-ticket-brand">
              <span className="order-ticket-mark"><Zap size={19} fill="currentColor" aria-hidden="true" /></span>
              <span><b>PODWAVE</b><small>COMPROVANTE OFICIAL</small></span>
              <button type="button" className="order-ticket-close" aria-label="Fechar ticket" onClick={closeOrderTicket} autoFocus>
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <p className="order-ticket-kicker">PEDIDO REGISTRADO</p>
            <h2 id="ticket-dialog-title">Ticket Digital</h2>
            <div className="order-ticket-reference-row">
              <strong>{reference}</strong>
              <button type="button" aria-label="Copiar código do pedido" onClick={() => void copy(reference, 'Código copiado.')}>
                <Copy size={16} aria-hidden="true" />
              </button>
            </div>
            <time dateTime={order.createdAt}>{formatTicketDate(order.createdAt)}</time>
          </header>

          <div className="order-ticket-tear" aria-hidden="true" />

          <div className="order-ticket-body">
            <div className="order-ticket-delivery">
              {order.deliveryType === 'pickup' ? <MapPin size={21} aria-hidden="true" /> : <Truck size={21} aria-hidden="true" />}
              <div><strong>{delivery.title}</strong><small>{delivery.detail}</small></div>
            </div>
            <section className="order-ticket-tracking" aria-label="Status do pedido">
              <div className="order-ticket-status-row">
                <strong aria-live="polite" data-status={order.status}>{ticketStatus(order)}</strong>
                <span className="order-ticket-live" data-live={connection === 'live'} aria-live="polite">
                  {connection === 'live' ? 'AO VIVO' : connection === 'offline' ? 'ÚLTIMO STATUS' : 'SINCRONIZANDO'}
                </span>
              </div>
              {order.status === 'cancelado' ? (
                <p className="order-ticket-canceled"><CircleAlert size={16} aria-hidden="true" /> {order.cancelReason || 'Pedido cancelado pela loja.'}</p>
              ) : (
                <ol className="order-ticket-steps">
                  {ticketStages.map(([stage, label], index) => (
                    <li key={stage} data-reached={index <= currentStage} aria-current={index === currentStage ? 'step' : undefined}>
                      <span aria-hidden="true">{index < currentStage ? <Check size={12} /> : index + 1}</span>
                      <small>{stage === 'enviado' && order.deliveryType === 'pickup' ? 'Retirada' : label}</small>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="order-ticket-items" aria-label="Sabores escolhidos e acessórios">
              <h3><Package size={15} aria-hidden="true" /> Sabores e acessórios</h3>
              {order.items.length ? (
                <ul>{order.items.map((item, index) => (
                  <li key={item.id + '-' + index}><span>{ticketItemLabel(item)}</span>
                    <strong>{formatCurrency(item.price * item.quantity)}</strong></li>
                ))}</ul>
              ) : <p>Este pedido antigo não tem itens detalhados.</p>}
            </section>

            <dl className="order-ticket-details">
              <div><dt>Destino</dt><dd>{order.deliveryType === 'pickup' ? 'Retirada no local' : order.addressSummary || 'A confirmar com a loja'}</dd></div>
              <div><dt>Pagamento</dt><dd>{order.paymentMethod || 'A combinar'}</dd></div>
            </dl>

            <div className="order-ticket-total">
              <span>TOTAL DO PEDIDO</span><strong>{formatCurrency(order.total)}</strong>
              {order.discount > 0 && <small>Você economizou {formatCurrency(order.discount)}</small>}
            </div>
          </div>

          <div className="order-ticket-tear" aria-hidden="true" />

          <footer className="order-ticket-stub">
            <div><Gift size={18} aria-hidden="true" /> <span>Cartão fidelidade</span><strong>{stamps}</strong></div>
            <div className="order-ticket-bars" aria-hidden="true" />
            <small>{reference} · REFERÊNCIA DO PEDIDO</small>
          </footer>
        </article>

        <div className="order-ticket-actions">
          {!isClosed && (
            <button type="button" className="order-ticket-alert" disabled={alerts.busy || orderAlertsEnabled}
              onClick={() => void alerts.activate(order.id)}>
              <Bell size={16} aria-hidden="true" />
              {orderAlertsEnabled ? 'Alertas ativos neste pedido' : alerts.busy ? 'Ativando…' : 'Ativar alerta deste pedido'}
            </button>
          )}
          {!isClosed && orderAlertsEnabled && !alerts.hasPushSubscription && (
            <p className="order-ticket-feedback">Alertas disponíveis enquanto a loja estiver aberta.</p>
          )}
          {!isClosed && !orderAlertsEnabled && alerts.message && <p className="order-ticket-feedback">{alerts.message}</p>}
          <div className="order-ticket-secondary">
            <button type="button" onClick={() => void copy(ticketSummary(order), 'Resumo copiado.')}>
              <Copy size={16} aria-hidden="true" /> Copiar resumo
            </button>
            <button type="button" onClick={() => void download()} disabled={downloading}>
              <Download size={16} aria-hidden="true" /> {downloading ? 'Gerando…' : 'Baixar PNG'}
            </button>
            <button type="button" onClick={() => void share()}>
              <Share2 size={16} aria-hidden="true" /> Compartilhar
            </button>
          </div>
          <p className="order-ticket-feedback" role="status">{feedback}</p>
          {manualCopy && <textarea aria-label="Resumo para copiar" readOnly value={manualCopy} onFocus={event => event.currentTarget.select()} />}
          <p className="order-ticket-note"><ReceiptText size={14} aria-hidden="true" /> Comprovante de pedido. Pagamento conforme a modalidade escolhida.</p>
        </div>
      </div>
      <div className="order-ticket-pinned">
        <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="order-ticket-whatsapp">
          <MessageCircle size={19} aria-hidden="true" /> Reenviar no WhatsApp
        </a>
      </div>
    </dialog>
  );
}
