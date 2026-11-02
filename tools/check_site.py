#!/usr/bin/env python3
"""Regression check for the Jukoke site. Run from the site's root:  python tools/check_site.py

Standard library only. Exit code 0 = every check passed, 1 = something failed.
What it catches: links and images that point nowhere, image width/height that do not match the real file,
stale wording that was retired (see BANNED), prices and plans that drifted from the table below, pages whose
menu differs from the others, unbalanced tags, a broken sitemap or feed, and a malformed js/config.js.
When pricing or plans change on purpose, change EXPECT / BANNED below in the same commit."""
import os, re, struct, sys, xml.dom.minidom
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ── What the site must say. Edit these when pricing or plans change on purpose. ──────────────────────────────────────
BANNED = ["Free+", "Lite+", "Stage Hold", "Nickname"]            # retired names; news.html and feed.xml may mention them as history
BANNED_EXEMPT = {"news.html", "feed.xml"}
EXPECT = {                                                       # file -> regexes that must each match its text
    "pricing.html": [
        r"1 Pack</th><td>1</td><td>\$1\.00</td>",
        r"10 Pack</th><td>10</td><td>\$8\.50</td>",
        r"40 Pack</th><td>40</td><td>\$30\.00</td>",
        r"Lite</th><td>5</td>",
        r"Pro</th><td>10</td>",
        r"<strong>\$35</strong> for 30 days",
        r"30-day free trial",
        r"loop, tempo and catalog editing",                  # part of Free (2026-11-01)
        r"trial (pauses|waits) while a",                     # the Pro Pass pauses the free trial
    ],
    "features.html": [
        r'<th scope="col">Free</th><th scope="col">Lite</th><th scope="col">Pro</th>',      # three plan columns, no more
        r'Loop, tempo and catalog editing</th><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td>',   # free in every plan (2026-11-01)
        r'Vocal removal and playlists</th><td>&ndash;</td><td>&#10003;</td><td>&#10003;</td>',        # still Lite and Pro
        r'<th scope="row">Songs waiting in the queue</th><td>1</td><td>Unlimited</td><td>Unlimited</td>',
    ],
}
NAV = ["index.html", "features.html", "pricing.html", "download.html", "news.html", "support.html"]

results = []
def check(name, ok, detail=""):
    results.append((name, bool(ok)))
    print(("PASS  " if ok else "FAIL  ") + name + (("   " + str(detail)[:400]) if (detail and not ok) else ""))

def read(rel):
    with open(os.path.join(ROOT, rel), encoding="utf-8", newline="") as f:
        return f.read()

PAGES = sorted(f for f in os.listdir(ROOT) if f.endswith(".html"))

# ── helpers ──────────────────────────────────────────────────────────────────────────────────────────────────────────
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}
TRACK = {"div", "section", "table", "thead", "tbody", "tr", "ul", "ol", "li", "article", "figure", "figcaption", "main", "header",
         "footer", "nav", "details", "summary", "form", "svg", "a", "p", "h1", "h2", "h3", "h4", "button", "td", "th", "span", "strong"}

class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.refs, self.imgs, self.ids, self.nav, self.stack, self.problems = [], [], set(), [], [], []
        self.in_nav = False
        self.title = ""; self._in_title = False
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if "id" in a: self.ids.add(a["id"])
        if tag in ("a", "link") and a.get("href"): self.refs.append(a["href"])
        if tag in ("script", "img", "source") and a.get("src"): self.refs.append(a["src"])
        if tag == "img": self.imgs.append(a)
        if tag == "nav" and a.get("aria-label") == "Main": self.in_nav = True
        if self.in_nav and tag == "a" and a.get("href"): self.nav.append(a["href"])
        if tag == "title": self._in_title = True
        if tag in TRACK: self.stack.append((tag, self.getpos()[0]))
    def handle_endtag(self, tag):
        if tag == "nav": self.in_nav = False
        if tag == "title": self._in_title = False
        if tag in TRACK:
            if self.stack and self.stack[-1][0] == tag: self.stack.pop()
            else: self.problems.append("</%s> at line %d closes %s" % (tag, self.getpos()[0], self.stack[-1] if self.stack else "nothing"))
    def handle_data(self, d):
        if self._in_title: self.title += d

def parse(rel):
    p = Page(); p.feed(read(rel)); p.close()
    for tag, line in p.stack: p.problems.append("<%s> opened at line %d never closed" % (tag, line))
    return p

def image_size(path):
    with open(path, "rb") as f: b = f.read(64)
    if b[:8] == b"\x89PNG\r\n\x1a\n": return struct.unpack(">II", b[16:24])
    if b[:4] == b"RIFF" and b[8:12] == b"WEBP":
        k = b[12:16]
        if k == b"VP8X": return (1 + int.from_bytes(b[24:27], "little"), 1 + int.from_bytes(b[27:30], "little"))
        if k == b"VP8L":
            v = int.from_bytes(b[21:25], "little"); return ((v & 0x3FFF) + 1, ((v >> 14) & 0x3FFF) + 1)
        if k == b"VP8 ": return (struct.unpack("<H", b[26:28])[0] & 0x3FFF, struct.unpack("<H", b[28:30])[0] & 0x3FFF)
    return None

