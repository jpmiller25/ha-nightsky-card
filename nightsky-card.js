// Night Sky Card - a minimal Home Assistant Lovelace card showing tonight's sky
// (stars, planets, constellations) for your home location, rendered with the
// VirtualSky library (vendored under ./vendor - see vendor/NOTICE.md).
//
// HACS's Lovelace "plugin" install only copies the single file named in
// hacs.json (this file) onto the HA host - it does not pull the rest of the
// repo. So vendor/ assets are loaded from jsDelivr instead, which serves
// files straight from this repo's GitHub source.
//
// Pinned to a specific commit, not @main: jsDelivr (and browsers) cache a
// branch ref as if it were immutable, so updates to vendor/ silently never
// reached already-loaded dashboards even with a cache-busting query string
// (jsDelivr's GitHub proxy ignores query strings for its cache key, so that
// didn't help either - confirmed directly). A commit-pinned URL has no such
// problem since that content genuinely never changes. Bump this hash to the
// new commit any time vendor/ changes.
const VENDOR_COMMIT = '34c8d23';
const VENDOR_BASE = new URL(`https://cdn.jsdelivr.net/gh/jpmiller25/ha-nightsky-card@${VENDOR_COMMIT}/vendor/`);
function vendorUrl(path) {
  return new URL(path, VENDOR_BASE).href;
}

let libsPromise = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`nightsky-card: failed to load ${src}`));
    document.head.appendChild(el);
  });
}

// stuquery.js's selector lookups (S('#id'), S('.class')) resolve against
// plain `document`, which cannot see across shadow-DOM boundaries - and the
// real HA frontend nests everything inside several layers of shadow DOM, so
// VirtualSky's own container lookup (and every element it creates
// afterwards) silently finds nothing there. Patch stuQuery's selector
// resolution to search through shadow roots too, right after stuquery.js
// loads and before virtualsky.js runs and starts relying on it.
function deepQuerySelectorAll(selector) {
  const results = [];
  const visit = (root) => {
    results.push(...root.querySelectorAll(selector));
    root.querySelectorAll('*').forEach((el) => {
      if (el.shadowRoot) visit(el.shadowRoot);
    });
  };
  visit(document);
  return results;
}

function patchStuQueryForShadowDom() {
  const proto = window.stuQuery.prototype;
  const original = proto.querySelector;
  proto.querySelector = function (els, selector) {
    if (els === document && selector.indexOf(':eq') < 0) {
      return deepQuerySelectorAll(selector);
    }
    return original.call(this, els, selector);
  };
}

// virtualsky.js has one raw `document.getElementById` call (for the canvas
// element it creates) that bypasses the S(...) wrapper entirely, so the
// patch above doesn't cover it. vendor/virtualsky.js calls this global when
// present instead - see the comment at its call site.
function deepGetElementById(id) {
  const direct = document.getElementById(id);
  if (direct) return direct;
  const matches = deepQuerySelectorAll('#' + id);
  return matches[0] || null;
}
window.__nightskyDeepGetElementById = deepGetElementById;

// stuquery.js defines the global `S` namespace that virtualsky.js expects to
// already exist, so it must load first.
function ensureLibsLoaded() {
  if (!libsPromise) {
    libsPromise = loadScript(vendorUrl('stuquery.js'))
      .then(() => patchStuQueryForShadowDom())
      .then(() => loadScript(vendorUrl('virtualsky.js')));
  }
  return libsPromise;
}

const DEFAULT_CONFIG = {
  hour: 22,
  magnitude: 5,
  height: 'min(75vh, 800px)',
  projection: 'stereo',
  az: 0, // 0 = facing north, 90 = east, 180 = south, 270 = west
  show_constellation_lines: true,
  show_constellation_labels: true,
  show_constellation_boundaries: false,
  show_planet_labels: true,
  show_star_labels: false,
};

