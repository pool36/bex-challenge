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
