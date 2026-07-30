# RO World Journey Gamehub

Classic Ragnarok-style database and planners (8 tools).

## Tools
- Skill Planner, Affix Planner, Equipment, Cards
- Monster Album, Maps, Events, Study/Quiz

## Run
```bash
node server.js
# http://localhost:3000/
```

## Features
- RO windowed UI (Phase 1–3)
- Tooltips (Phase 4)
- Site-wide search `/` or Ctrl+K (Phase 5)
- Favorites LocalStorage (Phase 6)
- Cross-links monster/map/card (Phase 7)
- Maps mobile sheet (Phase 8)
- PWA offline shell (Phase 9)
- SEO + share + a11y (Phase 10)

Extra modules (Rune, Pet, Refine, etc.) remain in the full repo for future updates.


## Production
- Site: https://ro-new-world.vercel.app
- Repo: https://github.com/RagnarokTheNewWorld/ro-new-world

### Deploy checklist
1. Push full tree including `shared/`, `sea/**/index.html`, `media/`, `sw.js`, `manifest.webmanifest`
2. Vercel root = repository root (not a subfolder)
3. `vercel.json` uses `trailingSlash: true` and rewrites to each tool `index.html`
4. If Git LFS is used for media, ensure LFS files are fetched on the Vercel build
