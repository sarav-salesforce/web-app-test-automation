# QA Test Playground - Shopping Experience

This project is a combined UI + API playground for exercising shopping cart and checkout automation scenarios. It includes:

- Product catalog, cart, checkout, and orders dashboard rendered with Express + EJS.
- SQLite storage with seed data so orders persist between restarts.
- JSON API for creating and retrieving orders.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- npm (bundled with Node)

### Install & Run

```bash
npm install
npm start
```

The server runs at `http://localhost:3000`. On first boot a SQLite DB is created at `data/orders.db` with a few sample orders. Delete that file if you want to start fresh.

## API Reference

### Create order

```
POST /api/orders
Content-Type: application/json
```

Sample payload:

```json
{
  "customerName": "Jamie Tester",
  "email": "jamie@example.com",
  "streetAddress": "123 Testing Ave",
  "city": "Austin",
  "zipCode": "73301",
  "shippingMethod": "Standard (5-7 days) - Free",
  "paymentMethod": "Credit Card",
  "paymentDetails": { "cardEnding": "1111" },
  "items": [
    { "name": "Business Laptop", "sku": "BL-01", "price": 899.99, "quantity": 1 }
  ],
  "subtotal": 899.99,
  "shipping": 0,
  "total": 899.99
}
```

### Retrieve all orders

```
GET /api/orders
```

Returns an array of saved orders sorted by `createdAt` (most recent first).

### Retrieve by identifier

```
GET /api/orders/:identifier
```

- When `:identifier` looks like an email (e.g. `/api/orders/jamie@example.com`), the response is an array of orders for that customer.
- When `:identifier` is an order number (e.g. `/api/orders/ORD-1763412914312`), the response is the single order.

### cURL cheatsheet

```bash
# All orders
curl http://localhost:3000/api/orders

# Orders for a customer
curl http://localhost:3000/api/orders/jamie@example.com

# Specific order number
curl http://localhost:3000/api/orders/ORD-1763412914312

# Create order with multiple line items
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
        "customerName": "Casey Automation",
        "email": "casey@example.com",
        "streetAddress": "500 QA Way",
        "city": "Denver",
        "zipCode": "80202",
        "shippingMethod": "Express (2-3 days) - $25.00",
        "paymentMethod": "Credit Card",
        "paymentDetails": { "cardEnding": "4242" },
        "items": [
          { "name": "Gaming Computer", "sku": "GC-88", "price": 1299.99, "quantity": 1 },
          { "name": "Wireless Mouse", "sku": "WM-15", "price": 49.99, "quantity": 2 }
        ],
        "subtotal": 1399.97,
        "shipping": 25,
        "total": 1424.97,
        "status": "Order Placed"
      }'
```

## UI Routes

- `/` - Product catalog with filtering, sorting, toast confirmations, and add-to-cart actions.
- `/cart` - Full cart table with per-item quantities and removal confirmations.
- `/checkout` - Shipping form, payment selection, and API-backed submission of whatever is in the cart.
- `/orders` - Orders dashboard that embeds an iframe listing current orders.

Orders created through the UI or the API land in the SQLite database (`data/orders.db`) so they persist between restarts.
