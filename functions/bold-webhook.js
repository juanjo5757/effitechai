const encoder = new TextEncoder();
const paymentEvents = new Set(['SALE_APPROVED', 'SALE_REJECTED', 'VOID_APPROVED', 'VOID_REJECTED']);

function identifier(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let result = 0;
  for (let index = 0; index < a.length; index++) result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return result === 0;
}

async function signBase64Body(base64Body, keyBytes) {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(base64Body));
  return toHex(signature);
}

export async function onRequestPost(context) {
  const secret = context.env.BOLD_WEBHOOK_SECRET;
  // Only this preview alias may acknowledge sandbox notifications.
  const previewHost = 'bold-test.effitechai.pages.dev';
  const host = new URL(context.request.url).hostname;
  const testMode = context.env.BOLD_WEBHOOK_MODE === 'test';
  if (testMode !== (host === previewHost)) {
    return new Response('Webhook environment mismatch', { status: 503 });
  }
  if (!testMode && !secret) return new Response(JSON.stringify({ ok: false, error: 'Webhook secret is not configured' }), { status: 500, headers: { 'content-type': 'application/json' } });

  const rawBody = await context.request.text();
  const receivedSignature = context.request.headers.get('x-bold-signature') || '';
  const base64Body = btoa(unescape(encodeURIComponent(rawBody)));
  // HMAC pads an empty key to one zero-filled SHA-256 block.
  // Web Crypto requires nonempty key material.
  const keyBytes = testMode ? new Uint8Array(64) : encoder.encode(secret);
  const expectedSignature = await signBase64Body(base64Body, keyBytes);
  if (!constantTimeEqual(receivedSignature.toLowerCase(), expectedSignature.toLowerCase())) {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid signature' }), { status: 401, headers: { 'content-type': 'application/json' } });
  }

  let event;
  try { event = JSON.parse(rawBody); } catch { return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), { status: 400, headers: { 'content-type': 'application/json' } }); }

  const eventId = identifier(event?.id);
  const eventType = identifier(event?.type);
  const paymentId = identifier(event?.data?.payment_id) || identifier(event?.subject);
  if (!eventId || !eventType || (paymentEvents.has(eventType) && !paymentId)) {
    console.warn('Bold notification missing required identifiers');
    return Response.json({ ok: false, error: 'Incomplete notification' }, { status: 422 });
  }
  if (!paymentEvents.has(eventType)) {
    console.info(JSON.stringify({ source: 'effitech_ai', environment: testMode ? 'test' : 'production', status: 'ignored', eventId, eventType }));
    return Response.json({ ok: true, status: 'ignored' });
  }
  if (testMode) {
    console.info('Bold sandbox notification received');
    return Response.json({ ok: true, environment: 'test' });
  }

  // A notification is a receipt. On retries the same IDs remain available for reconciliation.
  const metadata = event.data?.metadata;
  const reference = metadata && Object.hasOwn(metadata, 'reference')
    ? identifier(metadata.reference)
    : identifier(event.metadata?.reference) ?? identifier(event.reference);
  console.info(JSON.stringify({ source: 'effitech_ai', status: 'received', eventId, eventType, paymentId, reference, receivedAt: new Date().toISOString() }));
  return Response.json({ ok: true, status: 'received' });
}

export function onRequest(context) {
  if (context.request.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
  return onRequestPost(context);
}
