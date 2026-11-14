/* Langue de la cliente : après le paiement, Stripe la renvoie sur la page anglaise ; on la ramène dans sa langue
   (la langue est retenue sur l'appareil à chaque page visitée). */
(function () {
  var L = (document.documentElement.lang || 'en').slice(0, 2), retour = /[?&]order=complete/.test(location.search), m = null;
  try { m = localStorage.getItem('degna-langue'); if (!retour) localStorage.setItem('degna-langue', L); } catch (e) {}
  if (retour && m && m !== L) {
    var alt = document.querySelector('link[rel="alternate"][hreflang="' + m + '"]');
    if (alt) location.replace(alt.href + location.search);
  }
})();

/* Toute vidéo du site se lit seule, en boucle, sans que personne ait à la lancer.
   On ne déclenche la lecture que lorsque la vidéo est à l'écran : c'est la seule
   façon d'avoir quatre boucles sur une page sans vider la batterie d'un téléphone,
   et c'est aussi ce qui rattrape un navigateur qui a refusé la lecture automatique
   au chargement. Qui a demandé à son système de couper les animations garde
   l'affiche fixe : ce réglage-là est un choix de la visiteuse, pas un défaut. */
(function () {
  var sansMouvement = window.matchMedia('(prefers-reduced-motion: reduce)');
  var videos = [].slice.call(document.querySelectorAll('video[data-boucle]'));
  if (!videos.length) return;

  function lire(v) {
    if (sansMouvement.matches) { v.pause(); return; }
    var p = v.play();
    if (p && p.catch) { p.catch(function () { /* refus du navigateur : l'affiche reste */ }); }
  }

  if (!('IntersectionObserver' in window)) { videos.forEach(lire); return; }

  var obs = new IntersectionObserver(function (entrees) {
    entrees.forEach(function (e) {
      if (e.isIntersecting) { lire(e.target); } else { e.target.pause(); }
    });
  }, { rootMargin: '300px 0px', threshold: 0.01 });

  videos.forEach(function (v) { obs.observe(v); });

  var surChangement = function () {
    videos.forEach(function (v) { if (sansMouvement.matches) { v.pause(); } else { lire(v); } });
  };
  if (sansMouvement.addEventListener) { sansMouvement.addEventListener('change', surChangement); }
  else if (sansMouvement.addListener) { sansMouvement.addListener(surChangement); }
})();

/* Signature : le repère de mesure se trace à l'entrée dans le champ, ligne après ligne. */
(function () {
  var lignes = [].slice.call(document.querySelectorAll('.specs li'));
  if (!lignes.length) return;
  if (!('IntersectionObserver' in window)) { lignes.forEach(function (l) { l.classList.add('vu'); }); return; }
  var obs = new IntersectionObserver(function (entrees) {
    entrees.forEach(function (e) {
      if (!e.isIntersecting) return;
      var rang = [].indexOf.call(e.target.parentNode.children, e.target);
      e.target.style.transitionDelay = '0ms';
      setTimeout(function () { e.target.classList.add('vu'); }, rang * 70);
      obs.unobserve(e.target);
    });
  }, { threshold: 0.6 });
  lignes.forEach(function (l) { obs.observe(l); });
})();

/* Coloris : la pastille change les images de la fiche. Seul le noir et blanc existe ;
   les autres coloris remplacent l'achat par « Me prévenir ». */
