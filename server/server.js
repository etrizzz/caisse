import express from 'express';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const databasePath = path.join(rootDir, 'database', 'wizzaos.db');
const publicDir = path.join(rootDir, 'public');
const HEARTBEAT_GRACE_MS = 7000;
const HEARTBEAT_BROADCAST_MS = 2000;

const app = express();
const db = new Database(databasePath, { fileMustExist: false });

app.use(express.json());
app.use(express.static(publicDir));
app.use('/src', express.static(path.join(rootDir, 'src')));

const state = {
  cashSessionStartedAt: new Date().toISOString(),
  lastClientHeartbeatAt: null,
  serverStartedAt: new Date().toISOString(),
  shieldMode: {
    status: 'armed',
    graceMs: HEARTBEAT_GRACE_MS,
    lastIncident: null
  }
};

const bootstrap = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      franchise TEXT NOT NULL,
      price_cents INTEGER NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      safety_stock INTEGER NOT NULL DEFAULT 0,
      metadata_json TEXT DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_no TEXT NOT NULL UNIQUE,
      total_cents INTEGER NOT NULL,
      item_count INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const count = db.prepare('SELECT COUNT(*) AS count FROM products').get();

  if (count.count === 0) {
    const insert = db.prepare(`
      INSERT INTO products (sku, name, category, franchise, price_cents, stock, safety_stock, metadata_json)
      VALUES (@sku, @name, @category, @franchise, @price_cents, @stock, @safety_stock, @metadata_json)
    `);

    const seedProducts = [
      {
        sku: 'DIS-SAB-001',
        name: 'Sabre Laser Legacy Luke Skywalker',
        category: 'Collectible',
        franchise: 'Star Wars',
        price_cents: 32900,
        stock: 5,
        safety_stock: 3,
        metadata_json: JSON.stringify({ edition: 'Galaxy Edge Legacy', finish: 'brushed metal' })
      },
      {
        sku: 'MAR-HEL-007',
        name: 'Casque Iron Man Mark VII Réplique 1:1',
        category: 'Replica',
        franchise: 'Marvel',
        price_cents: 48900,
        stock: 2,
        safety_stock: 2,
        metadata_json: JSON.stringify({ lighting: true, voiceFx: true })
      },
      {
        sku: 'PIX-BR-014',
        name: 'Blu-ray Steelbook Ratatouille Édition Chef',
        category: 'Blu-ray',
        franchise: 'Disney Pixar',
        price_cents: 3490,
        stock: 11,
        safety_stock: 4,
        metadata_json: JSON.stringify({ format: '4K UHD + Blu-ray', limited: true })
      },
      {
        sku: 'DIS-ARC-021',
        name: 'Réplique Journal de Indiana Jones',
        category: 'Prop Replica',
        franchise: 'Lucasfilm',
        price_cents: 12900,
        stock: 4,
        safety_stock: 2,
        metadata_json: JSON.stringify({ material: 'aged leather', certificate: true })
      },
      {
        sku: 'DIS-MAR-088',
        name: 'Bouclier Captain America Battle Worn Deluxe',
        category: 'Collectible',
        franchise: 'Marvel',
        price_cents: 25900,
        stock: 3,
        safety_stock: 2,
        metadata_json: JSON.stringify({ diameter_cm: 61, finish: 'battle worn' })
      }
    ];

    const transaction = db.transaction((products) => {
      for (const product of products) insert.run(product);
    });

    transaction(seedProducts);
  }
};

bootstrap();

const readCatalog = () => db.prepare(`
  SELECT id, sku, name, category, franchise, price_cents, stock, safety_stock, metadata_json
  FROM products
  ORDER BY franchise, name
`).all().map((product) => ({
  ...product,
  metadata: JSON.parse(product.metadata_json || '{}')
}));

const buildMetrics = (catalog) => {
  const totalStock = catalog.reduce((sum, item) => sum + item.stock, 0);
  const lowStock = catalog.filter((item) => item.stock <= item.safety_stock);
  const marvelCount = catalog.filter((item) => item.franchise === 'Marvel').length;

  return {
    totalProducts: catalog.length,
    totalStock,
    lowStockCount: lowStock.length,
    marvelCount,
    rushIndex: Math.min(100, 35 + lowStock.length * 12 + marvelCount * 3)
  };
};

