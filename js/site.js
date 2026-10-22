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
  // Links set from config.js (data-cfg-href="releasesUrl" and so on). Only a real http(s) address is used, so a
  // placeholder never becomes a relative URL that lands on the 404 page.
  each("[data-cfg-href]", function (a) {
    var v = C[a.getAttribute("data-cfg-href")];
    if (/^https?:\/\//i.test(v || "")) { a.href = v; }
  });
  // Feedback form (support page). With a real Web3Forms key the message is sent to support by that service;
  // without one, the form opens the visitor's mail app with the message filled in, so it always works.
  var form = document.getElementById("fb-form");
  if (form) {
    var st = document.getElementById("fb-status"), btn = document.getElementById("fb-send");
    var say = function (t, cls) { st.textContent = t; st.className = "small " + (cls || ""); };
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var f = form.elements, email = f.email.value.trim(), msg = f.message.value.trim(), topic = f.topic.value;
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { say("Please enter a valid email address.", "fb-err"); f.email.focus(); return; }
      if (!msg) { say("Please write a message.", "fb-err"); f.message.focus(); return; }
      if (f.botcheck.checked) { return; }
      var subject = "Jukoke feedback: " + topic;
      var body = msg + "\n\nFrom: " + email + "\nPage: " + location.href;
      if (!/^[0-9a-f-]{20,}$/i.test(C.formKey || "")) {
        location.href = "mailto:support@jukeboxoke.com?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
        say("Opening your email app\u2026");
        return;
      }
      btn.disabled = true; say("Sending\u2026");
      fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ access_key: C.formKey, subject: subject, from_name: "Jukoke website", email: email, topic: topic, message: msg, page: location.href, botcheck: "" })
      }).then(function (r) { return r.json(); }).then(function (j) {
        if (j && j.success) { form.reset(); say("Thank you. Your message was sent.", "fb-ok"); }
        else { throw new Error("rejected"); }
      }).catch(function () {
        say("Couldn\u2019t send. Please email support@jukeboxoke.com instead.", "fb-err");
      }).then(function () { btn.disabled = false; });
    });
  }
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