(function () {
  var p = [].slice.call(document.querySelectorAll('.coloris .pastille'));
  if (!p.length) return;
  var vue = document.getElementById('vue'), dos = document.getElementById('vue-dos');
  var nom = document.querySelector('.coloris__nom');
  var apercu = document.querySelector('.apercu-couleur');
  var buy = document.getElementById('buy'), bientot = document.querySelector('.coloris__bientot');
  var notify = document.querySelector('.notify-coloris') || (bientot && bientot.querySelector('a'));
  var vues = [].slice.call(document.querySelectorAll('.vues button'));
  var sansFondu = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function choisir(b, maj) {
    p.forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
    var noir = b.dataset.code === 'noir';
    if (nom) nom.innerHTML = b.dataset.nom;
    /* La description et les détails parlent de la couleur choisie. */
    [].forEach.call(document.querySelectorAll('[data-teinte]'), function (e) { e.hidden = e.dataset.teinte !== b.dataset.code; });
    if (vue && b.dataset.face) vue.src = b.dataset.face;
    if (dos && b.dataset.dos) dos.src = b.dataset.dos;
    if (apercu) apercu.hidden = noir;
    if (notify) notify.href = b.dataset.mail;
    vues.forEach(function (v) {
      var r = v.dataset.role, src = b.dataset[r];
      v.hidden = !src;
      if (src) { v.dataset.src = src; v.querySelector('img').src = src; }
      v.setAttribute('aria-pressed', r === 'face' ? 'true' : 'false');
    });
    /* Gros plans : la même prise, dans la couleur choisie. */
    [].forEach.call(document.querySelectorAll('img[data-detail]'), function (i) {
      var cle = i.dataset.detail.replace(/-([a-z])/g, function (m, c) { return c.toUpperCase(); });   /* data-porte-tq → porteTq */
      var src = b.dataset[cle]; if (!src || i.getAttribute('src') === src) return;
      if (!i.getAttribute('src') || sansFondu) { i.src = src; return; }
      i.classList.add('fondu');                 /* fondu de 400 ms : l'image s'efface, change, revient */
      setTimeout(function () { i.onload = function () { i.classList.remove('fondu'); }; i.src = src; }, 220);
    });
    var lc = document.querySelector('[data-liste] input[name="couleur"]'); if (lc) lc.value = b.dataset.nom;
    /* Les films n'existent qu'en noir : on ne montre pas du noir sous une autre couleur. */
    [].forEach.call(document.querySelectorAll('[data-noir-seul]'), function (f) { f.hidden = !noir; });
    [].forEach.call(document.querySelectorAll('[data-couleur-seul]'), function (f) { f.hidden = noir || !b.dataset.decor; });
    /* Le décor de la couleur : son film s'il existe, sinon l'image fixe. */
    [].forEach.call(document.querySelectorAll('video[data-film]'), function (v) {
      var img = v.parentNode.querySelector('img[data-detail="decor"]'), film = !noir && b.dataset.film;
      v.hidden = !film; if (img) img.hidden = !!film;
      if (film) { if (v.getAttribute('src') !== film) { v.poster = b.dataset.decor || ''; v.src = film; } var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      else if (!v.paused) v.pause();
    });
    /* En vente : la couleur a ses liens de paiement (checkout.js) ; sinon « Bientôt disponible ». */
    var vente = noir || (typeof CHECKOUT !== 'undefined' && !!CHECKOUT.LINKS[b.dataset.code]);
    if (buy && bientot) { buy.hidden = !vente; bientot.hidden = vente; }
    var barre = document.getElementById('achat-barre'); if (barre) barre.style.display = vente ? '' : 'none';
    if (maj && history.replaceState) history.replaceState(null, '', noir ? location.pathname : '#' + b.dataset.code);
  }
  p.forEach(function (b) { b.addEventListener('click', function () { choisir(b, true); }); });
  var h = location.hash.slice(1);
  var depart = p.filter(function (b) { return b.dataset.code === h; })[0];
  if (depart) choisir(depart, false);
})();

/* Carrousel des coloris : flèches sur ordinateur, glissement au doigt sur téléphone. */
(function () {
  [].slice.call(document.querySelectorAll('.carrousel')).forEach(function (c) {
    var liste = c.querySelector('.coloris__liste');
    var fl = [].slice.call(c.querySelectorAll('.carrousel__fleche'));
    function maj() {
      var max = liste.scrollWidth - liste.clientWidth - 2;
      fl[0].disabled = liste.scrollLeft <= 2; fl[1].disabled = liste.scrollLeft >= max;
      c.classList.toggle('carrousel--plein', max <= 0);
    }
    fl.forEach(function (b) { b.addEventListener('click', function () {
      liste.scrollBy({ left: Number(b.dataset.dir) * liste.clientWidth * 0.8, behavior: 'smooth' }); }); });
    liste.addEventListener('scroll', maj, { passive: true }); window.addEventListener('resize', maj); maj();
  });
})();

/* Fiche robe : compteur de la bande d'images sur téléphone (« 3 / 7 »). */
(function () {
  var bande = document.querySelector('.fiche__medias'), c = document.querySelector('.fiche__compteur');
  if (!bande || !c) return;
  var n = c.querySelectorAll('span');
  function maj() {
    var vis = [].filter.call(bande.children, function (m) { return !m.hidden; });
    var i = Math.round(bande.scrollLeft / Math.max(1, bande.clientWidth));
    n[0].textContent = Math.min(vis.length, i + 1); n[1].textContent = vis.length;
  }
  bande.addEventListener('scroll', maj, { passive: true }); window.addEventListener('resize', maj);
  [].forEach.call(document.querySelectorAll('.coloris .pastille'), function (b) {
    b.addEventListener('click', function () { bande.scrollTo({ left: 0 }); setTimeout(maj, 50); });
  });
  maj();
})();

/* Liste d'attente : envoyée au service de formulaires s'il est branché,
   sinon un courriel déjà rédigé vers hello@degna.ca. Jamais d'impasse. */
(function () {
  var f = document.querySelector('form[data-liste]'); if (!f) return;
  var etat = f.querySelector('.liste__etat');
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var d = new FormData(f), pieces = d.getAll('pieces');
    if (!pieces.length) { f.querySelector('input[name="pieces"]').focus(); return; }
    var url = f.dataset.url, bouton = f.querySelector('button[type="submit"]');
    if (!url) {
      var corps = f.dataset.lPieces + ' : ' + pieces.join(', ') + '\n' + f.dataset.lCouleur + ' : ' + (d.get('couleur') || '') +
                  '\n' + f.dataset.lTaille + ' : ' + (d.get('taille') || '—') + '\n' + d.get('email');
      location.href = 'mailto:hello@degna.ca?subject=' + encodeURIComponent(f.dataset.sujet) + '&body=' + encodeURIComponent(corps);
      return;
    }
    bouton.disabled = true;
    fetch(url, { method: 'POST', body: d, headers: { Accept: 'application/json' } }).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      etat.className = 'liste__etat ok'; etat.textContent = etat.dataset.ok; f.reset();
    }).catch(function () { etat.className = 'liste__etat'; etat.innerHTML = etat.dataset.err; })
      .then(function () { bouton.disabled = false; });
  });
})();

