/* DEGNA — mesure d'audience sans cookie.
   Envoie au serveur DEGNA : l'événement (vue, clic « Précommander », inscription, commande), la page,
   la langue, la source publicitaire (utm) et le domaine d'arrivée. Aucun cookie, aucun identifiant,
   aucune adresse IP conservée. La source d'une publicité est gardée le temps de l'onglet (sessionStorage)
   pour savoir quelle publicité a mené à une précommande. */
(function () {
  var URL_MESURE = 'https://degna.cartelcustomer.workers.dev/mesure';
  if (navigator.webdriver || !navigator.sendBeacon || /^(localhost|127\.)/.test(location.hostname)) return;
  var q = new URLSearchParams(location.search), src = {};
  try {
    if (q.get('utm_source')) {
      src = { source: q.get('utm_source'), campagne: q.get('utm_campaign') || '', contenu: q.get('utm_content') || '' };
      sessionStorage.setItem('degna_src', JSON.stringify(src));
    } else { src = JSON.parse(sessionStorage.getItem('degna_src') || '{}'); }
  } catch (e) { src = {}; }
  var ref = '';
  try { if (document.referrer) { var h = new URL(document.referrer).hostname; if (h !== location.hostname) ref = h.replace(/^www\./, ''); } } catch (e) {}
  function envoyer(evt) {
    var corps = { evt: evt, page: location.pathname, langue: document.documentElement.lang.slice(0, 2),
                  source: src.source || '', campagne: src.campagne || '', contenu: src.contenu || '', ref: ref };
    try { navigator.sendBeacon(URL_MESURE, new Blob([JSON.stringify(corps)], { type: 'text/plain' })); } catch (e) {}
  }
  envoyer(q.get('order') === 'complete' ? 'commande' : 'vue');
  // Accueil : la première fois qu'un bloc entre à l'écran (vu-<bloc>), et chaque clic de tuile (clic-<nom>).
  if ('IntersectionObserver' in window) {
    var vus = {}, obs = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var n = e.target.getAttribute('data-bloc');
        if (e.isIntersecting && !vus[n]) { vus[n] = 1; envoyer('vu-' + n); obs.unobserve(e.target); }
      });
    }, { threshold: 0.35 });
    [].forEach.call(document.querySelectorAll('[data-bloc]'), function (el) { obs.observe(el); });
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-clic]');
    if (t) envoyer('clic-' + t.getAttribute('data-clic'));
  }, true);
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (f.matches('form[data-buy]') && f.querySelector('input[name="size"]:checked, input[type="radio"]:checked')) envoyer('clic_precommande');
    else if (f.matches('form[data-liste], form[data-coloris]')) envoyer('inscription');
  }, true);
})();
