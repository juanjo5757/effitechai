/* Configuración pública. Nunca incluyas contraseñas o claves privadas aquí. */
globalThis.EFFITECH_CONFIG = Object.freeze({
  maintenanceDiscounts: {
    advancedPercent: 10,
    terms: [
      { months: 3, percent: 5 },
      { months: 6, percent: 8 },
      { months: 12, percent: 12 }
    ]
  },
  prices: {
    es: { starter: [1260000, 2520000], growth: [3360000, 6300000], ai: [8400000], maintenance: [420000, 2100000] },
    en: { starter: [300, 600], growth: [800, 1500], ai: [2000], maintenance: [100, 500] }
  },
  whatsapp: '573176867192',
  email: 'meloia0412@gmail.com',
  bookingUrl: 'https://calendly.com/meloia0412/30min', // Evento configurado por EffiTech AI para diagnóstico de 20 minutos.
  formEndpoint: '', // Fase 2: añadir un endpoint HTTPS cuando exista backend o automatizador.
  instagramUrl: '',
  linkedinUrl: '',
  gaId: '',
  metaPixelId: ''
});