/* Coloris à venir : courriel seul ; service de formulaires s'il est branché, sinon courriel déjà rédigé. */
(function () {
  var f = document.querySelector('form[data-coloris]'); if (!f) return;
  var etat = f.querySelector('.liste__etat');
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var d = new FormData(f), url = f.dataset.url, bouton = f.querySelector('button[type="submit"]');
    if (!url) {
      location.href = 'mailto:hello@degna.ca?subject=' + encodeURIComponent(f.dataset.sujet) + '&body=' + encodeURIComponent(d.get('email'));
      return;
    }
    bouton.disabled = true;
    fetch(url, { method: 'POST', body: d, headers: { Accept: 'application/json' } }).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      etat.className = 'liste__etat ok'; etat.textContent = etat.dataset.ok; f.reset();
    }).catch(function () { etat.className = 'liste__etat'; etat.innerHTML = etat.dataset.err; })
      .then(function () { bouton.disabled = false; });
  });
})();

/* Cabine d'essayage : un clic sur un haut ou un bas change la photo, le total, et prépare la réservation. */
(function () {
  var vue = document.getElementById('cabine-vue'); if (!vue) return;
  var total = document.getElementById('cabine-total'), reserver = document.getElementById('cabine-reserver');
  var lang = (document.documentElement.lang || 'en').slice(0, 2);
  var sansFondu = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function prix(n) { return lang === 'fr' ? n + ' $ US' : lang === 'es' ? n + ' US$' : '$' + n; }
  function choisi(g) { return document.querySelector('[data-cabine-' + g + '][aria-pressed="true"]'); }
  /* La cabine suit la couleur choisie sur la fiche : une série de photos par couleur (cabine/<code>/). */
  var COULEURS = ['noir', 'ivoire', 'navy', 'marron'];
  function couleur() {
    var p = document.querySelector('.coloris .pastille[aria-pressed="true"]');
    var c = p && p.dataset.code; return COULEURS.indexOf(c) > -1 ? c : 'noir';
  }
  function chemin(c, h, b) { return vue.dataset.base + c + '/' + h + '--' + b + '.jpg' + (vue.dataset.v ? '?v=' + vue.dataset.v : ''); }
  /* La robe se porte seule : elle prend la place du haut et du bas (Pedro, 2026-11-13). */
  function robe(h) { return h && h.dataset.cabineHaut === 'robe'; }
  var cab = document.querySelector('.cabine');
  /* Les vignettes des pièces (mannequin invisible) prennent aussi la couleur choisie. */
  function vignettes(c) {
    [].forEach.call(document.querySelectorAll('.option img[data-v-noir]'), function (i) {
      var s = i.getAttribute('data-v-' + c) || i.getAttribute('data-v-noir');
      if (i.getAttribute('src') !== s) i.src = s;
    });
  }
  function maj() {
    var h = choisi('haut'), b = choisi('bas');
    vignettes(couleur());
    var seule = robe(h);
    if (cab) cab.toggleAttribute('data-robe', seule);
    var lh = document.querySelector('.cabine__tailles label:first-child span');
    if (lh) { lh.dataset.base = lh.dataset.base || lh.textContent; lh.textContent = seule ? lh.dataset.robe : lh.dataset.base; }
    var src = seule ? h.getAttribute('data-p-' + couleur()) : chemin(couleur(), h.dataset.cabineHaut, b.dataset.cabineBas);
    vue.alt = seule ? h.dataset.nom : h.dataset.nom + ' + ' + b.dataset.nom;
    if (vue.getAttribute('src') !== src) {
      if (sansFondu) vue.src = src;
      else { vue.classList.add('fondu'); setTimeout(function () { vue.onload = function () { vue.classList.remove('fondu'); }; vue.src = src; }, 180); }
    }
    /* Une pièce en vente mène à sa fiche, dans la couleur choisie ; une pièce à venir, à la liste d'attente. */
    var r = reserver, c = couleur();
    [['haut', h], ['bas', b]].forEach(function (x) {
      var lien = document.getElementById('cabine-achat-' + x[0]); if (!lien) return;
      lien.hidden = seule && x[0] === 'bas';
      var o = x[1], f = o.dataset.fiche;
      lien.textContent = f ? r.dataset.cmd + ' : ' + o.dataset.court + ' · ' + prix(o.dataset.prix) : o.dataset.court + ' · ' + r.dataset.bientot;
      lien.href = f ? f + (c === 'noir' ? '' : '#' + c) : '#liste';
    });
    var somme = Number(h.dataset.prix) + (seule ? 0 : Number(b.dataset.prix));
    total.textContent = seule ? h.dataset.nom + ' ' + prix(h.dataset.prix) : h.dataset.nom + ' ' + prix(h.dataset.prix) + ' + ' + b.dataset.nom + ' ' + prix(b.dataset.prix) + ' = ' + prix(somme);
    var cmd = document.getElementById('cabine-commander');
    if (cmd) cmd.textContent = (seule ? cmd.dataset.robe : cmd.dataset.txt) + ' · ' + prix(somme);
  }
  /* Un seul paiement pour la tenue : le serveur DEGNA ouvre une session Stripe avec le haut et le bas.
     S'il ne répond pas, la cliente garde les deux liens « une pièce à la fois » juste en dessous. */
  var set = document.getElementById('cabine-set');
  if (set) document.getElementById('cabine-commander').addEventListener('click', function () {
    var etat = set.querySelector('.cabine__etat'), bouton = this;
    var th = document.getElementById('cabine-taille-haut'), tb = document.getElementById('cabine-taille-bas');
    var seule = robe(choisi('haut'));
    if (!th.value || (!seule && !tb.value)) { etat.textContent = set.dataset.choisir; (th.value ? tb : th).focus(); return; }
    var c = couleur();
    var articles = [{ piece: choisi('haut').dataset.cle, couleur: c, taille: th.value }];
    if (!seule) articles.push({ piece: choisi('bas').dataset.cle, couleur: c, taille: tb.value });
    bouton.disabled = true; etat.textContent = set.dataset.attente;
    fetch(set.dataset.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ articles: articles, langue: set.dataset.langue }) })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (j && j.ok && /^https:\/\/checkout\.stripe\.com\//.test(j.url)) location.href = j.url; else throw 0; })
      .catch(function () { bouton.disabled = false; etat.textContent = set.dataset.err; });
  });
  [].forEach.call(document.querySelectorAll('[data-cabine-haut],[data-cabine-bas]'), function (o) {
    o.addEventListener('click', function () {
      var g = o.hasAttribute('data-cabine-haut') ? 'haut' : 'bas';
      [].forEach.call(document.querySelectorAll('[data-cabine-' + g + ']'), function (x) { x.setAttribute('aria-pressed', x === o ? 'true' : 'false'); });
      maj();
    });
  });
  [].forEach.call(document.querySelectorAll('.coloris .pastille'), function (p) {
    p.addEventListener('click', function () { setTimeout(maj, 0); });
  });
  maj();
  /* Réserver : la liste d'attente coche exactement les deux pièces de la tenue. */
  reserver.addEventListener('click', function (e) {
    var cles = [choisi('haut').dataset.cle, choisi('bas').dataset.cle];
    [].forEach.call(document.querySelectorAll('[data-liste] input[name="pieces"]'), function (c) { c.checked = cles.indexOf(c.dataset.cle) > -1; });
    var m = document.getElementById('liste-courriel');
    if (m) { e.preventDefault(); document.getElementById('liste').scrollIntoView({ behavior: sansFondu ? 'auto' : 'smooth', block: 'center' }); setTimeout(function () { m.focus({ preventScroll: true }); }, 400); }
  });
  /* Les photos des autres tenues de la couleur affichée se chargent en avance, pour un changement sans attente. */
  setTimeout(function () {
    var c = couleur();
    [].forEach.call(document.querySelectorAll('[data-cabine-haut]:not([data-cabine-haut="robe"])'), function (h) {
      [].forEach.call(document.querySelectorAll('[data-cabine-bas]'), function (b) { (new Image()).src = chemin(c, h.dataset.cabineHaut, b.dataset.cabineBas); });
    });
  }, 2500);
})();

