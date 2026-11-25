import '../config.js';
import '../quote-pricing.js';

const reply = (body, status = 200) => Response.json(body, {status, headers: {'Cache-Control':'no-store'}});
const integer = (v, min, max) => Number.isSafeInteger(v) && v >= min && v <= max;
const cost = v => Number.isFinite(v) && v >= 0 && v <= Number.MAX_SAFE_INTEGER / 100;

function validQuote(q) {
  return q && ['es','en'].includes(q.lang) && ['starter','growth','ai'].includes(q.plan)
    && integer(q.connections,0,2) && integer(q.rules,0,2) && integer(q.support,0,3)
    && integer(q.months,1,120) && cost(q.other) && Array.isArray(q.tools) && q.tools.length <= 100
    && q.tools.every(t => t && typeof t.name === 'string' && t.name.trim() && t.name.length <= 200
      && integer(t.seats,0,Number.MAX_SAFE_INTEGER) && [t.license,t.units,t.rate,t.setup].every(cost));
}

export async function onRequestPost({request, env}) {
  if (!env.BOLD_API_KEY || !env.QUOTES_DB) return reply({error:'unavailable'},503);
  if (request.headers.get('Origin') !== new URL(request.url).origin) return reply({error:'origin'},403);
  const raw = await request.text();
  if (raw.length > 32768) return reply({error:'size'},413);
  let input;
  try { input = JSON.parse(raw); } catch { return reply({error:'invalid'},400); }
  if (!input || !/^[a-f0-9-]{36}$/i.test(input.session || '') || !validQuote(input.quote)) return reply({error:'invalid'},400);
  const q = input.quote;
  const price = globalThis.EFFITECH_PRICING.calculate(q);
  if (!Number.isSafeInteger(price.total) || input.deposit !== price.deposit || input.total !== price.total)
    return reply({error:'quote_changed'},409);

  const snapshot = JSON.stringify({plan:q.plan,lang:q.lang,connections:q.connections,rules:q.rules,
    months:q.months,support:q.support,other:q.other,tools:q.tools.map(t=>({name:t.name.trim(),seats:t.seats,license:t.license,units:t.units,rate:t.rate,setup:t.setup})), price});
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input.session + snapshot));
  const key = Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2,'0')).join('');
  const db = env.QUOTES_DB;
  const reference = 'EA-' + crypto.randomUUID();
  const expires = Date.now() + 86400000;
  try {
    const claim = await db.prepare('INSERT INTO quotes (quote_key, reference, snapshot, expires) VALUES (?,?,?,?) ON CONFLICT(quote_key) DO NOTHING')
      .bind(key,reference,snapshot,expires).run();
    if (!claim.meta.changes) {
      const row = await db.prepare('SELECT url,expires FROM quotes WHERE quote_key=?').bind(key).first();
      if (row?.url && row.expires > Date.now()) return reply({url:row.url});
      return reply({error:row?.expires <= Date.now() ? 'expired' : 'pending'},409);
    }
    const response = await fetch('https://integrations.api.bold.co/online/link/v1', {
      method:'POST', headers:{Authorization:'x-api-key ' + env.BOLD_API_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({amount_type:'CLOSE',amount:{currency:price.currency,total_amount:price.deposit/100,tip_amount:0},
        reference,description:'EffiTech AI - Anticipo 50% - ' + q.plan,expiration_date:expires*1e6})
    });
    if (!response.ok) {
      // A definite validation rejection did not create a link. Ambiguous responses keep their claim.
      if ([400,401,403,422].includes(response.status)) await db.prepare('DELETE FROM quotes WHERE reference=? AND url IS NULL').bind(reference).run();
      return reply({error:'provider'},502);
    }
    const payload = (await response.json()).payload;
    const url = new URL(payload.url);
    if (url.origin !== 'https://checkout.bold.co' || url.username || url.password || !payload.payment_link) return reply({error:'provider'},502);
    await db.prepare('UPDATE quotes SET url=?,bold_id=? WHERE reference=?').bind(url.href,payload.payment_link,reference).run();
    return reply({url:url.href});
  } catch {
    return reply({error:'unavailable'},503);
  }
}
