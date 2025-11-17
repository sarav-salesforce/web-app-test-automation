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
    const payload = req.body;

    const items =
      typeof payload.items === 'string'
        ? JSON.parse(payload.items)
        : payload.items;
    const paymentDetails =
      typeof payload.paymentDetails === 'string'
        ? JSON.parse(payload.paymentDetails)
        : payload.paymentDetails;

    const orderData = {
      customerName: payload.customerName,
      email: payload.email,
      streetAddress: payload.streetAddress,
      city: payload.city,
      zipCode: payload.zipCode,
      shippingMethod: payload.shippingMethod,
      paymentMethod: payload.paymentMethod,
      paymentDetails: paymentDetails || {},
      items: items || [],
      subtotal: Number(payload.subtotal) || 0,
      shipping: Number(payload.shipping) || 0,
      total: Number(payload.total) || 0,
      status: payload.status || 'Processing',
    };

    const { orderNumber } = await createOrder(orderData);
    res.status(201).json({ message: 'Order created', orderNumber });
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
