# TBC Arena Logs

Warcraft Logs–style **arena timeline viewer** for **WoW TBC Anniversary**.

Open a combat log, pick a match, scrub every player’s casts, targets, and aura bars — locally first, same web app ready to host later.

## Quick start

```bash
cd tools/tbc-arena-logs
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

- **Load sample** — fixture Nagrand 2v2 to try the UI immediately  
- **Open combat log** / drag-drop — your real `WoWCombatLog.txt`

## Getting a real log

**Does WoW save each arena as its own file?** No — one continuous `WoWCombatLog.txt`.

**Do we analyze per match anyway?** Yes. On open, the app **splits the session into separate fights** (sidebar: Match 1, Match 2, …). Each timeline is one arena only.

**Want separate files on disk?** Use **Export this match (.txt)** or **Export all matches (.txt)** to download one CLEU file per fight.

### Helper addon: ArenaCombatLog

Installed at `Interface\AddOns\ArenaCombatLog` (source also under `WoW-Setup\addons\ArenaCombatLog`).

**Normal use (no commands):**
1. Enable **ArenaCombatLog** in the AddOns list → `/reload`
2. Click the **book icon** on the minimap (green = logging on, red = off)
3. **Start logging** before queueing → play → **Stop logging** when done
4. Right-click the minimap icon for a quick toggle

`/clog` still opens the same panel if you want it.

Then open the log in this app:

`C:\Program Files (x86)\World of Warcraft\_anniversary_\Logs\WoWCombatLog.txt`

## Features (v1)

- Parse Classic / TBC CLEU text logs  
- Split arenas via `ZONE_CHANGE` into known arena maps (fallback: PvP combat clusters)  
- Full-match timeline: all players, cast ticks, aura duration bars  
- Hover: time, source → target  
- Player filter, zoom, damage/healing summary, death order  
- **Export match JSON** — stable blob for a future upload/hosting API  

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local web app |
| `npm run build` | Production static build → `dist/` |
| `npm run preview` | Serve `dist/` |
| `npm test` | Parser / match-splitter unit tests |

## Project layout

```
src/
  lib/           CLEU parser, arena splitter, timeline builder
  components/    Match list + WCL-style timeline
  fixtures/      sample-arena.log
  types.ts       Stable Match JSON types
```

## Future hosting

The React app already emits a normalized `Match` object (`exportMatchJson`). A later backend only needs to store that JSON and serve the same viewer — no rewrite of the timeline UI.
