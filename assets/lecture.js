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
