/**
 * Maps mobile chrome: filter bottom sheet toggle (Phase 8)
 */
(function () {
  "use strict";

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else fn();
  }

  ready(function () {
    var stack = document.querySelector(".map-filter-stack");
    var shell = document.getElementById("map-shell");
    if (!stack || !shell) return;

    document.body.classList.add("map-page");

    var btn = document.createElement("button");
    btn.type = "button";
    btn.id = "map-mobile-filters-btn";
    btn.className = "map-mobile-filters-btn";
    btn.textContent = "Filters";
    btn.setAttribute("aria-expanded", "false");
    shell.appendChild(btn);

    var backdrop = document.createElement("div");
    backdrop.className = "map-mobile-sheet-backdrop";
    document.body.appendChild(backdrop);

    function setOpen(open) {
      stack.classList.toggle("is-open", open);
      backdrop.classList.toggle("is-on", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.textContent = open ? "Close" : "Filters";
    }

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      setOpen(!stack.classList.contains("is-open"));
    });

    // Tap handle area (pseudo title)
    stack.addEventListener("click", function (e) {
      // only toggle when clicking the stack padding/header region, not controls
      if (e.target === stack) setOpen(!stack.classList.contains("is-open"));
    });

    backdrop.addEventListener("click", function () {
      setOpen(false);
    });

    // Deep-link ?map=
    try {
      var params = new URLSearchParams(location.search);
      var mapId = params.get("map");
      var select = document.getElementById("map-select");
      if (mapId && select) {
        var tries = 0;
        var t = setInterval(function () {
          tries++;
          if ([].some.call(select.options, function (o) { return String(o.value) === String(mapId); })) {
            select.value = String(mapId);
            select.dispatchEvent(new Event("change", { bubbles: true }));
            clearInterval(t);
          }
          if (tries > 40) clearInterval(t);
        }, 150);
      }
    } catch (e) {}
  });
})();