# ── checks ───────────────────────────────────────────────────────────────────────────────────────────────────────────
pages = {rel: parse(rel) for rel in PAGES}

bad = []
for rel, p in pages.items():
    for r in p.refs:
        if re.match(r"(https?:|mailto:|tel:|data:|//|javascript:)", r) or r.startswith("#"): continue
        target, _, frag = r.partition("#"); target = target.split("?")[0]
        if not target: continue
        if not os.path.exists(os.path.join(ROOT, target)): bad.append("%s -> %s" % (rel, r)); continue
        if frag and target.endswith(".html") and frag not in pages[target].ids: bad.append("%s -> %s (no such anchor)" % (rel, r))
check("every local link, script, stylesheet and image exists, and every #anchor exists", not bad, bad)

bad = []
for rel, p in pages.items():
    for a in p.imgs:
        src = a.get("src", "")
        if re.match(r"(https?:|data:)", src): continue
        full = os.path.join(ROOT, src.split("?")[0])
        if not os.path.exists(full): continue
        if "alt" not in a: bad.append("%s: %s has no alt attribute" % (rel, src))
        if not src.startswith("img/shots/"): continue            # icons are deliberately shown smaller than the file
        size = image_size(full)
        if size is None: continue
        w, h = a.get("width"), a.get("height")
        if not (w and h and int(w) == size[0] and int(h) == size[1]):
            bad.append("%s: %s says %sx%s, the file is %dx%d" % (rel, src, w, h, size[0], size[1]))
        if not a.get("alt"): bad.append("%s: %s has no alt text" % (rel, src))
check("every screenshot's width/height match its file, and every image has alt", not bad, bad)

used = {a.get("src", "") for p in pages.values() for a in p.imgs}
orphans = [f for f in sorted(os.listdir(os.path.join(ROOT, "img", "shots"))) if "img/shots/" + f not in used] if os.path.isdir(os.path.join(ROOT, "img", "shots")) else []
check("every screenshot in img/shots is used by a page", not orphans, orphans)

bad = []
for rel in PAGES + ["feed.xml"]:
    if rel in BANNED_EXEMPT: continue
    text = read(rel)
    for w in BANNED:
        if w in text: bad.append("%s mentions %r" % (rel, w))
check("no retired wording (%s) outside the news history" % ", ".join(BANNED), not bad, bad)

bad = []
for rel, pats in EXPECT.items():
    text = read(rel)
    for pat in pats:
        if not re.search(pat, text): bad.append("%s: missing %s" % (rel, pat))
check("prices and plans match the EXPECT table", not bad, bad)

bad = [rel for rel, p in pages.items() if rel not in ("404.html",) and p.nav and p.nav != NAV]
check("every page has the same main menu", not bad, bad)

bad = ["%s: %s" % (rel, "; ".join(p.problems[:3])) for rel, p in pages.items() if p.problems]
check("tags are balanced on every page", not bad, bad)

bad = [rel for rel, p in pages.items() if not p.title.strip()]
check("every page has a title", not bad, bad)

bad = []
try:
    sm = read("sitemap.xml")
    for loc in re.findall(r"<loc>https?://[^/<]+/([^<]*)</loc>", sm):
        if loc and not os.path.exists(os.path.join(ROOT, loc)): bad.append(loc)
    xml.dom.minidom.parseString(sm.encode("utf-8"))
except Exception as e:
    bad.append(str(e))
check("sitemap.xml is valid and lists only pages that exist", not bad, bad)

try: xml.dom.minidom.parseString(read("feed.xml").encode("utf-8")); ok, why = True, ""
except Exception as e: ok, why = False, e
check("feed.xml is well-formed", ok, why)

cfg = read(os.path.join("js", "config.js"))
bad = []
for k in ("version", "winSize", "debSize", "winSha", "debSha", "pricesUpdated"):
    if not re.search(r'\b%s:\s*"[^"]+"' % k, cfg): bad.append("config.js: %s missing or empty" % k)
for k in ("winSha", "debSha"):
    m = re.search(r'\b%s:\s*"([^"]*)"' % k, cfg)
    if m and not re.fullmatch(r"[0-9a-f]{64}", m.group(1)): bad.append("config.js: %s is not 64 hex digits" % k)
check("js/config.js has its release fields, and the SHA-256 values look right", not bad, bad)

failed = [n for n, ok in results if not ok]
print("\n%s  (%d checks, %d failed)" % ("RESULT: FAILED" if failed else "RESULT: PASSED", len(results), len(failed)))
sys.exit(1 if failed else 0)
