import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const db = new Database(path.join(__dirname, 'wizzaos.db'));

db.exec(`
  DROP TABLE IF EXISTS products;
  CREATE TABLE products (
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
`);

const seedProducts = [
  ['DIS-SAB-001', 'Sabre Laser Legacy Luke Skywalker', 'Collectible', 'Star Wars', 32900, 5, 3, { edition: 'Galaxy Edge Legacy' }],
  ['DIS-SAB-002', 'Sabre Laser Ahsoka Tano Paire Deluxe', 'Collectible', 'Star Wars', 54900, 3, 2, { edition: 'White Blade Crate' }],
  ['MAR-HEL-007', 'Casque Iron Man Mark VII Réplique 1:1', 'Replica', 'Marvel', 48900, 2, 2, { lighting: true }],
  ['MAR-SHI-010', 'Bouclier Captain America Battle Worn Deluxe', 'Collectible', 'Marvel', 25900, 3, 2, { diameter_cm: 61 }],
  ['MAR-GAU-013', 'Gant Nano Infinity Endgame Collector', 'Replica', 'Marvel', 39900, 2, 1, { leds: true }],
  ['PIX-BR-014', 'Blu-ray Steelbook Ratatouille Édition Chef', 'Blu-ray', 'Disney Pixar', 3490, 11, 4, { format: '4K UHD + Blu-ray' }],
  ['DIS-BR-018', 'Blu-ray Steelbook Le Roi Lion Signature', 'Blu-ray', 'Disney', 2990, 9, 3, { artwork: 'savane embossée' }],
  ['DIS-ARC-021', 'Réplique Journal de Indiana Jones', 'Prop Replica', 'Lucasfilm', 12900, 4, 2, { material: 'aged leather' }],
  ['DIS-WAN-031', 'Baguette Sorcier Mickey Fantasia Collector', 'Collectible', 'Disney', 8900, 6, 2, { finish: 'chrome blue' }],
  ['MAR-BR-044', 'Blu-ray Steelbook Avengers Endgame Portail', 'Blu-ray', 'Marvel', 3690, 8, 3, { format: '4K UHD + Blu-ray' }]
];

const insert = db.prepare(`
  INSERT INTO products (sku, name, category, franchise, price_cents, stock, safety_stock, metadata_json)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const tx = db.transaction((rows) => {
  for (const row of rows) {
    insert.run(...row.slice(0, 7), JSON.stringify(row[7]));
  }
});

tx(seedProducts);
console.log(`Seeded ${seedProducts.length} Disney / cinéma products into ${path.join(__dirname, 'wizzaos.db')}`);
db.close();
