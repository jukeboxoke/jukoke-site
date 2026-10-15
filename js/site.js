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
  // The sample helper (resolver) link, set by resolverOwner and resolverRepo in config.js. Without both, the whole sentence stays hidden.
  var rOwner = /^[\w.-]+$/.test(C.resolverOwner || "") ? C.resolverOwner : "";
  var rRepo = /^[\w.-]+$/.test(C.resolverRepo || "") ? C.resolverRepo : "";
  C.resolverUrl = rOwner && rRepo && !/^YOUR-/.test(rOwner) ? "https://github.com/" + rOwner + "/" + rRepo + "/releases/latest" : "";
  each("[data-resolver-wrap]", function (w) { if (C.resolverUrl) { w.hidden = false; } });
  each("[data-resolver]", function (a) { if (C.resolverUrl) { a.href = C.resolverUrl; } });
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
