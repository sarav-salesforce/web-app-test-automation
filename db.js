const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dataDir = path.join(__dirname, 'data');
const dbPath = path.join(dataDir, 'orders.db');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orderNumber TEXT UNIQUE,
      customerName TEXT,
      email TEXT,
      streetAddress TEXT,
      city TEXT,
      zipCode TEXT,
      shippingMethod TEXT,
      paymentMethod TEXT,
      paymentDetails TEXT,
      items TEXT,
      subtotal REAL,
      shipping REAL,
      total REAL,
      status TEXT DEFAULT 'Order Placed',
      createdAt TEXT
    )`,
  );
});

const runAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function runCallback(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(this);
    });
  });

const allAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });

async function createOrder(order) {
  const {
    customerName,
    email,
    streetAddress,
    city,
    zipCode,
    shippingMethod,
    paymentMethod,
    paymentDetails,
    items,
    subtotal,
    shipping,
    total,
    status = 'Order Placed',
  } = order;

  const orderNumber = `ORD-${Date.now()}`;
  const createdAt = new Date().toISOString();

  await runAsync(
    `INSERT INTO orders (
      orderNumber,
      customerName,
      email,
      streetAddress,
      city,
      zipCode,
      shippingMethod,
      paymentMethod,
      paymentDetails,
      items,
      subtotal,
      shipping,
      total,
      status,
      createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      orderNumber,
      customerName,
      email,
      streetAddress,
      city,
      zipCode,
      shippingMethod,
      paymentMethod,
      JSON.stringify(paymentDetails || {}),
      JSON.stringify(items || []),
      subtotal,
      shipping,
      total,
      status,
      createdAt,
    ],
  );

  return { orderNumber, createdAt };
}

async function getOrders() {
  const rows = await allAsync(
    'SELECT * FROM orders ORDER BY datetime(createdAt) DESC',
  );
  return rows.map((row) => ({
    ...row,
    paymentDetails: JSON.parse(row.paymentDetails || '{}'),
    items: JSON.parse(row.items || '[]'),
  }));
}

async function getOrderByNumber(orderNumber) {
  const rows = await allAsync('SELECT * FROM orders WHERE orderNumber = ?', [
    orderNumber,
  ]);
  if (!rows.length) {
    return null;
  }
  const row = rows[0];
  return {
    ...row,
    paymentDetails: JSON.parse(row.paymentDetails || '{}'),
    items: JSON.parse(row.items || '[]'),
  };
}

async function getOrdersByEmail(email) {
  const rows = await allAsync(
    'SELECT * FROM orders WHERE LOWER(email) = LOWER(?) ORDER BY datetime(createdAt) DESC',
    [email],
  );
  return rows.map((row) => ({
    ...row,
    paymentDetails: JSON.parse(row.paymentDetails || '{}'),
    items: JSON.parse(row.items || '[]'),
  }));
}

async function normalizeOrderStatuses() {
  await runAsync(
    "UPDATE orders SET status = 'Order Placed' WHERE status IS NULL OR status != 'Order Placed'",
  );
}

async function seedOrdersIfEmpty() {
  const rows = await allAsync('SELECT COUNT(*) as count FROM orders');
  if (rows[0]?.count) {
    return;
  }

  const sampleOrders = [
    {
      customerName: 'Avery Chen',
      email: 'avery@example.com',
      streetAddress: '123 Market St',
      city: 'San Francisco',
      zipCode: '94107',
      shippingMethod: 'Standard (5-7 days) - Free',
      paymentMethod: 'Credit Card',
      paymentDetails: { cardEnding: '1111' },
      items: [
        { name: 'Business Laptop', price: 899.99, quantity: 1, sku: 'BL-01' },
      ],
      subtotal: 899.99,
      shipping: 0,
      total: 899.99,
    },
    {
      customerName: 'Jordan Patel',
      email: 'jordan@example.com',
      streetAddress: '78 Innovation Way',
      city: 'Austin',
      zipCode: '73301',
      shippingMethod: 'Express (2-3 days) - $25.00',
      paymentMethod: 'PayPal (Test Mode)',
      paymentDetails: { transactionId: 'PAY123456' },
      items: [
        { name: '4K Monitor', price: 399.99, quantity: 1, sku: '4K-27' },
      ],
      subtotal: 399.99,
      shipping: 25,
      total: 424.99,
    },
    {
      customerName: 'Morgan Lee',
      email: 'morgan@example.com',
      streetAddress: '56 Testing Ave',
      city: 'Seattle',
      zipCode: '98101',
      shippingMethod: 'Standard (5-7 days) - Free',
      paymentMethod: 'Bank Transfer (Test Mode)',
      paymentDetails: { reference: 'BANK-2025' },
      items: [
        { name: 'Desk Lamp', price: 54.99, quantity: 2, sku: 'DL-10' },
      ],
      subtotal: 109.98,
      shipping: 0,
      total: 109.98,
    },
  ];

  for (const sample of sampleOrders) {
    await createOrder(sample);
  }
}

module.exports = {
  db,
  createOrder,
  getOrders,
  getOrderByNumber,
  getOrdersByEmail,
  normalizeOrderStatuses,
  seedOrdersIfEmpty,
};
