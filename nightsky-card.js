// Night Sky Card - a minimal Home Assistant Lovelace card showing tonight's sky
// (stars, planets, constellations) for your home location, rendered with the
// VirtualSky library (vendored under ./vendor - see vendor/NOTICE.md).
//
// HACS's Lovelace "plugin" install only copies the single file named in
// hacs.json (this file) onto the HA host - it does not pull the rest of the
// repo. So vendor/ assets are loaded from jsDelivr instead, which serves
// files straight from this repo's GitHub source.
const VENDOR_BASE = new URL('https://cdn.jsdelivr.net/gh/jpmiller25/ha-nightsky-card@main/vendor/');

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

// stuquery.js defines the global `S` namespace that virtualsky.js expects to
// already exist, so it must load first.
function ensureLibsLoaded() {
  if (!libsPromise) {
    libsPromise = loadScript(new URL('stuquery.js', VENDOR_BASE).href).then(() =>
      loadScript(new URL('virtualsky.js', VENDOR_BASE).href)
    );
  }
  return libsPromise;
}

const DEFAULT_CONFIG = {
  hour: 22,
  magnitude: 5,
  height: '320px',
  projection: 'stereo',
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
