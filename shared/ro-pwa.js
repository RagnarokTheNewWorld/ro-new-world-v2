/**
 * Register service worker + manifest helpers (Phase 9)
 */
(function () {
  "use strict";

  function ensureManifestLink() {
    if (document.querySelector('link[rel="manifest"]')) return;
    var link = document.createElement("link");
    link.rel = "manifest";
    link.href = "/manifest.webmanifest";
    document.head.appendChild(link);
  }

  function ensureThemeMeta() {
    if (!document.querySelector('meta[name="theme-color"]')) {
      var m = document.createElement("meta");
      m.name = "theme-color";
      m.content = "#1a3568";
      document.head.appendChild(m);
    }
    if (!document.querySelector('meta[name="apple-mobile-web-app-capable"]')) {
      var a = document.createElement("meta");
      a.name = "apple-mobile-web-app-capable";
      a.content = "yes";
      document.head.appendChild(a);
    }
  }

  function registerSW() {
    if (!("serviceWorker" in navigator)) return;
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(function (err) {
        console.warn("SW register failed", err);
      });
    });
  }

  ensureManifestLink();
  ensureThemeMeta();
  registerSW();
})();
