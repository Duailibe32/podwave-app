import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import webpush from 'npm:web-push@3.6.7';

Deno.serve(async request => {
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
        const endpoint = new URL(job.endpoint);
        const allowed = /^(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)$/;
        if (endpoint.protocol !== 'https:' || endpoint.port || endpoint.username || endpoint.password || !allowed.test(endpoint.hostname)) {
          await finish();
          return;
        }
        const { data: device, error: lookupError } = await db.from('order_push_devices')
          .select('endpoint').eq('endpoint', job.endpoint).eq('customer_id', job.customer_id).maybeSingle();
        if (lookupError) return; // Keep the lease and retry after expiry.
        if (!device) { await finish(); return; }
        // Keep lock-screen content generic even during account switching.
        await webpush.sendNotification({
          endpoint: job.endpoint, keys: { p256dh: job.p256dh, auth: job.auth_secret },
        }, JSON.stringify({
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
