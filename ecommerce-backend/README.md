# E-Commerce Backend

The Express API for the store. It started from the [SuperSimpleDev ecommerce course](https://github.com/SuperSimpleDev/ecommerce-project) starter code, and I extended it with a separate cart and order history for each visitor, input validation and tests.

The endpoints are listed in [documentation.md](documentation.md).

## Run

Requires Node.js 22 or newer.

```bash
npm install
npm run dev
```

The server runs on http://localhost:3000. It uses a local SQLite file, or Postgres when `DATABASE_URL` is set, and loads the demo products into empty tables on startup. Optional settings are described in [.env.example](.env.example), and the [main README](../README.md#database) explains the Postgres setup.

## Test

```bash
npm test
```
