/**
 * RO World Journey — site-wide client search (Phase 5)
 * Lazy-loads JSON, builds in-memory index, no backend.
 */
(function () {
  "use strict";

  var CACHE_KEY = "ro_search_index_v1";
  var index = null;
  var loading = null;
  var ui = { root: null, input: null, results: null };

  function locale() {
    var loc = window.RO_ACTIVE_LOCALE || localStorage.getItem("ro_lang") || "en-US";
    if (window.RO_NORMALIZE_LOCALE) {
      try { loc = window.RO_NORMALIZE_LOCALE(loc) || loc; } catch (e) {}
    }
    return loc;
  }

  function localeFile(baseEn) {
    // baseEn like equipment_en-US.json → swap locale
    var loc = locale();
    var under = loc.toLowerCase().replace("-", "_"); // en_us
    var hyphen = loc; // en-US
    return baseEn
      .replace("en-US", hyphen)
      .replace("en_us", under)
      .replace("en-us", hyphen.toLowerCase());
  }

  function fetchJson(url) {
    return fetch(url, { credentials: "same-origin" }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status + " " + url);
      return r.json();
    });
  }

  function push(entries, item) {
    if (!item || !item.name) return;
    entries.push({
      id: String(item.id != null ? item.id : item.name),
      type: item.type,
      name: String(item.name),
      path: item.path,
      extra: item.extra || "",
      aliases: item.aliases || []
    });
  }

  function buildFromData(bundle) {
    var entries = [];

    // Tools (always)
    [
      { id: "tool-skill", type: "tool", name: "Skill Planner", path: "/sea/skill_planner/", extra: "skills jobs" },
      { id: "tool-affix", type: "tool", name: "Affix Planner", path: "/sea/affix_planner/", extra: "stunt affix" },
      { id: "tool-equip", type: "tool", name: "Equipment", path: "/sea/equipment/", extra: "gear items" },
      { id: "tool-cards", type: "tool", name: "Cards", path: "/sea/cards/", extra: "card fusion" },
      { id: "tool-monster", type: "tool", name: "Monster Album", path: "/sea/monster_album/", extra: "mobs drops" },
      { id: "tool-maps", type: "tool", name: "Maps", path: "/sea/maps/", extra: "world map spawns" },
      { id: "tool-events", type: "tool", name: "Events", path: "/sea/events/", extra: "schedule activity" },
      { id: "tool-study", type: "tool", name: "Study", path: "/sea/study/", extra: "quiz exam banquet" }
    ].forEach(function (t) { push(entries, t); });

    // Equipment
    if (bundle.equipment && Array.isArray(bundle.equipment.items)) {
      bundle.equipment.items.forEach(function (it) {
        push(entries, {
          id: it.id,
          type: "equip",
          name: it.name,
          path: "/sea/equipment/?q=" + encodeURIComponent(it.name || ""),
          extra: [it.itemType, it.itemSubtype, it.openLevel].filter(Boolean).join(" ")
        });
      });
    }

    // Monsters
    if (bundle.monsters && Array.isArray(bundle.monsters.monsters)) {
      bundle.monsters.monsters.forEach(function (m) {
        push(entries, {
          id: m.id,
          type: "monster",
          name: m.name,
          path: "/sea/monster_album/?q=" + encodeURIComponent(m.name || ""),
          extra: [m.race, m.element, m.type, m.level != null ? "Lv" + m.level : ""].filter(Boolean).join(" ")
        });
      });
    }

    // Cards
    if (bundle.cards && Array.isArray(bundle.cards.cards)) {
      bundle.cards.cards.forEach(function (c) {
        push(entries, {
          id: c.id,
          type: "card",
          name: c.name,
          path: "/sea/cards/?q=" + encodeURIComponent(c.name || ""),
          extra: [c.card_type_name, c.quality_type, c.effect].filter(Boolean).join(" ").slice(0, 120)
        });
      });
    }

    // Maps
    if (bundle.maps && bundle.maps.map_configs) {
      var mc = bundle.maps.map_configs;
      Object.keys(mc).forEach(function (key) {
        var map = mc[key] || {};
        push(entries, {
          id: map.map_id != null ? map.map_id : key,
          type: "map",
          name: map.name || key,
          path: "/sea/maps/?map=" + encodeURIComponent(map.map_id != null ? map.map_id : key),
          extra: "map"
        });
      });
    }

    // Events
    if (bundle.events) {
      (bundle.events.weeklyEvents || []).forEach(function (ev) {
        push(entries, {
          id: ev.id,
          type: "event",
          name: ev.title || ev.name,
          path: "/sea/events/",
          extra: (ev.description || "").slice(0, 100)
        });
      });
      (bundle.events.calendarEvents || []).forEach(function (ev) {
        push(entries, {
          id: ev.id,
          type: "event",
          name: ev.title || ev.name,
          path: "/sea/events/",
          extra: (ev.description || "").slice(0, 100)
        });
      });
    }

    // Study questions
    ["lucky", "banquet", "scholar"].forEach(function (key) {
      var pack = bundle[key];
      if (!pack || !Array.isArray(pack.questions)) return;
      pack.questions.forEach(function (q) {
        push(entries, {
          id: key + "-" + q.id,
          type: "quiz",
          name: q.question,
          path: "/sea/study/",
          extra: q.answer != null ? String(q.answer).slice(0, 80) : ""
        });
      });
    });

    // Jobs
    if (bundle.skillsIndex && bundle.skillsIndex.jobs) {
      var jobs = bundle.skillsIndex.jobs;
      Object.keys(jobs).forEach(function (jid) {
        var job = jobs[jid] || {};
        push(entries, {
          id: "job-" + jid,
          type: "job",
          name: job.job_name || jid,
          path: "/sea/skill_planner/?job=" + encodeURIComponent(jid),
          extra: "job class"
        });
      });
    }

    // Skills from job files
    (bundle.jobSkills || []).forEach(function (s) {
      push(entries, s);
    });

    // Affix packages (flatten entry names if present)
    if (bundle.affixLib && bundle.affixLib.packages) {
      var pkgs = bundle.affixLib.packages;
      Object.keys(pkgs).forEach(function (pid) {
        var pack = pkgs[pid];
        var entriesList = (pack && pack.entries) || [];
        if (!entriesList.length) {
          push(entries, {
            id: "affix-" + pid,
            type: "affix",
            name: "Affix package " + pid,
            path: "/sea/affix_planner/",
            extra: String(pid)
          });
          return;
        }
        entriesList.forEach(function (ent, i) {
          var name = ent.name || ent.skill_name || ent.title || ("Affix " + pid + "-" + i);
          push(entries, {
            id: "affix-" + pid + "-" + i,
            type: "affix",
            name: name,
            path: "/sea/affix_planner/",
            extra: String(pid)
          });
        });
      });
    }

    return entries;
  }

  function loadJobSkills(jobIds) {
    var loc = locale();
    var folder = loc.indexOf("zh") === 0 && loc.toLowerCase().indexOf("cn") < 0
      ? "jobs_zh-TW"
      : "jobs_en-US";
    // Prefer matching locale folder if present naming
    if (loc === "zh-TW") folder = "jobs_zh-TW";
    else folder = "jobs_en-US";

    var ids = (jobIds || []).slice(0, 60);
    var tasks = ids.map(function (id) {
      return fetchJson("/sea/skill-simulator/data/" + folder + "/" + id + ".json")
        .then(function (job) {
          var out = [];
          var skills = job.skills || {};
          Object.keys(skills).forEach(function (sid) {
            var s = skills[sid] || {};
            var name = s.name;
            if (!name) return;
            out.push({
              id: sid,
              type: "skill",
              name: name,
              path: "/sea/skill_planner/?job=" + encodeURIComponent(job.job_id || id),
              extra: job.job_name || ""
            });
          });
          var unique = job.unique_skills || {};
          Object.keys(unique).forEach(function (sid) {
            var s = unique[sid] || {};
            if (!s.name) return;
            out.push({
              id: "u-" + sid,
              type: "skill",
              name: s.name,
              path: "/sea/skill_planner/?job=" + encodeURIComponent(job.job_id || id),
              extra: (job.job_name || "") + " unique"
            });
          });
          return out;
        })
        .catch(function () { return []; });
    });
    return Promise.all(tasks).then(function (lists) {
      return lists.reduce(function (a, b) { return a.concat(b); }, []);
    });
  }

  function loadIndex(force) {
    if (index && !force) return Promise.resolve(index);
    if (loading) return loading;

    // session cache (names only can be large; try)
    if (!force) {
      try {
        var cached = sessionStorage.getItem(CACHE_KEY + "_" + locale());
        if (cached) {
          index = JSON.parse(cached);
          return Promise.resolve(index);
        }
      } catch (e) {}
    }

    var loc = locale();
    var locHyphen = loc;
    var locUnder = loc.toLowerCase().replace("-", "_");

    loading = Promise.all([
      fetchJson("/sea/equipment/data/equipment_" + locHyphen + ".json").catch(function () {
        return fetchJson("/sea/equipment/data/equipment_en-US.json");
      }),
      fetchJson("/sea/monster-album/data/monster_album_" + locHyphen + ".json").catch(function () {
        return fetchJson("/sea/monster-album/data/monster_album_en-US.json");
      }),
      fetchJson("/sea/cards/card_fusion_simulator_" + locHyphen + ".json").catch(function () {
        return fetchJson("/sea/cards/card_fusion_simulator_en-US.json");
      }),
      fetchJson("/sea/maps/map_index_" + locHyphen + ".json").catch(function () {
        return fetchJson("/sea/maps/map_index_en-US.json");
      }),
      fetchJson("/sea/events/data/events_" + locHyphen + ".json").catch(function () {
        return fetchJson("/sea/events/data/events_en-US.json");
      }),
      fetchJson("/sea/study/data/lucky_rabbit_questions_" + locUnder + ".json").catch(function () {
        return fetchJson("/sea/study/data/lucky_rabbit_questions_en_us.json");
      }),
      fetchJson("/sea/study/data/guild_banquet_questions_" + locUnder + ".json").catch(function () {
        return fetchJson("/sea/study/data/guild_banquet_questions_en_us.json");
      }),
      fetchJson("/sea/study/data/scholar_exam_questions_" + locUnder + ".json").catch(function () {
        return fetchJson("/sea/study/data/scholar_exam_questions_en_us.json");
      }),
      fetchJson("/sea/skill-simulator/data/skills_index_" + locHyphen + ".json").catch(function () {
        return fetchJson("/sea/skill-simulator/data/skills_index_en-US.json");
      }),
      fetchJson("/sea/affix-simulator/data/stunt_skill_library_" + locHyphen + ".json").catch(function () {
        return fetchJson("/sea/affix-simulator/data/stunt_skill_library_en-US.json");
      })
    ]).then(function (arr) {
      var skillsIndex = arr[8] || {};
      var jobIds = skillsIndex.jobs ? Object.keys(skillsIndex.jobs) : [];
      return loadJobSkills(jobIds).then(function (jobSkills) {
        var bundle = {
          equipment: arr[0],
          monsters: arr[1],
          cards: arr[2],
          maps: arr[3],
          events: arr[4],
          lucky: arr[5],
          banquet: arr[6],
          scholar: arr[7],
          skillsIndex: skillsIndex,
          affixLib: arr[9],
          jobSkills: jobSkills
        };
        index = buildFromData(bundle);
        try {
          // may fail if quota exceeded — ignore
          sessionStorage.setItem(CACHE_KEY + "_" + locale(), JSON.stringify(index));
        } catch (e) {}
        loading = null;
        return index;
      });
    }).catch(function (err) {
      loading = null;
      console.warn("RO search index failed", err);
      index = buildFromData({});
      return index;
    });

    return loading;
  }

  function score(entry, q) {
    var name = entry.name.toLowerCase();
    var extra = (entry.extra || "").toLowerCase();
    var id = String(entry.id).toLowerCase();
    if (name === q) return 100;
    if (name.indexOf(q) === 0) return 80;
    if (name.indexOf(q) >= 0) return 60;
    if (id === q) return 55;
    if (extra.indexOf(q) >= 0) return 30;
    var aliases = entry.aliases || [];
    for (var i = 0; i < aliases.length; i++) {
      if (String(aliases[i]).toLowerCase().indexOf(q) >= 0) return 40;
    }
    return 0;
  }

  function search(query, limit) {
    limit = limit || 40;
    var q = String(query || "").trim().toLowerCase();
    if (!q || !index) return [];
    var hits = [];
    for (var i = 0; i < index.length; i++) {
      var s = score(index[i], q);
      if (s > 0) hits.push({ s: s, e: index[i] });
    }
    hits.sort(function (a, b) {
      return b.s - a.s || a.e.name.localeCompare(b.e.name);
    });
    return hits.slice(0, limit).map(function (h) { return h.e; });
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
    affix: "Affix"
  };

  function ensureUI() {
    if (ui.root) return ui;
    var root = document.createElement("div");
    root.id = "ro-search-panel";
    root.className = "ro-search-panel";
    root.innerHTML =
      '<div class="ro-search-panel-inner ro-window">' +
      '  <div class="ro-window-title"><span class="ro-window-title-text">Search</span>' +
      '    <button type="button" class="ro-win-btn ro-search-close" aria-label="Close">×</button></div>' +
      '  <div class="ro-window-body">' +
      '    <input type="search" class="ro-search" id="ro-search-input" placeholder="Search skills, gear, cards, monsters, maps…" autocomplete="off">' +
      '    <div class="ro-search-status" id="ro-search-status">Type to search across all tools</div>' +
      '    <div class="ro-search-results" id="ro-search-results" role="listbox"></div>' +
      "  </div>" +
      "</div>";
    document.body.appendChild(root);
    ui.root = root;
    ui.input = root.querySelector("#ro-search-input");
    ui.results = root.querySelector("#ro-search-results");
    ui.status = root.querySelector("#ro-search-status");
    root.querySelector(".ro-search-close").addEventListener("click", close);
    root.addEventListener("click", function (e) {
      if (e.target === root) close();
    });
    ui.input.addEventListener("input", onInput);
    ui.input.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
    return ui;
  }

  function render(hits, q) {
    var box = ui.results;
    if (!box) return;
    if (!q) {
      box.innerHTML = "";
      ui.status.textContent = "Type to search across all tools";
      return;
    }
    if (!hits.length) {
      box.innerHTML = '<div class="ro-search-empty">No matches</div>';
      ui.status.textContent = "0 results";
      return;
    }
    ui.status.textContent = hits.length + " result" + (hits.length === 1 ? "" : "s");
    box.innerHTML = hits.map(function (e) {
      var label = TYPE_LABEL[e.type] || e.type;
      return (
        '<a class="ro-search-hit" role="option" href="' + e.path + '">' +
        '<span class="ro-search-hit-type">' + label + "</span>" +
        '<span class="ro-search-hit-name">' + escapeHtml(e.name) + "</span>" +
        (e.extra ? '<span class="ro-search-hit-extra">' + escapeHtml(String(e.extra).slice(0, 80)) + "</span>" : "") +
        "</a>"
      );
    }).join("");
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  var inputTimer = null;
  function onInput() {
    clearTimeout(inputTimer);
    inputTimer = setTimeout(function () {
      var q = ui.input.value;
      render(search(q), q.trim());
    }, 80);
  }

  function open() {
    ensureUI();
    ui.root.classList.add("is-open");
    ui.status.textContent = "Loading index…";
    loadIndex().then(function () {
      ui.status.textContent = (index ? index.length : 0) + " entries indexed — type to search";
      ui.input.focus();
      if (ui.input.value.trim()) onInput();
    });
  }

  function close() {
    if (!ui.root) return;
    ui.root.classList.remove("is-open");
  }

  function injectLaunchers() {
    // Header controls button
    document.querySelectorAll(".header-controls").forEach(function (hc) {
      if (hc.querySelector("[data-ro-search-open]")) return;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ro-btn";
      btn.setAttribute("data-ro-search-open", "1");
      btn.textContent = "Search";
      btn.addEventListener("click", open);
      hc.appendChild(btn);
    });
    // Hub search field → open global search when focused with intent, also keep local filter
    var hub = document.getElementById("hub-search");
    if (hub && !hub.dataset.roSearchBound) {
      hub.dataset.roSearchBound = "1";
      hub.setAttribute("placeholder", "Filter tools or press / to search everything…");
    }
  }

  function bindHotkey() {
    document.addEventListener("keydown", function (e) {
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        var tag = (e.target && e.target.tagName) || "";
        if (/INPUT|TEXTAREA|SELECT/.test(tag) || e.target.isContentEditable) return;
        e.preventDefault();
        open();
      }
      if (e.key === "k" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        open();
      }
    });
  }

  window.ROSearch = {
    open: open,
    close: close,
    loadIndex: loadIndex,
    search: search,
    getIndex: function () { return index; }
  };

  function boot() {
    injectLaunchers();
    bindHotkey();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
