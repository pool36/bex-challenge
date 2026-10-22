window.detect_identity_security = async function () {
  var B = window.__bex, r = {};
  r["Trust Wallet"] = B.safe(function () {
    return document.getElementById("in-page-channel-node-id");
  });

  // Microsoft SSO answers a MessagePort handshake on its fixed channel.
  r["Microsoft Single Sign On"] = await new Promise(function (done) {
    try {
      var mc = new MessageChannel();
      mc.port1.onmessage = function (e) {
        done(!!(e.data && e.data.body && e.data.body.method === "HandshakeResponse"));
      };
      var msg = {
        channel: "53ee284d-920a-4b59-9d30-a60315b26836",
        responseId: 1,
        body: { method: "Handshake" },
      };
      window.postMessage(msg, "*", [mc.port2]);
      setTimeout(function () { done(false); }, 800);
    } catch { done(false); }
  });
  return r;
};
