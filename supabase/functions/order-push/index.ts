import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import webpush from 'npm:web-push@3.6.7';

const storeOrigin = 'https://podwave-app.vercel.app';
const browserHeaders = {
  'Access-Control-Allow-Origin': storeOrigin,
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const allowedPushHost = /^(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)$/;

function isPushEndpoint(value: string) {
  const endpoint = new URL(value);
  return endpoint.protocol === 'https:' && !endpoint.port && !endpoint.username &&
    !endpoint.password && allowedPushHost.test(endpoint.hostname);
}

async function sendAdminTest(request: Request) {
  const reply = (body: object, status = 200) => Response.json(body, { status, headers: browserHeaders });
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const subject = Deno.env.get('ORDER_PUSH_VAPID_SUBJECT');
  const publicKey = Deno.env.get('ORDER_PUSH_VAPID_PUBLIC_KEY');
  const privateKey = Deno.env.get('ORDER_PUSH_VAPID_PRIVATE_KEY');
  if (!url || !key || !subject || !publicKey || !privateKey) return reply({ error: 'Envio indisponível.' }, 503);

  const db = createClient(url, key, { auth: { persistSession: false } });
  const token = request.headers.get('Authorization')?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return reply({ error: 'Entre novamente no painel.' }, 401);
  const { data: { user }, error: authError } = await db.auth.getUser(token);
  if (authError || !user) return reply({ error: 'Entre novamente no painel.' }, 401);
  const { data: profile, error: profileError } = await db.from('customer_profiles')
    .select('role').eq('id', user.id).maybeSingle();
  if (profileError) return reply({ error: 'Não foi possível verificar sua conta.' }, 502);
  if (!profile || !['admin', 'owner'].includes(profile.role)) return reply({ error: 'Acesso restrito.' }, 403);

  const raw = await request.text();
  if (raw.length > 4096) return reply({ error: 'Mensagem muito longa.' }, 400);
  let input;
  try { input = JSON.parse(raw); } catch { return reply({ error: 'Mensagem inválida.' }, 400); }
  const title = typeof input?.title === 'string' ? input.title.trim() : '';
  const body = typeof input?.body === 'string' ? input.body.trim() : '';
  const path = typeof input?.url === 'string' ? input.url.trim() : '';
  if (!title || title.length > 100 || !body || body.length > 400 || path.length > 300) {
    return reply({ error: 'Use até 100 caracteres no título e 400 na mensagem.' }, 400);
  }
  let target: URL;
  try { target = new URL(path || '/', storeOrigin); } catch { return reply({ error: 'Destino inválido.' }, 400); }
  if (target.origin !== storeOrigin) return reply({ error: 'Use um endereço do PodWave.' }, 400);

  const payload = JSON.stringify({
    title, body, url: target.pathname + target.search + target.hash, type: 'podwave-admin-test',
    tag: 'podwave-admin-test-' + crypto.randomUUID(), actions: [],
    vibrate: input.vibrate === true ? [200, 100, 200] : [],
    requireInteraction: input.requireInteraction === true,
  });
  if (input.campaignAudience !== undefined) {
    if (!['store', 'promotion'].includes(input.campaignAudience) ||
      typeof input.campaignId !== 'string' || !/^[0-9a-f-]{36}$/i.test(input.campaignId)) {
      return reply({ error: 'Confira o público do comunicado.' }, 400);
    }
    const { data: queued, error: queueError } = await db.rpc('podwave_queue_store_campaign', {
      p_actor: user.id, p_id: input.campaignId, p_audience: input.campaignAudience,
      p_payload: { ...JSON.parse(payload), type: 'podwave-store-campaign', tag: 'podwave-campaign-' + input.campaignId },
    });
    if (queueError) return reply({
      error: queueError.message.startsWith('Aguarde um minuto')
        ? queueError.message : 'Não foi possível agendar o comunicado.',
    }, 409);
    return reply({ queued });
  }
  const { data: devices, error } = await db.from('order_push_devices')
    .select('endpoint,p256dh,auth_secret').eq('customer_id', user.id).eq('notify_admin', true).limit(10);
  if (error) return reply({ error: 'Não foi possível consultar seus aparelhos.' }, 502);
  const results = await Promise.allSettled(devices.map(async device => {
    if (!isPushEndpoint(device.endpoint)) throw new Error('Invalid push endpoint');
    const { data: eligible, error: eligibilityError } = await db.rpc('podwave_can_deliver_admin_order_push', {
      p_endpoint: device.endpoint, p_owner: user.id,
    });
    if (eligibilityError || !eligible) throw new Error('Inactive subscription');
    await webpush.sendNotification({
      endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth_secret },
    }, payload, { vapidDetails: { subject, publicKey, privateKey }, TTL: 120, timeout: 5000 });
  }));
  return reply({ registered: devices.length, accepted: results.filter(result => result.status === 'fulfilled').length });
}

