import { WizzaEngine } from '../core/WizzaEngine.js';

const HEARTBEAT_INTERVAL_MS = 2000;
const HEARTBEAT_TIMEOUT_MS = 6500;

const state = {
  bootstrap: null,
  lastHeartbeatAt: 0,
  serverLock: false,
  audioContext: null
};

const euro = (value) => new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR'
}).format(value / 100);

const rushStroke = (value) => {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - value / 100);
  return { radius, circumference, offset };
};

const createAlarmTone = () => {
  if (!window.AudioContext && !window.webkitAudioContext) return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!state.audioContext) state.audioContext = new AudioCtx();

  const oscillator = state.audioContext.createOscillator();
  const gain = state.audioContext.createGain();
  oscillator.type = 'sawtooth';
  oscillator.frequency.value = 880;
  gain.gain.value = 0.02;
  oscillator.connect(gain);
  gain.connect(state.audioContext.destination);
  oscillator.start();
  oscillator.stop(state.audioContext.currentTime + 0.4);
};

const renderCatalog = (catalog) => catalog.map((item) => `
  <article class="catalog-card ${item.stock <= item.safety_stock ? 'catalog-card--alert' : ''}">
    <div class="catalog-card__meta">
      <span>${item.franchise}</span>
      <strong>${item.category}</strong>
    </div>
    <h3>${item.name}</h3>
    <p>SKU ${item.sku}</p>
    <div class="catalog-card__footer">
      <span>${euro(item.price_cents)}</span>
      <span>Stock ${item.stock}</span>
    </div>
  </article>
`).join('');

const renderWizza = (bootstrap) => {
  const alerts = WizzaEngine.buildStockAlert(bootstrap.catalog);
  return `
    <section class="wizza-panel glass-panel">
      <div>
        <p class="eyebrow">Wizza Copilot</p>
        <h2>Assistant de caisse vivant</h2>
      </div>
      <div class="wizza-bubble">
        ${bootstrap.wizza.motivation}
      </div>
      <div class="wizza-insights">
        <div>
          <h3>Motivation panier</h3>
          <p>${WizzaEngine.buildMotivation(18750)}</p>
        </div>
        <div>
          <h3>Alertes Disney</h3>
          <ul>${alerts.map((alert) => `<li>${alert}</li>`).join('') || '<li>Aucun stock critique détecté.</li>'}</ul>
        </div>
        <div>
          <h3>Clôture humaine</h3>
          <p>${WizzaEngine.buildClosingSummary({ totalReceipts: 42, revenueCents: 286900 })}</p>
        </div>
      </div>
    </section>
  `;
};

const renderDashboard = (bootstrap) => {
  const { circumference, offset } = rushStroke(bootstrap.metrics.rushIndex);

  document.body.innerHTML = `
    <div class="app-shell">
      <div id="shield-lock" class="shield-lock ${state.serverLock ? 'shield-lock--visible' : ''}">
        <div class="shield-lock__core">
          <p>MODE BLINDÉ</p>
          <h1>SERVEUR HORS LIGNE - DONNÉES SÉCURISÉES</h1>
          <span>Verrouillage immédiat de l'interface. Vérifiez le serveur local.</span>
        </div>
      </div>

      <header class="topbar glass-panel">
        <div>
          <p class="eyebrow">WizzaOS POS · Architecture 2026</p>
          <h1>Dashboard central Geek Shop</h1>
        </div>
        <div class="topbar__status">
          <span class="status-dot ${state.serverLock ? 'status-dot--off' : 'status-dot--on'}"></span>
          <span>${state.serverLock ? 'Blindage actif' : 'Serveur synchronisé'}</span>
        </div>
      </header>

      <main class="dashboard-grid">
        <section class="hero-panel glass-panel">
          <div>
            <p class="eyebrow">Scan 60fps</p>
            <h2>Encaissement ciné / Disney ultra-fluide</h2>
            <p>Transitions CSS pures, reflets dynamiques et feedback instantané même sur CPU sans GPU dédié.</p>
          </div>
          <div class="rush-meter">
            <svg viewBox="0 0 140 140">
              <circle cx="70" cy="70" r="52" class="rush-meter__track"></circle>
              <circle cx="70" cy="70" r="52" class="rush-meter__value" style="stroke-dasharray:${circumference};stroke-dashoffset:${offset}"></circle>
            </svg>
            <div>
              <strong>${bootstrap.metrics.rushIndex}%</strong>
              <span>Taux de rush</span>
            </div>
          </div>
        </section>

        <section class="terminal-panel glass-panel">
          <p class="eyebrow">Terminal opérateur</p>
          <h2>Console hacker-style</h2>
          <div class="terminal-log">
            ${bootstrap.terminalPresets.map((command) => `<div><span>&gt;</span>${command}</div>`).join('')}
          </div>
          <input class="terminal-input" value="stock low franchise:Disney" aria-label="Terminal WizzaOS" />
        </section>

        ${renderWizza(bootstrap)}

        <section class="catalog-panel">
          ${renderCatalog(bootstrap.catalog)}
        </section>
      </main>
    </div>
  `;
};

const lockInterface = () => {
  if (state.serverLock) return;
  state.serverLock = true;
  createAlarmTone();
  document.getElementById('shield-lock')?.classList.add('shield-lock--visible');
  document.querySelector('.status-dot')?.classList.replace('status-dot--on', 'status-dot--off');
};

const unlockInterface = () => {
  state.serverLock = false;
  document.getElementById('shield-lock')?.classList.remove('shield-lock--visible');
  document.querySelector('.status-dot')?.classList.replace('status-dot--off', 'status-dot--on');
};

const heartbeat = async () => {
  try {
    const response = await fetch('/api/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: 'dashboard-main' })
    });

    if (!response.ok) throw new Error('heartbeat_failed');

    state.lastHeartbeatAt = Date.now();
    unlockInterface();
  } catch (error) {
    lockInterface();
  }
};

const monitorServer = () => {
  window.setInterval(() => {
    if (Date.now() - state.lastHeartbeatAt > HEARTBEAT_TIMEOUT_MS) {
      lockInterface();
    }
  }, 500);

  window.setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);
};

const boot = async () => {
  const response = await fetch('/api/bootstrap');
  state.bootstrap = await response.json();
  renderDashboard(state.bootstrap);
  await heartbeat();
  monitorServer();
};

boot();
