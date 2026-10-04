(function () {
  var C = window.JUKOKE || {};
  var base = "https://github.com/" + C.githubOwner + "/" + C.releasesRepo;
  C.releasesUrl = base + "/releases";
  var dl = {
    win: base + "/releases/latest/download/" + C.winAsset,
    deb: base + "/releases/latest/download/" + C.debAsset
  };
  function each(sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); }
  each("[data-dl]", function (a) { a.href = dl[a.getAttribute("data-dl")] || "#"; });
  each("[data-cfg]", function (el) {
    var v = C[el.getAttribute("data-cfg")];
    if (v) el.textContent = v;
  });
  each("[data-cfg-href]", function (a) {
    var v = C[a.getAttribute("data-cfg-href")];
    if (v) a.href = v;
  });
  each("[data-year]", function (el) { el.textContent = new Date().getFullYear(); });
})();