/* Consentement exprès (Loi 25, LCAP) : le bouton reste inactif tant que la case n'est pas cochée. */
(function () {
  [].forEach.call(document.querySelectorAll('form[data-consent]'), function (f) {
    var c = f.querySelector('input[name="consentement"]'), b = f.querySelector('button[type="submit"]');
    if (!c || !b) return;
    var maj = function () { b.disabled = !c.checked; };
    c.addEventListener('change', maj); f.addEventListener('reset', function () { setTimeout(maj, 0); }); maj();
  });
})();

/* Réserver en images : chaque pastille est une case « Nom (Couleur) ». Toucher une pastille la choisit
   et met la photo de la pièce dans cette couleur ; on peut choisir plusieurs couleurs d'une même pièce.
   Le champ couleur récapitule les couleurs, le résumé compte les choix. */
(function () {
  [].forEach.call(document.querySelectorAll('form.reserve'), function (f) {
    var resume = f.querySelector('input[name="couleur"]'), etat = f.querySelector('.reserve__resume');
    function maj() {
      var choisies = [].slice.call(f.querySelectorAll('.pastille-res input:checked'));
      if (resume) resume.value = choisies.map(function (c) { return c.dataset.mot; }).join(' · ');
      [].forEach.call(f.querySelectorAll('.carte-res'), function (carte) {
        var mots = [].slice.call(carte.querySelectorAll('input:checked')).map(function (c) { return c.dataset.mot; });
        carte.querySelector('.carte-res__choix').textContent = mots.join(' · ');
        carte.classList.toggle('est-choisie', mots.length > 0);
      });
      if (etat) { var n = choisies.length; etat.textContent = n === 0 ? etat.dataset.rien : n === 1 ? etat.dataset.un : etat.dataset.plus.replace('{n}', n); }
    }
    f.addEventListener('change', function (e) {
      var c = e.target;
      if (c.matches('.pastille-res input')) {
        var carte = c.closest('.carte-res'), img = carte.querySelector('img');
        var code = c.checked ? c.dataset.code : ((carte.querySelector('input:checked') || {}).dataset || {}).code;
        if (code && carte.getAttribute('data-vue-' + code)) img.src = carte.getAttribute('data-vue-' + code);
      }
      maj();
    });
    f.addEventListener('reset', function () { setTimeout(maj, 0); });
    maj();
  });
})();

