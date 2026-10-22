/*
 * BEX Tracer shared collector. Identical copy at the top of every group file;
 * whichever file loads first installs it, the others reuse window.__bex.
 *
 * It runs from <head> before the page renders, so it can listen for events
 * extensions fire at load and plant bait elements that some extensions only
 * react to (a mailto link, a raw-JSON block, a large image, ...).
 */
(function () {
  if (window.__bex) return;
  var B = (window.__bex = { msgTypes: [], fdmClones: 0, nonce: String(Math.random()).slice(2) });

  window.addEventListener("message", function (e) {
    try {
      if (e.source === window && e.data && typeof e.data.type === "string") {
        B.msgTypes.push(e.data.type);
      }
    } catch { /* ignore */ }
  }, true);

  function el(tag, attrs, parent) {
    var n = document.createElement(tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    (parent || document.documentElement).appendChild(n);
    return n;
  }
  var HIDE = "position:absolute!important;left:-10000px!important;top:0!important;";

  // Must exist before document_idle content scripts scan the page.
  try {
    var box = el("div", { id: "bex-bait", style: HIDE, "aria-hidden": "true" });
    B.mailto = el("a", { href: "mailto:bex@example.com?subject=hi", id: "bex-mailto" }, box);
    B.mailto.textContent = "mail";
    var raw = el("div", { id: "jsonFormatterRaw" }, box);
    el("pre", {}, raw).textContent = JSON.stringify({ bexMarker: B.nonce });
    el("div", { id: "ch-53ee284d-920a-4b59-9d30-a60315b26836" }, box);
  } catch { /* ignore */ }

  function onReady() {
    try {
      // Large image for hover-button extensions (Pinterest needs >= 120x120).
      var c = document.createElement("canvas");
      c.width = c.height = 300;
      var g = c.getContext("2d");
      g.fillStyle = "#4a7"; g.fillRect(0, 0, 300, 300);
      g.fillStyle = "#fff"; g.fillRect(60, 60, 180, 180);
      B.img = el("img", {
        id: "bex-img", width: "300", height: "300", alt: "chart preview", src: c.toDataURL(),
        style: "position:absolute;left:0;top:2000px;" }, document.body);

      // Selection-cloning extensions (FDM) copy the selected nodes. Cloning a
      // defined custom element runs its constructor here, so every
      // construction after our own one is a copy made by someone else.
      var built = 0;
      customElements.define("bex-sel-probe", class extends HTMLElement {
        constructor() { super(); if (++built > 1) B.fdmClones++; }
      });
      var sel = el("div", { id: "bex-sel", style: HIDE }, document.body);
      el("bex-sel-probe", {}, sel).textContent = "selected text";
      window.getSelection().selectAllChildren(sel);
    } catch { /* ignore */ }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", onReady);
  else onReady();

  B.sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  B.safe = function (fn) { try { return !!fn(); } catch { return false; } };
  B.native = function (f) {
    try {
      return Function.prototype.toString.call(f).indexOf("[native code]") !== -1;
    } catch {
      return true;
    }
  };
})();

// Cosmetic bait: generic hiding rules that exist in only one blocker's default
// lists. Planted at load so the blockers' stylesheets have time to apply.
(function () {
  var B = window.__bex;
  if (!B || B.adBait) return;
  B.adBait = {};
  function plant() {
    var box = document.createElement("div");
    box.style.cssText = "position:absolute;left:-10000px;top:0;width:300px;";
    [
      ["adguard", "id", "pfx_interstitial"],
      ["abu1", "class", "wide_grey_ad_box"],
      ["abu2", "class", "widget-ad-codes"],
      ["abu3", "data-wpas-zoneid", "1"],
      ["abp1", "class", "jag8CityBio212023"],
      ["abp2", "class", "sctyyBTZN3nt5_true"],
      ["idcac1", "id", "cookie-notice"],
      ["idcac2", "class", "cookie-banner"],
    ].forEach(function (b) {
      var d = document.createElement("div");
      d.setAttribute(b[1], b[2]);
      d.textContent = "x";
      box.appendChild(d);
      B.adBait[b[0]] = d;
    });
    document.body.appendChild(box);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", plant);
  else plant();
})();

window.detect_ad_blockers = async function () {
  var B = window.__bex, r = {};
  function hidden(key) {
    var e = B.adBait && B.adBait[key];
    return !!e && (!e.isConnected || getComputedStyle(e).display === "none");
  }

  // Same-origin paths that one blocker's static network rules block and the
  // others don't (measured with each extension alone). Unblocked they 404;
  // blocked, fetch() rejects. Two of four must agree.
  var PROBES = {
    ubol: ["/hit.c?", "/cnvtr.js", "/imp2.js?", "/event.gif?"],
    pie: ["/dsgvocc.js", "/cookieok.js", "/dkmb_gdpr.js", "/eu_cookie.js"],
    adguardFamily: ["/getads?", "/getAditem", "/ab-a.js?v=", "/btag.min.js"],
    // Cookie-banner scripts blocked by IDCAC's and Pie's network rules.
    cookieScripts: ["/cmpcookie.js", "/cookie-bar.js", "/cookieaccept.js", "/iubenda_cs.js"],
    // EasyList paths blocked by ABP, uBOL, AdGuard and ABU alike.
    easylist: ["/468_80.", "/468x60-", "/760x90_", "/tagman/"],
  };
  function blocked(path) {
    var url = path + (path.indexOf("?") >= 0 ? "&" : "?") +
      "b=" + Math.random().toString(36).slice(2);
    return Promise.race([
      fetch(url, { cache: "no-store", credentials: "omit" }).then(
        function () { return false; },
        function () { return true; },
      ),
      B.sleep(3000).then(function () { return false; }),
    ]);
  }
  async function family(paths) {
    var hits = await Promise.all(paths.map(blocked));
    return hits.filter(Boolean).length >= 2;
  }

  var res = await Promise.all([
    family(PROBES.ubol), family(PROBES.pie), family(PROBES.adguardFamily), family(PROBES.easylist),
    family(PROBES.cookieScripts),
  ]);
  r["uBlock Origin Lite"] = res[0];
  r["Pie Adblock - A Powerful Free Ad Blocker"] = res[1];

  // AdGuard's subscribe.js cancels pointerdown on subscribe links (no isTrusted check).
  var adguardLink = B.safe(function () {
    var a = document.createElement("a");
    a.href = "adguard:subscribe?x=1";
    a.style.cssText = "position:absolute;left:-10000px;";
    document.body.appendChild(a);
    var ev = new PointerEvent("pointerdown", { bubbles: true, cancelable: true, button: 0 });
    var ok = !a.dispatchEvent(ev);
    a.remove();
    return ok;
  });
  var adguard = adguardLink || hidden("adguard");
  var abu = [hidden("abu1"), hidden("abu2"), hidden("abu3")].filter(Boolean).length >= 2;
  // The pair's shared network rules fired but neither specific signal did:
  // report both, which under MCC is never worse than reporting neither.
  if (res[2] && !adguard && !abu) adguard = abu = true;
  r["AdGuard AdBlocker"] = adguard;
  r["AdBlocker Ultimate"] = abu;

  // ABP: its anti-circumvention / acceptable-ads hiding rules, or EasyList
  // blocking that neither uBOL nor the AdGuard pair explains.
  r["Adblock Plus - free ad blocker"] = hidden("abp1") || hidden("abp2") ||
    (res[3] && !res[0] && !res[2]);

  // IDCAC's page scripts can be stopped by other extensions, but its network
  // rules still apply; Pie blocks the same paths, so only count them without Pie.
  r["I don't care about cookies"] = hidden("idcac1") || hidden("idcac2") ||
    B.safe(function () { return /(^|\s)idc0_\d+/.test(document.documentElement.className); }) ||
    (res[4] && !res[1]);

  // Privacy Badger registers a MAIN-world script that adds navigator.globalPrivacyControl.
  // It may register after the page loaded, so also check a fresh same-origin iframe.
  r["Privacy Badger"] = await new Promise(function (done) {
    try {
      var gpc = function (n) { return n.globalPrivacyControl === true && n.doNotTrack === "1"; };
      if (gpc(navigator)) return done(true);
      var f = document.createElement("iframe");
      f.style.cssText = "position:absolute;left:-10000px;width:10px;height:10px;";
      f.onload = function () {
        try { done(gpc(f.contentWindow.navigator)); }
        catch { done(false); }
        f.remove();
      };
      f.src = "/__bex_frame";
      document.body.appendChild(f);
      setTimeout(function () { done(false); }, 2500);
    } catch { done(false); }
  });
  return r;
};
