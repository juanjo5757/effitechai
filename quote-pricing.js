// Shared by the browser and Pages Functions. Amounts used for settlement are in minor units.
globalThis.EFFITECH_PRICING = Object.freeze({
  calculate(q) {
    const config = globalThis.EFFITECH_CONFIG;
    const prices = config.prices[q.lang];
    const [base, ceiling] = prices[q.plan];
    const step = ceiling ? (ceiling - base) / 4 : base * 0.1;
    const connections = q.connections * step;
    const rules = q.rules * step;
    const setup = base + connections + rules;
    const [min, max] = prices.maintenance;
    const maintenance = [0, min, (min + max) / 2, max][q.support];
    const cents = n => Math.round((n + Number.EPSILON) * 100);
    let once = cents(q.other), licenses = 0, usage = 0;
    for (const item of q.tools) {
      once += cents(item.setup);
      licenses += cents(item.seats * item.license);
      usage += cents(item.units * item.rate);
    }
    const standardFee = cents(maintenance);
    const discounts = config.maintenanceDiscounts;
    const advancedSaving = q.support === 3 ? Math.round(standardFee * discounts.advancedPercent / 100) : 0;
    const term = discounts.terms.filter(t => q.months >= t.months).at(-1);
    const termSaving = Math.round((standardFee - advancedSaving) * (term?.percent || 0) / 100);
    const monthly = licenses + usage + standardFee - advancedSaving - termSaving;
    const total = cents(setup) + once + q.months * monthly;
    return { base, connections, rules, setup, maintenance, once, licenses, usage, advancedSaving, termSaving,
      monthly, total, deposit: Math.round(cents(setup) / 2), currency: q.lang === 'es' ? 'COP' : 'USD' };
  }
});