/* Précommande payée d'une pièce : taille + couleur choisies → lien de paiement Stripe de cette combinaison.
   Les liens sont dans data-liens ({couleur: {taille: url}}), écrits par stripe/creer-liens-pieces.py. */
(function () {
  var f = document.querySelector('form[data-precommande]'); if (!f) return;
  var liens = {}; try { liens = JSON.parse(f.dataset.liens || '{}'); } catch (e) {}
  var note = f.querySelector('.precommande__note');
  if (new URLSearchParams(location.search).get('order') === 'complete') {
    var merci = document.querySelector('.order-merci'); if (merci) merci.hidden = false;
  }
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var t = f.querySelector('input[name="size"]:checked');
    if (!t) { note.textContent = f.dataset.msgTaille; return; }
    var p = document.querySelector('.coloris .pastille[aria-pressed="true"]'), c = (p && p.dataset.code) || 'noir';
    var url = (liens[c] || {})[t.value];
    if (!url) { note.textContent = f.dataset.msgCouleur; return; }
    note.textContent = ''; f.querySelector('button').disabled = true; location.assign(url);
  });
})();

/* Conseiller de taille (comme Zara) : taille et poids, silhouette, soutien-gorge, coupe préférée.
   Les barèmes du corps viennent de la robe mesurée (contenu.py : CORPS). Les réponses restent sur l'appareil. */
