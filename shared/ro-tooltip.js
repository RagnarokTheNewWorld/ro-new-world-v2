/**
 * RO World Journey — in-game style tooltips
 * Desktop: hover | Mobile: long-press / focus
 * API: ROTooltip.show(html|opts, x, y) | hide() | attach(root)
 */
(function () {
  "use strict";

  var el = null;
  var hideTimer = null;
  var longPressTimer = null;
  var LONG_MS = 420;

  var RARITY = {
    common: "common",
    white: "common",
    uncommon: "uncommon",
    green: "uncommon",
    rare: "rare",
    blue: "rare",
    epic: "epic",
    purple: "epic",
    legendary: "legendary",
    orange: "legendary",
    unique: "unique",
    gold: "unique"
  };

  function ensureEl() {
    if (el && document.body.contains(el)) return el;
    el = document.getElementById("ro-tooltip");
    if (!el) {
      el = document.createElement("div");
      el.id = "ro-tooltip";
      el.className = "ro-tooltip";
      el.setAttribute("role", "tooltip");
      el.hidden = true;
      document.body.appendChild(el);
    }
    return el;
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function place(x, y) {
    var node = ensureEl();
    node.hidden = false;
    node.style.left = "0px";
    node.style.top = "0px";
    var rect = node.getBoundingClientRect();
    var pad = 12;
    var left = x + 14;
    var top = y + 14;
    if (left + rect.width > window.innerWidth - pad) left = x - rect.width - 10;
    if (top + rect.height > window.innerHeight - pad) top = y - rect.height - 10;
    left = clamp(left, pad, window.innerWidth - rect.width - pad);
    top = clamp(top, pad, window.innerHeight - rect.height - pad);
    node.style.left = left + "px";
    node.style.top = top + "px";
  }

  function buildHtml(opts) {
    if (typeof opts === "string") return opts;
    opts = opts || {};
    var rarity = RARITY[String(opts.rarity || "rare").toLowerCase()] || "rare";
    var html = "";
    html += '<div class="ro-tooltip-head">';
    if (opts.icon) {
      html += '<img class="ro-tooltip-icon" src="' + String(opts.icon).replace(/"/g, "") + '" alt="">';
    }
    html += "<div>";
    html += '<div class="ro-tooltip-name">' + escapeHtml(opts.name || "") + "</div>";
    if (opts.type) html += '<div class="ro-tooltip-type">' + escapeHtml(opts.type) + "</div>";
    if (opts.meta) html += '<div class="ro-tooltip-type">' + escapeHtml(opts.meta) + "</div>";
    html += "</div></div>";
    html += '<div class="ro-tooltip-body">';
    if (opts.stats && opts.stats.length) {
      html += '<div class="ro-tooltip-stats">';
      opts.stats.forEach(function (line) {
        html += '<div class="ro-tooltip-stat">' + escapeHtml(line) + "</div>";
      });
      html += "</div>";
    }
    if (opts.desc) {
      html += '<div class="ro-tooltip-desc">' + escapeHtml(opts.desc) + "</div>";
    }
    if (opts.html) html += opts.html;
    html += "</div>";
    ensureEl().setAttribute("data-rarity", rarity);
    return html;
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function show(content, x, y) {
    clearTimeout(hideTimer);
    var node = ensureEl();
    if (typeof content === "object" && content !== null && !Array.isArray(content)) {
      node.innerHTML = buildHtml(content);
      if (content.rarity) node.setAttribute("data-rarity", RARITY[String(content.rarity).toLowerCase()] || "rare");
    } else {
      node.innerHTML = buildHtml(String(content || ""));
      if (!node.getAttribute("data-rarity")) node.setAttribute("data-rarity", "rare");
    }
    place(x == null ? 0 : x, y == null ? 0 : y);
  }

  function hide() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(function () {
      var node = ensureEl();
      node.hidden = true;
      node.innerHTML = "";
    }, 40);
  }

  function hideNow() {
    clearTimeout(hideTimer);
    var node = ensureEl();
    node.hidden = true;
    node.innerHTML = "";
  }

  function readData(target) {
    var name = target.getAttribute("data-ro-name") || target.getAttribute("data-name") || target.getAttribute("aria-label") || "";
    var type = target.getAttribute("data-ro-type") || "";
    var meta = target.getAttribute("data-ro-meta") || "";
    var desc = target.getAttribute("data-ro-desc") || target.getAttribute("data-desc") || "";
    var icon = target.getAttribute("data-ro-icon") || "";
    var rarity = target.getAttribute("data-ro-rarity") || "rare";
    var statsRaw = target.getAttribute("data-ro-stats") || "";
    var stats = statsRaw ? statsRaw.split("|").map(function (s) { return s.trim(); }).filter(Boolean) : [];
    if (!name && !desc && !stats.length) return null;
    return { name: name, type: type, meta: meta, desc: desc, icon: icon, rarity: rarity, stats: stats };
  }

  function attach(root) {
    root = root || document;
    var coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;

    root.addEventListener("mouseover", function (e) {
      if (coarse) return;
      var t = e.target.closest && e.target.closest("[data-ro-tooltip], [data-ro-name]");
      if (!t) return;
      var data = readData(t);
      if (!data) return;
      show(data, e.clientX, e.clientY);
    });

    root.addEventListener("mousemove", function (e) {
      if (coarse) return;
      var node = ensureEl();
      if (node.hidden) return;
      if (e.target.closest && e.target.closest("[data-ro-tooltip], [data-ro-name], #ro-tooltip")) {
        place(e.clientX, e.clientY);
      }
    });

    root.addEventListener("mouseout", function (e) {
      if (coarse) return;
      var t = e.target.closest && e.target.closest("[data-ro-tooltip], [data-ro-name]");
      if (!t) return;
      var to = e.relatedTarget;
      if (to && t.contains(to)) return;
      hide();
    });

    root.addEventListener("pointerdown", function (e) {
      if (!coarse) return;
      var t = e.target.closest && e.target.closest("[data-ro-tooltip], [data-ro-name]");
      if (!t) return;
      clearTimeout(longPressTimer);
      longPressTimer = setTimeout(function () {
        var data = readData(t);
        if (!data) return;
        show(data, e.clientX || 0, e.clientY || 0);
      }, LONG_MS);
    });

    root.addEventListener("pointerup", function () {
      clearTimeout(longPressTimer);
    });
    root.addEventListener("pointercancel", function () {
      clearTimeout(longPressTimer);
    });

    root.addEventListener("click", function (e) {
      var node = ensureEl();
      if (!node.hidden && !(e.target.closest && e.target.closest("#ro-tooltip, [data-ro-tooltip], [data-ro-name]"))) {
        hideNow();
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") hideNow();
    });
  }

  // Restyle legacy #tooltip used by skill/equipment when it becomes visible
  function observeLegacyTooltip() {
    var legacy = document.getElementById("tooltip");
    if (!legacy) return;
    legacy.classList.add("ro-legacy-tooltip");
    if (!legacy.getAttribute("data-rarity")) legacy.setAttribute("data-rarity", "rare");
  }

  window.ROTooltip = {
    show: show,
    hide: hide,
    hideNow: hideNow,
    attach: attach,
    buildHtml: buildHtml,
    RARITY: RARITY
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      ensureEl();
      observeLegacyTooltip();
      attach(document);
    }, { once: true });
  } else {
    ensureEl();
    observeLegacyTooltip();
    attach(document);
  }
})();
