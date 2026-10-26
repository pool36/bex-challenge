// save_research. Checked against the pinned code of all 14 extensions.
//
// Reported false, nothing reaches the bait page without a real user action:
// Scribbr (main.js only answers popup messages), PrintFriendly (action, command
// or context menu; touchpoint scripts need an ungranted optional permission),
// QR Code Generator (context menu only), The QR Code Generator (activeTab only),
// Save to Google Drive (upload page after a click), OneNote Web Clipper (marker
// only on OneNote hosts), Notion Web Clipper (popup only), The Camelizer
// (camelcamelcamel URLs only, no host access here), Exporter for Followers
// (Instagram only), GMass (Gmail only).

// Kami's global.js (all pages, document_end) treats any page holding this
// Schoology theme <link> as Schoology and injects its markers into <head>.
// Planted while <head> parses, so it is in place before document_end; the
// unknown rel keeps the browser from requesting it.
(function () {
  var B = window.__bex;
  if (!B || B.kamiBait) return;
  B.kamiBait = true;
  try {
    var l = document.createElement("link");
    l.setAttribute("rel", "x-bex-bait");
    l.setAttribute("href", "/sites/all/themes/schoology_theme/print.css");
    (document.head || document.documentElement).appendChild(l);
  } catch { /* ignore */ }
})();

window.detect_save_research = async function () {
  var B = window.__bex, r = {};
  // Rewrites mailto links to .../mail/?view=cm or, with a domain set, .../a/<domain>/mail/.
  r["Send from Gmail (by Google)"] = B.safe(function () {
    return B.mailto.getAttribute("href").indexOf("https://mail.google.com/") === 0;
  });

  r["Kami for Google Chrome"] = B.safe(function () {
    var tick = document.getElementById("tick-url");
    return (tick && /^chrome-extension:\/\/[a-p]{32}\/images\/tick\.svg$/
      .test(tick.getAttribute("data-tick-url") || "")) ||
      document.getElementById("kami-hide-create-assignment-button") ||
      document.querySelector(
        'link[href^="chrome-extension://"][href$="/assets/schoology_page_script.css"],' +
        'script[src^="chrome-extension://"][src$="/schoology_page_script.js"]',
      );
  });

  try {
    var ddm = { detail: { action: "TestCommunication" } };
    document.dispatchEvent(new CustomEvent("DDMRequestEvent", ddm));
  } catch { /* ignore */ }
  try {
    B.img.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
  } catch { /* ignore */ }
  await B.sleep(400);
  r["Scopus Document Download Manager"] = B.safe(function () {
    return document.getElementById("DDMExtension-testelementid");
  });

  function pinButton() {
    return document.querySelector('span[data-test-id="pinterest-save-button"]');
  }
  // Pinterest decides per hover; retry once with a pointer position inside the image.
  if (!B.safe(pinButton)) {
    try {
      var rect = B.img.getBoundingClientRect();
      var at = {
        bubbles: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
      };
      B.img.dispatchEvent(new MouseEvent("mouseover", at));
      B.img.dispatchEvent(new MouseEvent("mousemove", at));
    } catch { /* ignore */ }
    await B.sleep(200);
  }
  r["Save to Pinterest"] = B.safe(pinButton);
  return r;
};
