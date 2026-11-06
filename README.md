# Smart Quick-Commerce Grocery System (SQGS)

Ultra-fast grocery delivery (10–15 minutes) from hyper-local **dark stores** within a 2–3 km radius — ESILV Software Engineering & Development project, M1 2026-2027.

- **Backend:** Node.js 20 · Express 4 · ES modules · in-memory data
- **Frontend:** React 18 · Vite (`client/`)
- **Quality:** Vitest + Supertest (coverage ≥ 80 %) · ESLint · GitHub Actions CI
- **Planning:** Jira project `SCRUM` on https://quickcommerce.atlassian.net

## Run it

```bash
npm install
npm run dev                 # API → http://localhost:3000

npm run client:install
npm run client:dev          # React app → http://localhost:5173 (proxies /api to :3000)
```

```bash
npm test                    # unit + integration tests
npm test -- --coverage      # with coverage report in coverage/
npm run lint
```

## API

| Area | Method & route | Notes |
|---|---|---|
| Platform | `GET /version` `/info` `/health` `/boom` | `/boom` simulates a 500 |
| Products | `GET/POST /api/products` · `GET/PUT/DELETE /api/products/:id` | filters `category`, `q` |
| Dark stores | `GET/POST /api/darkstores` · `GET/PUT/DELETE /api/darkstores/:id` · `GET /api/darkstores/nearest?lat&lng` | 3 km radius |
| Catalog | `GET /api/catalog?storeId=` or `?lat&lng` | one store's products with live stock |
| Quote | `POST /api/orders/quote` | subtotal, delivery fee, small-cart fee, ETA |
| Orders | `GET/POST /api/orders` · `GET/PUT/DELETE /api/orders/:id` | checkout reserves stock and takes payment |
| Payments | `GET /api/payments` · `GET /api/payments/:id` · `PUT /api/payments/:id/confirm` | mock gateway, `tok_fail` = declined |

Order lifecycle: `PLACED → PICKING → PACKED → OUT_FOR_DELIVERY → DELIVERED` (or `CANCELLED` before packing).

### Example checkout

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"customerId":"c1","address":{"lat":48.8566,"lng":2.3735},
       "items":[{"productId":1,"quantity":2},{"productId":9,"quantity":1}],
       "payment":{"method":"card","token":"tok_demo"}}'
```

## Project structure

```
src/
  app.js, server.js
  data/        db.js (in-memory store), seed.js
  routes/      core, products, darkStores, catalog, orders, payments
  services/    orderService, stockService, paymentService, deliveryFee
  utils/       geo, httpError, errorHandler, status, appInfo
test/          integration tests + unit/
client/        React customer app
```

## Team & workflow

Branch `feature/SCRUM-<id>-<name>` → commit `feat(SCRUM-<id>): …` → PR `SCRUM-<id> | …` → merge when CI is green.
