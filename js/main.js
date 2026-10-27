(function () {
  "use strict";

  // Compte à rebours
  var countdown = document.getElementById("countdown");
  if (countdown) {
    var target = new Date(countdown.getAttribute("data-target")).getTime();
    var units = {
      days: countdown.querySelector('[data-unit="days"]'),
      hours: countdown.querySelector('[data-unit="hours"]'),
      minutes: countdown.querySelector('[data-unit="minutes"]'),
      seconds: countdown.querySelector('[data-unit="seconds"]')
    };
    var pad = function (n) { return String(n).padStart(2, "0"); };
    var timer;
    var calme = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Met à jour un chiffre ; s'il change (et que ce n'est pas le premier affichage), il glisse doucement en place.
    var setUnit = function (el, valeur) {
      if (el.textContent === valeur) return;
      var premier = el.textContent === "--";
      el.textContent = valeur;
      if (!premier && !calme && el.animate) {
        el.animate(
          [{ transform: "translate3d(0,-10px,0)", opacity: 0.25 }, { transform: "translate3d(0,0,0)", opacity: 1 }],
          { duration: 420, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
        );
      }
    };

    var tick = function () {
      var diff = target - Date.now();
      if (diff <= 0) {
        clearInterval(timer);
        countdown.innerHTML = '<p class="countdown-done">SpiNotes est disponible.</p>';
        return;
      }
      var s = Math.floor(diff / 1000);
      setUnit(units.days, String(Math.floor(s / 86400)));
      setUnit(units.hours, pad(Math.floor((s % 86400) / 3600)));
      setUnit(units.minutes, pad(Math.floor((s % 3600) / 60)));
      setUnit(units.seconds, pad(s % 60));
    };

    tick();
    timer = setInterval(tick, 1000);
  }

  // Interactions fluides. Tout passe par transform et opacité (voir style.css) ; ici on ne fait que poser des classes.
  var calmeGlobal = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var root = document.documentElement;
  var dansLaPage = function (el) { return el.getBoundingClientRect().top < window.innerHeight * 0.92; };

  // Apparition au défilement : on masque ce qui est sous la ligne de flottaison, puis on le révèle en cascade.
  if (!calmeGlobal && "IntersectionObserver" in window && root.classList.contains("js")) {
    var groupes = [
      ".section > .wrap > h2, .section > .wrap > .section-lead, .section > .wrap > .split > div:first-child",
      ".prose-block p, .price-line, .steps li, .card, .faq details, .contact-card, .form-card, .shots, .shots-note"
    ];
    var cibles = [];
    groupes.forEach(function (sel) {
      [].slice.call(document.querySelectorAll(sel)).forEach(function (el) { if (cibles.indexOf(el) < 0) cibles.push(el); });
    });
    var parent = null, rang = 0;
    var vus = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); vus.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    cibles.forEach(function (el) {
      if (el.closest(".hero")) return;
      if (el.parentNode !== parent) { parent = el.parentNode; rang = 0; }
      el.style.setProperty("--d", Math.min(rang, 5) * 0.07 + "s");
      rang++;
      el.setAttribute("data-reveal", "");
      if (dansLaPage(el)) el.classList.add("is-in"); else vus.observe(el);
    });
  }

  // Prix : il « monte » jusqu'à 6,99 € quand il entre dans l'écran.
  var prix = document.querySelector(".price");
  if (prix && !calmeGlobal && "IntersectionObserver" in window) {
    var finalTexte = prix.textContent, cible = 6.99;
    var po = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      po.disconnect();
      var debut = performance.now(), duree = 1100;
      var etape = function (t) {
        var p = Math.min((t - debut) / duree, 1), e = 1 - Math.pow(1 - p, 4);
        prix.textContent = p < 1 ? (cible * e).toFixed(2).replace(".", ",") + " €" : finalTexte;
        if (p < 1) requestAnimationFrame(etape);
      };
      requestAnimationFrame(etape);
    }, { threshold: 0.6 });
    po.observe(prix);
  }

  // En-tête : ombre dès qu'on a défilé (un seul écouteur passif, une classe posée au plus une fois par image)
  var entete = document.querySelector(".site-header");
  if (entete) {
    var attente = false;
    var maj = function () { attente = false; entete.classList.toggle("is-scrolled", window.scrollY > 8); };
    window.addEventListener("scroll", function () { if (!attente) { attente = true; requestAnimationFrame(maj); } }, { passive: true });
    maj();
  }

  // Menu mobile : bouton, Échap, clic sur un lien ou à côté ferment le panneau ; le défilement de la page est bloqué pendant l'ouverture.
  var bouton = document.querySelector(".nav-toggle");
  var menu = document.getElementById("menu-principal");
  if (bouton && menu) {
    [].slice.call(menu.querySelectorAll("a")).forEach(function (a, i) { a.style.setProperty("--i", i); });
    var ouvre = function (v) {
      root.classList.toggle("nav-open", v);
      root.classList.toggle("nav-lock", v);
      bouton.setAttribute("aria-expanded", v ? "true" : "false");
      bouton.setAttribute("aria-label", v ? "Fermer le menu" : "Ouvrir le menu");
    };
    bouton.addEventListener("click", function () { ouvre(!root.classList.contains("nav-open")); });
    menu.addEventListener("click", function (e) { if (e.target.closest("a")) ouvre(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && root.classList.contains("nav-open")) { ouvre(false); bouton.focus(); } });
    window.addEventListener("resize", function () { if (window.innerWidth >= 900) ouvre(false); });
  }

  // Parallaxe douce du hero et bouton « magnétique » : seulement avec une souris (pas sur téléphone), au plus une mise à jour par image.
  var hero = document.querySelector(".hero");
  if (hero && !calmeGlobal && window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    var cx = 0, cy = 0, enAttente = false;
    var applique = function () { enAttente = false; hero.style.setProperty("--px", cx.toFixed(3)); hero.style.setProperty("--py", cy.toFixed(3)); };
    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect();
      cx = (e.clientX - r.left) / r.width * 2 - 1;
      cy = (e.clientY - r.top) / r.height * 2 - 1;
      if (!enAttente) { enAttente = true; requestAnimationFrame(applique); }
    }, { passive: true });
    var cta = hero.querySelector(".btn");
    if (cta) {
      cta.addEventListener("pointermove", function (e) {
        var r = cta.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / r.width, dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        cta.style.transform = "translate3d(" + (dx * 10).toFixed(1) + "px," + (dy * 8 - 2).toFixed(1) + "px,0)";
      });
      cta.addEventListener("pointerleave", function () { cta.style.transform = ""; });
    }
  }

  // Aperçu de l'application : onglets (clavier compris), pastille qui glisse, choix de la vue de la base de données
  var shots = document.querySelector("[data-shots]");
  if (shots) {
    var tabs = [].slice.call(shots.querySelectorAll('[role="tab"]'));
    var pill = shots.querySelector(".tab-pill");
    var movePill = function (tab, instant) {
      if (!pill || !tab) return;
      if (instant) pill.style.transition = "none";
      pill.style.width = tab.offsetWidth + "px";
      pill.style.setProperty("--tx", tab.offsetLeft + "px");
      if (instant) { void pill.offsetWidth; pill.style.transition = ""; }
    };
    var select = function (tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.setAttribute("tabindex", on ? "0" : "-1");
        var panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) panel.hidden = !on;
      });
      movePill(tab, false);
      if (focus) tab.focus({ preventScroll: true });
      if (tab.scrollIntoView) tab.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    };
    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { select(tab, false); });
      tab.addEventListener("keydown", function (e) {
        var n = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : null;
        if (n === null) return;
        e.preventDefault();
        select(tabs[(n + tabs.length) % tabs.length], true);
      });
    });
    var current = function () { return tabs.filter(function (t) { return t.getAttribute("aria-selected") === "true"; })[0]; };
    movePill(current(), true);
    window.addEventListener("resize", function () { movePill(current(), true); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { movePill(current(), true); });

    var views = [].slice.call(shots.querySelectorAll("[data-view]"));
    var viewImgs = [].slice.call(shots.querySelectorAll("[data-view-img]"));
    views.forEach(function (btn) {
      btn.addEventListener("click", function () {
        views.forEach(function (o) {
          var on = o === btn;
          o.classList.toggle("is-on", on);
          o.setAttribute("aria-pressed", on ? "true" : "false");
        });
        viewImgs.forEach(function (img) {
          var on = img.getAttribute("data-view-img") === btn.getAttribute("data-view");
          img.classList.toggle("is-on", on);
          img.setAttribute("aria-hidden", on ? "false" : "true");
        });
      });
    });
  }

  // Aperçu : peu après le chargement, quand le navigateur est disponible, on charge et on décode les captures une à une.
  // Ainsi le travail est fait avant que la personne ne défile jusque-là, et le premier changement d'onglet reste fluide.
  // On s'abstient avec le mode économie de données ou une connexion lente.
  if (shots) {
    var conn = navigator.connection || {};
    var sobre = conn.saveData || /(^|-)2g$/.test(conn.effectiveType || "") || conn.effectiveType === "3g";
    if (!sobre) {
      var demarrer = function () {
        var imgs = [].slice.call(shots.querySelectorAll("img"));
        var idle = window.requestIdleCallback || function (fn) { return setTimeout(function () { fn({ timeRemaining: function () { return 10; } }); }, 150); };
        var suite = function () {
          var img = imgs.shift();
          if (!img) return;
          img.loading = "eager";
          var fini = function () { idle(suite, { timeout: 1500 }); };
          if (img.decode) img.decode().then(fini, fini); else fini();
        };
        idle(suite, { timeout: 1500 });
      };
      if (document.readyState === "complete") setTimeout(demarrer, 1800);
      else window.addEventListener("load", function () { setTimeout(demarrer, 1800); });
    }
  }

  // Formulaire de précommande
  var form = document.getElementById("preorder-form");
  if (!form) return;

  var entrepriseField = document.getElementById("entreprise-field");
  var entrepriseInput = document.getElementById("entreprise");
  var statusEl = document.getElementById("form-status");
  var submitBtn = document.getElementById("submit-btn");
  var endpoint = form.getAttribute("data-endpoint");

  form.querySelectorAll('input[name="situation"]').forEach(function (radio) {
    radio.addEventListener("change", function () {
      var isPro = form.situation.value === "pro";
      entrepriseField.hidden = !isPro;
      entrepriseInput.required = isPro;
      if (!isPro) {
        entrepriseInput.value = "";
        setError("entreprise", "");
      }
    });
  });

  function setError(name, message) {
    var el = document.getElementById(name + "-error");
    if (el) el.textContent = message;
    var input = form.elements[name];
    if (input && input.setAttribute) {
      if (message) input.setAttribute("aria-invalid", "true");
      else input.removeAttribute("aria-invalid");
      if (message) input.setAttribute("aria-describedby", name + "-error");
    }
  }

  function age(dateStr) {
    var d = new Date(dateStr + "T00:00:00");
    if (isNaN(d)) return -1;
    var now = new Date();
    var a = now.getFullYear() - d.getFullYear();
    var m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
    return a;
  }

  function validate(data) {
    var errors = {};
    var nameRe = /^[\p{L}][\p{L}\s'\-]{0,59}$/u;
    if (!nameRe.test(data.prenom)) errors.prenom = "Indiquez votre prénom.";
    if (!nameRe.test(data.nom)) errors.nom = "Indiquez votre nom.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) errors.email = "Adresse email invalide.";
    var tel = data.telephone.replace(/[\s.\-()]/g, "");
    if (!/^(0[1-9]\d{8}|\+\d{8,15})$/.test(tel)) errors.telephone = "Numéro invalide. Exemple : 06 12 34 56 78.";
    var a = age(data.naissance);
    if (!data.naissance || a < 0 || a > 120) errors.naissance = "Date de naissance invalide.";
    else if (a < 15) errors.naissance = "La précommande est ouverte à partir de 15 ans.";
    if (["etudiant", "perso", "pro"].indexOf(data.situation) === -1) errors.situation = "Choisissez une option.";
    if (data.situation === "pro" && !data.entreprise) errors.entreprise = "Indiquez le nom de votre entreprise.";
    if (!data.consentement) errors.consentement = "Votre accord est nécessaire pour enregistrer la précommande.";
    return errors;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    statusEl.textContent = "";
    statusEl.classList.remove("is-error");

    var data = {
      prenom: form.prenom.value.trim(),
      nom: form.nom.value.trim(),
      email: form.email.value.trim(),
      telephone: form.telephone.value.trim(),
      naissance: form.naissance.value,
      situation: form.situation.value,
      entreprise: form.entreprise.value.trim(),
      consentement: form.consentement.checked,
      site_web: form.site_web.value
    };

    ["prenom", "nom", "email", "telephone", "naissance", "situation", "entreprise", "consentement"].forEach(function (n) {
      setError(n, "");
    });

    var errors = validate(data);
    var names = Object.keys(errors);
    if (names.length) {
      document.dispatchEvent(new CustomEvent("spinotes:event", { detail: "form_error" }));
      names.forEach(function (n) { setError(n, errors[n]); });
      var first = form.elements[names[0]];
      if (first && first.focus) first.focus();
      else if (first && first[0]) first[0].focus();
      return;
    }

    if (!endpoint) {
      statusEl.textContent = "Les précommandes ne sont pas encore ouvertes. Écrivez-nous à spinotes.general@gmail.com.";
      statusEl.classList.add("is-error");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Envoi en cours…";

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (body) {
          return { ok: res.ok, body: body };
        });
      })
      .then(function (r) {
        if (r.ok) {
          window.location.href = "merci";
          return;
        }
        if (r.body && r.body.errors) {
          Object.keys(r.body.errors).forEach(function (n) { setError(n, r.body.errors[n]); });
        }
        throw new Error((r.body && r.body.message) || "Une erreur est survenue.");
      })
      .catch(function (err) {
        statusEl.textContent = err.message && err.message !== "Failed to fetch"
          ? err.message
          : "Connexion impossible. Vérifiez votre réseau et réessayez.";
        statusEl.classList.add("is-error");
        submitBtn.disabled = false;
        submitBtn.textContent = "Valider ma précommande";
      });
  });
})();