const buildWizzaSummary = (catalog) => {
  const disneyLowStock = catalog
    .filter((item) => /Disney|Marvel|Pixar|Star Wars|Lucasfilm/.test(item.franchise) && item.stock <= item.safety_stock)
    .map((item) => ({ sku: item.sku, name: item.name, stock: item.stock }));

  return {
    motivation: 'Gros panier détecté ? Wizza vous accompagne pour garder un encaissement fluide et premium.',
    lowStockAlerts: disneyLowStock,
    closingTone: 'Clôture prête : remerciez l’équipe, sauvegarde locale active et chiffres sécurisés.'
  };
};

app.get('/api/bootstrap', (_req, res) => {
  const catalog = readCatalog();
  const now = new Date().toISOString();

  res.json({
    clock: now,
    shieldMode: {
      ...state.shieldMode,
      now,
      lastClientHeartbeatAt: state.lastClientHeartbeatAt
    },
    metrics: buildMetrics(catalog),
    catalog,
    wizza: buildWizzaSummary(catalog),
    terminalPresets: [
      'stock low franchise:Disney',
      'receipt simulate total>200',
      'close session --warm-summary'
    ]
  });
});

app.post('/api/heartbeat', (req, res) => {
  const clientId = req.body?.clientId || 'dashboard';
  state.lastClientHeartbeatAt = new Date().toISOString();

  res.json({
    ok: true,
    clientId,
    serverTime: state.lastClientHeartbeatAt,
    shieldMode: state.shieldMode.status,
    graceMs: HEARTBEAT_GRACE_MS
  });
});

app.get('/api/shield-status', (_req, res) => {
  const lastBeat = state.lastClientHeartbeatAt ? new Date(state.lastClientHeartbeatAt).getTime() : 0;
  const elapsed = lastBeat ? Date.now() - lastBeat : null;
  const connectionHealthy = elapsed !== null && elapsed < HEARTBEAT_GRACE_MS;

  res.json({
    serverOnline: true,
    connectionHealthy,
    elapsedSinceClientHeartbeatMs: elapsed,
    broadcastEveryMs: HEARTBEAT_BROADCAST_MS,
    lockMessage: 'SERVEUR HORS LIGNE - DONNÉES SÉCURISÉES'
  });
});

app.post('/api/sales/simulate', (req, res) => {
  const totalCents = Number(req.body?.totalCents || 0);
  const itemCount = Number(req.body?.itemCount || 0);
  const receiptNo = `WZ-${Date.now()}`;

  db.prepare(`
    INSERT INTO sales (receipt_no, total_cents, item_count)
    VALUES (?, ?, ?)
  `).run(receiptNo, totalCents, itemCount);

  const motivationalMessage = totalCents >= 15000
    ? 'Encaissement premium validé : proposez la garantie collectionneur et gardez ce rythme.'
    : 'Ticket enregistré. Wizza recommande un cross-sell Blu-ray en édition limitée.';

  res.json({
    ok: true,
    receiptNo,
    motivationalMessage
  });
});

let server;
let heartbeatMonitor;

const shutdown = (signal) => {
  state.shieldMode = {
    ...state.shieldMode,
    status: 'tripped',
    lastIncident: `${signal} received at ${new Date().toISOString()}`
  };

  if (heartbeatMonitor) clearInterval(heartbeatMonitor);

  if (server) {
    server.close(() => {
      db.close();
      process.exit(0);
    });
  } else {
    db.close();
    process.exit(0);
  }
};

server = app.listen(3100, () => {
  console.log('WizzaOS POS server running on http://localhost:3100');

  heartbeatMonitor = setInterval(() => {
    const lastBeat = state.lastClientHeartbeatAt ? new Date(state.lastClientHeartbeatAt).getTime() : 0;

    if (!lastBeat) return;

    const elapsed = Date.now() - lastBeat;

    if (elapsed >= HEARTBEAT_GRACE_MS) {
      state.shieldMode = {
        ...state.shieldMode,
        status: 'warning',
        lastIncident: `Client heartbeat timeout after ${elapsed}ms`
      };
    } else {
      state.shieldMode = {
        ...state.shieldMode,
        status: 'armed'
      };
    }
  }, HEARTBEAT_BROADCAST_MS);
});

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
