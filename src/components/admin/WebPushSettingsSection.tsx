import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellRing,
  Send,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  Info,
  Clock,
  Sparkles,
  KeyRound,
  Radio,
} from 'lucide-react';

interface WebPushHistoryItem {
  id: string;
  title: string;
  body: string;
  url: string;
  sentAt: string;
  status: 'success' | 'failed';
}

const PUSH_HISTORY_KEY = 'podwave_webpush_test_history_v1';
const PUSH_VAPID_KEY = 'podwave_webpush_vapid_public_key_v1';

export const WebPushSettingsSection: React.FC<{
  onNotify?: (message: string) => void;
}> = ({ onNotify }) => {
  // Estado de suporte e permissão do navegador
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [swActive, setSwActive] = useState<boolean>(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Formulário de Notificação de Teste
  const [title, setTitle] = useState('🔥 Novidade PodWave: Sabores Exclusivos!');
  const [body, setBody] = useState('Chegaram novos pods descartáveis e juices premium com entrega rápida na sua região.');
  const [url, setUrl] = useState('/?ref=push');
  const [tag, setTag] = useState('podwave-promo-push');
  const [requireInteraction, setRequireInteraction] = useState(false);
  const [vibrate, setVibrate] = useState(true);

  // VAPID & PushManager Subscription
  const [vapidKey, setVapidKey] = useState<string>(() => {
    try {
      return localStorage.getItem(PUSH_VAPID_KEY) || '';
    } catch {
      return '';
    }
  });
  const [subscriptionJson, setSubscriptionJson] = useState<string | null>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);

  // Histórico de envios de teste
  const [history, setHistory] = useState<WebPushHistoryItem[]>(() => {
    try {
      const stored = localStorage.getItem(PUSH_HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Feedback de ações
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [copiedSub, setCopiedSub] = useState(false);

  // Verifica o suporte e o status atual do Service Worker e Permissões
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hasNotification = 'Notification' in window;
    const hasServiceWorker = 'serviceWorker' in navigator;
    const supported = hasNotification && hasServiceWorker;
    setIsSupported(supported);

    if (hasNotification) {
      setPermission(Notification.permission);
    }

    if (hasServiceWorker) {
      navigator.serviceWorker.ready
        .then((reg) => {
          setSwActive(true);
          setSwRegistration(reg);

          // Verifica se já existe inscrição de push ativa
          if ('pushManager' in reg) {
            reg.pushManager.getSubscription().then((sub) => {
              if (sub) {
                setSubscriptionJson(JSON.stringify(sub, null, 2));
              }
            });
          }
        })
        .catch(() => {
          setSwActive(false);
        });
    }
  }, []);

  const saveHistory = (items: WebPushHistoryItem[]) => {
    setHistory(items);
    try {
      localStorage.setItem(PUSH_HISTORY_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  };

  const handleSaveVapidKey = (key: string) => {
    setVapidKey(key);
    try {
      localStorage.setItem(PUSH_VAPID_KEY, key.trim());
    } catch {
      // ignore
    }
    if (onNotify) onNotify('Chave VAPID salva no armazenamento local.');
  };

  // Solicitar permissão de notificação no navegador
  const handleRequestPermission = async () => {
    if (!('Notification' in window)) {
      setFeedback({ type: 'error', message: 'Seu navegador atual não suporta a Web Notification API.' });
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        setFeedback({ type: 'success', message: 'Permissão para notificações concedida com sucesso!' });
        if (onNotify) onNotify('Permissão de notificações concedida!');
      } else if (result === 'denied') {
        setFeedback({
          type: 'error',
          message: 'Permissão bloqueada pelo usuário. Desbloqueie nas permissões do site nas configurações do navegador.',
        });
      } else {
        setFeedback({ type: 'info', message: 'Permissão não concedida (fechada pelo usuário).' });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: 'Falha ao solicitar permissão: ' + (err instanceof Error ? err.message : String(err)),
      });
    }
  };

  // Disparar notificação de teste diretamente via Service Worker (Web Push API)
  const handleSendTestNotification = async () => {
    setIsSending(true);
    setFeedback(null);

    try {
      if (!('Notification' in window)) {
        throw new Error('A API de Notificações não está disponível neste navegador.');
      }

      // Se a permissão ainda não foi solicitada, pede agora
      let currentPerm = Notification.permission;
      if (currentPerm === 'default') {
        currentPerm = await Notification.requestPermission();
        setPermission(currentPerm);
      }

      if (currentPerm !== 'granted') {
        throw new Error(
          'Permissão de notificação não concedida. Permita notificações no topo do navegador para receber os alertas.'
        );
      }

      // Obtém o registro ativo do Service Worker
      let reg = swRegistration;
      if (!reg && 'serviceWorker' in navigator) {
        reg = await navigator.serviceWorker.ready;
        setSwRegistration(reg);
        setSwActive(true);
      }

      const notifOptions: NotificationOptions & { vibrate?: number[] } = {
        body: body.trim(),
        icon: '/pwa-192x192.png',
        badge: '/apple-touch-icon.png',
        tag: tag.trim() || 'podwave-test',
        data: {
          url: url.trim() || '/',
          type: 'podwave-admin-test',
          sentAt: new Date().toISOString(),
        },
        vibrate: vibrate ? [200, 100, 200] : undefined,
        requireInteraction,
      };

      if (reg && 'showNotification' in reg) {
        // Envio via ServiceWorkerRegistration (Padrão Web Push PWA)
        await reg.showNotification(title.trim(), notifOptions);

        // Comunica também via postMessage para garantir compatibilidade com o worker ativo
        if (reg.active) {
          reg.active.postMessage({
            type: 'SHOW_TEST_NOTIFICATION',
            title: title.trim(),
            options: notifOptions,
          });
        }
      } else {
        // Fallback para new Notification direto se o SW ainda estiver inicializando
        new Notification(title.trim(), {
          body: notifOptions.body,
          icon: notifOptions.icon,
          tag: notifOptions.tag,
        });
      }

      const newItem: WebPushHistoryItem = {
        id: `push-${Date.now()}`,
        title: title.trim(),
        body: body.trim(),
        url: url.trim() || '/',
        sentAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        status: 'success',
      };
      saveHistory([newItem, ...history.slice(0, 9)]);

      setFeedback({
        type: 'success',
        message: 'Notificação push disparada com sucesso! Verifique a barra de notificações do seu aparelho/sistema.',
      });
      if (onNotify) onNotify('Notificação push enviada!');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setFeedback({ type: 'error', message: errMsg });

      const failedItem: WebPushHistoryItem = {
        id: `push-${Date.now()}`,
        title: title.trim(),
        body: body.trim(),
        url: url.trim() || '/',
        sentAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        status: 'failed',
      };
      saveHistory([failedItem, ...history.slice(0, 9)]);
    } finally {
      setIsSending(false);
    }
  };

  // Helper para converter VAPID base64 string em Uint8Array para o PushManager
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // Obter ou gerar PushSubscription no PushManager
  const handleGenerateSubscription = async () => {
    setIsSubscribing(true);
    setFeedback(null);

    try {
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service Worker não suportado.');
      }

      const reg = await navigator.serviceWorker.ready;
      if (!('pushManager' in reg)) {
        throw new Error('PushManager não suportado pelo navegador.');
      }

      let sub = await reg.pushManager.getSubscription();

      if (!sub) {
        const subOptions: PushSubscriptionOptionsInit = {
          userVisibleOnly: true,
        };

        if (vapidKey.trim()) {
          subOptions.applicationServerKey = urlBase64ToUint8Array(vapidKey.trim());
        }

        sub = await reg.pushManager.subscribe(subOptions);
      }

      const jsonStr = JSON.stringify(sub, null, 2);
      setSubscriptionJson(jsonStr);
      setFeedback({
        type: 'success',
        message: 'Inscrição PushSubscription obtida com sucesso! Você pode copiá-la para disparos remotos.',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: 'Não foi possível gerar a inscrição: ' + (err instanceof Error ? err.message : String(err)),
      });
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleCopySubscription = () => {
    if (!subscriptionJson) return;
    navigator.clipboard.writeText(subscriptionJson);
    setCopiedSub(true);
    setTimeout(() => setCopiedSub(false), 2000);
    if (onNotify) onNotify('JSON da inscrição Web Push copiado!');
  };

  return (
    <div className="p-6 rounded-2xl bg-[#0D1022] light:bg-white border border-[#8423DA]/30 shadow-xl space-y-6 text-xs text-white light:text-slate-900">
      {/* HEADER DA SEÇÃO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#8423DA]/20 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8423DA] to-[#00DFFF] flex items-center justify-center text-white shadow-md shrink-0">
            <BellRing className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-heading text-base font-extrabold text-white light:text-slate-900 flex items-center gap-2">
              <span>Notificações Web Push & Service Worker</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold">
                Web Push API
              </span>
            </h3>
            <p className="text-xs text-[#A5A5B8] light:text-slate-600">
              Configure permissões, chaves VAPID e envie notificações push de teste diretamente aos dispositivos dos usuários.
            </p>
          </div>
        </div>

        {/* Status rápido do Service Worker */}
        <div className="flex items-center gap-2">
          <span
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold ${
              swActive
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${swActive ? 'animate-pulse text-emerald-400' : 'text-amber-400'}`} />
            <span>Service Worker: {swActive ? 'Ativo e Pronto' : 'Inicializando...'}</span>
          </span>
        </div>
      </div>

      {/* FEEDBACK BANNER */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border flex items-start gap-2.5 animate-in fade-in duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
              : feedback.type === 'error'
              ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
              : 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : feedback.type === 'error' ? (
            <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          ) : (
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          )}
          <span className="text-xs leading-relaxed">{feedback.message}</span>
        </div>
      )}

      {/* CARD 1: DIAGNÓSTICO E PERMISSÕES DO NAVEGADOR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/25 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-gray-400 text-[11px] mb-1.5 font-medium">
              <span>Status da Permissão</span>
              <ShieldCheck className="w-3.5 h-3.5 text-[#00DFFF]" />
            </div>
            <div className="flex items-center gap-2">
              {permission === 'granted' ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" /> Autorizada (Ativa)
                </span>
              ) : permission === 'denied' ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-400">
                  <XCircle className="w-4 h-4" /> Bloqueada pelo Navegador
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300">
                  <AlertTriangle className="w-4 h-4" /> Não Solicitada
                </span>
              )}
            </div>
            <p className="text-[10px] text-[#A5A5B8] mt-1">
              {permission === 'granted'
                ? 'Este navegador pode receber notificações push em segundo plano.'
                : permission === 'denied'
                ? 'Clique no ícone de cadeado na barra de endereços para desbloquear.'
                : 'Solicite autorização para habilitar o envio de pushes.'}
            </p>
          </div>

          <div className="pt-3">
            <button
              type="button"
              onClick={handleRequestPermission}
              disabled={permission === 'granted'}
              className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                permission === 'granted'
                  ? 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5'
                  : 'bg-[#8423DA] hover:bg-[#9d3aef] text-white shadow-md'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>{permission === 'granted' ? 'Permissão Ativada ✓' : 'Solicitar Permissão'}</span>
            </button>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/25 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-gray-400 text-[11px] mb-1.5 font-medium">
              <span>Service Worker Ativo</span>
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <p className="text-xs font-bold text-white light:text-slate-900 font-mono">
              /order-notifications-sw.js
            </p>
            <p className="text-[10px] text-[#A5A5B8] mt-1">
              Responsável por escutar eventos <code>push</code> e <code>notificationclick</code> para abrir os links desejados.
            </p>
          </div>

          <div className="pt-3">
            <button
              type="button"
              onClick={async () => {
                if ('serviceWorker' in navigator) {
                  const reg = await navigator.serviceWorker.ready;
                  await reg.update();
                  if (onNotify) onNotify('Service worker atualizado com sucesso!');
                }
              }}
              className="w-full py-2 px-3 rounded-lg bg-[#181C38] hover:bg-[#8423DA]/30 border border-[#8423DA]/30 text-white text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#00DFFF]" />
              <span>Atualizar Worker</span>
            </button>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/25 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-gray-400 text-[11px] mb-1.5 font-medium">
              <span>Suporte Web Push</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <p className="text-xs font-bold text-white light:text-slate-900">
              {isSupported ? '100% Compatível' : 'Parcial / Incompatível'}
            </p>
            <p className="text-[10px] text-[#A5A5B8] mt-1">
              Disponível em Chrome, Edge, Safari (iOS 16.4+ em PWA) e Firefox.
            </p>
          </div>

          <div className="pt-3">
            <button
              type="button"
              onClick={handleGenerateSubscription}
              disabled={isSubscribing}
              className="w-full py-2 px-3 rounded-lg bg-[#00DFFF]/15 hover:bg-[#00DFFF]/25 border border-[#00DFFF]/40 text-[#00DFFF] text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{isSubscribing ? 'Obtendo...' : 'Inscrição PushManager'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* CARD 2: CONFIGURAÇÃO DE DISPARO DE TESTE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Formulário */}
        <div className="p-5 rounded-2xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/30 space-y-4">
          <div className="flex items-center justify-between border-b border-[#8423DA]/20 pb-2">
            <h4 className="font-heading font-bold text-white light:text-slate-900 text-sm flex items-center gap-2">
              <Send className="w-4 h-4 text-[#00DFFF]" />
              <span>Configurar Notificação de Teste</span>
            </h4>
            <span className="text-[10px] text-[#A5A5B8]">Disparo em tempo real</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-gray-300 light:text-slate-700 font-semibold mb-1 text-[11px]">
                Título da Notificação *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: 🔥 Promoção Relâmpago PodWave!"
                className="w-full p-2.5 rounded-xl bg-[#0D1022] light:bg-white border border-[#8423DA]/30 text-white light:text-slate-900 font-bold focus:outline-none focus:border-[#00DFFF]"
              />
            </div>

            <div>
              <label className="block text-gray-300 light:text-slate-700 font-semibold mb-1 text-[11px]">
                Mensagem / Corpo da Notificação *
              </label>
              <textarea
                rows={3}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Texto explicativo ou anúncio de novos sabores/descontos..."
                className="w-full p-2.5 rounded-xl bg-[#0D1022] light:bg-white border border-[#8423DA]/30 text-white light:text-slate-900 focus:outline-none focus:border-[#00DFFF]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-300 light:text-slate-700 font-semibold mb-1 text-[11px]">
                  URL de Destino ao Clicar
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Ex: / ou /?orders=1"
                  className="w-full p-2 rounded-xl bg-[#0D1022] light:bg-white border border-[#8423DA]/30 text-white light:text-slate-900 font-mono text-[11px] focus:outline-none focus:border-[#00DFFF]"
                />
              </div>

              <div>
                <label className="block text-gray-300 light:text-slate-700 font-semibold mb-1 text-[11px]">
                  Tag de Agrupamento
                </label>
                <input
                  type="text"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  placeholder="podwave-promo-push"
                  className="w-full p-2 rounded-xl bg-[#0D1022] light:bg-white border border-[#8423DA]/30 text-white light:text-slate-900 font-mono text-[11px] focus:outline-none focus:border-[#00DFFF]"
                />
              </div>
            </div>

            {/* Opções adicionais */}
            <div className="pt-2 flex flex-wrap items-center gap-4 text-[11px]">
              <label className="flex items-center gap-2 cursor-pointer text-gray-300">
                <input
                  type="checkbox"
                  checked={vibrate}
                  onChange={(e) => setVibrate(e.target.checked)}
                  className="w-4 h-4 rounded text-[#8423DA] focus:ring-[#00DFFF] cursor-pointer"
                />
                <span>Vibração háptica no celular</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-gray-300">
                <input
                  type="checkbox"
                  checked={requireInteraction}
                  onChange={(e) => setRequireInteraction(e.target.checked)}
                  className="w-4 h-4 rounded text-[#8423DA] focus:ring-[#00DFFF] cursor-pointer"
                />
                <span>Manter visível até o clique</span>
              </label>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleSendTestNotification}
              disabled={isSending}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#8423DA] via-[#007BFF] to-[#00DFFF] hover:opacity-95 text-white font-extrabold shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Disparando Web Push...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Enviar Notificação de Teste Imediata</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Pré-visualização ao Vivo do Alerta Push */}
        <div className="p-5 rounded-2xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/30 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-[#8423DA]/20 pb-2 mb-3">
              <h4 className="font-heading font-bold text-white light:text-slate-900 text-sm flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>Pré-visualização do Alerta no Aparelho</span>
              </h4>
              <span className="text-[10px] text-gray-400 font-mono">Mobile & Desktop</span>
            </div>

            {/* Mock Visual da Notificação */}
            <div className="p-4 rounded-2xl bg-[#0D1022] border border-[#8423DA]/40 shadow-2xl relative overflow-hidden space-y-2.5">
              <div className="flex items-center justify-between text-[11px] text-[#A5A5B8]">
                <div className="flex items-center gap-2">
                  <img
                    src="/pwa-192x192.png"
                    alt="Logo"
                    className="w-5 h-5 rounded-md object-contain bg-black/40 p-0.5 border border-white/10"
                  />
                  <span className="font-bold text-white">PodWave</span>
                  <span>•</span>
                  <span>agora</span>
                </div>
                <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-gray-300">PWA Push</span>
              </div>

              <div>
                <p className="font-heading font-extrabold text-white text-xs leading-snug">
                  {title || 'Título da notificação'}
                </p>
                <p className="text-[11px] text-gray-300 leading-relaxed mt-1">
                  {body || 'Corpo da mensagem que aparecerá na tela do cliente.'}
                </p>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px]">
                <span className="text-[#00DFFF] font-mono truncate max-w-[200px]">
                  Destino: {url || '/'}
                </span>
                <span className="text-gray-400">Toque para abrir</span>
              </div>
            </div>

            {/* Dica Informativa */}
            <div className="mt-4 p-3 rounded-xl bg-purple-950/30 border border-purple-500/20 text-[11px] text-purple-200 leading-relaxed flex items-start gap-2">
              <Info className="w-4 h-4 text-[#00DFFF] shrink-0 mt-0.5" />
              <span>
                Ao clicar na notificação enviada, o Service Worker foca automaticamente na janela do catálogo ou abre uma nova guia direcionando o cliente para a página promocional.
              </span>
            </div>
          </div>

          {/* Chave VAPID Opcional para Integrações Remotas */}
          <div className="pt-3 border-t border-[#8423DA]/20">
            <label className="block text-[11px] font-semibold text-gray-300 mb-1">
              Chave Pública VAPID (Opcional para backend remoto):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={vapidKey}
                onChange={(e) => handleSaveVapidKey(e.target.value)}
                placeholder="Ex: BEl62iENgUivxKyFloWv61RRzqINb-vdS928..."
                className="flex-1 p-2 rounded-xl bg-[#0D1022] border border-[#8423DA]/30 text-white font-mono text-[10px] focus:outline-none focus:border-[#00DFFF]"
              />
              <button
                type="button"
                onClick={() => handleSaveVapidKey(vapidKey)}
                className="px-3 py-2 rounded-xl bg-[#181C38] hover:bg-[#8423DA]/30 border border-[#8423DA]/30 text-white font-bold text-[11px] cursor-pointer"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CARD 3: INSCRIÇÃO PUSHMANAGER (JSON EXPORTÁVEL) */}
      {subscriptionJson && (
        <div className="p-5 rounded-2xl bg-[#141838] light:bg-slate-100 border border-[#00DFFF]/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#00DFFF]" />
              <h4 className="font-heading font-bold text-white light:text-slate-900 text-xs">
                Inscrição Web Push Ativa (PushSubscription JSON)
              </h4>
            </div>
            <button
              type="button"
              onClick={handleCopySubscription}
              className="px-3 py-1.5 rounded-xl bg-[#00DFFF]/20 hover:bg-[#00DFFF]/30 border border-[#00DFFF]/40 text-[#00DFFF] font-bold text-[11px] flex items-center gap-1.5 cursor-pointer transition-all"
            >
              {copiedSub ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSub ? 'Copiado!' : 'Copiar Inscrição'}</span>
            </button>
          </div>
          <p className="text-[11px] text-[#A5A5B8]">
            Copie os dados criptográficos de endpoint e chaves p256dh/auth para disparar notificações a partir de servidores Node.js, Python ou ferramentas de teste como WebPush CLI.
          </p>
          <pre className="p-3 rounded-xl bg-[#080811] text-emerald-400 font-mono text-[10px] overflow-x-auto max-h-40 border border-white/5">
            {subscriptionJson}
          </pre>
        </div>
      )}

      {/* CARD 4: HISTÓRICO DE DISPAROS DE TESTE */}
      <div className="p-5 rounded-2xl bg-[#141838] light:bg-slate-100 border border-[#8423DA]/25 space-y-3">
        <div className="flex items-center justify-between border-b border-[#8423DA]/20 pb-2">
          <div className="flex items-center gap-2 text-white font-bold text-xs">
            <Clock className="w-4 h-4 text-[#00DFFF]" />
            <span>Histórico de Testes Recentes</span>
          </div>
          {history.length > 0 && (
            <button
              type="button"
              onClick={() => saveHistory([])}
              className="text-[10px] text-gray-400 hover:text-rose-400 underline cursor-pointer"
            >
              Limpar histórico
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <p className="text-gray-400 text-center py-4 text-[11px]">
            Nenhum disparo de teste registrado ainda. Configure o formulário acima e clique em "Enviar Notificação de Teste Imediata".
          </p>
        ) : (
          <div className="divide-y divide-[#8423DA]/15 space-y-1">
            {history.map((item) => (
              <div key={item.id} className="pt-2 pb-2 flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        item.status === 'success' ? 'bg-emerald-400' : 'bg-rose-400'
                      }`}
                    />
                    <span className="font-bold text-white truncate">{item.title}</span>
                    <span className="text-[10px] text-gray-400 font-mono">às {item.sentAt}</span>
                  </div>
                  <p className="text-[11px] text-[#A5A5B8] truncate mt-0.5">{item.body}</p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setTitle(item.title);
                    setBody(item.body);
                    setUrl(item.url);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#0D1022] hover:bg-[#8423DA]/30 border border-[#8423DA]/25 text-[#00DFFF] text-[10px] font-bold cursor-pointer shrink-0"
                >
                  Recarregar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