Deno.serve(async request => {
  if (request.headers.get('Origin') === storeOrigin) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: browserHeaders });
    if (request.method === 'POST') return sendAdminTest(request);
  }
  if (request.method !== 'POST') return new Response(null, { status: 405 });
  const dispatchSecret = Deno.env.get('ORDER_PUSH_DISPATCH_SECRET');
  if (!dispatchSecret || request.headers.get('x-order-push-secret') !== dispatchSecret) {
    return new Response(null, { status: 401 });
  }

  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const subject = Deno.env.get('ORDER_PUSH_VAPID_SUBJECT');
  const publicKey = Deno.env.get('ORDER_PUSH_VAPID_PUBLIC_KEY');
  const privateKey = Deno.env.get('ORDER_PUSH_VAPID_PRIVATE_KEY');
  if (!url || !key || !subject || !publicKey || !privateKey) return new Response(null, { status: 503 });
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await db.rpc('podwave_claim_order_push');
  if (error) return new Response(null, { status: 502 });

  const jobs = data ?? [];
  let delivered = 0;
  for (let start = 0; start < jobs.length; start += 5) {
    await Promise.all(jobs.slice(start, start + 5).map(async job => {
      const finish = () => db.from('order_push_queue').delete().eq('id', job.id).eq('attempts', job.attempts);
      try {
        if (!isPushEndpoint(job.endpoint)) {
          await finish();
          return;
        }
        if (job.status === 'store_campaign') {
          const { data: payload, error: payloadError } = await db.rpc('podwave_store_campaign_payload', {
            p_id: job.order_id, p_endpoint: job.endpoint, p_owner: job.customer_id,
          });
          if (payloadError) return;
          if (payload) {
            await webpush.sendNotification({
              endpoint: job.endpoint, keys: { p256dh: job.p256dh, auth: job.auth_secret },
            }, JSON.stringify(payload), { vapidDetails: { subject, publicKey, privateKey }, TTL: 600, timeout: 5000 });
            delivered++;
          }
          await finish();
          return;
        }
        const adminOrder = job.status === 'admin_new_order';
        const { data: device, error: lookupError } = adminOrder
          ? await db.rpc('podwave_can_deliver_admin_order_push', { p_endpoint: job.endpoint, p_owner: job.customer_id })
          : await db.from('order_push_devices')
            .select('endpoint').eq('endpoint', job.endpoint).eq('customer_id', job.customer_id).maybeSingle();
        if (lookupError) return; // Keep the lease and retry after expiry.
        if (!device) { await finish(); return; }
        // Keep lock-screen content generic even during account switching.
        await webpush.sendNotification({
          endpoint: job.endpoint, keys: { p256dh: job.p256dh, auth: job.auth_secret },
        }, JSON.stringify(adminOrder ? {
          title: 'PodWave · Novo pedido', body: 'Abra a Central de Pedidos para conferir.',
          type: 'podwave-admin-order', url: '/admin?tab=pedidos', actions: [],
          tag: 'podwave-admin-order-' + job.order_id,
        } : {
          title: 'PodWave — Atualização de pedido', body: 'Abra Meus Pedidos para conferir.',
          orderId: job.order_id, status: job.status, ownerId: job.customer_id,
        }), { vapidDetails: { subject, publicKey, privateKey }, TTL: 120, timeout: 5000 });
        await finish();
        delivered++;
      } catch (failure) {
        const status = (failure as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await db.from('order_push_devices').delete().eq('endpoint', job.endpoint).eq('customer_id', job.customer_id);
        }
        // Remaining errors are retried by the lease, up to five attempts.
      }
    }));
  }
  return Response.json({ claimed: jobs.length, delivered });
});
