# Vendored code

This folder contains unmodified copies of Stuart Lowe's VirtualSky planetarium
library, pulled from https://github.com/slowe/VirtualSky (master branch):

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
