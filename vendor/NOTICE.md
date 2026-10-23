# Vendored code

This folder contains Stuart Lowe's VirtualSky planetarium library, pulled
from https://github.com/slowe/VirtualSky (master branch), with one small
local patch (see below):

- `stuquery.js` - the library's own minimal jQuery-like helper, required by virtualsky.js
- `virtualsky.js` - the planetarium engine itself
- `virtualsky-planets.js` - planet ephemeris plugin, lazy-loaded when planets are shown
- `lines_latin.json` - constellation line data
- `boundaries.json` - IAU constellation boundary data
- `stars.json` - deeper star catalog, lazy-loaded when the magnitude limit exceeds the ~4.5 built into virtualsky.js itself
- `lang/en.json` - English phrase/constellation-name data (required even for a single-language setup - the engine throws without it)

**Licensing status (unresolved as of this card's creation):** the VirtualSky
repository has no LICENSE file. The only notice present is a bare copyright
line (`(c) Stuart Lowe, Las Cumbres Observatory Global Telescope`) and a
"provided as is, do not expect support" disclaimer. The project's own site
additionally states it's "provided freely for educational and non-profit
use," which is not a formal open-source license grant.

This is fine for private, personal use (which is this card's current scope).
It is **not** resolved for public redistribution (e.g. submitting this card
to the HACS default store, or otherwise encouraging strangers to download
these vendored files through this repo). Before doing that, reach out to
Stuart Lowe for explicit permission, or swap this vendoring for a
differently-licensed sky-rendering engine. Don't skip this step.

**Local patch to `virtualsky.js`:** one line, in the canvas-creation code.
Upstream uses a raw `document.getElementById(this.idinner)` to grab the
canvas it just created, which can't see across shadow-DOM boundaries - and
the real HA frontend is built from many nested shadow-DOM web components, so
this silently failed with the canvas never getting sized (a blank card, no
error). Patched to call `window.__nightskyDeepGetElementById` (defined in
`nightsky-card.js`, which searches through shadow roots) when it's present,
falling back to the original behavior otherwise, so the file still works
correctly outside this card's context. Search `virtualsky.js` for
"nightsky-card patch" to find it.
