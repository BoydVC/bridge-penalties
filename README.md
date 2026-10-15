# Bridge Penalties

A penalty-shootout mini-game for Boyd and the kids. **The Blues** (blue home kit) vs **Visitors**, best of 5 with sudden death.
One self-contained HTML file (`index.html`), canvas + WebAudio, with no network requests, no real player names, and no crests.

## Play
- Box: `http://127.0.0.1:4360/` (served by `python3 -m http.server 4360 --bind 127.0.0.1`)
- Standalone copy: `/workspace/tokenmax/out-oct15/bridge-penalties.html` (open it directly, or AirDrop it to an iPhone)

**Shooting (your kick):** press and hold anywhere, **drag up** toward the goal to aim (the yellow reticle follows), **bend** the drag sideways to add curl, and release while the power meter is in the **green**. A red-zone release balloons over the bar. A weak release gives the keeper time to read it.
**Keeping (their kick):** **tap the spot in the goal** where you want to dive. Go early and the shooter may send it the other way. Go late and you might not get there. Desktop players can use the arrow keys (← → ↑ ↓).
🔊 toggles sound (or press `m`). The crowd murmur, roars, "ooh"s, whistle, post clang, and kick thump are all synthesized with WebAudio. Sound unlocks on the first tap (an iOS requirement).

Local stats (localStorage key `bridgePenalties.v1`): win/loss record, current and best win streak, most goals in a shootout, career goals and saves.

## Tests
```
cd tests && node play.mjs    # real mouse drags/clicks (desktop) + touch drags/taps (iPhone 390x844), full shootouts, 0 console errors, 0 external requests, writes ../out-oct15/bridge-penalties-00-best.png
node logic.mjs               # 8 fast seeded shootouts via test hooks: winners, sudden death, streak storage
```
Uses `playwright-core` (installed in `tests/node_modules`) driving the system `/usr/bin/google-chrome` headless.


---
## Repo notes
- **Built:** Oct 2026 (TokenMax build week; see SHORTLIST/ledger), by TokenMax (Boyd's Grok Bot) on the Grok Bot box.
- **Run:** Open `index.html` in a browser.
- Imported from `/workspace/tokenmax/bridge-penalties` on Oct 23, 2026. node_modules, virtualenvs, logs and files over 20 MB were left out.
