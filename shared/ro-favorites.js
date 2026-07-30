/**
 * RO World Journey — LocalStorage favorites / bookmarks (Phase 6)
 * Schema: { type, id, name, path, addedAt }
 */
(function () {
  "use strict";

  var KEY = "ro_favorites_v1";
  var MAX = 200;
  var ui = { root: null, list: null };

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function write(list) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
    } catch (e) {
      console.warn("RO favorites save failed", e);
    }
    document.dispatchEvent(new CustomEvent("ro-favorites-changed", { detail: { list: list } }));
    syncStars();
  }

  function keyOf(item) {
    return String(item.type || "") + "::" + String(item.id || item.path || item.name || "");
  }

  function isFav(item) {
    var k = keyOf(item);
    return read().some(function (f) { return keyOf(f) === k; });
  }

  function add(item) {
    if (!item || !item.name) return false;
    var list = read();
    var k = keyOf(item);
    if (list.some(function (f) { return keyOf(f) === k; })) return true;
    list.unshift({
      type: String(item.type || "item"),
      id: String(item.id != null ? item.id : item.name),
      name: String(item.name),
      path: String(item.path || "/"),
      addedAt: Date.now(),
      extra: item.extra ? String(item.extra).slice(0, 120) : ""
    });
    write(list);
    return true;
  }

  function remove(item) {
    var k = keyOf(item);
    write(read().filter(function (f) { return keyOf(f) !== k; }));
  }

  function toggle(item) {
    if (isFav(item)) {
      remove(item);
      return false;
    }
    add(item);
    return true;
  }

  function clearAll() {
    write([]);
  }

  function exportJson() {
    return JSON.stringify(read(), null, 2);
  }

  function importJson(text) {
    var data = JSON.parse(text);
    if (!Array.isArray(data)) throw new Error("Expected array");
    var cleaned = [];
    data.forEach(function (item) {
      if (!item || !item.name) return;
      cleaned.push({
        type: String(item.type || "item"),
        id: String(item.id != null ? item.id : item.name),
        name: String(item.name),
        path: String(item.path || "/"),
        addedAt: item.addedAt || Date.now(),
        extra: item.extra ? String(item.extra).slice(0, 120) : ""
      });
    });
    write(cleaned.slice(0, MAX));
    return cleaned.length;
  }

  var TYPE_LABEL = {
    tool: "Tool",
    skill: "Skill",
    job: "Job",
    equip: "Equip",
    card: "Card",
    monster: "Monster",
    map: "Map",
    event: "Event",
    quiz: "Quiz",
    affix: "Affix",
    item: "Item"
  };

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function ensureUI() {
    if (ui.root) return ui;
    var root = document.createElement("div");
    root.id = "ro-fav-panel";
    root.className = "ro-fav-panel";
    root.innerHTML =
      '<div class="ro-fav-panel-inner ro-window">' +
      '  <div class="ro-window-title"><span class="ro-window-title-text">Favorites</span>' +
      '    <button type="button" class="ro-win-btn ro-fav-close" aria-label="Close">×</button></div>' +
      '  <div class="ro-window-body">' +
      '    <div class="ro-fav-toolbar">' +
      '      <button type="button" class="ro-btn" data-ro-fav-export>Export</button>' +
      '      <button type="button" class="ro-btn" data-ro-fav-import>Import</button>' +
      '      <button type="button" class="ro-btn" data-ro-fav-clear>Clear</button>' +
      "    </div>" +
      '    <div class="ro-fav-status" id="ro-fav-status"></div>' +
      '    <div class="ro-fav-list" id="ro-fav-list"></div>' +
      '    <input type="file" accept="application/json,.json" id="ro-fav-file" hidden>' +
      "  </div>" +
      "</div>";
    document.body.appendChild(root);
    ui.root = root;
    ui.list = root.querySelector("#ro-fav-list");
    ui.status = root.querySelector("#ro-fav-status");
    root.querySelector(".ro-fav-close").addEventListener("click", close);
    root.addEventListener("click", function (e) {
      if (e.target === root) close();
    });
    root.querySelector("[data-ro-fav-export]").addEventListener("click", function () {
      var blob = new Blob([exportJson()], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "ro-favorites.json";
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
    });
    root.querySelector("[data-ro-fav-import]").addEventListener("click", function () {
      root.querySelector("#ro-fav-file").click();
    });
    root.querySelector("#ro-fav-file").addEventListener("change", function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var n = importJson(String(reader.result || ""));
          ui.status.textContent = "Imported " + n + " favorites";
          renderList();
        } catch (err) {
          ui.status.textContent = "Import failed";
        }
        e.target.value = "";
      };
      reader.readAsText(file);
    });
    root.querySelector("[data-ro-fav-clear]").addEventListener("click", function () {
      if (confirm("Clear all favorites?")) {
        clearAll();
        renderList();
      }
    });
    return ui;
  }

  function renderList() {
    ensureUI();
    var list = read();
    ui.status.textContent = list.length ? list.length + " saved" : "No favorites yet — star tools, search hits, or marked rows";
    if (!list.length) {
      ui.list.innerHTML = '<div class="ro-fav-empty">Empty. Use ★ to bookmark items.</div>';
      return;
    }
    ui.list.innerHTML = list.map(function (f) {
      return (
        '<div class="ro-fav-row">' +
        '<a class="ro-fav-link" href="' + escapeHtml(f.path) + '">' +
        '<span class="ro-fav-type">' + escapeHtml(TYPE_LABEL[f.type] || f.type) + "</span>" +
        '<span class="ro-fav-name">' + escapeHtml(f.name) + "</span>" +
        (f.extra ? '<span class="ro-fav-extra">' + escapeHtml(f.extra) + "</span>" : "") +
        "</a>" +
        '<button type="button" class="ro-fav-star is-on" data-ro-fav-remove title="Remove" ' +
        'data-type="' + escapeHtml(f.type) + '" data-id="' + escapeHtml(f.id) + '" data-name="' + escapeHtml(f.name) + '" data-path="' + escapeHtml(f.path) + '">★</button>' +
        "</div>"
      );
    }).join("");
    ui.list.querySelectorAll("[data-ro-fav-remove]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        remove({
          type: btn.getAttribute("data-type"),
          id: btn.getAttribute("data-id"),
          name: btn.getAttribute("data-name"),
          path: btn.getAttribute("data-path")
        });
        renderList();
      });
    });
  }

  function open() {
    ensureUI();
    renderList();
    ui.root.classList.add("is-open");
  }

  function close() {
    if (ui.root) ui.root.classList.remove("is-open");
  }

  function itemFromEl(el) {
    if (!el) return null;
    var name = el.getAttribute("data-ro-name") || el.getAttribute("data-fav-name") || el.getAttribute("aria-label");
    var path = el.getAttribute("data-ro-path") || el.getAttribute("data-fav-path") || el.getAttribute("href") || location.pathname;
    var type = el.getAttribute("data-ro-type") || el.getAttribute("data-fav-type") || "item";
    var id = el.getAttribute("data-ro-id") || el.getAttribute("data-fav-id") || name;
    var extra = el.getAttribute("data-ro-desc") || el.getAttribute("data-ro-extra") || "";
    if (!name && el.classList.contains("hub-card")) {
      var t = el.querySelector(".hub-card-title");
      name = t ? t.textContent.trim() : "";
      path = el.getAttribute("href") || path;
      type = "tool";
      id = path;
    }
    if (!name) return null;
    return { type: type, id: id, name: name, path: path, extra: extra };
  }

  function makeStarButton(item) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ro-fav-star" + (isFav(item) ? " is-on" : "");
    btn.title = isFav(item) ? "Remove favorite" : "Add favorite";
    btn.setAttribute("aria-label", btn.title);
    btn.textContent = isFav(item) ? "★" : "☆";
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var on = toggle(item);
      btn.classList.toggle("is-on", on);
      btn.textContent = on ? "★" : "☆";
      btn.title = on ? "Remove favorite" : "Add favorite";
    });
    return btn;
  }

  function decorateHubCards() {
    document.querySelectorAll(".hub-card[href]").forEach(function (card) {
      if (card.querySelector(".ro-fav-star")) return;
      var item = itemFromEl(card);
      if (!item) return;
      item.type = "tool";
      item.id = card.getAttribute("href");
      var bar = card.querySelector(".hub-card-titlebar");
      if (bar) {
        var star = makeStarButton(item);
        star.classList.add("ro-fav-star--titlebar");
        bar.appendChild(star);
      }
    });
  }

  function decorateSearchHits() {
    // When search results render, stars are added via mutation observer / event
  }

  function syncStars() {
    document.querySelectorAll(".ro-fav-star[data-bound-path]").forEach(function (btn) {
      var item = {
        type: btn.getAttribute("data-type") || "item",
        id: btn.getAttribute("data-id") || "",
        name: btn.getAttribute("data-name") || "",
        path: btn.getAttribute("data-bound-path") || ""
      };
      var on = isFav(item);
      btn.classList.toggle("is-on", on);
      btn.textContent = on ? "★" : "☆";
    });
    // hub cards
    document.querySelectorAll(".hub-card[href]").forEach(function (card) {
      var star = card.querySelector(".ro-fav-star");
      if (!star) return;
      var item = itemFromEl(card);
      if (!item) return;
      item.type = "tool";
      item.id = card.getAttribute("href");
      var on = isFav(item);
      star.classList.toggle("is-on", on);
      star.textContent = on ? "★" : "☆";
    });
  }

  function injectLauncher() {
    document.querySelectorAll(".header-controls").forEach(function (hc) {
      if (hc.querySelector("[data-ro-fav-open]")) return;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ro-btn";
      btn.setAttribute("data-ro-fav-open", "1");
      btn.textContent = "★ Fav";
      btn.title = "Favorites";
      btn.addEventListener("click", open);
      // place before search if present
      var searchBtn = hc.querySelector("[data-ro-search-open]");
      if (searchBtn) hc.insertBefore(btn, searchBtn);
      else hc.appendChild(btn);
    });
  }

  // Enhance ROSearch results with stars when panel opens/updates
  function hookSearchResults() {
    var obs = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          if (!(node instanceof HTMLElement)) return;
          var hits = node.classList && node.classList.contains("ro-search-hit")
            ? [node]
            : (node.querySelectorAll ? node.querySelectorAll(".ro-search-hit") : []);
          hits.forEach(function (hit) {
            if (hit.querySelector(".ro-fav-star")) return;
            var nameEl = hit.querySelector(".ro-search-hit-name");
            var typeEl = hit.querySelector(".ro-search-hit-type");
            var extraEl = hit.querySelector(".ro-search-hit-extra");
            var item = {
              type: (typeEl && typeEl.textContent || "item").toLowerCase(),
              id: hit.getAttribute("href") || (nameEl && nameEl.textContent) || "",
              name: nameEl ? nameEl.textContent.trim() : "",
              path: hit.getAttribute("href") || "/",
              extra: extraEl ? extraEl.textContent.trim() : ""
            };
            // map label back to type key
            var labelMap = { tool: "tool", skill: "skill", job: "job", equip: "equip", card: "card", monster: "monster", map: "map", event: "event", quiz: "quiz", affix: "affix" };
            item.type = labelMap[item.type] || item.type;
            var star = makeStarButton(item);
            star.setAttribute("data-bound-path", item.path);
            star.setAttribute("data-type", item.type);
            star.setAttribute("data-id", item.id);
            star.setAttribute("data-name", item.name);
            hit.appendChild(star);
          });
        });
      });
    });
    var start = function () {
      var panel = document.getElementById("ro-search-results");
      if (panel) obs.observe(panel, { childList: true, subtree: true });
    };
    start();
    // search panel may be created later
    document.addEventListener("click", function (e) {
      if (e.target && e.target.closest && e.target.closest("[data-ro-search-open]")) {
        setTimeout(start, 300);
      }
    });
  }

  // Generic: elements with data-ro-fav="1"
  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest("[data-ro-fav-toggle]");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    var host = btn.closest("[data-ro-name], [data-fav-name], .hub-card") || btn;
    var item = itemFromEl(host) || {
      type: btn.getAttribute("data-type") || "item",
      id: btn.getAttribute("data-id") || "",
      name: btn.getAttribute("data-name") || "",
      path: btn.getAttribute("data-path") || location.pathname
    };
    if (!item.name) return;
    var on = toggle(item);
    btn.classList.toggle("is-on", on);
    if (btn.classList.contains("ro-fav-star")) btn.textContent = on ? "★" : "☆";
  });

  window.ROFavorites = {
    list: read,
    add: add,
    remove: remove,
    toggle: toggle,
    isFav: isFav,
    clear: clearAll,
    exportJson: exportJson,
    importJson: importJson,
    open: open,
    close: close
  };

  function boot() {
    injectLauncher();
    decorateHubCards();
    hookSearchResults();
    document.addEventListener("ro-favorites-changed", function () {
      if (ui.root && ui.root.classList.contains("is-open")) renderList();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
