<p align="center">
  <h1 align="center">⚡ Xness</h1>
  <p align="center">
    A real-time leveraged crypto trading platform
    <br />
    <strong>BTC · ETH · SOL — Up to 100× Leverage</strong>
    <br />
    <br />
    <a href="#features">Features</a> · <a href="#architecture">Architecture</a> · <a href="#getting-started">Getting Started</a> · <a href="#deployment">Deployment</a> · <a href="#contributing">Contributing</a>
  </p>
</p>

---

## 📖 About

Xness is a full-stack, event-driven trading platform that lets users trade crypto perpetuals with leverage. It features real-time price feeds via WebSocket, an in-memory trading engine with BigInt precision math, automatic risk management (liquidation, take-profit, stop-loss), and a modern Next.js trading UI with candlestick charts.

Built as a **Turborepo monorepo** with 4 microservices communicating through **Redis Streams**.

## ✨ Features

- **Margin Trading** — Long/Short positions with up to 100× leverage
- **Real-Time Prices** — Live WebSocket feed from Backpack Exchange
- **Trading Engine** — In-memory order processing with BigInt fixed-point arithmetic (8-decimal precision)
- **Risk Management** — Automatic liquidation, take-profit, and stop-loss execution
- **Candlestick Charts** — Interactive TradingView-style charts with multiple timeframes (1m, 5m, 15m, 1h, 4h, 1d)
- **Order Management** — Open positions table, order history, one-click close
- **Wallet System** — USDC deposits and real-time balance tracking
- **Authentication** — JWT-based auth with sign-up/sign-in/sign-out
- **Responsive UI** — Modern dark-themed trading interface

## 🏗️ Architecture

```
                    ┌─────────────────┐
                    │   Next.js Web   │
                    │   (Frontend)    │
                    └───────┬─────────┘
                            │ HTTP / WS
                    ┌───────▼─────────┐
                    │   HTTP Server   │◄────── JWT Auth
                    │   (REST API)    │
                    └───────┬─────────┘
                            │ Redis Streams
               ┌────────────┼────────────┐
               ▼            ▼            ▼
       ┌──────────┐  ┌────────────┐  ┌──────────┐
       │  Price   │  │  Trading   │  │PostgreSQL│
       │  Poller  │  │  Engine    │  │    DB    │
       └────┬─────┘  └──────┬─────┘  └──────────┘
            │               │
       Backpack       In-Memory State
       Exchange       + Batch DB Writes
       (WebSocket)
```

### Services

| Service | Description | Port |
|---------|-------------|------|
| **Web** | Next.js 14 frontend with trading UI | `3000` |
| **HTTP Server** | Express REST API with JWT auth | `4000` |
| **Trading Engine** | Stateful engine processing orders in-memory via Redis Streams | — |
| **Price Poller** | Streams live BTC/ETH/SOL prices from Backpack Exchange WebSocket | — |

### Shared Packages

| Package | Description |
|---------|-------------|
| `@repo/db` | Prisma client + schema (PostgreSQL) |
| `@repo/redis-client` | Shared Redis connection factory |
| `@repo/types` | Shared TypeScript types |
| `@repo/ui` | Shared UI components |
| `@repo/eslint-config` | Shared ESLint configuration |
| `@repo/typescript-config` | Shared TypeScript configuration |

## 📁 Project Structure

```
xness/
├── apps/
│   ├── web/                  # Next.js frontend
│   │   ├── app/
│   │   │   ├── (auth)/       # Sign-in / Sign-up pages
│   │   │   ├── (protected)/  # Trade, Market, Wallet pages
│   │   │   └── page.tsx      # Landing page
│   │   ├── components/       # TradingChart, OrderForm, OrderBook, etc.
│   │   ├── hooks/            # useMarketFeed, etc.
│   │   └── lib/              # API client
│   ├── http_server/          # Express REST API
│   │   └── src/
│   │       ├── controllers/  # Auth, Order, Balance controllers
│   │       ├── middleware/    # JWT auth middleware
│   │       └── routes/       # API routes
│   ├── engine/               # Trading engine
│   │   └── src/index.ts      # Core engine loop
│   └── price_poller/         # Backpack Exchange WebSocket client
│       └── src/index.ts
├── packages/
│   ├── db/                   # Prisma schema + client
│   ├── redisClient/          # Redis connection
│   ├── types/                # Shared types
│   ├── ui/                   # Shared UI
│   ├── eslint-config/
│   └── typescript-config/
├── docker/                   # Dockerfiles for each service
├── docker-compose.yml        # Local development (Postgres + Redis)
├── docker-compose.prod.yml   # Production (all services)
├── nginx.conf                # Nginx reverse proxy config
└── turbo.json                # Turborepo pipeline config
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14, React, TypeScript, Lightweight Charts |
| **Backend API** | Node.js, Express, Zod validation |
| **Trading Engine** | Node.js, BigInt arithmetic, Redis Streams |
| **Database** | PostgreSQL 15, Prisma ORM |
| **Message Bus** | Redis Streams (event-driven) |
| **Price Feed** | Backpack Exchange WebSocket API |
| **Auth** | JWT (HTTP-only cookies) |
| **Monorepo** | Turborepo, pnpm workspaces |
| **Deployment** | Docker, Docker Compose, Nginx, Let's Encrypt SSL |
| **Cloud** | AWS EC2 |

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **pnpm** ≥ 9.0
- **Docker** & **Docker Compose** (for Postgres + Redis)

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/xness.git
cd xness
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Start Infrastructure

Start PostgreSQL and Redis using Docker:

```bash
docker compose up -d
```

### 4. Set Up Environment Variables

Create `.env` files for the services that need them:

**`packages/db/.env`**
```env
DATABASE_URL="postgresql://sanjana:sura@localhost:5432/postgres?schema=public"
```

**`apps/http_server/.env`**
```env
DATABASE_URL="postgresql://sanjana:sura@localhost:5432/postgres?schema=public"
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 5. Run Database Migrations

