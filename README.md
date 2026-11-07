# React E-Commerce Store

A full-stack online store built with React, TypeScript and an Express API, covering the flow from product search to order tracking.

**Live demo:** https://react-ecommerce-8359.onrender.com

> The demo runs on a free server that sleeps when idle, so the first visit may take about a minute to load.

![Store home page](docs/screenshots/react-store.png)

## Features

- Product catalog with search by name or keyword
- Cart with quantity updates and item removal
- Delivery options with a live payment summary
- Order placement and order history
- Package tracking with delivery progress
- Responsive layout for phone and desktop

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, React Router, Axios, Day.js
- **Backend:** Node.js, Express, Sequelize, SQLite
- **Testing and tooling:** Vitest, Testing Library, ESLint, GitHub Actions

## Run Locally

Requires Node.js 22 or newer.

Install the dependencies:

```bash
npm install
npm --prefix ecommerce-backend install
```

Start the backend on http://localhost:3000. It creates the database and loads the demo data on first run.

```bash
npm run dev:backend
```

In a second terminal, start the frontend on http://localhost:5173:

```bash
npm run dev
```

The dev server forwards API requests to the backend, so no configuration is needed. Optional settings are described in [.env.example](.env.example) and [ecommerce-backend/.env.example](ecommerce-backend/.env.example).

## Tests

```bash
npm test
npm run lint
npm run build
```

GitHub Actions runs all three on every push.

## Project Structure

```text
.
├── .github/workflows/    # CI pipeline
├── docs/screenshots/     # README images
├── ecommerce-backend/    # Express API
│   ├── defaultData/      # Demo products, cart and orders
│   ├── images/           # Product images served by the API
│   ├── models/           # Sequelize models
│   ├── routes/           # API routes
│   └── server.js         # Server entry point
├── public/               # Static frontend assets
├── src/
│   ├── components/       # Shared components
│   ├── pages/            # Home, checkout, orders, tracking
│   ├── types/            # Shared TypeScript types
│   └── utils/            # Helpers and their tests
└── render.yaml           # Render deployment config
```

## Background

This project started from a React course. The backend is based on the [course starter code](https://github.com/SuperSimpleDev/ecommerce-project), and I built the frontend while following the course, then migrated it to TypeScript. I extended the project with a search fix, cart quantity validation, frontend tests, CI and deployment config.
