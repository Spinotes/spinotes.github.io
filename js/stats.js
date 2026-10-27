/*
 * Mesure d'audience maison de SpiNotes.
 * Sans cookie, sans identifiant conservé, sans adresse IP. Une visite = un identifiant aléatoire gardé
 * uniquement en mémoire le temps de la page. Rien n'est envoyé si le visiteur a activé « Ne pas me suivre »
 * (DNT / GPC) ou s'il a refusé la mesure depuis la page Confidentialité.
 * Les données collectées sont décrites dans la politique de confidentialité.
 */
(function () {
  "use strict";

  var OPT_OUT_KEY = "spinotes-no-stats";

  function optedOut() {
    try {
      if (window.localStorage.getItem(OPT_OUT_KEY) === "1") return true;
    } catch (e) { /* stockage indisponible : on mesure quand même */ }
    return navigator.doNotTrack === "1" || window.doNotTrack === "1" || navigator.globalPrivacyControl === true;
  }

  // Bouton de refus de la page Confidentialité (indépendant de la mesure elle-même).
  var toggle = document.getElementById("stats-toggle");
  if (toggle) {
    var label = document.getElementById("stats-toggle-state");
    var render = function () {
      var off = optedOut();
      toggle.textContent = off ? "Réactiver la mesure d'audience" : "Refuser la mesure d'audience";
      if (label) label.textContent = off ? "La mesure d'audience est désactivée sur cet appareil." : "La mesure d'audience est active.";
    };
    toggle.addEventListener("click", function () {
      try {
        if (window.localStorage.getItem(OPT_OUT_KEY) === "1") window.localStorage.removeItem(OPT_OUT_KEY);
        else window.localStorage.setItem(OPT_OUT_KEY, "1");
      } catch (e) { /* ignoré */ }
      render();
    });
    render();
  }

  if (optedOut()) return;

  var meta = document.querySelector('meta[name="stats-endpoint"]');
  var endpoint = meta && meta.getAttribute("content");
  if (!endpoint) return;

  var PAGES = {
    "": "accueil", "index.html": "accueil", "merci": "merci", "cgv": "cgv", "cgu": "cgu",
    "confidentialite": "confidentialite", "mentions-legales": "mentions"
  };
  var SECTIONS = ["app", "avantages", "offre", "precommande", "faq", "contact"];

  var seg = location.pathname.replace(/\/+$/, "").split("/").pop().replace(/\.html$/, "");
  var page = Object.prototype.hasOwnProperty.call(PAGES, seg) ? PAGES[seg] : "autre";

  var vid = "";
  for (var i = 0; i < 12; i++) vid += "abcdefghijklmnopqrstuvwxyz0123456789".charAt(Math.floor(Math.random() * 36));

  var visibleMs = 0;
  var visibleSince = document.visibilityState === "visible" ? Date.now() : 0;
  var maxScroll = 0;
  var seen = {};
  var events = {};
  var sentOnce = false;

  function count(name) {
    events[name] = (events[name] || 0) + 1;
  }

  function seconds() {
    return Math.round((visibleMs + (visibleSince ? Date.now() - visibleSince : 0)) / 1000);
  }

  function updateScroll() {
    var doc = document.documentElement;
    var total = Math.max(doc.scrollHeight, 1);
    var pct = Math.round(((window.pageYOffset || doc.scrollTop || 0) + window.innerHeight) / total * 100);
    if (pct > maxScroll) maxScroll = Math.min(pct, 100);
  }
  window.addEventListener("scroll", updateScroll, { passive: true });
  updateScroll();

  // Sections vues (au moins 40 % visibles)
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) seen[en.target.id] = true;
      });
    }, { threshold: 0.4 });
    SECTIONS.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) io.observe(el);
    });
  }

  // Clics : on ne retient qu'un nom d'action, jamais le texte ni l'adresse complète.
  document.addEventListener("click", function (e) {
    var el = e.target && e.target.closest ? e.target.closest("a, button, summary") : null;
    if (!el) return;
    var name = el.getAttribute("data-track");
    var href = el.getAttribute("href") || "";
    if (!name) {
      if (el.tagName === "SUMMARY") name = "faq_open";
      else if (el.closest(".site-nav")) name = "nav_" + href.replace(/[^a-z]/g, "");
      else if (/^mailto:/i.test(href)) name = "mail_contact";
      else if (el.closest(".footer-links")) name = "legal";
      else if (el.classList.contains("brand")) name = "logo";
    }
    if (name) count(name);
  }, true);

  // Formulaire : début de saisie et soumission (le contenu saisi n'est jamais lu).
  var form = document.getElementById("preorder-form");
  if (form) {
    var started = false;
    form.addEventListener("focusin", function () {
      if (!started) { started = true; count("form_start"); }
    });
    form.addEventListener("submit", function () { count("form_submit"); });
  }
  document.addEventListener("spinotes:event", function (e) {
    if (e && typeof e.detail === "string") count(e.detail);
  });

  function referrer() {
    if (!document.referrer) return "direct";
    try {
      var h = new URL(document.referrer).hostname.replace(/^www\./, "");
      return h === location.hostname ? "interne" : h;
    } catch (e) { return "inconnu"; }
  }

  function param(name) {
    try { return new URLSearchParams(location.search).get(name) || ""; } catch (e) { return ""; }
  }

  function send() {
    updateScroll();
    var payload = JSON.stringify({
      v: 1,
      vid: vid,
      page: page,
      dur: seconds(),
      scroll: maxScroll,
      sections: Object.keys(seen).join(","),
      src: referrer(),
      utm_s: param("utm_source"),
      utm_c: param("utm_campaign"),
      dev: window.innerWidth < 768 ? "mobile" : (window.innerWidth < 1100 ? "tablette" : "ordinateur"),
      lang: (navigator.language || "").slice(0, 5),
      ev: events
    });
    sentOnce = true;
    var ok = false;
    try {
      if (navigator.sendBeacon) ok = navigator.sendBeacon(endpoint, new Blob([payload], { type: "text/plain" }));
    } catch (e) { ok = false; }
    if (!ok && window.fetch) {
      try { fetch(endpoint, { method: "POST", body: payload, keepalive: true, headers: { "Content-Type": "text/plain" } }).catch(function () {}); } catch (e) { /* ignoré */ }
    }
  }

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") {
      if (visibleSince) { visibleMs += Date.now() - visibleSince; visibleSince = 0; }
      send();
    } else {
      visibleSince = Date.now();
    }
  });
  window.addEventListener("pagehide", function () {
    if (visibleSince) { visibleMs += Date.now() - visibleSince; visibleSince = 0; }
    send();
  });

  // Point d'étape après 30 s de présence, au cas où la fermeture de l'onglet n'enverrait rien (certains mobiles).
  setTimeout(function () { if (!sentOnce && document.visibilityState === "visible") send(); }, 30000);
})();
