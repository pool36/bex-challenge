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

window.detect_developer_tools = async function () {
  var B = window.__bex, r = {};
  r["SEOquake: On-Page SEO Checker"] = B.safe(function () {
    return document.querySelector("seoquake-seobar, [data-seoquake-seobar-host]") ||
      B.msgTypes.some(function (t) { return /:seobar:wxt:content-script-started$/.test(t); });
  });
  // JSON Formatter's MAIN-world script parses our planted #jsonFormatterRaw into window.json.
  r["JSON Formatter"] = B.safe(function () {
    return window.json && window.json.bexMarker === B.nonce;
  });
  return r;
};
