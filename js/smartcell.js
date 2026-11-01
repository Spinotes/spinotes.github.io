/* An isolated marketing illustration. No app data or backend access. */
(function () {
  "use strict";
  var demo = document.querySelector("[data-smartcell-demo]");
  if (!demo) return;
  var material = 1200, frozen = false, snapshot = 2000;
  var format = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  var field = function (name) { return demo.querySelector("[data-demo-" + name + "]"); };
  function render(changed) {
    var total = material + 800, shown = frozen ? snapshot : total;
    field("material").textContent = format.format(material);
    field("total").textContent = format.format(total);
    field("widget").textContent = format.format(shown);
    field("desk").textContent = format.format(shown);
    field("state").textContent = frozen ? "Valeur figée" : "Synchronisée";
    field("state").classList.toggle("is-frozen", frozen);
    field("freeze").textContent = frozen ? "Resynchroniser" : "Figer la valeur";
    field("freeze").setAttribute("aria-pressed", String(frozen));
    if (changed) field("feedback").textContent = frozen ? "La feuille évolue ; la SmartCell conserve " + format.format(snapshot) + "." : "La SmartCell suit la feuille : " + format.format(shown) + ".";
  }
  field("add").addEventListener("click", function () { material += 100; render(true); });
  field("freeze").addEventListener("click", function () { if (!frozen) snapshot = material + 800; frozen = !frozen; render(true); });
  render(false);
}());
