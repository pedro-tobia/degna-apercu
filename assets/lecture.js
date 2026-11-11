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
  function choisir(b, maj) {
    p.forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
    var noir = b.dataset.code === 'noir';
    if (nom) nom.innerHTML = b.dataset.nom;
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
      var src = b.dataset[i.dataset.detail]; if (src) i.src = src;
    });
    /* Les films n'existent qu'en noir : on ne montre pas du noir sous une autre couleur. */
    [].forEach.call(document.querySelectorAll('[data-noir-seul]'), function (f) { f.hidden = !noir; });
    [].forEach.call(document.querySelectorAll('[data-couleur-seul]'), function (f) { f.hidden = noir || !b.dataset.decor; });
    if (buy && bientot) { buy.hidden = !noir; bientot.hidden = noir; }
    var barre = document.getElementById('achat-barre'); if (barre) barre.style.display = noir ? '' : 'none';
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
