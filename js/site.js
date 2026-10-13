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
  // A link setting that is still a placeholder (or blank) used to become a relative URL and land on the 404 page.
  // Only a real http(s) address is used; otherwise the link falls back to e-mail, which always works.
  each("[data-cfg-href]", function (a) {
    var v = C[a.getAttribute("data-cfg-href")];
    if (/^https?:\/\//i.test(v || "")) { a.href = v; }
    else {
      a.href = "mailto:support@jukeboxoke.com?subject=Jukoke%20feedback";
      a.textContent = "Email your feedback";
    }
  });
  each("[data-year]", function (el) { el.textContent = new Date().getFullYear(); });
})();
