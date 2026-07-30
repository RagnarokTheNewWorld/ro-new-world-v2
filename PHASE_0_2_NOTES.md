# Phase 0–3 status

## Phase 0–2
- Hub redesign with classic RO windows (`index.html` + `shared/ro-ui.css`)
- Nav limited to 8 tools; SEO robots/sitemap; themed 404

## Phase 3
- Extracted tool folders under `sea/`:
  skill_planner, skill-simulator, affix_planner, affix-*, equipment, cards,
  monster_album, monster-album, maps, events, study
- Applied RO shell to all entry HTML:
  - Trimmed site-nav to 8 tools only
  - Injected `/shared/ro-ui.css`
  - Added `body.ro-shell`
  - Share button + shared scripts
  - viewport-fit=cover
- Tool shell CSS in `ro-ui.css` (sticky dark header, windowed main)

## Preview
```bash
cd rtnw-data-main && node server.js
# http://localhost:3000/
# http://localhost:3000/sea/skill_planner/
# http://localhost:3000/sea/study/
```

## Next
- Phase 4 tooltips
- Phase 5 site-wide search
- Phase 6 favorites
- Phase 7 cross-linking
- Phase 8 maps mobile
- Phase 9 PWA

## Phase 4 done
- shared/ro-tooltip.js + CSS rarity chrome
- Legacy skill/equipment #tooltip restyled
- data-ro-* attrs on hub cards
- Injected on all tool pages

## Phase 4 done
- shared/ro-tooltip.js (hover desktop, long-press mobile)
- Rarity border colors + legacy #tooltip RO restyle
- Hub cards data-ro-* attrs
- Injected on hub + all 8 tools


## Phase 5 done
- shared/ro-search.js: lazy JSON index (equip, monsters, cards, maps, events, quiz, jobs, skills, affix)
- Search button in header + / and Ctrl/Cmd+K hotkeys
- Windowed results panel with type badges and deep links


## Phase 6 done
- shared/ro-favorites.js LocalStorage bookmarks
- ★ on hub cards + search hits; ★ Fav panel with export/import/clear


## Phase 7 done
- shared/ro-links.js: monster drops/cards, map spawns, reverse item→monster
- Related chips panel + inline on ?q= pages; Links button on search hits


## Phase 8 done
- map_view.css rewritten (was 404 stub): dvh shell, touch-action, larger markers
- Mobile bottom sheet for filters + Filters button; safe-area
- map_mobile.js sheet toggle + ?map= deep link


## Phase 10 done
- Unique title/description/OG/Twitter/canonical per tool
- Share buttons ensured; skip link + focus-visible + reduced-motion
- README_GAMEHUB.md


## Post-10: Deep links
- shared/ro-deeplink.js applies ?q= to equipment/monster/card search, ?job=, ?map=
- card-simulator extracted; SW v2 precache includes deeplink

