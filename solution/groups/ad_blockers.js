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
