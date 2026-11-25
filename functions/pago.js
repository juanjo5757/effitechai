import '../config.js';

const copy = {
  es: {
    title: 'Estado del anticipo', paid: 'Anticipo recibido', pending: 'Confirmación pendiente',
    closed: 'Pago sin completar', unknown: 'No pudimos verificar el pago',
    invalid: 'Cotización no encontrada', reference: 'Referencia', received: 'Importe recibido',
    next: 'Comparte la referencia con EffiTech AI para coordinar la reunión de inicio.',
    contact: 'Coordinar el inicio', wait: 'Bold aún no ha confirmado el anticipo. Si ya pagaste, consulta el estado de nuevo antes de realizar otro intento.',
    retry: 'Actualizar estado', back: 'Volver a los planes', help: 'Consulta con EffiTech AI antes de volver a pagar.',
    message: 'Quiero coordinar el inicio del proyecto. Mi referencia es'
  },
  en: {
    title: 'Deposit status', paid: 'Deposit received', pending: 'Awaiting confirmation',
    closed: 'Payment not completed', unknown: 'We could not verify your payment',
    invalid: 'Quote not found', reference: 'Reference', received: 'Amount received',
    next: 'Share your reference with EffiTech AI to arrange your kickoff meeting.',
    contact: 'Arrange kickoff', wait: 'Bold has yet to confirm the deposit. If you have already paid, check the status again before trying another payment.',
    retry: 'Refresh status', back: 'Back to plans', help: 'Contact EffiTech AI before attempting another payment.',
    message: 'I would like to schedule my project kickoff. My reference is'
  }
};

export async function onRequestGet({request, env}) {
  const url = new URL(request.url);
  const token = url.searchParams.get('ref') || '';
  const lang = url.searchParams.get('lang') === 'en' ? 'en' : 'es';
  const labels = copy[lang];
  let state = 'invalid', status = 404, amount = '', reference = '';
  if (/^[a-f0-9]{64}$/.test(token)) {
    try {
      const row = await env.QUOTES_DB.prepare('SELECT reference, bold_id, snapshot FROM quotes WHERE quote_key=?').bind(token).first();
      if (row) {
        if (!/^EA-[a-f0-9-]{36}$/i.test(row.reference) || !row.bold_id) throw new Error();
        reference = row.reference;
        const response = await fetch('https://integrations.api.bold.co/online/link/v1/' + encodeURIComponent(row.bold_id), {
          headers: {Authorization:'x-api-key ' + env.BOLD_API_KEY}, signal: AbortSignal.timeout(8000)
        });
        if (!response.ok) throw new Error();
        const data = await response.json();
        const link = data.payload ?? data;
        const {price} = JSON.parse(row.snapshot);
        if (link.id !== row.bold_id || (link.reference && link.reference !== reference)) throw new Error();
        if (link.status === 'PAID') {
          if (link.total == null || Math.round(Number(link.total) * 100) !== price.deposit ||
              (link.currency && link.currency !== price.currency) ||
              (link.is_sandbox && url.hostname === 'effitechai.pages.dev')) throw new Error();
          amount = new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'es-CO', {
            style:'currency', currency:price.currency, currencyDisplay:'code'
          }).format(price.deposit / 100);
          state = 'paid';
        } else if (['ACTIVE','PROCESSING'].includes(link.status)) state = 'pending';
        else if (['EXPIRED','REJECTED','CANCELLED'].includes(link.status)) state = 'closed';
        else throw new Error();
        status = 200;
      }
    } catch {
      state = 'unknown';
      status = 503;
    }
  }
  const safeToken = /^[a-f0-9]{64}$/.test(token) ? token : '';
  const address = language => '/pago?ref=' + safeToken + '&amp;lang=' + language;
  const plans = '/?lang=' + lang + '#planes';
  const contact = 'https://wa.me/' + globalThis.EFFITECH_CONFIG.whatsapp + '?text=' +
    encodeURIComponent(labels.message + ' ' + reference);
  const page = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow">
    <link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/theme-overrides.css">
    <title>${labels.title} · EffiTech AI</title></head><body><main class="receipt">
    <header><a href="${plans}">EffiTech AI</a><a href="${address(lang === 'en' ? 'es' : 'en')}">${lang === 'en' ? 'Español' : 'English'}</a></header>
    <section><span class="eyebrow">${labels.title}</span><h1>${labels[state]}</h1>
    ${reference ? `<p>${labels.reference}<br><strong>${reference}</strong></p>` : ''}
    ${state === 'paid' ? `<p>${labels.received}<br><strong class="receipt-amount">${amount}</strong></p><p>${labels.next}</p><a class="btn btn-primary" href="${contact}">${labels.contact}</a>` : ''}
    ${state === 'pending' ? `<p>${labels.wait}</p>` : ''}
    ${['unknown','closed'].includes(state) ? `<p>${labels.help}</p>` : ''}
    ${['pending','unknown'].includes(state) ? `<a class="btn btn-secondary" href="${address(lang)}">${labels.retry}</a>` : ''}
    <a class="receipt-back" href="${plans}">${labels.back}</a></section></main></body></html>`;
  return new Response(page, {status, headers:{'Content-Type':'text/html; charset=utf-8',
    'Cache-Control':'no-store', 'Referrer-Policy':'no-referrer', 'X-Robots-Tag':'noindex, nofollow'}});
}
