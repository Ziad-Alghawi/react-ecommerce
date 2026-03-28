# E-Commerce Frontend

A React and TypeScript storefront built with Vite and connected to an Express backend for products, cart, checkout, orders, and package tracking.

This project focuses on a clean shopping flow rather than a mock landing page. The frontend handles product browsing, cart updates, checkout, order history, and delivery tracking, while the bundled backend serves the API, image assets, and production build output.

## Stack

- React 19
- TypeScript
- Vite
- React Router
- Axios
- Vitest and Testing Library
- Express backend inside [ecommerce-backend](./ecommerce-backend)

## Features

- Product listing with search
- Cart quantity updates and item removal
- Delivery option selection during checkout
- Payment summary and order placement flow
- Orders history page
- Delivery tracking page
- TypeScript-based frontend source for components, pages, and utilities
- Component and utility tests covering key flows

## Project Structure

```text
ecommerce-project/
|-- ecommerce-backend/   # Express API, images, database, production dist
|-- public/              # Frontend static assets
|-- src/                 # React + TypeScript frontend
|-- vite.config.ts       # Frontend build and proxy configuration
```

## Getting Started

Install dependencies for both the frontend and the backend.

```bash
npm install
npm --prefix ecommerce-backend install
```

Start the backend first.

```bash
npm run dev:backend
```

In a second terminal, start the frontend dev server.

```bash
npm run dev
```

The frontend runs through Vite and proxies API and image requests to the backend on port 3000.

## Available Scripts

Frontend root:

```bash
npm run dev
npm run dev:frontend
npm run build
npm run preview
npm run lint
npm run test
```

Backend:

```bash
npm --prefix ecommerce-backend run dev
npm --prefix ecommerce-backend run start
```

## Build Notes

- The frontend production build is written to [ecommerce-backend/dist](./ecommerce-backend/dist).
- That setup keeps the backend ready to serve the compiled frontend in one place.
- For local development, the backend must be running before the frontend if you want API requests and images to work correctly.

## Validation

The current frontend has been checked with:

```bash
npm run build
npm run lint
npm run test
```

## Notes

- If port 3000 is already in use, stop the existing process before starting the backend.
- The repository keeps the backend inside the frontend project folder so the full app can be started from one place.

## Summary

This repository represents a complete TypeScript migration of the frontend application while preserving the original shopping experience and backend integration. The result is a cleaner project structure, improved maintainability, and a more production-ready developer workflow.
