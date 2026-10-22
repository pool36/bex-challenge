window.detect_capture_recording = async function () {
  var B = window.__bex, r = {};
  r["Vimeo Record - Screen & Webcam Recorder"] = B.safe(function () {
    return document.querySelector(
      'link[rel="stylesheet"][href^="https://fonts.googleapis.com/css2?family=Inter+Tight"]',
    );
  });
  return r;
};
