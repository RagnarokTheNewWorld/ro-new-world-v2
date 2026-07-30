/**
 * RO World Journey — cross-links graph (Phase 7)
 * Monster ↔ Card/Item drops, Map ↔ Monster spawns
 */
(function () {
  "use strict";

  var graph = null;
  var loading = null;
  var CACHE = "ro_links_graph_v1";

  function locale() {
    var loc = window.RO_ACTIVE_LOCALE || localStorage.getItem("ro_lang") || "en-US";
    if (window.RO_NORMALIZE_LOCALE) {
      try { loc = window.RO_NORMALIZE_LOCALE(loc) || loc; } catch (e) {}
    }
    return loc;
  }

  function fetchJson(url) {
    return fetch(url, { credentials: "same-origin" }).then(function (r) {
      if (!r.ok) throw new Error(String(r.status));
      return r.json();
    });
  }

  function emptyGraph() {
    return {
      monsterById: {},       // id -> { id, name }
      cardById: {},          // item_id -> { id, name }
      mapById: {},           // map_id -> { id, name }
      monsterDrops: {},      // monsterId -> [{ id, name, kind }]
      itemDroppedBy: {},     // itemId -> [{ id, name }] monsters
      mapMonsters: {},       // mapId -> [{ id, name }]
      monsterMaps: {},       // monsterId -> [{ id, name }]
      monsterByName: {}      // lower name -> id
    };
  }

  function addList(map, key, item) {
    key = String(key);
    if (!map[key]) map[key] = [];
    var id = String(item.id);
    if (map[key].some(function (x) { return String(x.id) === id; })) return;
    map[key].push(item);
  }

  function buildGraph(monstersData, mapsIndex, spawns, cardsData) {
    var g = emptyGraph();

    (cardsData.cards || []).forEach(function (c) {
      g.cardById[String(c.id)] = { id: c.id, name: c.name, type: "card" };
    });

    var mapConfigs = (mapsIndex && mapsIndex.map_configs) || {};
    Object.keys(mapConfigs).forEach(function (k) {
      var m = mapConfigs[k] || {};
      var id = m.map_id != null ? m.map_id : k;
      g.mapById[String(id)] = { id: id, name: m.name || String(id) };
    });

    (monstersData.monsters || []).forEach(function (mon) {
      if (!mon || mon.id == null) return;
      var mid = String(mon.id);
      var mname = mon.name || mid;
      g.monsterById[mid] = { id: mon.id, name: mname };
      if (mname) g.monsterByName[mname.toLowerCase()] = mon.id;

      function considerDrop(d, kind) {
        if (!d) return;
        var iid = d.item_id != null ? d.item_id : d.id;
        var iname = d.name || String(iid);
        if (iid == null) return;
        addList(g.monsterDrops, mid, {
          id: iid,
          name: iname,
          kind: kind || d.kind || "item",
          isCard: !!(g.cardById[String(iid)] || /card/i.test(iname))
        });
        addList(g.itemDroppedBy, String(iid), { id: mon.id, name: mname });
      }

      (mon.drop_rate_entries || []).forEach(function (d) { considerDrop(d, d.kind || "drop"); });
      (mon.drops || []).forEach(function (d) { considerDrop(d, "drop"); });
      if (mon.guaranteed_card) considerDrop(mon.guaranteed_card, "card");
    });

    var views = (spawns && spawns.views) || {};
    Object.keys(views).forEach(function (key) {
      var view = views[key] || {};
      var mapId = view.map_id != null ? view.map_id : key;
      var mapMeta = g.mapById[String(mapId)] || { id: mapId, name: String(mapId) };
      g.mapById[String(mapId)] = mapMeta;
      (view.monsters || []).forEach(function (sm) {
        var sid = sm.monster_id != null ? sm.monster_id : sm.id;
        var sname = sm.name || String(sid);
        if (sid == null) return;
        // resolve album id by name if possible
        var albumId = g.monsterByName[String(sname).toLowerCase()];
        var resolvedId = albumId != null ? albumId : sid;
        var resolvedName = (g.monsterById[String(resolvedId)] || {}).name || sname;
        addList(g.mapMonsters, String(mapId), { id: resolvedId, name: resolvedName });
        addList(g.monsterMaps, String(resolvedId), { id: mapId, name: mapMeta.name });
        // also index raw spawn id
        if (String(resolvedId) !== String(sid)) {
          addList(g.monsterMaps, String(sid), { id: mapId, name: mapMeta.name });
        }
      });
    });

    return g;
  }

  function loadGraph(force) {
    if (graph && !force) return Promise.resolve(graph);
    if (loading) return loading;

    if (!force) {
      try {
        var cached = sessionStorage.getItem(CACHE + "_" + locale());
        if (cached) {
          graph = JSON.parse(cached);
          return Promise.resolve(graph);
        }
      } catch (e) {}
    }

    var loc = locale();
    loading = Promise.all([
      fetchJson("/sea/monster-album/data/monster_album_" + loc + ".json").catch(function () {
        return fetchJson("/sea/monster-album/data/monster_album_en-US.json");
      }),
      fetchJson("/sea/maps/map_index_" + loc + ".json").catch(function () {
        return fetchJson("/sea/maps/map_index_en-US.json");
      }),
      fetchJson("/sea/maps/map_monster_spawns_" + loc + ".json").catch(function () {
        return fetchJson("/sea/maps/map_monster_spawns_en-US.json");
      }),
      fetchJson("/sea/cards/card_fusion_simulator_" + loc + ".json").catch(function () {
        return fetchJson("/sea/cards/card_fusion_simulator_en-US.json");
      })
    ]).then(function (arr) {
      graph = buildGraph(arr[0], arr[1], arr[2], arr[3]);
      try {
        sessionStorage.setItem(CACHE + "_" + locale(), JSON.stringify(graph));
      } catch (e) {}
      loading = null;
      return graph;
    }).catch(function (err) {
      console.warn("RO links graph failed", err);
      graph = emptyGraph();
      loading = null;
      return graph;
    });
    return loading;
  }

  function linkToMonster(id, name) {
    var q = name || id;
    return "/sea/monster_album/?q=" + encodeURIComponent(q);
  }
  function linkToMap(id, name) {
    return "/sea/maps/?map=" + encodeURIComponent(id);
  }
  function linkToCard(id, name) {
    return "/sea/cards/?q=" + encodeURIComponent(name || id);
  }
  function linkToEquip(id, name) {
    return "/sea/equipment/?q=" + encodeURIComponent(name || id);
  }

  function chipsHtml(title, items, hrefFn) {
    if (!items || !items.length) return "";
    var max = 12;
    var slice = items.slice(0, max);
    var html = '<div class="ro-links-group"><div class="ro-links-group-title">' + escapeHtml(title) + '</div><div class="ro-links-chips">';
    slice.forEach(function (it) {
      var href = hrefFn(it);
      html += '<a class="ro-link-chip" href="' + href + '">' + escapeHtml(it.name || it.id) + "</a>";
    });
    if (items.length > max) {
      html += '<span class="ro-link-chip ro-link-chip--more">+' + (items.length - max) + "</span>";
    }
    html += "</div></div>";
    return html;
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderForMonster(monsterId) {
    return loadGraph().then(function (g) {
      var mid = String(monsterId);
      var drops = g.monsterDrops[mid] || [];
      var maps = g.monsterMaps[mid] || [];
      var cards = drops.filter(function (d) { return d.isCard || d.kind === "card"; });
      var items = drops.filter(function (d) { return !d.isCard && d.kind !== "card"; });
      var html = "";
      html += chipsHtml("Spawns on", maps, function (m) { return linkToMap(m.id, m.name); });
      html += chipsHtml("Cards", cards, function (c) { return linkToCard(c.id, c.name); });
      html += chipsHtml("Drops", items, function (i) {
        return (g.cardById[String(i.id)] ? linkToCard : linkToEquip)(i.id, i.name);
      });
      return html;
    });
  }

  function renderForItem(itemId) {
    return loadGraph().then(function (g) {
      var iid = String(itemId);
      var monsters = g.itemDroppedBy[iid] || [];
      return chipsHtml("Dropped by", monsters, function (m) { return linkToMonster(m.id, m.name); });
    });
  }

  function renderForMap(mapId) {
    return loadGraph().then(function (g) {
      var monsters = g.mapMonsters[String(mapId)] || [];
      return chipsHtml("Monsters", monsters, function (m) { return linkToMonster(m.id, m.name); });
    });
  }

  function renderPanel(html) {
    var panel = document.getElementById("ro-links-panel");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "ro-links-panel";
      panel.className = "ro-links-panel ro-window";
      panel.innerHTML =
        '<div class="ro-window-title"><span class="ro-window-title-text">Related</span>' +
        '<button type="button" class="ro-win-btn" id="ro-links-close">×</button></div>' +
        '<div class="ro-window-body" id="ro-links-body"></div>';
      document.body.appendChild(panel);
      panel.querySelector("#ro-links-close").addEventListener("click", function () {
        panel.classList.remove("is-open");
      });
    }
    var body = panel.querySelector("#ro-links-body");
    body.innerHTML = html || '<div class="ro-links-empty">No linked data found.</div>';
    panel.classList.add("is-open");
  }

  function showRelated(opts) {
    opts = opts || {};
    var p;
    if (opts.monsterId != null) p = renderForMonster(opts.monsterId);
    else if (opts.itemId != null) p = renderForItem(opts.itemId);
    else if (opts.mapId != null) p = renderForMap(opts.mapId);
    else if (opts.monsterName) {
      p = loadGraph().then(function (g) {
        var id = g.monsterByName[String(opts.monsterName).toLowerCase()];
        if (id == null) return "";
        return renderForMonster(id);
      });
    } else {
      return Promise.resolve("");
    }
    return Promise.resolve(p).then(function (html) {
      return html;
    }).then(function (html) {
      if (html && typeof html.then === "function") return html;
      return html;
    }).then(function (html) {
      renderPanel(typeof html === "string" ? html : "");
      return html;
    });
  }

  // Deep-link helpers used by search / external
  window.ROLinks = {
    load: loadGraph,
    getGraph: function () { return graph; },
    linkToMonster: linkToMonster,
    linkToMap: linkToMap,
    linkToCard: linkToCard,
    linkToEquip: linkToEquip,
    renderForMonster: renderForMonster,
    renderForItem: renderForItem,
    renderForMap: renderForMap,
    showRelated: showRelated
  };

  // Hook: when landing with ?q= on monster/card/equip pages, offer related after graph load
  function bootFromQuery() {
    var path = location.pathname || "";
    var params = new URLSearchParams(location.search);
    var q = params.get("q") || params.get("map");
    if (!q) return;

    loadGraph().then(function (g) {
      var host = document.querySelector("main, .main-content, .app") || document.body;
      if (host.querySelector(".ro-links-inline")) return;

      var html = "";
      var box = document.createElement("div");
      box.className = "ro-links-inline ro-window";
      box.innerHTML = '<div class="ro-window-title"><span class="ro-window-title-text">Related</span></div><div class="ro-window-body ro-links-inline-body">Loading…</div>';

      if (path.indexOf("monster") >= 0) {
        var mid = g.monsterByName[String(q).toLowerCase()];
        // also try id
        if (mid == null && g.monsterById[String(q)]) mid = q;
        if (mid != null) {
          host.insertBefore(box, host.firstChild);
          renderForMonster(mid).then(function (h) {
            box.querySelector(".ro-links-inline-body").innerHTML = h || "No links";
          });
        }
      } else if (path.indexOf("/cards") >= 0) {
        // find card by name
        var card = null;
        Object.keys(g.cardById).some(function (id) {
          if (g.cardById[id].name.toLowerCase() === String(q).toLowerCase()) {
            card = g.cardById[id];
            return true;
          }
          return false;
        });
        // partial match
        if (!card) {
          Object.keys(g.cardById).some(function (id) {
            if (g.cardById[id].name.toLowerCase().indexOf(String(q).toLowerCase()) >= 0) {
              card = g.cardById[id];
              return true;
            }
            return false;
          });
        }
        if (card) {
          host.insertBefore(box, host.firstChild);
          renderForItem(card.id).then(function (h) {
            box.querySelector(".ro-links-inline-body").innerHTML = h || "No links";
          });
        }
      } else if (path.indexOf("/maps") >= 0) {
        var mapId = params.get("map") || q;
        if (g.mapById[String(mapId)] || g.mapMonsters[String(mapId)]) {
          host.insertBefore(box, host.firstChild);
          renderForMap(mapId).then(function (h) {
            box.querySelector(".ro-links-inline-body").innerHTML = h || "No links";
          });
        }
      }
    });
  }

  // Add "Related" action on search hits for monster/card/map
  function hookSearch() {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest && e.target.closest("[data-ro-related]");
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      showRelated({
        monsterId: btn.getAttribute("data-monster-id"),
        itemId: btn.getAttribute("data-item-id"),
        mapId: btn.getAttribute("data-map-id"),
        monsterName: btn.getAttribute("data-monster-name")
      });
    });

    var obs = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          if (!(node instanceof HTMLElement)) return;
          var hits = node.classList && node.classList.contains("ro-search-hit")
            ? [node]
            : node.querySelectorAll ? node.querySelectorAll(".ro-search-hit") : [];
          hits.forEach(function (hit) {
            if (hit.querySelector("[data-ro-related]")) return;
            var typeEl = hit.querySelector(".ro-search-hit-type");
            var nameEl = hit.querySelector(".ro-search-hit-name");
            var type = (typeEl && typeEl.textContent || "").toLowerCase();
            var name = nameEl ? nameEl.textContent.trim() : "";
            if (!name) return;
            if (type !== "monster" && type !== "card" && type !== "map") return;
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "ro-btn ro-related-btn";
            btn.textContent = "Links";
            btn.setAttribute("data-ro-related", "1");
            if (type === "monster") btn.setAttribute("data-monster-name", name);
            if (type === "card") {
              // resolve later on click via name
              btn.addEventListener("click", function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                loadGraph().then(function (g) {
                  var found = null;
                  Object.keys(g.cardById).some(function (id) {
                    if (g.cardById[id].name === name) {
                      found = id;
                      return true;
                    }
                    return false;
                  });
                  if (found) showRelated({ itemId: found });
                  else showRelated({});
                });
              });
            }
            if (type === "map") {
              var href = hit.getAttribute("href") || "";
              var mm = href.match(/map=([^&]+)/);
              if (mm) btn.setAttribute("data-map-id", decodeURIComponent(mm[1]));
            }
            hit.appendChild(btn);
          });
        });
      });
    });
    function watch() {
      var panel = document.getElementById("ro-search-results");
      if (panel) obs.observe(panel, { childList: true, subtree: true });
    }
    watch();
    setTimeout(watch, 500);
  }

  function boot() {
    hookSearch();
    bootFromQuery();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
