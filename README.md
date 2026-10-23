# Night Sky Card

A minimal Home Assistant Lovelace card showing tonight's sky - stars,
planets, and constellations - for your home location (read from
`zone.home`). Built on the [VirtualSky](https://github.com/slowe/VirtualSky)
planetarium library, locked to a fixed time each night rather than a live,
fully-featured planetarium.

**Status:** personal-use card, not yet published to the HACS default store.
See `vendor/NOTICE.md` for an open licensing question that needs resolving
before any public distribution.

## Install (as a HACS custom repository)

1. HACS -> the three-dot menu (top right) -> **Custom repositories**
2. Add this repo's URL, category **Lovelace**
3. Install "Night Sky Card" from HACS like any other frontend card
4. Settings -> Dashboards -> Resources -> add resource:
   - URL: `/hacsfiles/ha-nightsky-card/nightsky-card.js`
   - Resource type: **JavaScript Module**

## Add the card to a dashboard

```yaml
type: custom:nightsky-card
hour: 22              # which hour tonight to render (24h, default 22)
height: 320px          # card height, default 320px
magnitude: 5           # faintest star magnitude to show, default 5
projection: stereo   # polar | stereo | lambert | equirectangular | ortho (default: stereo)
show_constellation_lines: true
show_constellation_labels: true
show_constellation_boundaries: false
show_planet_labels: true
show_star_labels: false
```

Drag/touch to pan around the sky. The "Lines" and "Labels" buttons in the
card toggle constellation lines and labels on/off live.

## How it works

- Pulls latitude/longitude from `zone.home` automatically - no location
  config needed.
- Computes "tonight at `hour`:00" client-side on load; it's a fixed snapshot
  for that moment, not a live-ticking clock, and it's correct for whatever
  day it happens to load on without needing a daily refresh job.
- VirtualSky itself (and the constellation line/boundary data it loads) is
  vendored locally under `vendor/` rather than pulled from VirtualSky's
  hosted site, so this card has no runtime dependency on an external site
  staying up.

## Known limitations

- Dragging pans both azimuth and altitude (no horizontal-only lock). Not
  currently planned - flagged as something to revisit only if it's
  genuinely annoying in daily use.
- Constellation **lines** (connect-the-dots), not pictorial constellation
  **artwork** - VirtualSky doesn't support the latter.