(function () {
  var d = document.getElementById('taille-dialog'); if (!d || !d.showModal) return;
  var corps = JSON.parse(d.dataset.corps), T = JSON.parse(d.dataset.textes), mode = d.dataset.mode;
  var form = d.querySelector('form'), etapes = [].slice.call(d.querySelectorAll('.taille-etape')), i = 0;
  var res = d.querySelector('.taille-res'), err = d.querySelector('.taille-erreur');
  var bRetour = d.querySelector('[data-pas="-1"]'), bSuite = d.querySelector('[data-pas="1"]'), bRefaire = d.querySelector('[data-refaire]');
  var TAILLES = ['XS', 'S', 'M', 'L', 'XL'];
  var CLE = 'degna-taille';
  function lire() { try { return JSON.parse(localStorage.getItem(CLE) || 'null'); } catch (e) { return null; } }
  function garder(o) { try { localStorage.setItem(CLE, JSON.stringify(o)); } catch (e) {} }
  function champ(n) { return form.elements[n]; }
  function unite(u) {
    d.dataset.unite = u;
    [].forEach.call(d.querySelectorAll('[data-si]'), function (c) { c.hidden = c.dataset.si !== u; });
    [].forEach.call(d.querySelectorAll('.taille-unites button'), function (b) { b.setAttribute('aria-pressed', b.dataset.unite === u ? 'true' : 'false'); });
  }
  [].forEach.call(d.querySelectorAll('.taille-unites button'), function (b) { b.addEventListener('click', function () { unite(b.dataset.unite); }); });
  function montrer(n) {
    i = n;
    etapes.forEach(function (e, k) { e.hidden = k !== i; });
    bRetour.hidden = i === 0 || i === 4; bSuite.hidden = i === 4; bRefaire.hidden = i !== 4;
    bSuite.textContent = i === 3 ? bSuite.dataset.voir : bSuite.dataset.suivant;
  }
  function mesures() {
    var h, w;
    if (d.dataset.unite === 'imp') {
      h = (Number(champ('h_ft').value) * 12 + Number(champ('h_in').value || 0)) * 2.54; w = Number(champ('p_lb').value) * 0.4536;
    } else { h = Number(champ('h_cm').value); w = Number(champ('p_kg').value); }
    if (!(h > 135 && h < 210 && w > 30 && w < 180)) return null;
    var imc = w / Math.pow(h / 100, 2);
    var v = Number((form.querySelector('[name=ventre]:checked') || {}).value || 1);
    var hp = Number((form.querySelector('[name=hanches]:checked') || {}).value || 1);
    var poitrine = 42 + 2.1 * imc, source = T.estimee;
    var bande = champ('bande').value, bonnet = champ('bonnet').value;
    if (bande && bonnet) {
      var sous = bande.slice(0, 2) === 'eu' ? Number(bande.slice(2)) : Number(bande.slice(2)) * 2.54 - 11;
      poitrine = sous + ({ 'A': 13, 'B': 15, 'C': 17, 'D': 19, 'DD/E': 21, 'F': 23, 'G': 25 })[bonnet];
      source = T.mesuree;
    }
    return { h: h, poitrine: poitrine, source: source,
             taille: 13 + 2.6 * imc + [-3, 0, 4][v], hanches: 52 + 2 * imc + [-4, 0, 5][hp],
             coupe: Number((form.querySelector('[name=coupe]:checked') || {}).value || 1) };
  }
  function indice(m, cle) {   /* position continue entre XS (0) et XL (4) */
    var c = TAILLES.map(function (t) { return (corps[t][cle][0] + corps[t][cle][1]) / 2; });
    if (m <= c[0]) return (m - c[0]) / 5.5;
    if (m >= c[4]) return 4 + (m - c[4]) / 5.5;
    for (var j = 0; j < 4; j++) if (m < c[j + 1]) return j + (m - c[j]) / (c[j + 1] - c[j]);
    return 4;
  }
  function choix(f) { return { t: TAILLES[Math.max(0, Math.min(4, Math.round(f)))], entre: Math.abs(f - Math.floor(f) - 0.5) < 0.15, hors: f < -0.8 || f > 4.8 }; }
  function ligne(lib, m, t, cle, src) {
    var r = corps[t][cle];
    return '<li>' + lib + ' ' + (src ? src + ' ' : '') + ': ' + Math.round(m) + ' cm — ' + t + ' ' + T.prevue + ' ' + r[0] + '–' + r[1] + ' cm</li>';
  }
  function resultat() {
    var m = mesures(); if (!m) { montrer(0); err.textContent = T.manque; return; }
    err.textContent = '';
    var dec = [-0.35, 0, 0.5][m.coupe];
    var ib = indice(m.poitrine, 'poitrine'), iw = indice(m.taille, 'taille'), ih = indice(m.hanches, 'hanches');
    var html = '', notes = [], boutons = '';
    var hc = document.querySelector('[data-cabine-haut][aria-pressed="true"]');
    var robeCabine = mode === 'cabine' && hc && hc.dataset.cabineHaut === 'robe';
    if (mode === 'robe' || robeCabine) {
      var r = choix(Math.max(ib, iw) + dec);
      html = '<p class="taille-res__pour">' + T.resultat + '</p><p class="taille-res__t">' + r.t + '</p><p class="taille-res__pour">' + T.pour_robe + '</p><ul>' +
             ligne(T.l_poitrine, m.poitrine, r.t, 'poitrine', m.source) + ligne(T.l_taille, m.taille, r.t, 'taille', T.estimee) + '</ul>';
      if (r.entre) notes.push(T.entre); if (r.hors) notes.push(T.hors); if (m.h > 166) notes.push(T.grande);
      boutons = robeCabine ? '<button type="button" class="btn btn--block" data-appliquer data-haut="' + r.t + '">' + T.choisir + ' ' + r.t + '</button>'
                           : '<button type="button" class="btn btn--block" data-appliquer data-robe="' + r.t + '">' + T.choisir + ' ' + r.t + '</button>';
    } else {
      var h = choix(Math.max(ib, iw - 0.5) + dec), b = choix(Math.max(iw, ih - 0.3) + dec);
      var nh = (document.querySelector('[data-cabine-haut][aria-pressed="true"]') || {}).dataset, nb = (document.querySelector('[data-cabine-bas][aria-pressed="true"]') || {}).dataset;
      html = '<p class="taille-res__pour">' + T.resultat + '</p><div class="taille-res__deux"><p><span>' + T.haut + (nh ? ' · ' + nh.court : '') + '</span><b class="taille-res__t">' + h.t + '</b></p>' +
             '<p><span>' + T.bas + (nb ? ' · ' + nb.court : '') + '</span><b class="taille-res__t">' + b.t + '</b></p></div><ul>' +
             ligne(T.l_poitrine, m.poitrine, h.t, 'poitrine', m.source) + ligne(T.l_taille, m.taille, b.t, 'taille', T.estimee) + ligne(T.l_hanches, m.hanches, b.t, 'hanches', T.estimee) + '</ul>';
      if (h.entre || b.entre) notes.push(T.entre); if (h.hors || b.hors) notes.push(T.hors); notes.push(T.base_pieces);
      boutons = '<button type="button" class="btn btn--block" data-appliquer data-haut="' + h.t + '" data-bas="' + b.t + '">' + T.appliquer + ' · ' + h.t + ' / ' + b.t + '</button>';
    }
    res.innerHTML = html + notes.map(function (n) { return '<p class="taille-note">' + n + '</p>'; }).join('') + boutons;
    garder({ unite: d.dataset.unite, h_cm: champ('h_cm').value, p_kg: champ('p_kg').value, h_ft: champ('h_ft').value, h_in: champ('h_in').value, p_lb: champ('p_lb').value,
             bande: champ('bande').value, bonnet: champ('bonnet').value,
             ventre: (form.querySelector('[name=ventre]:checked') || {}).value, hanches: (form.querySelector('[name=hanches]:checked') || {}).value,
             coupe: (form.querySelector('[name=coupe]:checked') || {}).value });
    montrer(4);
  }
  res.addEventListener('click', function (e) {
    var a = e.target.closest('[data-appliquer]'); if (!a) return;
    if (a.dataset.robe) {
      var r = document.querySelector('form[data-buy] input[name="size"][value="' + a.dataset.robe + '"]');
      if (r) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }
    } else {
      [['haut', a.dataset.haut], ['bas', a.dataset.bas]].forEach(function (x) {
        var s = document.getElementById('cabine-taille-' + x[0]); if (s && x[1]) { s.value = x[1]; s.dispatchEvent(new Event('change', { bubbles: true })); }
      });
    }
    d.close();
  });
  bSuite.addEventListener('click', function () {
    if (i === 0 && !mesures()) { err.textContent = T.manque; return; }
    err.textContent = '';
    if (i === 3) resultat(); else montrer(i + 1);
  });
  bRetour.addEventListener('click', function () { montrer(Math.max(0, i - 1)); });
  bRefaire.addEventListener('click', function () { montrer(0); });
  function ouvrir() {
    var s = lire();
    unite((s && s.unite) || d.dataset.unite);
    if (s) {
      ['h_cm', 'p_kg', 'h_ft', 'h_in', 'p_lb', 'bande', 'bonnet'].forEach(function (k) { if (s[k] != null) champ(k).value = s[k]; });
      ['ventre', 'hanches', 'coupe'].forEach(function (k) { var r = form.querySelector('[name=' + k + '][value="' + s[k] + '"]'); if (r) r.checked = true; });
    }
    montrer(0); d.showModal();
  }
  [].forEach.call(document.querySelectorAll('[data-ouvrir-taille]'), function (b) { b.addEventListener('click', ouvrir); });
  d.addEventListener('click', function (e) { if (e.target === d) d.close(); });   /* clic hors de la fenêtre */
  unite(d.dataset.unite); montrer(0);
})();

