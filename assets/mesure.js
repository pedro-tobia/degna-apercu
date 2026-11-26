/* DEGNA — mesure d'audience v2, sans cookie et sans donnée personnelle.

   Ce qui change par rapport à la v1 :
   · un identifiant de VISITE (aléatoire, le temps de l'onglet) : sans lui on compte des pages, pas des clientes ;
   · le pays et le type d'appareil (le pays est ajouté par le serveur, jamais l'adresse IP) ;
   · la profondeur de lecture, le temps passé, et la position des clics (carte des clics) ;
   · l'ajout au panier, enfin mesuré : panier.js appelle window.degnaMesure (voir panier.js.md) ;
   · `?order=complete` ne compte PLUS une commande. Il envoie `retour_paiement` ;
   · le clic d'une annonce Google (gclid) est gardé pour la commande, jamais pour la mesure (2026-11-25).
     Une vente, c'est Stripe, et rien d'autre.

   Toujours : aucun cookie, aucun identifiant qui survit à la visite, aucune adresse IP,
   aucun texte saisi, aucun contenu de page. Rien ne permet de reconnaître une personne. */
(function () {
  var URL_MESURE = 'https://degna.cartelcustomer.workers.dev/mesure';
  if (navigator.webdriver || !navigator.sendBeacon || /^(localhost|127\.)/.test(location.hostname)) return;

  function jeton() {
    return (Date.now().toString(36) + Math.random().toString(36).slice(2, 10)).slice(-14);
  }

  /* Identifiant de visite : vit le temps de l'onglet (sessionStorage, pas un cookie),
     disparaît quand l'onglet se ferme, et n'est jamais relié à une personne ni à une visite suivante. */
  var vid;
  try {
    vid = sessionStorage.getItem('degna_vid');
    if (!vid) { vid = jeton(); sessionStorage.setItem('degna_vid', vid); }
  } catch (e) { vid = jeton(); }
  var pid = jeton();               // identifiant de CETTE vue de page

  var q = new URLSearchParams(location.search), src = {};
  /* La source d'une publicité est gardée le temps de l'onglet : panier.js la joint à la commande,
     le serveur l'écrit dans Stripe (2026-11-19). Sans elle, le jour d'une vente, on saurait qu'on
     a vendu, jamais grâce à quoi.
     Le clic d'une annonce Google (2026-11-25) : Google ajoute lui-même `gclid` (ou `gbraid`/`wbraid`
     sur iPhone) à l'adresse, sans utm. Gardé comme l'utm, il part avec la commande dans Stripe : c'est
     ce qui permettra de dire à Google Ads « ce clic a acheté ». Il n'est **jamais** envoyé à la mesure
     d'audience : seule une commande le porte. */
  var clic = null;
  ['gclid', 'gbraid', 'wbraid'].some(function (k) { var v = q.get(k); if (v) { clic = { type: k, valeur: v }; } return !!v; });
  try {
    if (q.get('utm_source') || clic) {
      src = { source: q.get('utm_source') || 'google', campagne: q.get('utm_campaign') || (q.get('utm_source') ? '' : 'ads'),
              contenu: q.get('utm_content') || '' };
      if (clic) src.clic = clic;
      sessionStorage.setItem('degna_src', JSON.stringify(src));
    } else { src = JSON.parse(sessionStorage.getItem('degna_src') || '{}'); }
  } catch (e) { src = {}; }

  var ref = '';
  try {
    if (document.referrer) {
      var h = new URL(document.referrer).hostname;
      if (h !== location.hostname) ref = h.replace(/^www\./, '');
    }
  } catch (e) {}

  /* Appareil : une classe, jamais la chaîne du navigateur (qui, elle, sert à reconnaître quelqu'un). */
  var cote = Math.min(screen.width || 0, screen.height || 0);
  var appareil = !cote ? '' : cote < 700 ? 'mobile' : cote < 1100 ? 'tablette' : 'ordinateur';

  function envoyer(evt, extra) {
    var corps = {
      evt: evt, page: location.pathname, langue: (document.documentElement.lang || '').slice(0, 2),
      source: src.source || '', campagne: src.campagne || '', contenu: src.contenu || '',
      ref: ref, vid: vid, pid: pid, appareil: appareil
    };
    if (extra) for (var k in extra) if (extra[k] !== undefined && extra[k] !== null) corps[k] = extra[k];
    try { navigator.sendBeacon(URL_MESURE, new Blob([JSON.stringify(corps)], { type: 'text/plain' })); } catch (e) {}
  }
  window.degnaMesure = envoyer;     // panier.js passe par ici : un seul chemin d'envoi

  envoyer('vue');
  /* Retour depuis Stripe. Ce n'est PAS une vente : seul Stripe sait si c'est payé. */
  if (q.get('order') === 'complete') envoyer('retour_paiement');

  /* --- Jusqu'où elle descend : 25, 50, 75, 100 % de la page, une fois chacun. */
  var paliers = [25, 50, 75, 100], atteints = {}, enAttente = false;
  function mesurerDefilement() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    var p = h > 20 ? Math.round((window.scrollY / h) * 100) : 100;
    for (var i = 0; i < paliers.length; i++) {
      if (p >= paliers[i] && !atteints[paliers[i]]) {
        atteints[paliers[i]] = 1;
        envoyer('defilement', { valeur: paliers[i] });
      }
    }
  }
  addEventListener('scroll', function () {
    if (enAttente) return;
    enAttente = true;
    setTimeout(function () { enAttente = false; mesurerDefilement(); }, 400);
  }, { passive: true });
  mesurerDefilement();

  /* --- Blocs de la page : comptés la première fois qu'ils entrent à l'écran. */
  if ('IntersectionObserver' in window) {
    var vus = {}, obs = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var n = e.target.getAttribute('data-bloc');
        if (e.isIntersecting && !vus[n]) { vus[n] = 1; envoyer('vu-' + n); obs.unobserve(e.target); }
      });
    }, { threshold: 0.35 });
    [].forEach.call(document.querySelectorAll('[data-bloc]'), function (el) { obs.observe(el); });
  }

  /* --- Clics : quel élément, et où sur la page (en % : la carte des clics marche à toute largeur).
         Un clic hors élément nommé est gardé aussi — c'est lui qui révèle ce qu'on croit
         cliquable et qui ne l'est pas. Au plus 25 par vue de page, pour ne pas inonder la base.
         Le sélecteur ne contient que des noms de balises : jamais de texte saisi. */
  function chemin(el) {
    var bouts = [];
    for (var i = 0; el && el.nodeType === 1 && i < 4; i++) {
      var n = el.nodeName.toLowerCase();
      if (el.id) { bouts.unshift(n + '#' + el.id.slice(0, 20)); break; }
      var c = (el.className && typeof el.className === 'string') ? el.className.trim().split(/\s+/)[0] : '';
      bouts.unshift(c ? n + '.' + c.slice(0, 20) : n);
      el = el.parentElement;
    }
    return bouts.join('>').slice(0, 80);
  }
  var clicsLibres = 0;
  document.addEventListener('click', function (e) {
    var doc = document.documentElement;
    var pos = {
      x: Math.round((e.pageX / Math.max(doc.scrollWidth, 1)) * 1000) / 10,
      y: Math.round((e.pageY / Math.max(doc.scrollHeight, 1)) * 1000) / 10
    };
    var t = e.target.closest && e.target.closest('[data-clic]');
    if (t) { envoyer('clic-' + t.getAttribute('data-clic'), pos); return; }
    if (clicsLibres++ < 25) { pos.detail = chemin(e.target); envoyer('clic_vide', pos); }
  }, true);

  /* --- Liste d'attente (le panier, lui, passe par window.degnaMesure depuis panier.js). */
  document.addEventListener('submit', function (e) {
    if (e.target.matches && e.target.matches('form[data-liste], form[data-coloris]')) envoyer('inscription');
  }, true);

  /* --- Temps passé sur la page, envoyé une seule fois au départ. */
  var debut = Date.now(), parti = false;
  function partir() {
    if (parti) return;
    parti = true;
    envoyer('temps', { valeur: Math.min(Math.round((Date.now() - debut) / 1000), 3600) });
  }
  addEventListener('pagehide', partir);
  addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') partir(); });
})();
