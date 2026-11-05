// Song wish list form (wish.html). Runs only in the guest's browser: nothing is sent to us and nothing is stored on a
// server. It writes a plain text message in the format the Jukoke MC screen reads (Party > Prep > Guest List > Paste wish
// list) and hands it to the guest's own Messages / email / share sheet.
// formatWishList() is a port of format_wish_list() in Jukoke's core/wish_list.py: change one, change the other.
(function () {
  var form = document.getElementById("wl-form");
  if (!form) { return; }
  var MAX_SONGS = 60, MAX_TEXT = 200, DRAFT_KEY = "jukoke.wishlist.draft.v1";
  var $ = function (id) { return document.getElementById(id); };

  // ── the message ──────────────────────────────────────────────────────────
  function clip(s, n) { return String(s == null ? "" : s).replace(/\s+/g, " ").trim().slice(0, n || MAX_TEXT); }
  function field(s) { return clip(String(s == null ? "" : s).replace(/\|/g, "/")); }
  function formatWishList(name, pin, device, note, songs, party) {
    var lines = ["JUKOKE WISH LIST"];
    if (String(party || "").trim()) { lines.push("Party: " + field(party)); }
    lines.push("Name: " + field(name));
    if (String(pin || "").trim()) { lines.push("PIN: " + field(pin)); }
    if (String(device || "").trim()) { lines.push("Device: " + field(device)); }
    if (String(note || "").trim()) { lines.push("Note: " + field(note)); }
    lines.push("");
    var n = 0;
    for (var i = 0; i < songs.length; i++) {
      var s = songs[i], title = field(s.title);
      if (!title) { continue; }
      n++;
      var parts = [title, field(s.artist), field(s.key), field(s.note)];
      while (parts.length > 1 && !parts[parts.length - 1]) { parts.pop(); }
      lines.push(n + ". " + parts.join(" | "));
    }
    return lines.join("\n");
  }
  window.formatWishList = formatWishList;

  // ── the device line (a hint for the host only) ───────────────────────────
  function deviceText() {
    var ua = navigator.userAgent || "", os = "", br = "";
    if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) { os = "iPhone/iPad"; }
    else if (/Android/.test(ua)) { os = "Android"; }
    else if (/Windows/.test(ua)) { os = "Windows"; }
    else if (/Mac OS X/.test(ua)) { os = "Mac"; }
    else if (/Linux|CrOS/.test(ua)) { os = "Linux"; }
    if (/Edg\//.test(ua)) { br = "Edge"; }
    else if (/Firefox|FxiOS/.test(ua)) { br = "Firefox"; }
    else if (/SamsungBrowser/.test(ua)) { br = "Samsung Internet"; }
    else if (/Chrome|CriOS/.test(ua)) { br = "Chrome"; }
    else if (/Safari/.test(ua)) { br = "Safari"; }
    return [os, br].filter(Boolean).join(", ");
  }
  var device = deviceText();
  $("wl-device-text").textContent = device || "this device";
  if (!device) { $("wl-device-row").hidden = true; }

  // ── who it goes to (optional, from the link's #part, which the browser never sends to a server) ─────────
  var hash = {};
  try {
    location.hash.replace(/^#/, "").split("&").forEach(function (kv) {
      var i = kv.indexOf("="); if (i > 0) { hash[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1)); }
    });
  } catch (e) { hash = {}; }
  var toSms = /^\+?[\d\s().-]{5,20}$/.test(hash.sms || "") ? hash.sms.replace(/[\s().-]/g, "") : "";
  var toMail = /^[^@\s,;?&]+@[^@\s,;?&]+\.[^@\s,;?&]+$/.test(hash.mail || "") ? hash.mail : "";
  var hostName = clip(hash.host || "", 40);
  if (hostName) { $("wl-host").textContent = " for " + hostName; }
  var party = clip(hash.party || "", 80);                      // the party's title, set by the host's link; shown read-only, sent as the Party: line
  if (party) { $("wl-party").value = party; $("wl-party-row").hidden = false; }

  // ── songs ────────────────────────────────────────────────────────────────
  var songsEl = $("wl-songs");
  // The key is a -/+ stepper in whole semitones (what Jukoke's key setting uses); 0 is the original key and is sent as nothing.
  var KEY_MAX = 12;
  function setKey(row, n) {
    n = Math.max(-KEY_MAX, Math.min(KEY_MAX, n || 0));
    row.querySelector('[data-f="key"]').value = n ? (n > 0 ? "+" + n : String(n)) : "";
    row.querySelector("[data-keyshow]").textContent = n ? (n > 0 ? "+" + n : "\u2212" + (-n)) : "Original";
    row.querySelector('[data-k="-1"]').disabled = n <= -KEY_MAX;
    row.querySelector('[data-k="1"]').disabled = n >= KEY_MAX;
  }
  function getKey(row) { return parseInt(row.querySelector('[data-f="key"]').value, 10) || 0; }
  function addSong(v) {
    if (songsEl.children.length >= MAX_SONGS) { return; }
    v = v || {};
    var n = songsEl.children.length + 1;
    var row = document.createElement("fieldset");
    row.className = "wl-song";
    row.innerHTML =
      '<legend>Song <span class="wl-n"></span></legend>' +
      '<button type="button" class="wl-del" data-del aria-label="Remove this song">Remove</button>' +
      '<div class="wl-row2"><label>Song title or link<input data-f="title" type="text" maxlength="200" autocomplete="off" placeholder="Title, or a YouTube link"></label>' +
      '<label>Artist (optional)<input data-f="artist" type="text" maxlength="200" autocomplete="off"></label></div>' +
      '<div class="wl-row2 wl-kn"><div><span class="wl-lbl">Key</span><div class="wl-key"><button type="button" data-k="-1" aria-label="Lower the key">\u2212</button><output data-keyshow></output><button type="button" data-k="1" aria-label="Raise the key">+</button><input type="hidden" data-f="key"></div></div>' +
      '<label>Note (optional)<input data-f="note" type="text" maxlength="200" autocomplete="off" placeholder="Duet, slow version\u2026"></label></div>';
    songsEl.appendChild(row);
    ["title", "artist", "note"].forEach(function (k) { if (v[k]) { row.querySelector('[data-f="' + k + '"]').value = v[k]; } });
    setKey(row, parseInt(v.key, 10) || 0);
    renumber();
  }
  function renumber() {
    Array.prototype.forEach.call(songsEl.children, function (row, i) {
      row.querySelector(".wl-n").textContent = i + 1;
      row.querySelector("[data-del]").hidden = songsEl.children.length < 2;      // the last song cannot be removed: it can be cleared
    });
    $("wl-add").disabled = songsEl.children.length >= MAX_SONGS;
  }
  function readSongs() {
    return Array.prototype.map.call(songsEl.children, function (row) {
      var o = {};
      Array.prototype.forEach.call(row.querySelectorAll("[data-f]"), function (el) { o[el.getAttribute("data-f")] = el.value; });
      return o;
    });
  }
  function currentMessage() {
    var send = $("wl-send-device").checked ? device : "";
    return formatWishList($("wl-name").value, $("wl-pin").value, send, $("wl-note").value, readSongs(), party);
  }

  // ── checks, preview, draft ───────────────────────────────────────────────
  var say = function (t, cls) { var s = $("wl-status"); s.textContent = t; s.className = "small " + (cls || ""); };
  function problem() {
    if (!clip($("wl-name").value)) { $("wl-name").focus(); return "Please enter your stage name."; }
    var pin = $("wl-pin").value.trim();
    if (pin && !/^\d{4}$/.test(pin)) { $("wl-pin").focus(); return "The PIN is 4 digits, or leave it empty."; }
    if (!readSongs().some(function (s) { return clip(s.title); })) { return "Please add at least one song."; }
    return "";
  }
  function refresh() {
    $("wl-preview").value = currentMessage();
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ name: $("wl-name").value, pin: $("wl-pin").value, note: $("wl-note").value,
        dev: $("wl-send-device").checked, songs: readSongs() }));
    } catch (e) { /* private mode or blocked storage: the form still works, it just forgets */ }
  }
  var d = null;
  try { d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"); } catch (e) { d = null; }
  if (d && typeof d === "object") {
    $("wl-name").value = clip(d.name, 40); $("wl-pin").value = String(d.pin || "").replace(/\D/g, "").slice(0, 4);
    $("wl-note").value = clip(d.note, 300); $("wl-send-device").checked = d.dev !== false;
    (Array.isArray(d.songs) ? d.songs.slice(0, MAX_SONGS) : []).forEach(function (s) { addSong(s || {}); });
  }
  if (!songsEl.children.length) { addSong(); }

  form.addEventListener("input", refresh);
  form.addEventListener("change", refresh);
  form.addEventListener("click", function (e) {
    var t = e.target, kb = t.closest ? t.closest("[data-k]") : null;
    if (kb) { var kr = kb.closest(".wl-song"); setKey(kr, getKey(kr) + parseInt(kb.getAttribute("data-k"), 10)); refresh(); return; }
    if (t.hasAttribute("data-del")) { songsEl.removeChild(t.closest(".wl-song")); renumber(); refresh(); }
  });
  $("wl-add").addEventListener("click", function () {
    addSong(); renumber(); refresh();
    var last = songsEl.lastChild; if (last) { last.querySelector('[data-f="title"]').focus(); }
  });
  $("wl-clear").addEventListener("click", function () {
    if (!window.confirm("Clear everything on this form?")) { return; }
    songsEl.innerHTML = ""; addSong(); $("wl-name").value = ""; $("wl-pin").value = ""; $("wl-note").value = "";
    refresh(); say("");
  });

  // ── sending ──────────────────────────────────────────────────────────────
  function guard(fn) { return function () { var p = problem(); if (p) { say(p, "fb-err"); return; } say(""); refresh(); fn($("wl-preview").value); }; }
  var title = "Song wish list";
  $("wl-sms").addEventListener("click", guard(function (msg) {
    location.href = "sms:" + toSms + "?&body=" + encodeURIComponent(msg);       // "?&body=" is read by both iPhone and Android
    say("Opening your messages app…");
  }));
  $("wl-mail").addEventListener("click", guard(function (msg) {
    location.href = "mailto:" + toMail + "?subject=" + encodeURIComponent(title) + "&body=" + encodeURIComponent(msg);
    say("Opening your email app…");
  }));
  function copyText(msg) {
    var done = function () { say("Copied. Paste it into any message to your host.", "fb-ok"); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(msg).then(done, fallback);
    } else { fallback(); }
    function fallback() {
      $("wl-details").open = true; var ta = $("wl-preview"); ta.focus(); ta.select();
      try { if (document.execCommand("copy")) { done(); return; } } catch (e) { /* fall through */ }
      say("Press and hold the text above, then choose Copy.", "fb-err");
    }
  }
  $("wl-copy").addEventListener("click", guard(copyText));
  if (navigator.share) {
    $("wl-share").hidden = false;
    $("wl-share").addEventListener("click", guard(function (msg) {
      navigator.share({ title: title, text: msg }).then(function () { say("Sent. Thank you!", "fb-ok"); }, function () { say(""); });
    }));
  }
  form.addEventListener("submit", function (e) { e.preventDefault(); });
  renumber(); refresh();
})();
