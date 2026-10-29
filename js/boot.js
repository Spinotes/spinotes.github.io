// Marque la page comme « avec JavaScript » avant le premier affichage : les animations d'entrée et le menu mobile
// n'existent que dans ce cas. Sans JavaScript, tout reste visible et utilisable.
// Pose aussi le thème (jour ou nuit) avant l'affichage, pour éviter tout éclair de la mauvaise couleur.
(function () {
  "use strict";
  var root = document.documentElement;
  var KEY = "spinotes-theme";
  var COULEURS = { light: "#f5f1fb", dark: "#0b0813" };
  var systeme = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  root.className += " js";

  // Le choix n'est enregistré que si la personne appuie sur le bouton ; sinon on suit l'appareil.
  function choisi() {
    try {
      var v = window.localStorage.getItem(KEY);
      return v === "light" || v === "dark" ? v : null;
    } catch (e) { return null; }
  }

  function actuel() {
    return choisi() || (systeme && systeme.matches ? "dark" : "light");
  }

  function appliquer(theme) {
    root.setAttribute("data-theme", theme);
    var barres = document.querySelectorAll('meta[name="theme-color"]');
    for (var i = 0; i < barres.length; i++) barres[i].setAttribute("content", COULEURS[theme]);
    var boutons = document.querySelectorAll(".theme-toggle");
    for (var j = 0; j < boutons.length; j++) {
      var nuit = theme === "dark";
      boutons[j].setAttribute("aria-label", nuit ? "Passer en mode jour" : "Passer en mode nuit");
      boutons[j].setAttribute("title", nuit ? "Mode jour" : "Mode nuit");
    }
  }

  appliquer(actuel());
  document.addEventListener("DOMContentLoaded", function () { appliquer(actuel()); });

  // Pas de choix enregistré : on suit l'appareil quand il passe de jour à nuit.
  if (systeme && systeme.addEventListener) {
    systeme.addEventListener("change", function () { if (!choisi()) appliquer(actuel()); });
  }

  document.addEventListener("click", function (e) {
    var cible = e.target.closest ? e.target.closest(".theme-toggle") : null;
    if (!cible) return;
    var suivant = actuel() === "dark" ? "light" : "dark";
    try { window.localStorage.setItem(KEY, suivant); } catch (err) { /* stockage indisponible : le choix vaut pour cette page */ }
    var calme = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (document.startViewTransition && !calme) document.startViewTransition(function () { appliquer(suivant); });
    else appliquer(suivant);
  });
})();
