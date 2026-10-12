(function () {
  var C = window.JUKOKE || {};
  var base = "https://github.com/" + C.githubOwner + "/" + C.releasesRepo;
  C.releasesUrl = base + "/releases";
  C.resolverUrl = "https://github.com/" + C.resolverOwner + "/" + C.resolverRepo + "/releases/latest";
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
  each("[data-resolver]", function (a) { a.href = C.resolverUrl; });
  // Optional cookieless analytics (Umami). Does nothing until analyticsId
  // (the Umami "website ID") is set in config.js. Download buttons are
  // tagged so each click is counted as an event.
  if (C.analyticsId && !/^(localhost|127\.)/.test(location.hostname)) {
    each("[data-dl]", function (a) {
      a.setAttribute("data-umami-event", "download-" + a.getAttribute("data-dl"));
    });
    var b = document.createElement("script");
    b.defer = true;
    b.src = "https://cloud.umami.is/script.js";
    b.setAttribute("data-website-id", C.analyticsId);
    document.head.appendChild(b);
  }
  each("[data-year]", function (el) { el.textContent = new Date().getFullYear(); });
})();
