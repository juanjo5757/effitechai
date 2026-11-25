// Legal documents and the 404 page can also be read directly from a saved file.
(() => {
  const render = () => {
    const url = new URL(location.href);
    let saved;
    try { saved = localStorage.getItem('meloia_lang'); } catch {}
    const lang = [url.hash.slice(1), url.searchParams.get('lang'), saved].find(value => value === 'es' || value === 'en') || 'es';
    document.documentElement.lang = lang;
    document.documentElement.dataset.documentLanguage = lang;
    for (const article of document.querySelectorAll('article[lang]')) {
      article.hidden = article.lang !== lang;
      if (!article.hidden) document.title = article.querySelector('h1').textContent + ' · EffiTech AI';
    }
    try { localStorage.setItem('meloia_lang', lang); } catch {}
  };
  render();
  window.addEventListener('hashchange', render);
})();
