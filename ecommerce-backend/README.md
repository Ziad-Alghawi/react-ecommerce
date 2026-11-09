# E-Commerce Backend

The Express API for the store. It started from the [SuperSimpleDev ecommerce course](https://github.com/SuperSimpleDev/ecommerce-project) starter code, and I extended it with a separate cart and order history for each visitor, input validation and tests.

The endpoints are listed in [documentation.md](documentation.md).

## Run

Requires Node.js 22 or newer.

```bash
npm install
npm run dev
```

The server runs on http://localhost:3000. It creates the SQLite database and loads the demo products on first run. Optional settings are described in [.env.example](.env.example).

## Test

```bash
npm test
```
