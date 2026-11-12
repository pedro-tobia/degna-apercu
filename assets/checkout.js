/* DEGNA — passage en caisse Stripe
   ---------------------------------------------------------------------------
   Deux voies, au choix. Changez `mode` ci-dessous.

   mode: "links"    Un lien de paiement Stripe par taille. Aucun serveur, aucun
                    hébergement, rien à maintenir. C'est la bonne voie tant qu'il
                    n'y a qu'un produit. Collez les cinq URL dans LINKS.

   mode: "session"  Une fonction serveur crée une Checkout Session. Nécessaire le
                    jour où il faut un vrai stock, des remises, ou plusieurs
                    produits dans un panier. Le code de la fonction est dans
                    api/checkout.js à la racine du projet.

   Dans les deux cas la page de paiement est celle de Stripe : adresse, taxes,
   Apple Pay et Google Pay sont gérés par eux. Aucune donnée de carte ne touche
   ce site, et aucune clé secrète ne doit apparaître dans ce fichier.
   --------------------------------------------------------------------------- */

const CHECKOUT = {
  mode: "links",

  // Un lien par couleur et par taille — tableau de bord Stripe › Liens de paiement.
  // Une couleur absente d'ici n'est pas en vente : la fiche affiche « Bientôt disponible ».
  LINKS: {
    noir: {
      XS: "https://buy.stripe.com/8x2dR27xbcTG26a5gh4c800",
      S:  "https://buy.stripe.com/8x23cocRvcTGfX05gh4c801",
      M:  "https://buy.stripe.com/bJedR27xbaLyh14aAB4c802",
      L:  "https://buy.stripe.com/bJecMYbNr1aY3ae1014c803",
      XL: "https://buy.stripe.com/7sYcMYg3H3j6dOS7op4c804"
    },
    ivoire: {
      XS: "https://buy.stripe.com/fZudR2eZDf1ObGKfUV4c805",
      S:  "https://buy.stripe.com/3cI5kw18NaLyfX0cIJ4c806",
      M:  "https://buy.stripe.com/fZudR25p38DqdOSfUV4c807",
      L:  "https://buy.stripe.com/dRmfZa3gV5re9yC1014c808",
      XL: "https://buy.stripe.com/7sYdR23gV5reaCGeQR4c809"
    },
    navy: {
      XS: "https://buy.stripe.com/4gMaEQ18N3j6h148st4c80a",
      S:  "https://buy.stripe.com/8x28wI3gVg5S4ei8st4c80b",
      M:  "https://buy.stripe.com/4gM6oAcRv4nah14bEF4c80c",
      L:  "https://buy.stripe.com/cNifZadVz2f24eicIJ4c80d",
      XL: "https://buy.stripe.com/fZueV62cR8Dq6mqcIJ4c80e"
    },
    marron: {
      XS: "https://buy.stripe.com/9B65kw6t7aLycKOfUV4c80f",
      S:  "https://buy.stripe.com/3cIeV6dVz06UfX07op4c80g",
      M:  "https://buy.stripe.com/3cIeV6bNrdXKdOS7op4c80h",
      L:  "https://buy.stripe.com/eVqdR2dVz4na9yC7op4c80i",
      XL: "https://buy.stripe.com/3cIbIU3gVg5SdOS8st4c80j"
    }
  },

  // Utilisé seulement en mode "session".
  endpoint: "/api/checkout"
};

/* ------------------------------------------------------------------ */

// Messages dans la langue de la page (en, fr, es).
const MSG = ({
  en: { absent: "<b>Online checkout opens shortly.</b> To order now, write to <a href=\"mailto:hello@degna.ca\">hello@degna.ca</a>.", choisir: "<b>Choose a size first.</b> The size table is one tap away.",
        vers: "Taking you to the secure Stripe page…", ouvre: "Opening the secure Stripe page…",
        echec: "<b>We could not reach checkout.</b> Nothing was charged. Try again, or write to <a href=\"mailto:hello@degna.ca\">hello@degna.ca</a> and we will take the order by email." },
  fr: { absent: "<b>Le paiement en ligne ouvre très bientôt.</b> Pour commander dès maintenant, écrivez à <a href=\"mailto:hello@degna.ca\">hello@degna.ca</a>.", choisir: "<b>Choisissez d’abord une taille.</b> Le tableau des tailles est juste en dessous.",
        vers: "Redirection vers la page sécurisée de Stripe…", ouvre: "Ouverture de la page sécurisée de Stripe…",
        echec: "<b>Le paiement est injoignable.</b> Rien n’a été débité. Réessayez, ou écrivez à <a href=\"mailto:hello@degna.ca\">hello@degna.ca</a> et nous prendrons la commande par courriel." },
  es: { absent: "<b>El pago en línea abre muy pronto.</b> Para pedir ahora, escriba a <a href=\"mailto:hello@degna.ca\">hello@degna.ca</a>.", choisir: "<b>Elija primero una talla.</b> La tabla de tallas está justo debajo.",
        vers: "Redirigiendo a la página segura de Stripe…", ouvre: "Abriendo la página segura de Stripe…",
        echec: "<b>No pudimos conectar con el pago.</b> No se cobró nada. Inténtelo de nuevo, o escriba a <a href=\"mailto:hello@degna.ca\">hello@degna.ca</a> y tomaremos el pedido por correo." }
})[(document.documentElement.lang || "en").slice(0, 2)] || null;

