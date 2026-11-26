/* DEGNA — panier (Pedro, 2026-11-15 : « ajouter au panier », le panier accessible en tout temps).
   Le panier vit dans le navigateur (localStorage, rien de personnel : pièce, couleur, taille). Le sac de l'en-tête
   l'ouvre sur toutes les pages ; « Passer au paiement » envoie la liste au serveur DEGNA (/panier), qui recalcule
   prix et noms et ouvre UN paiement Stripe pour tout. Aucun plafond maison (Pedro : toute la collection dans toutes les couleurs) ; 100 lignes = la limite de Stripe. */
(function () {
  var MAX = 100, CLE = 'degna-panier';
  var tiroir = document.getElementById('panier'); if (!tiroir) return;
  var CAT = JSON.parse(tiroir.dataset.catalogue || '{}'), T = JSON.parse(tiroir.dataset.textes || '{}');
  var lang = tiroir.dataset.langue || 'en';
  var liste = tiroir.querySelector('.panier__liste'), total = tiroir.querySelector('[data-panier-total]'), etat = tiroir.querySelector('.panier__etat');
  var dernier = null;

  function lire() { try { return JSON.parse(localStorage.getItem(CLE) || '[]').filter(function (a) { return CAT[a.piece]; }); } catch (e) { return []; } }
  function ecrire(a) { try { localStorage.setItem(CLE, JSON.stringify(a)); } catch (e) {} afficher(); }
  function prix(n) { return lang === 'fr' ? n + ' $ US' : lang === 'es' ? n + ' US$' : '$' + n; }
  function texte(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  function afficher() {
    var a = lire(), somme = 0;
    liste.innerHTML = a.map(function (x, i) {
      var c = CAT[x.piece]; somme += c.prix;
      return '<li class="panier__article"><a href="' + c.url + (x.couleur === 'noir' ? '' : '#' + x.couleur) + '"><img src="' + (c.img[x.couleur] || '') + '" alt="" width="76" height="101"></a>' +
             '<div><a href="' + c.url + (x.couleur === 'noir' ? '' : '#' + x.couleur) + '">' + texte(c.nom) + '</a><small>' + texte((T.couleurs || {})[x.couleur] || '') +
             ' · ' + texte(T.panier_taille) + ' ' + texte(x.taille) + '</small><button type="button" class="panier__retirer" data-retirer="' + i + '">' + texte(T.panier_retirer) + '</button></div>' +
             '<b>' + prix(c.prix) + '</b></li>';
    }).join('');
    total.textContent = prix(somme);
    tiroir.classList.toggle('panier--vide', !a.length);
    [].forEach.call(document.querySelectorAll('[data-panier-n]'), function (n) { n.textContent = a.length; n.hidden = !a.length; });
  }

  /* --- La livraison du pays de la visiteuse -------------------------------------------------
     La page est statique : elle ne sait pas d'où on la lit. Le Worker, lui, est sur Cloudflare et
     reçoit le pays avec la requête. On le lui demande une seule fois, à la première ouverture du
     panier — pas au chargement de la page : la plupart des visites n'ouvrent jamais le panier, et
     une requête qui ne sert à rien reste une requête.

     Si quoi que ce soit échoue — Worker muet, pays inconnu, navigateur sans Intl.DisplayNames —
     **on ne touche à rien** : la note générale écrite dans la page reste affichée. Mieux vaut une
     phrase vraie pour tout le monde qu'une phrase à trou pour une seule. */
  var zoneDemandee = false;
  var note = tiroir.querySelector('.panier__note');
  var fiche = document.querySelector('[data-zone-fiche]');

  function nomDuPays(code) {
    try { return new Intl.DisplayNames([lang], { type: 'region' }).of(code) || null; }
    catch (e) { return null; }
  }

  /* La phrase est écrite en deux morceaux : le pays et son prix en gras, puis la fin propre au
     moment. Sur la fiche on parle d'échange — elle se demande si elle la prend. Dans le panier on
     parle de taxes — elle se demande le total. Le nom du pays passe par textContent, jamais par
     innerHTML : il vient d'une table du navigateur, mais on ne construit pas de HTML avec une
     donnée qu'on n'a pas écrite soi-même. */
  function poserLaPhrase(ou, debut, fin) {
    if (!ou) return;
    ou.textContent = '';
    var b = document.createElement('b');
    b.textContent = debut;
    ou.appendChild(b);
    if (fin) { ou.appendChild(document.createTextNode(' ' + fin)); }
  }

  function direLaLivraison() {
    if (zoneDemandee || (!note && !fiche) || !tiroir.dataset.zone) return;
    zoneDemandee = true;
    fetch(tiroir.dataset.zone, { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !d.ok || !d.pays) return;
        var pays = nomDuPays(d.pays);
        if (!pays) return;
        var modele = !d.desservi ? T.zone_hors
                   : d.droits_compris ? T.zone_offerte
                   : T.zone_payante;
        if (!modele) return;
        var debut = modele.replace('{pays}', pays).replace('{prix}', prix(d.prix));
        poserLaPhrase(note, debut, T.zone_fin_panier);
        poserLaPhrase(fiche, debut, T.zone_fin_fiche);
      })
      .catch(function () {});
  }

  /* Sur une fiche produit la phrase est visible tout de suite : on demande au chargement.
     Ailleurs, on attend l'ouverture du panier — la plupart des visites ne l'ouvrent jamais. */
  if (fiche) direLaLivraison();

  function ouvrir() {
    dernier = document.activeElement; etat.textContent = '';
    direLaLivraison();
    tiroir.hidden = false; document.documentElement.classList.add('panier-ouvert');
    window.degnaMesure && window.degnaMesure('panier_ouvert', { valeur: lire().length });
    [].forEach.call(document.querySelectorAll('[data-panier-ouvrir]'), function (b) { b.setAttribute('aria-expanded', 'true'); });
    var x = tiroir.querySelector('.panier__x'); if (x) x.focus();
  }
  function fermer() {
    tiroir.hidden = true; document.documentElement.classList.remove('panier-ouvert');
    [].forEach.call(document.querySelectorAll('[data-panier-ouvrir]'), function (b) { b.setAttribute('aria-expanded', 'false'); });
    if (dernier && dernier.focus) dernier.focus();
    if (location.hash === '#panier' && history.replaceState) history.replaceState(null, '', location.pathname + location.search);
  }

  /* Ajoute des pièces ; renvoie un message d'erreur, ou rien si tout va bien. */
  function ajouter(articles) {
    var a = lire();
    if (a.length + articles.length > MAX) return T.panier_max;
    ecrire(a.concat(articles)); ouvrir();
    /* Mesure v2 : panier.js appelle la mesure directement, au lieu de compter sur l'ordre des écouteurs
       (jusqu'au 2026-11-25, l'ajout au panier n'était compté nulle part : l'événement était coupé ici). */
    articles.forEach(function (x) {
      window.degnaMesure && window.degnaMesure('panier_ajout', {
        valeur: (CAT[x.piece] || {}).prix || 0,
        detail: x.piece + '|' + x.couleur + '|' + x.taille
      });
    });
    return '';
  }
  function couleurChoisie() {
    var b = document.querySelector('.pastille[aria-pressed="true"]');
    return (b && b.dataset.code) || 'noir';
  }

  /* Fiches robe et pièces : « Ajouter au panier » remplace le passage direct au paiement (écoute en capture : passe avant les anciens gestionnaires). */
  document.addEventListener('submit', function (e) {
    var f = e.target; if (!f.matches || !f.matches('form[data-buy], form[data-precommande]')) return;
    e.preventDefault(); e.stopImmediatePropagation();
    var note = f.querySelector('.panier-note') || f.querySelector('.precommande__note');
    var t = f.querySelector('input[name="size"]:checked');
    if (!t) { if (note) note.textContent = T.panier_choisir; var r = f.querySelector('input[name="size"]'); if (r) r.focus(); return; }
    var piece = f.matches('form[data-buy]') ? 'la-robe' : f.dataset.piece;
    var err = ajouter([{ piece: piece, couleur: couleurChoisie(), taille: t.value }]);
    if (note) note.textContent = err || T.panier_ajoute;
  }, true);

  /* Habillez-moi : « Ajouter la tenue au panier » (haut + bas, ou la robe seule). */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('#cabine-commander'); if (!b) return;
    e.preventDefault(); e.stopImmediatePropagation();
    var set = document.getElementById('cabine-set'), etatSet = set && set.querySelector('.cabine__etat');
    var h = document.querySelector('[data-cabine-haut][aria-pressed="true"]'), bas = document.querySelector('[data-cabine-bas][aria-pressed="true"]');
    var th = document.getElementById('cabine-taille-haut'), tb = document.getElementById('cabine-taille-bas');
    var seule = h && h.dataset.cabineHaut === 'robe';
    if (!th.value || (!seule && !tb.value)) { if (etatSet) etatSet.textContent = set.dataset.choisir; (th.value ? tb : th).focus(); return; }
    var c = couleurChoisie(), arts = [{ piece: h.dataset.cle, couleur: c, taille: th.value }];
    if (!seule && bas) arts.push({ piece: bas.dataset.cle, couleur: c, taille: tb.value });
    var err = ajouter(arts);
    if (etatSet) etatSet.textContent = err || T.panier_ajoute;
  }, true);

  document.addEventListener('click', function (e) {
    var o = e.target.closest && e.target.closest('[data-panier-ouvrir]'); if (o) { ouvrir(); return; }
    if (e.target.closest && e.target.closest('[data-panier-fermer]')) { fermer(); return; }
    var r = e.target.closest && e.target.closest('[data-retirer]');
    if (r) {
      var a = lire(), parti = a[Number(r.dataset.retirer)];
      window.degnaMesure && parti && window.degnaMesure('panier_retrait', {
        valeur: (CAT[parti.piece] || {}).prix || 0,
        detail: parti.piece + '|' + parti.couleur + '|' + parti.taille
      });
      a.splice(Number(r.dataset.retirer), 1); ecrire(a);
    }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !tiroir.hidden) fermer(); });

  /* L'utm mis de côté par mesure.js, s'il y en a un. Jamais d'erreur si le stockage est refusé. */
  function source() {
    try { return JSON.parse(sessionStorage.getItem('degna_src') || '{}'); } catch (e) { return {}; }
  }

  /* Paiement : un seul paiement Stripe pour tout le panier. */
  tiroir.querySelector('[data-panier-payer]').addEventListener('click', function () {
    var a = lire(), bouton = this; if (!a.length) return;
    bouton.disabled = true; etat.textContent = T.panier_attente;
    window.degnaMesure && window.degnaMesure('paiement_ouvert', {
      valeur: a.reduce(function (t, x) { return t + ((CAT[x.piece] || {}).prix || 0); }, 0),
      detail: a.length + ' articles'
    });
    fetch(tiroir.dataset.url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articles: a.map(function (x) { return { piece: x.piece, couleur: x.couleur, taille: x.taille }; }),
                             langue: lang, retour: location.pathname.replace(/^\//, ''),
                             /* D'où vient-elle. `mesure.js` garde l'utm de la publicité dans
                                sessionStorage le temps de l'onglet ; on le passe au serveur, qui
                                l'écrit dans la commande Stripe. **C'est le seul chaînon qui
                                permettra un jour de dire quelle publicité a payé une vente** :
                                sans lui, le jour de la première vente, on saura qu'on a vendu,
                                jamais grâce à quoi. Aucun cookie, aucun identifiant de personne :
                                le nom d'une campagne, rien d'autre. */
                             source: source() }) })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (j && j.ok && j.url) location.href = j.url; else throw 0; })
      .catch(function () { window.degnaMesure && window.degnaMesure('paiement_erreur'); etat.textContent = T.panier_err; bouton.disabled = false; });
  });

  /* Retour de Stripe après paiement : le panier se vide. */
  if (/[?&]order=complete\b/.test(location.search)) { try { localStorage.removeItem(CLE); } catch (e) {} }
  window.addEventListener('storage', function (e) { if (e.key === CLE) afficher(); });   // autre onglet
  afficher();
  if (location.hash === '#panier') ouvrir();
})();