/* Habillez-moi : le tableau des mesures suit le haut, le bas et les deux tailles choisies. */
(function () {
  var box = document.querySelector('.cabine__mesures'); if (!box) return;
  var sh = document.getElementById('cabine-taille-haut'), sb = document.getElementById('cabine-taille-bas'), lib = box.querySelector('.cabine__mesures-choix');
  function maj() {
    var h = (document.querySelector('[data-cabine-haut][aria-pressed="true"]') || {}).dataset || {}, b = (document.querySelector('[data-cabine-bas][aria-pressed="true"]') || {}).dataset || {};
    [].forEach.call(box.querySelectorAll('tr[data-taille]'), function (tr) {
      tr.classList.toggle('est-haut', tr.dataset.taille === sh.value);
      tr.classList.toggle('est-bas', tr.dataset.taille === sb.value);
    });
    var seule = h.cabineHaut === 'robe';
    if (seule) [].forEach.call(box.querySelectorAll('tr.est-bas'), function (tr) { tr.classList.remove('est-bas'); });
    lib.textContent = (h.court || '') + ' ' + (sh.value || '—') + (seule ? '' : ' · ' + (b.court || '') + ' ' + (sb.value || '—'));
  }
  sh.addEventListener('change', maj); sb.addEventListener('change', maj);
  document.addEventListener('click', function (e) { if (e.target.closest('[data-cabine-haut],[data-cabine-bas]')) setTimeout(maj, 0); });
  maj();
})();

/* Page Sempre : une couleur, un lieu — la pastille change le film, le décor, le nom et le lien de la robe. */
(function () {
  var art = document.querySelector('.heros-robe--lieu'); if (!art) return;
  var v = art.querySelector('video'), nom = art.querySelector('.lieu__nom'), liens = art.querySelectorAll('.lieu__lien');
  var calme = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  [].forEach.call(art.querySelectorAll('.lieu__pastille'), function (b) {
    b.addEventListener('click', function () {
      [].forEach.call(art.querySelectorAll('.lieu__pastille'), function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      nom.textContent = b.dataset.nom;
      [].forEach.call(liens, function (a) { a.href = b.dataset.lien; });
      v.classList.add('fondu');
      setTimeout(function () {
        v.poster = b.dataset.poster; v.src = b.dataset.film;
        if (!calme) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
        v.classList.remove('fondu');
      }, 220);
    });
  });
})();
