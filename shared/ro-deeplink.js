/**
 * Deep-link ?q= / ?job= / ?map= into tool UIs (post Phase 10)
 */
(function () {
  "use strict";

  function params() {
    try {
      return new URLSearchParams(window.location.search);
    } catch (e) {
      return new URLSearchParams();
    }
  }

  function setInputValue(el, value) {
    if (!el) return false;
    var proto = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")
      || Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
    if (proto && proto.set) proto.set.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: "Enter" }));
    return true;
  }

  function setSelectValue(el, value) {
    if (!el) return false;
    var match = null;
    for (var i = 0; i < el.options.length; i++) {
      var opt = el.options[i];
      if (String(opt.value) === String(value) || String(opt.textContent).trim().toLowerCase() === String(value).toLowerCase()) {
        match = opt.value;
        break;
      }
    }
    if (match == null) return false;
    el.value = match;
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function tryApply() {
    var p = params();
    var q = p.get("q") || p.get("search") || "";
    var job = p.get("job") || "";
    var map = p.get("map") || "";
    var applied = false;

    if (q) {
      var ids = [
        "equipment-filter-keyword",
        "monster-search",
        "card-search",
        "hub-search"
      ];
      for (var i = 0; i < ids.length; i++) {
        var el = document.getElementById(ids[i]);
        if (el) {
          applied = setInputValue(el, q) || applied;
        }
      }
      // generic search inputs
      document.querySelectorAll('input[type="search"]').forEach(function (inp) {
        if (!inp.value) applied = setInputValue(inp, q) || applied;
      });
    }

    if (job) {
      var jobSelect = document.getElementById("job-select")
        || document.querySelector("select[name='job']")
        || document.querySelector("[data-job-select]");
      if (jobSelect) applied = setSelectValue(jobSelect, job) || applied;
      // skill planner may use buttons
      document.querySelectorAll("[data-job-id], [data-job]").forEach(function (btn) {
        var id = btn.getAttribute("data-job-id") || btn.getAttribute("data-job");
        if (String(id) === String(job)) {
          btn.click();
          applied = true;
        }
      });
    }

    if (map) {
      var mapSelect = document.getElementById("map-select");
      if (mapSelect && mapSelect.options.length > 1) {
        applied = setSelectValue(mapSelect, map) || applied;
      }
    }

    return applied;
  }

  function boot() {
    var attempts = 0;
    var max = 50;
    function tick() {
      attempts++;
      var ok = tryApply();
      // keep trying a while — tools load JSON async
      if (!ok && attempts < max) {
        setTimeout(tick, 200);
      } else if (ok && attempts < 15) {
        // re-apply once more after data may re-render filters
        setTimeout(tryApply, 400);
        setTimeout(tryApply, 1200);
      }
    }
    tick();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }

  window.RODeeplink = { apply: tryApply };
})();
