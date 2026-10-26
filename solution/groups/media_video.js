// media_video. Checked against the pinned code of all 9 extensions.
//
// Reported false, nothing reaches the bait page: Video Downloader Professional
// (passive scanner, writes DOM only on a popup download), Video Download Helper
// (content scripts only on listed video sites), Picture-in-Picture Extension
// (its autoPip media-session handler cannot be read by the page), h264ify
// (YouTube only), Volume Booster (content.js waits for a message nothing
// sends), Volume Master (no page code), AHA Music (content.js is empty).

// Video Downloader Plus's content script looks for a page thumbnail in the top
// frame: og/twitter meta, then JSON-LD, then it fetches the href of
// link[type="application/json+oembed"] (polling 4 x 1 s). The bait page has
// none of the former, so it fetches our nonce URL. The unknown rel keeps the
// browser itself from requesting it.
(function () {
  var B = window.__bex;
  if (!B || B.vdpBait) return;
  B.vdpBait = true;
  try {
    B.oembedUrl = new URL("/__bex_oembed_" + B.nonce + ".json", location.href).href;
    var l = document.createElement("link");
    l.setAttribute("rel", "x-bex-bait");
    l.setAttribute("type", "application/json+oembed");
    l.setAttribute("href", B.oembedUrl);
    (document.head || document.documentElement).appendChild(l);
  } catch { /* ignore */ }
})();

window.detect_media_video = async function () {
  var B = window.__bex, r = {};

  r["Video Downloader Plus"] = B.safe(function () {
    return performance.getEntriesByName(B.oembedUrl).length > 0;
  });

  // FDM's contextmenuhlpr.js clones the selection with Range.cloneContents()
  // on every selectionchange and window focus, without checking isTrusted.
  // Cloning a defined custom element runs its constructor with the clone
  // already inside the DocumentFragment, so each FDM clone is counted here
  // synchronously; requiring both triggers keeps it specific to FDM.
  var syncProbe = B.safe(function () {
    var fired = false;
    if (!customElements.get("bex-fdm-probe")) {
      customElements.define("bex-fdm-probe", class extends HTMLElement {
        constructor() {
          super();
          if (this.parentNode && this.parentNode.nodeType === 11) window.__bex.fdmProbe++;
        }
      });
    }
    B.fdmProbe = 0;
    var host = document.createElement("div");
    host.style.cssText = "position:absolute!important;left:-10000px!important;top:0!important;";
    host.appendChild(document.createElement("bex-fdm-probe")).textContent = "selected text";
    document.body.appendChild(host);
    try {
      window.getSelection().selectAllChildren(host);
      document.dispatchEvent(new Event("selectionchange"));
      var afterSelection = B.fdmProbe;
      window.dispatchEvent(new FocusEvent("focus"));
      fired = afterSelection >= 1 && B.fdmProbe >= 2;
    } finally {
      host.remove();
    }
    return fired;
  });
  r["Free Download Manager"] = B.fdmClones > 0 || syncProbe;
  return r;
};
