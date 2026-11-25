'use strict';
(() => {
  const C = window.EFFITECH_CONFIG;
  const $ = (q, root = document) => root.querySelector(q);
  const $$ = (q, root = document) => [...root.querySelectorAll(q)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const safeHttps = value => {
    try { const u = new URL(value); return u.protocol === 'https:' ? u.href : ''; }
    catch { return ''; }
  };
  let lang = 'es';
  const english = window.EFFITECH_EN || {};
  const tr = source => lang === 'en' ? (english[source] ?? source) : source;
  const staticText = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const key = node.data.trim();
    if (key && Object.hasOwn(english, key) && !node.parentElement.closest('script, noscript')) {
      staticText.push({ node, key, original: node.data });
    }
  }
  const attributes = [];
  for (const name of ['aria-label', 'placeholder', 'alt', 'content']) {
    for (const el of $$('[' + name + ']')) {
      const source = el.getAttribute(name);
      if (Object.hasOwn(english, source)) attributes.push({ el, name, source });
    }
  }
  const pageTitle = document.title;
  const liveText = new Map();
  function writeText(el, source, values = {}) {
    liveText.set(el, { source, values });
    el.textContent = tr(source).replace(/\{(\w+)\}/g, (_, key) => values[key]);
  }
  const wa = message => 'https://wa.me/' + C.whatsapp.replace(/\D/g, '') + '?text=' + encodeURIComponent(message);
  $('#year').textContent = new Date().getFullYear();

  /* Menú: respuesta inmediata, sin bloquear entradas durante transiciones. */
  const menu = $('.menu-toggle');
  const nav = $('#nav-links');
  function closeMenu() {
    nav.classList.remove('open');
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', tr('Abrir menú'));
  }
  menu.addEventListener('click', () => {
    const open = !nav.classList.contains('open');
    nav.classList.toggle('open', open);
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', tr(open ? 'Cerrar menú' : 'Abrir menú'));
  });
  $$('#nav-links a').forEach(a => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

  /* Entrada de secciones, con equivalente estático para movimiento reducido. */
  if ('IntersectionObserver' in window && !reduced.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .05 });
    document.documentElement.classList.add('reveal-ready');
    $$('.reveal').forEach(el => observer.observe(el));
  }

  /* Diálogos nativos: foco contenido, Escape y retorno al control de origen. */
  function showDialog(dialog) {
    dialog.showModal();
    document.body.classList.add('modal-open');
  }
  $$('[data-dialog]').forEach(button => button.addEventListener('click', () => showDialog($('#' + button.dataset.dialog))));
  $$('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  $$('dialog').forEach(dialog => {
    dialog.addEventListener('close', () => {
      if (!$$('dialog[open]').length) document.body.classList.remove('modal-open');
    });
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
    });
  });

  /* Demostración finita de 6 pasos. Se puede pausar y reanudar. */
  const flowNodes = $$('.flow-node');
  const flowControl = $('#flow-control');
  const flowResult = $('#flow-result');
  const flowStatus = $('#flow-status');
  const messages = [
    'Un cliente necesita información sobre tus servicios.',
    'Su mensaje llega a WhatsApp.',
    'La IA responde y entiende qué necesita.',
    'Sus datos quedan organizados en el CRM.',
    'El sistema facilita una reunión y envía recordatorios.',
    'Tu equipo recibe una oportunidad con contexto para avanzar.'
  ];
  let flowIndex = -1;
  let flowTimer = 0;
  let playing = false;
  function renderFlow() {
    flowNodes.forEach((node, index) => {
      node.classList.toggle('active', index === flowIndex);
      node.classList.toggle('done', index < flowIndex);
    });
    if (flowIndex >= 0) {
      writeText(flowResult, messages[flowIndex]);
      writeText(flowStatus, flowIndex === 5 ? 'Flujo completado: una oportunidad lista para avanzar.' : 'Paso {step} de 6 · El sistema está trabajando.', { step: flowIndex + 1 });
    }
    flowControl.setAttribute('aria-pressed', String(playing));
    $('.flow-stage').classList.toggle('is-playing', playing);
    let label = 'Ver el flujo';
    if (playing) label = 'Pausar flujo';
    else if (flowIndex === 5) label = 'Repetir flujo';
    else if (flowIndex >= 0) label = reduced.matches ? 'Siguiente paso' : 'Continuar flujo';
    writeText(flowControl, label);
  }
  function pauseFlow() {
    clearTimeout(flowTimer);
    playing = false;
    renderFlow();
  }
  function advanceFlow() {
    flowIndex++;
    renderFlow();
    if (flowIndex >= 5) { pauseFlow(); return; }
    flowTimer = setTimeout(advanceFlow, 1350);
  }
  flowControl.addEventListener('click', () => {
    if (reduced.matches) {
      flowIndex = flowIndex >= 5 ? 0 : flowIndex + 1;
      renderFlow();
      return;
    }
    if (playing) { pauseFlow(); return; }
    if (flowIndex >= 5) flowIndex = -1;
    playing = true;
    advanceFlow();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && playing) pauseFlow(); });
  reduced.addEventListener('change', () => { if (playing) pauseFlow(); });

  /* Resorte amortiguado: se retargetea desde posición y velocidad actuales. */
  const tabs = $$('[data-example]');
  const indicator = $('.tab-indicator');
  let activeTab = tabs[0];
  let position = 0, width = 0, velocity = 0, widthVelocity = 0;
  let targetPosition = 0, targetWidth = 0, animationFrame = 0, previousTime = 0;
  function drawIndicator() {
    indicator.style.transform = 'translateX(' + position + 'px)';
    indicator.style.width = width + 'px';
  }
  function springFrame(now) {
    const dt = Math.min((now - previousTime) / 1000 || .016, .032);
    previousTime = now;
    // k=280, damping=2*sqrt(k): critical damping, no decorative bounce.
    const stiffness = 280, damping = 2 * Math.sqrt(stiffness);
    velocity += (stiffness * (targetPosition - position) - damping * velocity) * dt;
    widthVelocity += (stiffness * (targetWidth - width) - damping * widthVelocity) * dt;
    position += velocity * dt;
    width += widthVelocity * dt;
    drawIndicator();
    if (Math.abs(targetPosition - position) < .1 && Math.abs(targetWidth - width) < .1 && Math.abs(velocity) < .1 && Math.abs(widthVelocity) < .1) {
      position = targetPosition; width = targetWidth; velocity = 0; widthVelocity = 0;
      drawIndicator(); animationFrame = 0;
    } else animationFrame = requestAnimationFrame(springFrame);
  }
  function moveIndicator(immediate = false) {
    targetPosition = activeTab.offsetLeft;
    targetWidth = activeTab.offsetWidth;
    if (immediate || reduced.matches) {
      cancelAnimationFrame(animationFrame); animationFrame = 0;
      position = targetPosition; width = targetWidth; velocity = 0; widthVelocity = 0;
      drawIndicator();
    } else if (!animationFrame) {
      previousTime = performance.now(); animationFrame = requestAnimationFrame(springFrame);
    }
  }
  function selectTab(tab, focus = false) {
    activeTab = tab;
    tabs.forEach(item => {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
      $('#' + item.getAttribute('aria-controls')).hidden = !selected;
    });
    moveIndicator();
    if (focus) tab.focus();
    track('example_view', { example: tab.dataset.example });
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); selectTab(tabs[next], true); }
    });
  });
  moveIndicator(true);
  if ('ResizeObserver' in window) new ResizeObserver(() => moveIndicator(true)).observe($('.tabs'));
  else window.addEventListener('resize', () => moveIndicator(true));
  reduced.addEventListener('change', () => moveIndicator(true));

  /* URLs reales de contacto y calendario opcional. */
  const booking = safeHttps(C.bookingUrl);
  function renderContactLinks() {
    $$('[data-whatsapp]').forEach(link => {
      link.href = wa(tr('Hola EffiTech AI, quiero descubrir qué puedo automatizar en mi negocio.'));
    });
    $$('[data-booking]').forEach(link => {
      link.href = booking || wa(tr('Quiero coordinar una reunión inicial gratuita. ¿Qué horarios tienen disponibles?'));
    });
    writeText($('#booking-note'), booking ? 'Elige un horario disponible en nuestro calendario.' : 'Coordinamos el horario contigo por WhatsApp.');
  }
  $$('[data-whatsapp]').forEach(link => link.addEventListener('click', () => track('whatsapp_click')));
  $$('[data-booking]').forEach(link => link.addEventListener('click', () => track('booking_click', { channel: booking ? 'calendar' : 'whatsapp' })));
  $$('[data-social]').forEach(button => button.addEventListener('click', () => {
    const url = safeHttps(button.dataset.social === 'linkedin' ? C.linkedinUrl : C.instagramUrl);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
    else showDialog($('#social-dialog'));
  }));

  /* Analítica preparada. Proveedores externos solo con consentimiento. */
  let analyticsConsent = false;
  let analyticsStarted = false;
  try { analyticsConsent = localStorage.getItem('effitech_ai_analytics') === 'yes'; } catch {}
  function startAnalytics() {
    if (!analyticsConsent || analyticsStarted) return;
    analyticsStarted = true;
    if (/^G-[A-Z0-9]+$/.test(C.gaId)) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
      window.gtag('js', new Date());
      window.gtag('config', C.gaId);
      const script = document.createElement('script');
      script.async = true; script.src = 'https://www.googletagmanager.com/gtag/js?id=' + C.gaId;
      document.head.append(script);
    }
    if (/^\d+$/.test(C.metaPixelId)) {
      const fbq = function () { if (fbq.callMethod) fbq.callMethod.apply(fbq, arguments); else fbq.queue.push(arguments); };
      fbq.queue = []; fbq.loaded = true; fbq.version = '2.0'; fbq.push = fbq;
      window.fbq = window._fbq = fbq;
      const script = document.createElement('script');
      script.async = true; script.src = 'https://connect.facebook.net/en_US/fbevents.js';
      document.head.append(script);
      fbq('consent', 'grant'); fbq('init', C.metaPixelId); fbq('track', 'PageView');
    }
  }
  function track(name, properties = {}) {
    if (!analyticsConsent) return;
    if (typeof window.gtag === 'function') window.gtag('event', name, properties);
    if (typeof window.fbq === 'function') window.fbq('trackCustom', name, properties);
    document.dispatchEvent(new CustomEvent('effitech-ai:analytics', { detail: { event: name, ...properties } }));
  }
  $$('[data-consent]').forEach(button => button.addEventListener('click', () => {
    analyticsConsent = button.dataset.consent === 'yes';
    try { localStorage.setItem('effitech_ai_analytics', analyticsConsent ? 'yes' : 'no'); } catch {}
    if (analyticsConsent) {
      if (typeof window.gtag === 'function') window.gtag('consent', 'update', { analytics_storage: 'granted' });
      if (typeof window.fbq === 'function') window.fbq('consent', 'grant');
      startAnalytics();
    } else {
      if (typeof window.gtag === 'function') window.gtag('consent', 'update', { analytics_storage: 'denied' });
      if (typeof window.fbq === 'function') window.fbq('consent', 'revoke');
    }
    $('#analytics-dialog').close();
  }));
  startAnalytics();
  $$('[data-track]').forEach(link => link.addEventListener('click', () => track('cta_click', { placement: link.dataset.track })));

  /* Auditoría: validación inline, envío manual honesto o backend configurable. */
  const form = $('#audit-form');
  const status = $('#form-status');
  const submit = $('#submit-button');
  const endpoint = safeHttps(C.formEndpoint);
  let requestId = '', submitting = false;
  if (endpoint) {
    writeText($('#delivery-note'), 'Enviaremos tu solicitud directamente a EffiTech AI.');
    // El responsable debe actualizar la política al conectar un backend real.
    const privacy = $('#privacy-dialog');
    writeText(privacy.querySelectorAll('p')[1], 'Al enviar el formulario, tus datos se transmiten a EffiTech AI para atender tu solicitud. Puedes solicitar información sobre su tratamiento en nuestro correo de contacto.');
  }
  const planIntakeForm = $('#plan-intake-form');
  $$('[data-plan]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    planIntakeForm.reset();
    for (const field of planIntakeForm.querySelectorAll('[aria-invalid]')) {
      field.setCustomValidity('');
      field.removeAttribute('aria-invalid');
    }
    planIntakeForm.elements.plan.value = link.dataset.plan;
    track('plan_select', { plan: link.dataset.plan });
    showDialog($('#plan-intake-dialog'));
  }));
  function validateField(input) {
    input.setCustomValidity('');
    const value = input.value.trim();
    let message = '';
    if (input.validity.valueMissing && input.type === 'checkbox') message = 'Autoriza el contacto para enviar la solicitud.';
    else if (input.required && !value) message = 'Completa este campo.';
    else if (input.id === 'phone' && !/^\+?\d{8,15}$/.test(value.replace(/[\s().-]/g, ''))) message = 'Incluye un número válido con código de país.';
    else if (input.type === 'email' && input.validity.typeMismatch) message = 'Revisa el formato de tu correo.';
    else if (input.minLength > 0 && value.length < input.minLength) message = 'Escribe al menos 10 caracteres.';
    else if (input.name === 'hours' && !input.validity.valid) message = 'Introduce un número entre 1 y 80.';
    input.setCustomValidity(tr(message));
    input.setAttribute('aria-invalid', String(!!message));
    const error = input.id && document.getElementById(input.id + '-error');
    if (error) { error.textContent = tr(message); input.setAttribute('aria-describedby', error.id); }
    return input.validity.valid;
  }
  for (const field of $$('form input, form textarea, form select')) {
    field.addEventListener('invalid', () => validateField(field));
    field.addEventListener('input', () => {
      if (field.getAttribute('aria-invalid') === 'true') validateField(field);
    });
  }
  const inputs = $$('.fields input, .fields textarea');
  inputs.forEach(input => {
    input.addEventListener('blur', () => validateField(input));
    input.addEventListener('input', () => {
      requestId = '';
      if (input.getAttribute('aria-invalid') === 'true') validateField(input);
    });
  });
  function prepareRequest(values) {
    const lines = [
      tr('SOLICITUD DE AUDITORÍA GRATUITA') + ' — EffiTech AI', '',
      tr('Nombre') + ': ' + values.name, tr('Empresa') + ': ' + values.company,
      'WhatsApp: ' + values.phone, 'Email: ' + values.email
    ];
    lines.push('', tr('Proceso que quiero automatizar') + ':', values.process, '', tr('Autorizo a EffiTech AI a contactarme para atender esta solicitud.'));
    openRequest(tr('Auditoría gratuita') + ' — ' + values.company, lines.join('\n'));
    writeText(status, 'Solicitud preparada. Elige un canal y confirma el envío allí.');
    track('audit_prepared', { plan: 'unspecified' });
  }
  function openRequest(subject, message) {
    $('#request-preview').textContent = message;
    $('#request-mail').href = 'mailto:' + C.email + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(message);
    $('#request-gmail').href = 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(C.email) + '&su=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(message);
    $('#request-wa').href = wa(message);
    writeText($('#copy-status'), '');
    showDialog($('#request-dialog'));
  }
  $('#copy-request').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('#request-preview').textContent); writeText($('#copy-status'), 'Solicitud copiada.'); }
    catch { writeText($('#copy-status'), 'No pudimos copiarla. Selecciona el texto de la solicitud y cópialo manualmente.'); }
  });
  ['request-mail', 'request-gmail', 'request-wa'].forEach(id => $('#' + id).addEventListener('click', () => {
    track('audit_channel_open', { channel: id });
    writeText($('#copy-status'), 'Completa el envío en el servicio que abriste. Esta página no puede confirmar su recepción.');
  }));
  planIntakeForm.addEventListener('submit', event => {
    event.preventDefault();
    const fields = [...planIntakeForm.elements].filter(field => field.required);
    if (!fields.map(validateField).every(Boolean)) { planIntakeForm.reportValidity(); return; }
    const values = new FormData(planIntakeForm);
    const field = key => values.get(key).trim();
    const lines = [
      tr('SOLICITUD DE PROPUESTA') + ' — EffiTech AI', '',
      tr('Plan de interés') + ': ' + field('plan'), tr('Nombre') + ': ' + field('name'),
      tr('Empresa') + ': ' + field('company'), 'Email: ' + field('email'),
      tr('Objetivo') + ': ' + field('goal'), tr('Herramientas') + ': ' + (field('tools') || tr('Sin especificar')),
      tr('Plazo') + ': ' + tr(field('timing')), '', tr('Autorizo a EffiTech AI a contactarme para preparar una propuesta.')
    ];
    $('#plan-intake-dialog').close();
    openRequest(tr('Propuesta') + ' ' + field('plan') + ' — ' + field('company'), lines.join('\n'));
    track('plan_intake_complete', { plan: field('plan') });
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submitting) return;
    const valid = inputs.map(validateField).every(Boolean);
    if (!valid || !form.reportValidity()) return;
    const values = new FormData(form);
    if (values.get('website')) return;
    const payload = {
      name: values.get('name').trim(), company: values.get('company').trim(),
      phone: values.get('phone').trim(), email: values.get('email').trim(),
      process: values.get('process').trim(), consent: true,
      plan: null, source: 'effitech_ai_website'
    };
    if (!endpoint) { prepareRequest(payload); return; }
    if (!requestId) requestId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
    payload.requestId = requestId;
    payload.submittedAt = new Date().toISOString();
    submitting = true; submit.disabled = true; writeText(submit, 'Enviando solicitud…');
    writeText(status, 'Estamos enviando tu solicitud.');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: controller.signal, credentials: 'omit' });
      if (!response.ok) throw new Error('server');
      const result = await response.json();
      if (result.ok !== true) throw new Error('unconfirmed');
      writeText(status, 'Solicitud recibida. Te contactaremos para conocer mejor tu negocio.');
      track('generate_lead', { form: 'audit', plan: 'unspecified' });
      form.reset(); requestId = '';
    } catch {
      writeText(status, 'No pudimos confirmar la recepción. Conservamos tus datos para que puedas reintentar.');
    } finally {
      clearTimeout(timeout); submitting = false; submit.disabled = false;
      writeText(submit, 'Solicitar auditoría gratuita');
    }
  });
  /* Microinteracciones adicionales: parallax sutil y métricas al entrar en pantalla. */
  const visual = $('[data-parallax]');
  if (visual && !reduced.matches) {
    let ticking = false;
    const parallax = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const rect = visual.getBoundingClientRect();
          const offset = Math.max(-10, Math.min(10, (window.innerHeight / 2 - (rect.top + rect.height / 2)) * .025));
          visual.style.setProperty('--parallax-y', offset + 'px'); ticking = false;
        }); ticking = true;
      }
    };
    window.addEventListener('scroll', parallax, { passive: true }); parallax();
  }
  const counters = $$('.metric strong[data-count]');
  if ('IntersectionObserver' in window && !reduced.matches) {
    const counterObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting || entry.target.dataset.done) return;
      entry.target.dataset.done = 'true';
      const target = Number(entry.target.dataset.count), suffix = entry.target.dataset.suffix || '';
      let start = 0, started = performance.now();
      const tick = now => { const progress = Math.min(1, (now - started) / 750); start = Math.round(target * (1 - Math.pow(1 - progress, 3))); entry.target.textContent = start + tr(suffix); if (progress < 1) requestAnimationFrame(tick); else entry.target.classList.add('counted'); };
      requestAnimationFrame(tick);
    }), { threshold: .65 });
    counters.forEach(counter => counterObserver.observe(counter));
  }
  const calculatorForm = $('#calculator-form');
  calculatorForm.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(calculatorForm);
    const hours = Math.round(Number(data.get('hours')) * 0.65);
    writeText($('#calculator-result-title'), 'Ejemplo: {hours} h libres por semana.', { hours });
    writeText($('#calculator-result-copy'), 'Calculamos el 65 % de las horas que indicaste y redondeamos al entero más cercano. El ahorro real depende de las tareas que puedan automatizarse.');
    const result = $('#calculator-result');
    result.hidden = false;
    result.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'nearest' });
    track('calculator_complete', { industry: data.get('industry') });
  });

  function renderPrices() {
    const prices = C.prices[lang];
    const formatter = new Intl.NumberFormat(lang === 'es' ? 'es-CO' : 'en-US');
    for (const el of $$('[data-price]')) {
      const plan = el.dataset.price;
      const amounts = prices[plan].map(value => formatter.format(value));
      const currency = lang === 'es' ? 'COP ' : 'US$';
      const prefix = amounts.length === 1 ? tr('Desde') + ' ' : '';
      el.textContent = prefix + currency + amounts.join('–') + (plan === 'maintenance' ? tr('/mes') : '');
    }
  }
  function applyLanguage(next) {
    lang = next;
    document.documentElement.lang = lang;
    document.title = tr(pageTitle);
    const canonical = $(lang === 'es' ? 'link[hreflang="x-default"]' : 'link[hreflang="en"]').href;
    $('link[rel="canonical"]').href = canonical;
    $('[property="og:url"]').content = canonical;
    for (const { node, key, original } of staticText) {
      if (node.isConnected) node.data = original.replace(key, () => tr(key));
    }
    for (const { el, name, source } of attributes) el.setAttribute(name, tr(source));
    for (const [el, item] of liveText) writeText(el, item.source, item.values);
    $('.language-toggle').setAttribute('aria-label', lang === 'es' ? 'Switch to English' : 'Cambiar a español');
    menu.setAttribute('aria-label', tr(nav.classList.contains('open') ? 'Cerrar menú' : 'Abrir menú'));
    for (const el of $$('[data-policy]')) {
      const file = el.getAttribute('href').split('#')[0];
      el.setAttribute('href', file + '#' + lang);
    }
    for (const el of counters) el.textContent = el.dataset.count + tr(el.dataset.suffix);
    for (const field of $$('form [aria-invalid="true"]')) validateField(field);
    document.querySelector('[property="og:locale"]').content = lang === 'es' ? 'es_CO' : 'en_US';
    renderPrices();
    renderContactLinks();
    moveIndicator(true);
    try { localStorage.setItem('meloia_lang', lang); } catch {}
  }
  const queryLang = new URL(location.href).searchParams.get('lang');
  let saved;
  try { saved = localStorage.getItem('meloia_lang'); } catch {}
  applyLanguage(['en', 'es'].includes(queryLang) ? queryLang : saved === 'en' ? 'en' : 'es');
  $('.language-toggle').addEventListener('click', () => {
    applyLanguage(lang === 'es' ? 'en' : 'es');
    const url = new URL(location.href);
    url.searchParams.set('lang', lang);
    if (url.protocol !== 'file:') history.replaceState(null, '', url);
  });
  // Only expose personal-data fields once all three submit handlers are installed.
  for (const readyForm of [form, calculatorForm, planIntakeForm]) {
    const fields = readyForm.querySelector('.form-fields');
    fields.disabled = false;
    fields.hidden = false;
    readyForm.querySelector('.form-fallback').hidden = true;
  }
  /* Pulido de navegación y profundidad en escritorio. */
  const header = $('.header');
  if (header) { const syncHeader = () => header.classList.toggle('scrolled', window.scrollY > 24); window.addEventListener('scroll', syncHeader, { passive: true }); syncHeader(); }
  if (!reduced.matches && window.matchMedia('(pointer:fine)').matches) {
    const spotlight = document.createElement('div'); spotlight.className = 'cursor-spotlight'; document.body.append(spotlight);
    window.addEventListener('pointermove', event => { spotlight.style.setProperty('--x', event.clientX + 'px'); spotlight.style.setProperty('--y', event.clientY + 'px'); }, { passive: true });
  }
})();


