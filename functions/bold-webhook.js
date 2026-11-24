const encoder = new TextEncoder();

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let result = 0;
  for (let index = 0; index < a.length; index++) result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return result === 0;
}

async function signBase64Body(base64Body, secret) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(base64Body));
  return toHex(signature);
}

export async function onRequestPost(context) {
  const secret = context.env.BOLD_WEBHOOK_SECRET;
  if (!secret) return new Response(JSON.stringify({ ok: false, error: 'Webhook secret is not configured' }), { status: 500, headers: { 'content-type': 'application/json' } });

  const rawBody = await context.request.text();
  const receivedSignature = context.request.headers.get('x-bold-signature') || '';
  const base64Body = btoa(unescape(encodeURIComponent(rawBody)));
  const expectedSignature = await signBase64Body(base64Body, secret);
  if (!constantTimeEqual(receivedSignature.toLowerCase(), expectedSignature.toLowerCase())) {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid signature' }), { status: 401, headers: { 'content-type': 'application/json' } });
  }

  let event;
  try { event = JSON.parse(rawBody); } catch { return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), { status: 400, headers: { 'content-type': 'application/json' } }); }

  const eventType = event?.type || 'UNKNOWN';
  const reference = event?.metadata?.reference || event?.reference || null;
  // Aquí se conectará el registro en CRM/email después de definir el proveedor.
  console.log(JSON.stringify({ source: 'effitech_ai', eventType, reference, receivedAt: new Date().toISOString() }));
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
}

export function onRequest(context) {
  if (context.request.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
  return onRequestPost(context);
}
