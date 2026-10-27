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

    var tick = function () {
      var diff = target - Date.now();
      if (diff <= 0) {
        clearInterval(timer);
        countdown.innerHTML = '<p class="countdown-done">SpiNotes est disponible.</p>';
        return;
      }
      var s = Math.floor(diff / 1000);
      units.days.textContent = Math.floor(s / 86400);
      units.hours.textContent = pad(Math.floor((s % 86400) / 3600));
      units.minutes.textContent = pad(Math.floor((s % 3600) / 60));
      units.seconds.textContent = pad(s % 60);
    };

    tick();
    timer = setInterval(tick, 1000);
  }

  // Aperçu de l'application : onglets (clavier compris) et choix de la vue de la base de données
  var shots = document.querySelector("[data-shots]");
  if (shots) {
    var tabs = [].slice.call(shots.querySelectorAll('[role="tab"]'));
    var select = function (tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.setAttribute("tabindex", on ? "0" : "-1");
        var panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
      if (tab.scrollIntoView) tab.scrollIntoView({ block: "nearest", inline: "nearest" });
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
    var views = [].slice.call(shots.querySelectorAll("[data-view]"));
    var viewImgs = [].slice.call(shots.querySelectorAll("[data-view-img]"));
    views.forEach(function (b) {
      b.addEventListener("click", function () {
        views.forEach(function (o) {
          var on = o === b;
          o.classList.toggle("is-on", on);
          o.setAttribute("aria-pressed", on ? "true" : "false");
        });
        viewImgs.forEach(function (img) { img.hidden = img.getAttribute("data-view-img") !== b.getAttribute("data-view"); });
      });
    });
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