```bash
cd packages/db
npx prisma migrate deploy
npx prisma generate
cd ../..
```

### 6. Start All Services

```bash
pnpm dev
```

This starts all 4 services simultaneously via Turborepo:
- **Web** → `http://localhost:3000`
- **HTTP Server** → `http://localhost:4000`
- **Engine** → Consuming from Redis Streams
- **Price Poller** → Streaming from Backpack Exchange

## 🔑 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/v1/auth/signup` | Create a new account |
| `POST` | `/v1/auth/signin` | Sign in |
| `POST` | `/v1/auth/signout` | Sign out |
| `GET` | `/v1/auth/profile` | Get current user |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/v1/orders` | Place a new order |
| `POST` | `/v1/orders/:id/close` | Close a position |
| `GET` | `/v1/orders/open-orders` | Get open positions |
| `GET` | `/v1/orders/` | Get all orders |
| `GET` | `/v1/orders/:id` | Get order by ID |

### Balance
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/v1/balance` | Get wallet balance |
| `POST` | `/v1/balance/deposit` | Deposit USDC |

### Market Data
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/v1/candles?asset=BTC_USDC&timeFrame=1m` | Get candlestick data |

## 🐳 Deployment

### Production Deployment (Docker Compose)

See the full [Deployment Guide](deployment.md) for step-by-step instructions on deploying to AWS EC2.

Quick start:

```bash
# 1. Set environment variables
cp .env.example .env
# Edit .env with your production values

# 2. Build and start all services
docker compose -f docker-compose.prod.yml up -d --build

# 3. Run database migrations
docker compose -f docker-compose.prod.yml run --rm engine \
  sh -c "cd ../../packages/db && npm install -g prisma && prisma migrate deploy"
```

### Services in Production

All 5 services are containerized:
- `xness_web` — Next.js frontend (port 3000)
- `xness_http` — Express API (port 4000)
- `xness_engine` — Trading engine (no exposed port)
- `xness_poller` — Price poller (no exposed port)
- `xness_postgres` — PostgreSQL database (port 5432)
- `xness_redis` — Redis (port 6379)

Nginx is used as a reverse proxy to route traffic and terminate SSL.

## 📊 Data Model

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│     User     │     │    Wallet    │     │    Order     │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ id           │────▶│ userId (1:1) │     │ userId (1:N) │
│ name         │     │ asset (USDC) │     │ market       │
│ email        │     │ balanceRaw   │     │ side         │
│ password     │     │ createdAt    │     │ status       │
│              │     │ updatedAt    │     │ quantity     │
│              │     │              │     │ openPrice    │
│              │     │              │     │ closePrice   │
│              │     │              │     │ leverage     │
│              │     │              │     │ initialMargin│
│              │     │              │     │ Pnl          │
│              │     │              │     │ takeProfit   │
│              │     │              │     │ stopLoss     │
│              │     │              │     │ reason       │
│              │     │              │     │ createdAt    │
│              │     │              │     │ closedAt     │
└──────────────┘     └──────────────┘     └──────────────┘

Markets: BTC_USDC | SOL_USDC | ETH_USDC
Sides:   LONG | SHORT
Status:  OPEN | CLOSED | LIQUIDATION
```

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

### 1. Fork & Clone

```bash
git fork https://github.com/YOUR_USERNAME/xness.git
git clone https://github.com/YOUR_FORK/xness.git
cd xness
```

### 2. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

### 3. Make Your Changes

Follow the existing code style and patterns. Key guidelines:

- **TypeScript** — All code must be fully typed
- **BigInt** — All financial values use BigInt with 8-decimal scaling (never use `Number` for money)
- **Shared packages** — Common types/utilities go in `packages/`, not duplicated across apps
- **Components** — UI components go in `apps/web/components/`

### 4. Test Your Changes

```bash
# Type-check all packages
pnpm check-types

# Lint
pnpm lint

# Build everything
pnpm build
```

### 5. Submit a Pull Request

Push your branch and open a PR with:
- A clear description of what you changed
- Why you made the change
- Screenshots for any UI changes

### Ideas for Contributions

- [ ] Add support for more trading pairs
- [ ] Implement order book visualization
- [ ] Add portfolio analytics / PnL charts
- [ ] WebSocket reconnection with exponential backoff in the frontend
- [ ] Rate limiting on API endpoints
- [ ] Database connection pooling
- [ ] CI/CD pipeline with GitHub Actions
- [ ] Add unit tests for the trading engine
- [ ] Multi-asset wallet support

## ⚙️ Environment Variables

| Variable | Service | Description |
|----------|---------|-------------|
| `DATABASE_URL` | HTTP Server, Engine | PostgreSQL connection string |
| `REDIS_HOST` | HTTP Server, Engine, Poller | Redis hostname |
| `REDIS_PORT` | HTTP Server, Engine, Poller | Redis port |
| `NEXT_PUBLIC_API_URL` | Web | API base URL |
| `CORS_ORIGIN` | HTTP Server | Allowed CORS origin |
| `DOMAIN` | Docker Compose (prod) | Production domain name |
| `POSTGRES_USER` | Docker Compose | PostgreSQL username |
| `POSTGRES_PASSWORD` | Docker Compose | PostgreSQL password |
| `POSTGRES_DB` | Docker Compose | PostgreSQL database name |

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<p align="center">
  Built with ❤️ using TypeScript, Next.js, Redis, and PostgreSQL
</p>