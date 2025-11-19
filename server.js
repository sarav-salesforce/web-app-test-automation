const express = require('express');
const path = require('path');
const {
  createOrder,
  getOrders,
  getOrderByNumber,
  getOrdersByEmail,
  normalizeOrderStatuses,
  seedOrdersIfEmpty,
} = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const catalogProducts = [
  {
    id: 'prod-1',
    name: '4K Monitor',
    price: 399.99,
    description: '27-inch 4K UHD monitor with HDR support',
    sku: '4K-27',
    inStock: true,
  },
  {
    id: 'prod-2',
    name: 'Business Laptop',
    price: 899.99,
    description: 'Lightweight laptop perfect for professionals',
    sku: 'BL-01',
    inStock: true,
  },
  {
    id: 'prod-3',
    name: 'Cable Management Kit',
    price: 19.99,
    description: 'Cable management kit for clean desk setups',
    sku: 'CM-05',
    inStock: false,
  },
  {
    id: 'prod-4',
    name: 'Desk Lamp',
    price: 54.99,
    description: 'LED desk lamp with adjustable brightness',
    sku: 'DL-10',
    inStock: true,
  },
  {
    id: 'prod-5',
    name: 'Ergonomic Chair',
    price: 299.99,
    description: 'Mesh office chair with lumbar support',
    sku: 'EC-22',
    inStock: true,
  },
  {
    id: 'prod-6',
    name: 'Gaming Computer',
    price: 1299.99,
    description: 'High-performance gaming desktop with RGB lighting',
    sku: 'GC-88',
    inStock: true,
  },
  {
    id: 'prod-7',
    name: 'Gaming Headset',
    price: 89.99,
    description: 'Surround sound headset with noise cancellation',
    sku: 'GH-19',
    inStock: true,
  },
  {
    id: 'prod-8',
    name: 'Graphics Tablet',
    price: 249.99,
    description: 'Professional drawing tablet with pressure sensitivity',
    sku: 'GT-40',
    inStock: true,
  },
  {
    id: 'prod-9',
    name: 'HD Webcam',
    price: 79.99,
    description: '1080p webcam with built-in microphone',
    sku: 'HW-12',
    inStock: false,
  },
  {
    id: 'prod-10',
    name: 'Mechanical Keyboard',
    price: 129.99,
    description: 'Mechanical keyboard with Cherry MX switches',
    sku: 'MK-33',
    inStock: true,
  },
  {
    id: 'prod-11',
    name: 'Portable SSD',
    price: 159.99,
    description: '1TB portable SSD with USB-C connectivity',
    sku: 'SSD-1TB',
    inStock: true,
  },
  {
    id: 'prod-12',
    name: 'Standing Desk',
    price: 449.99,
    description: 'Electric adjustable standing desk with presets',
    sku: 'SD-55',
    inStock: false,
  },
  {
    id: 'prod-13',
    name: 'USB-C Hub',
    price: 39.99,
    description: '7-in-1 USB-C hub with HDMI and card reader',
    sku: 'HUB-07',
    inStock: false,
  },
  {
    id: 'prod-14',
    name: 'Wireless Charger',
    price: 29.99,
    description: 'Wireless charging pad for phones and earbuds',
    sku: 'WC-09',
    inStock: true,
  },
  {
    id: 'prod-15',
    name: 'Wireless Mouse',
    price: 49.99,
    description: 'Ergonomic mouse with precision tracking',
    sku: 'WM-15',
    inStock: true,
  },
];

const featuredCartItem = {
  name: 'Business Laptop',
  sku: 'BL-01',
  description: 'Lightweight laptop perfect for professionals',
  price: 899.99,
  quantity: 1,
};

const safeParseJSON = (value, fallback) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const ensureArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  if (typeof value === 'string') {
    const parsed = safeParseJSON(value, null);
    if (!parsed) return [];
    return Array.isArray(parsed) ? parsed : [parsed];
  }
  return [value];
};

const toNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const normalizeOrderPayload = (raw) => {
  const parsedItems = ensureArray(raw.items).map((item) => ({
    name: item.name,
    sku: item.sku,
    price: toNumber(item.price, 0),
    quantity: Math.max(1, toNumber(item.quantity, 1)),
  }));

  const paymentDetails =
    typeof raw.paymentDetails === 'string'
      ? safeParseJSON(raw.paymentDetails || '{}', {})
      : raw.paymentDetails || {};

  const subtotal =
    raw.subtotal !== undefined
      ? toNumber(raw.subtotal, 0)
      : parsedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const shipping =
    raw.shipping !== undefined ? toNumber(raw.shipping, 0) : 0;

  const total =
    raw.total !== undefined ? toNumber(raw.total, subtotal + shipping) : subtotal + shipping;

  return {
    customerName: raw.customerName?.trim(),
    email: raw.email?.trim(),
    streetAddress: raw.streetAddress?.trim(),
    city: raw.city?.trim(),
    zipCode: raw.zipCode?.trim(),
    shippingMethod: raw.shippingMethod || 'Standard (5-7 days) - Free',
    paymentMethod: raw.paymentMethod || 'Credit Card',
    paymentDetails,
    items: parsedItems,
    subtotal,
    shipping,
    total,
    status: raw.status || 'Order Placed',
  };
};

app.get('/', (req, res) => {
  res.render('catalog', {
    products: catalogProducts,
    cartCount: featuredCartItem.quantity,
  });
});

app.get('/cart', (req, res) => {
  res.render('cart', {
    item: featuredCartItem,
    subtotal: featuredCartItem.price * featuredCartItem.quantity,
    shipping: 0,
  });
});

app.get('/checkout', (req, res) => {
  res.render('checkout', {
    item: featuredCartItem,
    subtotal: featuredCartItem.price * featuredCartItem.quantity,
    shipping: 0,
  });
});

app.get('/orders', async (req, res) => {
  try {
    const orders = await getOrders();
    res.render('orders', { orders });
  } catch (error) {
    res.status(500).send('Unable to load orders');
  }
});

app.get('/orders/embed', async (req, res) => {
  try {
    const orders = await getOrders();
    res.render('orders-table', { orders });
  } catch (error) {
    res.status(500).send('Unable to load orders');
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const orders = await getOrders();
    res.json(orders);
  } catch (error) {
    console.error('Failed to fetch orders', error);
    res.status(500).json({ error: 'Unable to fetch orders' });
  }
});

app.get('/api/orders/:identifier', async (req, res) => {
  const identifier = decodeURIComponent(req.params.identifier);
  try {
    if (identifier.includes('@')) {
      const orders = await getOrdersByEmail(identifier);
      if (!orders.length) {
        res.status(404).json({ error: 'No orders found for that email' });
        return;
      }
      res.json(orders);
      return;
    }

    const order = await getOrderByNumber(identifier);
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    res.json(order);
  } catch (error) {
    console.error('Failed to lookup order', error);
    res.status(500).json({ error: 'Unable to lookup order' });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const incoming = Array.isArray(req.body) ? req.body : [req.body];
    const normalized = incoming.map((entry) => normalizeOrderPayload(entry));

    const invalidEntry = normalized.find(
      (order) =>
        !order.customerName ||
        !order.email ||
        !order.items.length ||
        order.items.some((item) => !item.name || !item.sku),
    );

    if (invalidEntry) {
      res.status(400).json({ error: 'Invalid order payload' });
      return;
    }

    const orderNumbers = [];
    for (const orderData of normalized) {
      const { orderNumber } = await createOrder(orderData);
      orderNumbers.push(orderNumber);
    }

    res.status(201).json({
      message: orderNumbers.length > 1 ? 'Orders created' : 'Order created',
      orderNumber: orderNumbers[0],
      orderNumbers,
    });
  } catch (error) {
    console.error('Failed to create order', error);
    res.status(500).json({ error: 'Unable to create order' });
  }
});

async function start() {
  await seedOrdersIfEmpty();
  await normalizeOrderStatuses();
  return app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  start();
}

module.exports = { app, start };
