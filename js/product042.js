(function(){
  "use strict";
  var prices={sync:{monthly:"4,99 €",yearly:"49,99 €"},collab:{monthly:"7,99 €",yearly:"79,99 €"}};
  var billing=[].slice.call(document.querySelectorAll("[data-billing]"));
  billing.forEach(function(button){button.addEventListener("click",function(){
    var mode=button.getAttribute("data-billing");
    billing.forEach(function(b){b.setAttribute("aria-pressed",String(b===button));});
    [].slice.call(document.querySelectorAll("[data-price-plan]")).forEach(function(plan){
      var data=prices[plan.getAttribute("data-price-plan")];if(!data)return;
      plan.querySelector("[data-price-value]").textContent=data[mode];
      plan.querySelector("[data-price-period]").textContent=mode==="yearly"?"/ an":"/ mois";
      plan.parentNode.querySelector("[data-price-alternative]").textContent=mode==="yearly"?"Paiement annuel · près de 2 mois offerts":"ou "+data.yearly+" / an";
    });
  });});
  var levels=[].slice.call(document.querySelectorAll("[data-formula-mode]"));
  levels.forEach(function(button){button.addEventListener("click",function(){
    var mode=button.getAttribute("data-formula-mode");levels.forEach(function(b){b.setAttribute("aria-pressed",String(b===button));});
    [].slice.call(document.querySelectorAll("[data-formula-panel]")).forEach(function(panel){panel.hidden=panel.getAttribute("data-formula-panel")!==mode;});
  });});
  if(location.protocol==="file:"||["localhost","127.0.0.1","[::1]"].indexOf(location.hostname)>=0){
    var banner=document.createElement("div");banner.className="local-preview-banner";
    banner.textContent="Préparation locale — non publiée. Les formulaires et la mesure d’audience n’envoient aucune donnée depuis cet aperçu.";
    document.body.insertBefore(banner,document.body.firstChild);
  }
})();
