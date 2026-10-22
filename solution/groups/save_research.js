window.detect_save_research = async function () {
  var B = window.__bex, r = {};
  r["Send from Gmail (by Google)"] = B.safe(function () {
    return B.mailto.getAttribute("href").indexOf("https://mail.google.com/mail/") === 0;
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
  r["Save to Pinterest"] = B.safe(function () {
    return document.querySelector('span[data-test-id="pinterest-save-button"]');
  });
  return r;
};