function sizeChosen(form) {
  return new FormData(form).get("size");
}

function say(node, html) {
  node.innerHTML = html;
}

// La couleur choisie sur la fiche (pastille enfoncée) ; noir par défaut.
function couleurChoisie() {
  const b = document.querySelector('.coloris .pastille[aria-pressed="true"]');
  return (b && b.dataset.code) || "noir";
}

function startLink(size, note, button) {
  const url = (CHECKOUT.LINKS[couleurChoisie()] || {})[size];
  if (!url) {
    say(note, MSG.absent);
    return;
  }
  button.disabled = true;
  say(note, MSG.vers);
  window.location.assign(url);
}

async function startSession(size, note, button) {
  button.disabled = true;
  say(note, MSG.ouvre);
  try {
    const res = await fetch(CHECKOUT.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ size: size, quantity: 1 })
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    if (!data.url) throw new Error("no url in response");
    window.location.assign(data.url);
  } catch (err) {
    button.disabled = false;
    say(note, MSG.echec);
  }
}

function initCheckout() {
  const forms = Array.prototype.slice.call(document.querySelectorAll("form[data-buy]"));
  if (!forms.length) return;

  forms.forEach(function (form) {
    const note = form.parentNode.querySelector(".buy-note");
    const button = form.querySelector('button[type="submit"]');

    // Une taille choisie ici l'est aussi dans l'autre boîte, et le bouton la nomme.
    form.addEventListener("change", function () {
      const size = sizeChosen(form);
      forms.forEach(function (f) {
        const r = f.querySelector('input[name="size"][value="' + size + '"]');
        if (r) r.checked = true;
        f.querySelector(".buy-size").textContent = " · " + size;
        f.querySelector(".sizes").classList.remove("rappel");
        const b = f.querySelector('button[type="submit"]'), lab = f.querySelector(".buy-label");
        if (b && lab && b.dataset.acheter) { lab.textContent = b.dataset.acheter; b.classList.remove("btn--attente"); }
      });
      const champ = document.querySelector('[data-liste] input[name="taille"]'); if (champ) champ.value = size;
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const size = sizeChosen(form);
      if (!size) {
        say(note, MSG.choisir);
        form.querySelector(".sizes").classList.add("rappel");
        form.querySelector('input[name="size"]').focus();
        return;
      }
      if (CHECKOUT.mode === "session") startSession(size, note, button);
      else startLink(size, note, button);
    });
  });

  // Trois vues dans le héros : une seule grande image, on change sa source.
  const vue = document.getElementById("vue");
  const vues = Array.prototype.slice.call(document.querySelectorAll(".vues button"));
  vues.forEach(function (b) {
    b.addEventListener("click", function () {
      vue.src = b.dataset.src; vue.alt = b.dataset.alt;
      vues.forEach(function (o) { o.setAttribute("aria-pressed", o === b ? "true" : "false"); });
    });
  });

  // Barre collante : seulement quand aucune boîte d'achat n'est à l'écran.
  const barre = document.getElementById("achat-barre");
  if (barre && "IntersectionObserver" in window) {
    const visibles = new Set();
    const lien = barre.querySelector("a");
    const obs = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) visibles.add(e.target); else visibles.delete(e.target); });
      const on = visibles.size === 0;
      barre.classList.toggle("on", on);
      barre.setAttribute("aria-hidden", on ? "false" : "true");
      lien.tabIndex = on ? 0 : -1;
    }, { threshold: 0.15 });
    forms.forEach(function (f) { obs.observe(f); });
  }

  // Retour depuis Stripe après un paiement réussi.
  if (new URLSearchParams(window.location.search).get("order") === "complete") {
    const banner = document.getElementById("order-complete");
    if (banner) {
      banner.hidden = false;
      banner.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCheckout);
} else {
  initCheckout();
}