class NightSkyCard extends HTMLElement {
  setConfig(config) {
    this._config = { ...DEFAULT_CONFIG, ...config };
    this._maybeInit();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._latlong) {
      const zone = hass.states['zone.home'];
      if (zone && zone.attributes.latitude != null) {
        this._latlong = {
          latitude: zone.attributes.latitude,
          longitude: zone.attributes.longitude,
        };
        this._maybeInit();
      }
    }
  }

  connectedCallback() {
    if (this._built) return;
    this._built = true;
    this._uid = 'nightsky-' + Math.random().toString(36).slice(2);
    this.innerHTML = `
      <ha-card>
        <div style="position:relative;">
          <div id="${this._uid}" style="width:100%;height:${(this._config || DEFAULT_CONFIG).height};"></div>
          <div style="position:absolute;top:8px;right:8px;display:flex;gap:6px;">
            <button id="${this._uid}-lines" style="font-size:11px;">Lines</button>
            <button id="${this._uid}-labels" style="font-size:11px;">Labels</button>
          </div>
        </div>
      </ha-card>
    `;
    this._container = this.querySelector('#' + this._uid);
    this._maybeInit();
  }

  getCardSize() {
    return 4;
  }

  // Only initialize once we have: the DOM container, the config, AND the
  // home coordinates from hass - these three arrive in no particular order.
  _maybeInit() {
    if (this._sky || !this._container || !this._config || !this._latlong) return;
    ensureLibsLoaded().then(
      () => this._createSky(),
      (err) => this._showError(err)
    );
  }

  _showError(err) {
    console.error('nightsky-card:', err);
    if (this._container) {
      this._container.innerHTML = `<div style="color:#f88;padding:12px;font-size:13px;">Night Sky Card failed to load: ${err.message || err}</div>`;
    }
  }

  _createSky() {
    const tonight = new Date();
    tonight.setHours(this._config.hour, 0, 0, 0);

    this._sky = window.S.virtualsky(this._uid, {
      id: this._uid,
      projection: this._config.projection,
      latitude: this._latlong.latitude,
      longitude: this._latlong.longitude,
      clock: tonight,
      live: false,
      az: this._config.az,
      magnitude: this._config.magnitude,
      constellations: this._config.show_constellation_lines,
      constellationlabels: this._config.show_constellation_labels,
      constellationboundaries: this._config.show_constellation_boundaries,
      showplanetlabels: this._config.show_planet_labels,
      showstarlabels: this._config.show_star_labels,
      cardinalpoints: true,
      mouse: true,
      keyboard: false,
    });

    this._wireToggles();
    this._wireResize();
  }

  // The container's CSS size (height defaults to a responsive clamp, see
  // DEFAULT_CONFIG) can change after creation - window resize, sidebar
  // toggle, dashboard layout settling, etc. VirtualSky only sizes its canvas
  // once at creation, so without this the canvas stays whatever size it
  // happened to be born at while the CSS box around it changes shape.
  // sky.resize() with no args re-reads the container's current rendered
  // size itself (stuQuery's outerWidth/outerHeight), so just needing to
  // call it is enough - no manual width/height tracking here.
  _wireResize() {
    let pending = false;
    const observer = new ResizeObserver(() => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        if (this._sky) this._sky.resize();
      });
    });
    observer.observe(this._container);
    this._resizeObserver = observer;
  }

  disconnectedCallback() {
    if (this._resizeObserver) this._resizeObserver.disconnect();
  }

  _wireToggles() {
    const linesBtn = this.querySelector('#' + this._uid + '-lines');
    const labelsBtn = this.querySelector('#' + this._uid + '-labels');
    linesBtn.addEventListener('click', () => {
      this._sky.constellation.lines = !this._sky.constellation.lines;
      this._sky.checkLoaded();
      this._sky.draw();
    });
    labelsBtn.addEventListener('click', () => {
      this._sky.constellation.labels = !this._sky.constellation.labels;
      this._sky.checkLoaded();
      this._sky.draw();
    });
  }
}

customElements.define('nightsky-card', NightSkyCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'nightsky-card',
  name: 'Night Sky Card',
  description: "Shows tonight's sky - stars, planets, and constellations - for your home location.",
});
