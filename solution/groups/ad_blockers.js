// ad_blockers. The scoring browser has no network, so only same-origin
// signals count: path rules the blockers' DNR lists apply to our own host,
// cosmetic hiding, and what content scripts write into page JavaScript.
// Every probe below was checked to hit exactly one extension in the pool.
//
// Adblock for Youtube and SponsorBlock only act on youtube.com frames, which
// cannot load offline, so they are reported false.

// Bait planted at load so cosmetic stylesheets have time to apply.
(function () {
  var B = window.__bex;
  if (!B || B.adBait) return;
  B.adBait = {};
  try { performance.setResourceTimingBufferSize(5000); } catch { /* ignore */ }

  function plant() {
    var box = document.createElement("div");
    box.style.cssText = "position:absolute;left:-10000px;top:0;width:300px;";
    [
      // AdGuard Base generic hiding.
      ["ag1", "div", "id", "pfx_interstitial"],
      ["ag2", "a", "href", "https://x.adglare.net/a"],
      // AdBlocker Ultimate's Ultimate Ad Filter generic hiding.
      ["abu1", "div", "class", "wide_grey_ad_box"],
      ["abu2", "div", "class", "widget-ad-codes"],
      ["abu3", "div", "data-wpas-zoneid", "1"],
      ["abu4", "a", "href", "https://x.example/sexdating.php"],
      ["abu5", "div", "data-google-av-itpl", "1"],
      // I don't care about cookies' common.css.
      ["idcac1", "div", "id", "cookie-notice"],
      ["idcac2", "div", "class", "cookie-banner"],
      ["idcac3", "div", "id", "stickyCookieBar"],
      ["idcac4", "div", "id", "cookie_bar_top"],
    ].forEach(function (b) {
      var d = document.createElement(b[1]);
      d.setAttribute(b[2], b[3]);
      d.style.cssText = "display:block;width:300px;height:20px;";
      d.textContent = "x";
      box.appendChild(d);
      B.adBait[b[0]] = d;
    });

    // IDCAC consent honeypot: its default click handler tags the button it
    // presses with class `idcac`.
    var law = document.createElement("div");
    law.id = "cookielaw";
    law.className = "in";
    var btn = document.createElement("button");
    btn.id = "cookie-accept";
    btn.textContent = "Accept";
    law.appendChild(btn);
    box.appendChild(law);
    B.adBait.idcacBtn = btn;

    document.body.appendChild(box);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", plant);
  else plant();
})();

window.detect_ad_blockers = async function () {
  var B = window.__bex, r = {};
  var bait = B.adBait || {};
  function hidden(e, win) {
    if (!e) return false;
    if (!e.isConnected) return true;
    var s = (win || window).getComputedStyle(e);
    return s.display === "none" || s.visibility === "hidden";
  }
  function count(list) { return list.filter(Boolean).length; }
  function hiddenCount(list) { return count(list.map(function (e) { return hidden(e); })); }
  function bust(path) {
    return path + (path.indexOf("?") >= 0 ? "&" : "?") + "b=" + Math.random().toString(36).slice(2);
  }

  // Unblocked, these paths 404 and fetch() resolves; blocked, it rejects.
  function fetchBlocked(path) {
    return Promise.race([
      fetch(bust(path), { cache: "no-store", credentials: "omit" }).then(
        function () { return false; },
        function () { return true; },
      ),
      B.sleep(3000).then(function () { return false; }),
    ]);
  }
  // For rules limited to script/image a 404 fires onerror too, so read the
  // Resource Timing entry instead: blocked requests report status 0.
  function tagBlocked(tag, path) {
    var url = new URL(bust(path), location.href).href;
    return new Promise(function (done) {
      var n = document.createElement(tag);
      var settle = function () {
        setTimeout(function () {
          var e = performance.getEntriesByName(url);
          n.remove();
          done(e.length === 0 || e[e.length - 1].responseStatus === 0);
        }, 100);
      };
      n.onload = function () { n.remove(); done(false); };
      n.onerror = settle;
      n.style.cssText = "position:absolute;left:-10000px;";
      n.src = url;
      document.body.appendChild(n);
      setTimeout(function () { done(false); }, 3000);
    });
  }
  function family(probes) {
    return Promise.all(probes.map(function (p) {
      return typeof p === "string" ? fetchBlocked(p) : tagBlocked(p[0], p[1]);
    })).then(count);
  }

  // uBOL's ublock-filters redirect /prebid-ads.js to its own stand-in, which
  // loads (instead of 404ing) and sets canRunAds.
  var prebid = new Promise(function (done) {
    var s = document.createElement("script");
    s.onload = function () { done(window.canRunAds === true && window.isAdBlockActive === false); };
    s.onerror = function () { done(false); };
    s.src = bust("/prebid-ads.js");
    document.head.appendChild(s);
    setTimeout(function () { done(false); }, 3000);
  });

  // A fresh document: ABP's element hiding and Privacy Badger's MAIN-world
  // dnt.js only reach documents created after the extension finished
  // starting up, which the bait page itself is not.
  var frame = new Promise(function (done) {
    var f = document.createElement("iframe");
    f.style.cssText = "position:absolute;left:-10000px;width:300px;height:300px;";
    f.onload = function () { done(f); };
    f.src = "/__bex_ad_" + B.nonce;
    document.body.appendChild(f);
    setTimeout(function () { done(f); }, 2500);
  });

  var net = Promise.all([
    family(["/hit.c?", "/cnvtr.js", "/imp2.js?", "/event.gif?", "/webtracking.min.js",
      "/asg_embed.js", "/api/popads-code", "/adspop.js", "/visilabs.min.js"]),
    // ABP's anti-circumvention list.
    family(["/seznamzpravy.cz/ssp.js", "/z/seznamzpravy.cz/a/ssp.js",
      ["img", "/seznamzpravy.cz/ssp.js"], ["script", "/seznamzpravy.cz/cmp.js"]]),
    family(["/pl/js/system-ba.js", "/sdk/v1/dd.interstitial.ts.js", "/sdk/v1/dd.master.spot.js",
      "/wp-content/uploads/2026/x/rvpasteref300.png", "/z.lnbz.la/", "/z.srnky.com/",
      "/z.clksz.com/", "/z.aii.sh/", "/z.cyou/1clkn/"]),
    family(["/z.advert.", "/x.advert.js",
      ["script", "/advertising/ad-shield.js"], ["script", "/flashad.js"]]),
    family(["/dsgvocc.js", "/cookieok.js", "/dkmb_gdpr.js", "/eu_cookie.js",
      "/z/vod.provider.plex.tv/ad"]),
    family(["/modules/mod_pescookies", "/CookiesDirective", "/ico_cookies.js",
      "/eucd/eucd.min.js", "/cookie_law/plugin.js", "/js/consentbar.js"]),
  ]);

  var f = await frame;
  var fw = null, fd = null;
  try { fw = f.contentWindow; fd = f.contentDocument; } catch { /* ignore */ }

  var abpBait = [], gpc = false;
  if (fd && fd.body) {
    ["jag8CityBio212023", "sctyyBTZN3nt5_true"].forEach(function (c) {
      var d = fd.createElement("div");
      d.className = c;
      d.textContent = "x";
      abpBait.push(fd.body.appendChild(d));
    });
    ["//x4pollyxxpush.com/a", "//mage98rquewz.com/a"].forEach(function (h) {
      var a = fd.createElement("a");
      a.href = h;
      a.textContent = "x";
      abpBait.push(fd.body.appendChild(a));
    });
    gpc = B.safe(function () {
      return fw.navigator.globalPrivacyControl === true && fw.navigator.doNotTrack === "1";
    });
    // uBOL's prevent-clipboard-write scriptlet installs its traps on the first
    // mousemove (no isTrusted check), as own properties of the instances.
    B.safe(function () {
      fd.dispatchEvent(new fw.MouseEvent("mousemove", { bubbles: true }));
      return true;
    });
  }

  // AdGuard's subscribe.js cancels pointerdown on subscribe links (no
  // isTrusted check). Without a location= parameter it sends nothing.
  function pointerPrevented(href) {
    return B.safe(function () {
      var a = document.createElement("a");
      a.href = href;
      a.style.cssText = "position:absolute;left:-10000px;";
      document.body.appendChild(a);
      var ev = new PointerEvent("pointerdown", { bubbles: true, cancelable: true, button: 0 });
      var prevented = !a.dispatchEvent(ev);
      a.remove();
      return prevented;
    });
  }
  var adguardLink = pointerPrevented("adguard:subscribe?x=1") &&
    !pointerPrevented("https://example.com/");

  var res = await Promise.all([net, prebid, B.sleep(1800)]);
  var n = res[0];

  var clipboard = B.safe(function () {
    var own = Object.prototype.hasOwnProperty;
    return own.call(fd, "execCommand") && own.call(fw.navigator.clipboard, "writeText");
  });
  r["uBlock Origin Lite"] = n[0] >= 2 || res[1] || clipboard;

  r["Adblock Plus - free ad blocker"] = n[1] >= 2 ||
    count(abpBait.map(function (e) { return hidden(e, fw); })) >= 2;

  r["AdGuard AdBlocker"] = n[2] >= 2 || adguardLink || hidden(bait.ag1) || hidden(bait.ag2);

  r["AdBlocker Ultimate"] = n[3] >= 2 ||
    hiddenCount([bait.abu1, bait.abu2, bait.abu3, bait.abu4, bait.abu5]) >= 2;

  r["Pie Adblock - A Powerful Free Ad Blocker"] = n[4] >= 2;

  r["Privacy Badger"] = gpc;

  // Network rules survive when another extension (New Tab Redirect) keeps
  // IDCAC's page scripts and CSS off the bait page.
  r["I don't care about cookies"] = n[5] >= 2 ||
    B.safe(function () { return /(^|\s)idc0_\d+/.test(document.documentElement.className); }) ||
    B.safe(function () { return bait.idcacBtn.classList.contains("idcac"); }) ||
    hiddenCount([bait.idcac1, bait.idcac2, bait.idcac3, bait.idcac4]) >= 2;

  r["Adblock for Youtube"] = false;
  r["SponsorBlock"] = false;

  try { f.remove(); } catch { /* ignore */ }
  return r;
};
