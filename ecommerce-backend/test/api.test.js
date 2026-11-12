import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHmac, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SignJWT, exportJWK, generateKeyPair } from 'jose';

const serverFile = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'server.js');
// The database file is saved in the working directory, so use an empty
// folder to keep the real database.sqlite untouched
const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ecommerce-backend-test-'));
const productId = 'e43638ce-6aa0-4b85-b27f-e1d07eb678c6';
const adminId = randomUUID();
const newProduct = {
  name: 'Plaid Wool Scarf',
  priceCents: 1599,
  image: 'images/products/gray-hand-knit-wool-socks.jpg',
  keywords: ['scarves', 'plaid']
};

let server;
let baseUrl;
let supabase;
let supabaseUrl;
let signingKey;
let stripeApi;
let stripeSettings;
const webhookSecret = 'whsec_test_secret';
// The Checkout Sessions the server created, by ID, and their line items
const stripeSessions = new Map();
const stripeLineItems = new Map();

function getFreePort() {
  return new Promise((resolve) => {
    const probe = net.createServer().listen(0, () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

// Stands in for Supabase Auth, which publishes the public keys its tokens are signed with
async function startSupabase() {
  const { privateKey, publicKey } = await generateKeyPair('ES256');
  signingKey = privateKey;
  const keys = { keys: [{ ...await exportJWK(publicKey), kid: 'test-key', alg: 'ES256', use: 'sig' }] };

  supabase = http.createServer((req, res) => {
    if (req.url !== '/auth/v1/.well-known/jwks.json') {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(keys));
  });
  await new Promise((resolve) => supabase.listen(0, resolve));
  supabaseUrl = `http://localhost:${supabase.address().port}`;
}

// Stripe's API takes form fields like line_items[0][price_data][unit_amount]=1090
function parseStripeForm(body) {
  const fields = {};
  for (const [name, value] of new URLSearchParams(body)) {
    const keys = name.split(/\]?\[|\]/).filter(Boolean);
    const parent = keys.slice(0, -1).reduce((object, key) => (object[key] ??= {}), fields);
    parent[keys.at(-1)] = value;
  }
  return fields;
}

// Stands in for the Stripe API. It keeps the sessions the server creates, which tests then mark paid
async function startStripe() {
  stripeApi = http.createServer(async (req, res) => {
    const send = (status, body) => res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(body));
    const [, sessionId, lineItemsPath] = req.url.match(/^\/v1\/checkout\/sessions(?:\/(\w+)(\/line_items)?)?/) ?? [];

    if (req.method === 'POST' && req.url === '/v1/checkout/sessions') {
      let body = '';
      for await (const chunk of req) body += chunk;
      const { line_items: lines, metadata, success_url, cancel_url } = parseStripeForm(body);

      const lineItems = Object.values(lines).map(({ price_data: price, quantity }) => ({
        description: price.product_data.name,
        quantity: Number(quantity),
        amount_total: Number(price.unit_amount) * Number(quantity),
        price: { unit_amount: Number(price.unit_amount), product: { metadata: price.product_data.metadata ?? {} } }
      }));
      const session = {
        id: `cs_test_${randomUUID().replaceAll('-', '')}`,
        object: 'checkout.session',
        url: 'https://checkout.stripe.com/c/pay/test',
        amount_total: lineItems.reduce((total, line) => total + line.amount_total, 0),
        payment_status: 'unpaid',
        metadata,
        success_url,
        cancel_url
      };
      stripeSessions.set(session.id, session);
      stripeLineItems.set(session.id, lineItems);
      return send(200, session);
    }

    if (req.method === 'GET' && stripeSessions.has(sessionId) && lineItemsPath) {
      // Takes a moment like the real API, so requests that arrive together overlap
      setTimeout(() => send(200, { object: 'list', data: stripeLineItems.get(sessionId), has_more: false }), 50);
      return;
    }
    if (req.method === 'GET' && stripeSessions.has(sessionId)) {
      return send(200, stripeSessions.get(sessionId));
    }
    send(404, { error: { type: 'invalid_request_error', code: 'resource_missing', message: 'No such checkout session' } });
  });
  await new Promise((resolve) => stripeApi.listen(0, resolve));
  stripeSettings = {
    STRIPE_SECRET_KEY: 'sk_test_stand_in',
    STRIPE_WEBHOOK_SECRET: webhookSecret,
    STRIPE_API_URL: `http://localhost:${stripeApi.address().port}`
  };
}

function createToken(userId = randomUUID(), {
  key = signingKey,
  issuer = `${supabaseUrl}/auth/v1`,
  expiresAt = '1h',
  email
} = {}) {
  return new SignJWT({ role: 'authenticated', email })
    .setProtectedHeader({ alg: 'ES256', kid: 'test-key' })
    .setIssuer(issuer)
    .setAudience('authenticated')
    .setSubject(userId)
    .setExpirationTime(expiresAt)
    .sign(key);
}

async function startServer(settings = {}) {
  const port = await getFreePort();
  baseUrl = `http://localhost:${port}`;
  // Like a local run, the Supabase project only comes from .env. Real environment variables
  // win over the file, so the order limit tests see MAX_ORDERS=2
  fs.writeFileSync(path.join(workDir, '.env'), `SUPABASE_URL=${supabaseUrl}
MAX_ORDERS=50
`);
  const env = {
    ...process.env,
    PORT: String(port),
    MAX_VISITORS: '3',
    MAX_ORDERS: '2',
    // Spaces and capitals as someone might paste them
    ADMIN_USER_IDS: ` ${adminId.toUpperCase()} ,${randomUUID()}`,
    // Tests delete visitors, so they only reach Postgres when given a throwaway database
    DATABASE_URL: process.env.TEST_DATABASE_URL || '',
    ...stripeSettings,
    ...settings
  };
  delete env.SUPABASE_URL;

  server = spawn(process.execPath, [serverFile], { cwd: workDir, env });

  await new Promise((resolve, reject) => {
    server.stdout.on('data', (data) => {
      if (data.toString().includes('Server is running')) resolve();
    });
    server.on('exit', (code) => reject(new Error(`Server exited with code ${code}`)));
  });
}

async function stopServer() {
  const exited = new Promise((resolve) => server.once('exit', resolve));
  server.kill();
  await exited;
}

// A guest is their visitor ID. A logged in user is { token }, plus the browser's visitorId if any
function api(urlPath, {
  visitorId, token, authorization = token && `Bearer ${token}`, method = 'GET', body, headers: extraHeaders
} = {}) {
  const headers = { 'Content-Type': 'application/json', ...extraHeaders };
  if (visitorId) headers['X-Visitor-Id'] = visitorId;
  if (authorization) headers.Authorization = authorization;
  return fetch(baseUrl + urlPath, {
    method,
    headers,
    body: body && JSON.stringify(body)
  });
}

const identify = (who) => (typeof who === 'string' ? { visitorId: who } : who);

async function addToCart(who) {
  const response = await api('/api/cart-items', {
    ...identify(who), method: 'POST', body: { productId, quantity: 1 }
  });
  assert.equal(response.status, 201);
}

async function getCart(who) {
  return (await api('/api/cart-items', identify(who))).json();
}

async function asAdmin() {
  return { token: await createToken(adminId) };
}

async function createProduct(fields = newProduct) {
  const response = await api('/api/admin/products', { ...await asAdmin(), method: 'POST', body: fields });
  assert.equal(response.status, 201);
  return response.json();
}

async function getProducts(search = '') {
  return (await api(`/api/products${search && `?search=${search}`}`)).json();
}

// A logged in user who has ordered the product, so they can review it
async function createBuyer(orderedProductId = productId, email) {
  const buyer = { token: await createToken(randomUUID(), { email }) };
  await api('/api/cart-items', { ...buyer, method: 'POST', body: { productId: orderedProductId, quantity: 1 } });
  assert.equal((await api('/api/orders', { ...buyer, method: 'POST' })).status, 201);
  return buyer;
}

const reviewsPath = (id = productId) => `/api/products/${id}/reviews`;

function postReview(who, body, id = productId) {
  return api(reviewsPath(id), { ...who, method: 'POST', body });
}

async function getReviews(who = {}, id = productId) {
  return (await api(reviewsPath(id), who)).json();
}

async function getRating(id) {
  return (await (await api(`/api/products/${id}`)).json()).rating;
}

async function getOrders(who) {
  return (await api('/api/orders', identify(who))).json();
}

function checkout(who, origin = baseUrl) {
  return api('/api/stripe/checkout-sessions', { ...identify(who), method: 'POST', headers: { Origin: origin } });
}

// What clicking Pay with card does. Returns the session the Stripe stand-in got
async function startCheckout(who) {
  const response = await checkout(who);
  assert.equal(response.status, 201);
  assert.equal((await response.json()).url, 'https://checkout.stripe.com/c/pay/test');
  return [...stripeSessions.values()].at(-1);
}

// What the success page asks for after Stripe sends the customer back
function getPaidOrder(who, session) {
  return api(`/api/stripe/checkout-sessions/${session.id}/order`, identify(who));
}

// Signed like Stripe signs webhooks: an HMAC of the timestamp and the exact body
function sendWebhook(event, { secret = webhookSecret, body = JSON.stringify(event) } = {}) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac('sha256', secret).update(`${timestamp}.${JSON.stringify(event)}`).digest('hex');
  return fetch(`${baseUrl}/api/stripe/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Stripe-Signature': `t=${timestamp},v1=${signature}` },
    body
  });
}

function checkoutCompleted(session) {
  return { id: `evt_${randomUUID()}`, object: 'event', type: 'checkout.session.completed', data: { object: session } };
}

before(async () => {
  await startSupabase();
  await startStripe();
  await startServer();
});
after(async () => {
  await stopServer();
  supabase.close();
  stripeApi.close();
  fs.rmSync(workDir, { recursive: true, force: true });
});

test('products and delivery options work without a visitor ID', async () => {
  assert.equal((await api('/api/products')).status, 200);
  assert.equal((await api('/api/delivery-options')).status, 200);
});

test('searches products by name or keyword', async () => {
  const byName = await (await api('/api/products?search=SOCKS')).json();
  assert.ok(byName.some((product) => product.id === productId));

  const byKeyword = await (await api('/api/products?search=apparel')).json();
  assert.ok(byKeyword.some((product) => product.id === productId));

  assert.deepEqual(await (await api('/api/products?search=spaceship')).json(), []);
});

test('an order costs what the payment summary showed', async () => {
  const visitorId = randomUUID();
  await addToCart(visitorId);
  await api(`/api/cart-items/${productId}`, {
    visitorId, method: 'PUT', body: { quantity: 2, deliveryOptionId: '2' }
  });

  const summary = await (await api('/api/payment-summary', { visitorId })).json();
  // 2 socks at $10.90, $4.99 shipping, 10% tax
  assert.equal(summary.totalItems, 2);
  assert.equal(summary.productCostCents, 2180);
  assert.equal(summary.shippingCostCents, 499);
  assert.equal(summary.taxCents, 268);
  assert.equal(summary.totalCostCents, 2947);

  const order = await (await api('/api/orders', { visitorId, method: 'POST' })).json();
  assert.equal(order.totalCostCents, summary.totalCostCents);

  // Delivery option 2 takes 3 days
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
  const deliveryTimeMs = order.products[0].estimatedDeliveryTimeMs;
  assert.ok(Math.abs(deliveryTimeMs - (order.orderTimeMs + threeDaysMs)) < 5000);

  const savedOrder = await (await api(`/api/orders/${order.id}?expand=products`, { visitorId })).json();
  assert.equal(savedOrder.products[0].product.id, productId);
  assert.equal(savedOrder.orderTimeMs, order.orderTimeMs);
});

for (const [kind, createVisitor] of [
  ['guest', async () => randomUUID()],
  ['user', async () => ({ token: await createToken() })]
]) {
  test(`refuses new orders once a ${kind} has reached the limit`, async () => {
    // The server was started with room for 2 orders per visitor
    const visitor = await createVisitor();
    const placeOrder = () => api('/api/orders', { ...identify(visitor), method: 'POST' });

    for (let i = 0; i < 2; i++) {
      await addToCart(visitor);
      assert.equal((await placeOrder()).status, 201);
    }

    await addToCart(visitor);
    const response = await placeOrder();
    assert.equal(response.status, 409);
    assert.match((await response.json()).error, /up to 2 orders/);
    // The cart is kept, so nothing is lost
    assert.equal((await getCart(visitor)).length, 1);
  });
}

test('cart and order routes need a valid visitor ID', async () => {
  for (const urlPath of ['/api/cart-items', '/api/orders', '/api/payment-summary']) {
    assert.equal((await api(urlPath)).status, 400, `${urlPath} without an ID`);
    assert.equal((await api(urlPath, { visitorId: 'not-a-uuid' })).status, 400, `${urlPath} with a bad ID`);
  }
});

test('reads the Supabase project from .env in the folder it runs in', async () => {
  const response = await api('/api/cart-items', { token: await createToken() });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), []);
});

test('a logged in user has the same cart and orders in every browser', async () => {
  const token = await createToken();
  const laptop = { token, visitorId: randomUUID() };
  const phone = { token, visitorId: randomUUID() };

  await addToCart(laptop);
  assert.equal((await getCart(phone)).length, 1);
  // No visitor ID is needed with a token
  assert.equal((await getCart({ token })).length, 1);
  // The browser's own guest cart is separate
  assert.deepEqual(await getCart(laptop.visitorId), []);

  const order = await (await api('/api/orders', { ...phone, method: 'POST' })).json();
  assert.equal((await api(`/api/orders/${order.id}`, { token })).status, 200);
  assert.equal((await api(`/api/orders/${order.id}`, { token: await createToken() })).status, 404);
});

test("a user's ID sent as a guest's visitor ID can't open their cart", async () => {
  const userId = randomUUID();
  await addToCart({ token: await createToken(userId) });

  const response = await api('/api/cart-items', { visitorId: userId.toUpperCase() });
  assert.equal(response.status, 401);
});

test('logging in moves the guest cart and orders to the account', async () => {
  const guestId = randomUUID();
  const token = await createToken();
  const otherProductId = '15b6fc6f-327a-4ec4-896f-486349e85a3d';

  await addToCart(guestId);
  const order = await (await api('/api/orders', { visitorId: guestId, method: 'POST' })).json();
  await addToCart(guestId);
  await api('/api/cart-items', {
    visitorId: guestId, method: 'POST', body: { productId: otherProductId, quantity: 2 }
  });
  // Already in the account's cart from another device
  await addToCart({ token });

  // The first requests after logging in arrive together
  const [cart] = await Promise.all([
    getCart({ token, visitorId: guestId }),
    getCart({ token, visitorId: guestId })
  ]);

  const quantities = Object.fromEntries(cart.map((item) => [item.productId, item.quantity]));
  assert.deepEqual(quantities, { [productId]: 2, [otherProductId]: 2 });
  const orders = await (await api('/api/orders', { token })).json();
  assert.deepEqual(orders.map(({ id }) => id), [order.id]);

  // Nothing is left for the guest, and nothing moves twice
  assert.deepEqual(await getCart(guestId), []);
  assert.deepEqual(await (await api('/api/orders', { visitorId: guestId })).json(), []);
  assert.deepEqual(await getCart({ token, visitorId: guestId }), cart);
});

test('a guest who logs out and in again keeps what they added in between', async () => {
  const guestId = randomUUID();
  const token = await createToken();

  await addToCart({ token, visitorId: guestId });
  await addToCart(guestId);

  assert.equal((await getCart({ token, visitorId: guestId }))[0].quantity, 2);
});

test('an invalid or expired token is refused, even with a visitor ID', async () => {
  const userId = randomUUID();
  const { privateKey: otherKey } = await generateKeyPair('ES256');
  const badAuthorizations = {
    'that is not a JWT': 'Bearer not-a-token',
    'without Bearer': `Basic ${await createToken(userId)}`,
    'signed with another key': `Bearer ${await createToken(userId, { key: otherKey })}`,
    'from another project': `Bearer ${await createToken(userId, { issuer: 'https://other.supabase.co/auth/v1' })}`,
    'that has expired': `Bearer ${await createToken(userId, { expiresAt: Math.floor(Date.now() / 1000) - 60 })}`,
    'for a user ID that is not a UUID': `Bearer ${await createToken('not-a-uuid')}`
  };

  for (const [problem, authorization] of Object.entries(badAuthorizations)) {
    for (const urlPath of ['/api/cart-items', '/api/orders', '/api/payment-summary']) {
      const response = await api(urlPath, { authorization, visitorId: randomUUID() });
      assert.equal(response.status, 401, `${urlPath} with a token ${problem}`);
      assert.match((await response.json()).error, /log in again/);
    }
  }
});

test('malformed product and order IDs are not found', async () => {
  const visitorId = randomUUID();
  const addResponse = await api('/api/cart-items', {
    visitorId, method: 'POST', body: { productId: 'not-a-uuid', quantity: 1 }
  });
  assert.equal(addResponse.status, 400);

  for (const method of ['PUT', 'DELETE']) {
    const response = await api('/api/cart-items/not-a-uuid', { visitorId, method, body: { quantity: 1 } });
    assert.equal(response.status, 404, `${method} a cart item`);
  }
  assert.equal((await api('/api/orders/not-a-uuid', { visitorId })).status, 404);
});

test('a failing database call returns a 500 error and the server keeps running', async () => {
  const visitorId = randomUUID();
  await addToCart(visitorId);

  // Sequelize throws when findByPk gets an object instead of an ID
  const response = await api(`/api/cart-items/${productId}`, {
    visitorId, method: 'PUT', body: { deliveryOptionId: {} }
  });
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: 'Something went wrong!' });

  assert.equal((await api('/api/products')).status, 200);
});

test('a malformed JSON body returns a 400 error', async () => {
  const response = await fetch(`${baseUrl}/api/cart-items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Visitor-Id': randomUUID() },
    body: '{ "productId": '
  });
  assert.equal(response.status, 400);
  assert.ok((await response.json()).error);
});

test('new visitors start with an empty cart and no orders', async () => {
  const visitorId = randomUUID();
  assert.deepEqual(await getCart(visitorId), []);
  assert.deepEqual(await (await api('/api/orders', { visitorId })).json(), []);
});

test('each visitor has their own cart and orders', async () => {
  const alice = randomUUID();
  const bob = randomUUID();

  await addToCart(alice);
  assert.equal((await getCart(alice)).length, 1);
  assert.deepEqual(await getCart(bob), []);

  const summary = await (await api('/api/payment-summary', { visitorId: bob })).json();
  assert.equal(summary.totalItems, 0);

  const order = await (await api('/api/orders', { visitorId: alice, method: 'POST' })).json();
  assert.deepEqual(await getCart(alice), []);
  assert.equal((await (await api('/api/orders', { visitorId: alice })).json()).length, 1);
  assert.deepEqual(await (await api('/api/orders', { visitorId: bob })).json(), []);

  // Bob can't open Alice's order, even with its ID
  assert.equal((await api(`/api/orders/${order.id}`, { visitorId: alice })).status, 200);
  assert.equal((await api(`/api/orders/${order.id}`, { visitorId: bob })).status, 404);
});

test('tells the frontend whether the user is an admin, from the token only', async () => {
  const userId = randomUUID();
  const me = async (who) => (await api('/api/me', who)).json();

  assert.deepEqual(await me({}), { userId: null, isAdmin: false });
  assert.deepEqual(await me({ visitorId: adminId }), { userId: null, isAdmin: false });
  assert.deepEqual(await me({ token: await createToken(userId) }), { userId, isAdmin: false });
  assert.deepEqual(await me(await asAdmin()), { userId: adminId, isAdmin: true });

  const expired = await createToken(adminId, { expiresAt: Math.floor(Date.now() / 1000) - 60 });
  assert.equal((await api('/api/me', { token: expired })).status, 401);
});

test("admin routes need an admin's valid token", async () => {
  const routes = [
    ['GET', '/api/admin/images'],
    ['POST', '/api/admin/products', newProduct],
    ['PUT', `/api/admin/products/${productId}`, newProduct],
    ['DELETE', `/api/admin/products/${productId}`]
  ];
  const refusals = [
    ['without a token', {}, 401],
    ["with the admin's ID as a visitor ID", { visitorId: adminId }, 401],
    ["with an admin's token from another project", {
      token: await createToken(adminId, { issuer: 'https://other.supabase.co/auth/v1' })
    }, 401],
    ["with a user's token", { token: await createToken() }, 403]
  ];

  for (const [method, urlPath, body] of routes) {
    for (const [problem, who, status] of refusals) {
      const response = await api(urlPath, { ...who, method, body });
      assert.equal(response.status, status, `${method} ${urlPath} ${problem}`);
      assert.ok((await response.json()).error);
    }
  }
  assert.equal((await getProducts()).find(({ id }) => id === productId).name, 'Gray Hand Knit Wool Socks');

  const response = await api('/api/admin/images', await asAdmin());
  assert.equal(response.status, 200);
  const images = await response.json();
  assert.equal(images.length, 42);
  assert.ok(images.includes(newProduct.image));
});

test('an admin adds, edits and deletes a product', async () => {
  const admin = await asAdmin();
  const product = await createProduct({
    ...newProduct,
    name: `  ${newProduct.name}  `,
    keywords: [' scarves', 'plaid '],
    rating: { stars: 5, count: 1000 }
  });
  assert.equal(product.name, newProduct.name);
  assert.deepEqual(product.keywords, newProduct.keywords);
  assert.deepEqual(product.rating, { stars: 0, count: 0 });
  assert.deepEqual((await getProducts('plaid')).map(({ id }) => id), [product.id]);

  const changes = { ...newProduct, name: 'Cashmere Scarf', priceCents: 1299, keywords: [], rating: { stars: 5, count: 1 } };
  const updateResponse = await api(`/api/admin/products/${product.id}`, { ...admin, method: 'PUT', body: changes });
  assert.equal(updateResponse.status, 200);
  const updated = await updateResponse.json();
  assert.equal(updated.name, 'Cashmere Scarf');
  assert.equal(updated.priceCents, 1299);
  assert.deepEqual(updated.keywords, []);
  assert.deepEqual(updated.rating, { stars: 0, count: 0 });
  assert.deepEqual((await getProducts('cashmere')).map(({ id }) => id), [product.id]);

  const deleteResponse = await api(`/api/admin/products/${product.id}`, { ...admin, method: 'DELETE' });
  assert.equal(deleteResponse.status, 204);
  assert.ok(!(await getProducts()).some(({ id }) => id === product.id));
  assert.deepEqual(await getProducts('cashmere'), []);

  for (const id of [product.id, randomUUID(), 'not-a-uuid']) {
    for (const method of ['PUT', 'DELETE']) {
      const response = await api(`/api/admin/products/${id}`, { ...admin, method, body: newProduct });
      assert.equal(response.status, 404, `${method} ${id}`);
    }
  }
});

test('refuses product fields that are missing or invalid', async () => {
  const admin = await asAdmin();
  const product = await createProduct();
  const invalidFields = {
    'without a name': { name: undefined },
    'with a blank name': { name: '   ' },
    'with a name over 100 characters': { name: 'a'.repeat(101) },
    'without a price': { priceCents: undefined },
    'with a price of 0': { priceCents: 0 },
    'with a negative price': { priceCents: -100 },
    'with a price in dollars': { priceCents: 15.99 },
    'with a price as text': { priceCents: '1599' },
    'with a price over $10,000': { priceCents: 1000001 },
    'without an image': { image: undefined },
    'with an image from another site': { image: 'https://example.com/hat.jpg' },
    'without keywords': { keywords: undefined },
    'with keywords as text': { keywords: 'scarves,plaid' },
    'with a keyword containing a comma': { keywords: ['scarves,shawls'] },
    'with a blank keyword': { keywords: [' '] },
    'with a keyword over 20 characters': { keywords: ['k'.repeat(21)] },
    'with more than 10 keywords': { keywords: Array.from({ length: 11 }, (_, i) => `keyword${i}`) }
  };

  for (const [problem, fields] of Object.entries(invalidFields)) {
    const body = { ...newProduct, ...fields };
    const createResponse = await api('/api/admin/products', { ...admin, method: 'POST', body });
    assert.equal(createResponse.status, 400, `creating a product ${problem}`);
    assert.ok((await createResponse.json()).error);

    const updateResponse = await api(`/api/admin/products/${product.id}`, { ...admin, method: 'PUT', body });
    assert.equal(updateResponse.status, 400, `editing a product ${problem}`);
  }

  assert.deepEqual((await getProducts('plaid')).map(({ id }) => id), [product.id]);
  assert.equal((await getProducts('plaid'))[0].name, newProduct.name);
  await api(`/api/admin/products/${product.id}`, { ...admin, method: 'DELETE' });
});

test('a deleted product stays in carts and orders but can no longer be added', async () => {
  const visitorId = randomUUID();
  const product = await createProduct();
  const addProduct = () => api('/api/cart-items', {
    visitorId, method: 'POST', body: { productId: product.id, quantity: 1 }
  });

  assert.equal((await addProduct()).status, 201);
  const order = await (await api('/api/orders', { visitorId, method: 'POST' })).json();
  assert.equal((await addProduct()).status, 201);

  await api(`/api/admin/products/${product.id}`, { ...await asAdmin(), method: 'DELETE' });

  const [cartItem] = await (await api('/api/cart-items?expand=product', { visitorId })).json();
  assert.equal(cartItem.product.name, newProduct.name);
  const summary = await (await api('/api/payment-summary', { visitorId })).json();
  assert.equal(summary.productCostCents, newProduct.priceCents);
  assert.equal((await addProduct()).status, 400);

  assert.equal((await api('/api/orders', { visitorId, method: 'POST' })).status, 201);
  const orders = await (await api('/api/orders?expand=products', { visitorId })).json();
  assert.equal(orders.length, 2);
  for (const { products } of orders) {
    assert.equal(products[0].product.name, newProduct.name);
  }
  const savedOrder = await (await api(`/api/orders/${order.id}?expand=products`, { visitorId })).json();
  assert.equal(savedOrder.products[0].product.image, newProduct.image);
  // How the orders page knows not to offer it again
  assert.ok(savedOrder.products[0].product.deletedAt);
});

test('drops the least recently active visitor when there are too many', async () => {
  // The server was started with room for 3 visitors
  const [oldest, active, third, newest] = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];

  await addToCart(oldest);
  await addToCart(active);
  await addToCart(third);
  // Coming back makes this visitor recent again, so it's kept
  await getCart(active);
  await getCart(newest);

  // Reading a cart counts as activity too, so check the kept visitors first
  assert.equal((await getCart(third)).length, 1);
  assert.equal((await getCart(active)).length, 1);
  assert.deepEqual(await getCart(oldest), []);
});

test('logged in users are never dropped for the visitor limit, even after a restart', async () => {
  // The server was started with room for 3 visitors, and only guests count
  const user = { token: await createToken(), visitorId: randomUUID() };
  const guests = Array.from({ length: 4 }, () => randomUUID());
  await addToCart(user);
  await addToCart(guests[0]);

  const fillWithNewGuests = async () => {
    for (const guestId of guests.slice(1)) {
      await getCart(guestId);
    }
  };
  await fillWithNewGuests();

  assert.equal((await getCart(user)).length, 1);
  assert.equal((await getCart({ token: user.token })).length, 1);
  // The oldest guest made room for the others
  assert.deepEqual(await getCart(guests[0]), []);

  await stopServer();
  await startServer();
  await addToCart(guests[0]);
  await fillWithNewGuests();

  assert.equal((await getCart(user)).length, 1);
});

test('still counts saved visitors after a restart', async () => {
  const [saved, other] = [randomUUID(), randomUUID()];
  await addToCart(saved);
  await addToCart(other);
  const products = await getProducts();

  await stopServer();
  await startServer();

  // The default products are only added to an empty table
  assert.deepEqual(await getProducts(), products);
  assert.equal((await getCart(saved)).length, 1);

  // Only works if the restarted server remembered both visitors: "saved"
  // was just read, so two new visitors push out "other"
  await getCart(randomUUID());
  await getCart(randomUUID());
  assert.equal((await getCart(saved)).length, 1);
  assert.deepEqual(await getCart(other), []);
});

test('returns a single product, including a deleted one', async () => {
  const product = await createProduct();
  const response = await api(`/api/products/${product.id}`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).name, newProduct.name);

  await api(`/api/admin/products/${product.id}`, { ...await asAdmin(), method: 'DELETE' });
  // Links from old orders still open it, and deletedAt tells the page not to sell it
  assert.ok((await (await api(`/api/products/${product.id}`)).json()).deletedAt);

  for (const id of [randomUUID(), 'not-a-uuid']) {
    assert.equal((await api(`/api/products/${id}`)).status, 404, id);
    assert.equal((await api(reviewsPath(id))).status, 404, `reviews of ${id}`);
  }
});

test('only logged in customers who ordered the product can review it', async () => {
  const product = await createProduct();
  const guestId = randomUUID();
  const customer = { token: await createToken() };

  assert.equal((await postReview({ visitorId: guestId }, { stars: 5 }, product.id)).status, 401);
  const expired = await createToken(randomUUID(), { expiresAt: Math.floor(Date.now() / 1000) - 60 });
  assert.equal((await postReview({ token: expired }, { stars: 5 }, product.id)).status, 401);

  // Ordering another product doesn't count
  await addToCart(customer);
  await api('/api/orders', { ...customer, method: 'POST' });
  const refused = await postReview(customer, { stars: 5 }, product.id);
  assert.equal(refused.status, 403);
  assert.match((await refused.json()).error, /ordered this product/);
  assert.equal((await getReviews(customer, product.id)).canReview, false);
  assert.equal((await getReviews({}, product.id)).canReview, false);

  // An order placed as a guest counts once it has moved to the account
  await api('/api/cart-items', { visitorId: guestId, method: 'POST', body: { productId: product.id, quantity: 1 } });
  await api('/api/orders', { visitorId: guestId, method: 'POST' });
  await getCart({ ...customer, visitorId: guestId });
  assert.equal((await getReviews(customer, product.id)).canReview, true);
  assert.equal((await postReview(customer, { stars: 5 }, product.id)).status, 201);
  assert.equal((await getReviews({}, product.id)).reviews.length, 1);
});

test('refuses review fields that are missing or invalid', async () => {
  const buyer = await createBuyer();
  const invalidFields = {
    'without stars': {},
    'with 0 stars': { stars: 0 },
    'with 6 stars': { stars: 6 },
    'with half a star': { stars: 4.5 },
    'with stars as text': { stars: '5' },
    'with text over 500 characters': { stars: 5, text: 'a'.repeat(501) },
    'with text that is not a string': { stars: 5, text: 42 }
  };

  for (const [problem, body] of Object.entries(invalidFields)) {
    const response = await postReview(buyer, body);
    assert.equal(response.status, 400, `a review ${problem}`);
    assert.ok((await response.json()).error);
  }
  assert.ok(!(await getReviews(buyer)).reviews.some((review) => review.isMine));

  const response = await postReview(buyer, { stars: 4, text: `  ${'a'.repeat(500)}  ` });
  assert.equal(response.status, 201);
  const review = await response.json();
  assert.equal(review.text, 'a'.repeat(500));
  await api(`${reviewsPath()}/${review.id}`, { ...buyer, method: 'DELETE' });
});

test('allows one review per user per product', async () => {
  const buyer = await createBuyer();
  const review = await (await postReview(buyer, { stars: 4 })).json();

  assert.equal((await postReview(buyer, { stars: 1, text: 'Changed my mind' })).status, 409);
  const mine = (await getReviews(buyer)).reviews.filter((review) => review.isMine);
  assert.deepEqual(mine.map(({ id, stars }) => ({ id, stars })), [{ id: review.id, stars: 4 }]);

  // Deleting it makes room for a new one
  await api(`${reviewsPath()}/${review.id}`, { ...buyer, method: 'DELETE' });
  const newReview = await postReview(buyer, { stars: 2 });
  assert.equal(newReview.status, 201);
  await api(`${reviewsPath()}/${(await newReview.json()).id}`, { ...buyer, method: 'DELETE' });
});

test('only the author edits a review, and only the author or an admin deletes it', async () => {
  const author = await createBuyer();
  const otherBuyer = await createBuyer();
  const review = await (await postReview(author, { stars: 3, text: 'Fine' })).json();
  const reviewPath = `${reviewsPath()}/${review.id}`;

  for (const [who, name] of [[otherBuyer, 'another customer'], [await asAdmin(), 'an admin']]) {
    const response = await api(reviewPath, { ...who, method: 'PUT', body: { stars: 1 } });
    assert.equal(response.status, 403, `${name} editing`);
  }
  assert.equal((await api(reviewPath, { ...otherBuyer, method: 'DELETE' })).status, 403);
  assert.equal((await api(reviewPath, { method: 'PUT', body: { stars: 1 } })).status, 401);

  const edited = await api(reviewPath, { ...author, method: 'PUT', body: { stars: 5, text: '' } });
  assert.equal(edited.status, 200);
  const { stars, text } = await edited.json();
  assert.deepEqual({ stars, text }, { stars: 5, text: null });
  assert.equal((await api(reviewPath, { ...author, method: 'PUT', body: { stars: 9 } })).status, 400);

  // A review is only found under its own product
  const otherProductPath = `${reviewsPath('15b6fc6f-327a-4ec4-896f-486349e85a3d')}/${review.id}`;
  assert.equal((await api(otherProductPath, { ...author, method: 'DELETE' })).status, 404);
  for (const id of [randomUUID(), 'not-a-uuid']) {
    assert.equal((await api(`${reviewsPath()}/${id}`, { ...author, method: 'DELETE' })).status, 404, id);
  }

  assert.equal((await api(reviewPath, { ...await asAdmin(), method: 'DELETE' })).status, 204);
  assert.ok(!(await getReviews()).reviews.some(({ id }) => id === review.id));
});

test('shows reviews newest first, with a masked name instead of the email', async () => {
  const product = await createProduct();
  const first = await createBuyer(product.id, 'jane.doe@example.com');
  const second = await createBuyer(product.id, 'j@example.com');
  const third = await createBuyer(product.id);
  // The name and user always come from the token, never from the body
  await postReview(first, { stars: 4, text: 'Cozy', authorName: 'Admin', userId: randomUUID() }, product.id);
  await postReview(second, { stars: 3 }, product.id);
  await postReview(third, { stars: 2 }, product.id);

  const { reviews } = await getReviews(first, product.id);
  assert.deepEqual(reviews.map(({ authorName, stars, isMine }) => ({ authorName, stars, isMine })), [
    { authorName: 'Customer', stars: 2, isMine: false },
    { authorName: 'j***', stars: 3, isMine: false },
    { authorName: 'ja***', stars: 4, isMine: true }
  ]);
  assert.ok(!JSON.stringify(reviews).includes('jane'));
  assert.ok(!JSON.stringify(reviews).includes('example.com'));
  assert.ok(reviews.every((review) => !('userId' in review)));
});

test('recalculates the rating from the demo rating and reviews after every change', async () => {
  const product = await createProduct();
  const [first, second] = [await createBuyer(product.id), await createBuyer(product.id)];

  const review = await (await postReview(first, { stars: 5 }, product.id)).json();
  assert.deepEqual(await getRating(product.id), { stars: 5, count: 1 });

  await postReview(second, { stars: 2 }, product.id);
  assert.deepEqual(await getRating(product.id), { stars: 3.5, count: 2 });

  await api(`${reviewsPath(product.id)}/${review.id}`, { ...first, method: 'PUT', body: { stars: 3 } });
  assert.deepEqual(await getRating(product.id), { stars: 2.5, count: 2 });

  await api(`${reviewsPath(product.id)}/${review.id}`, { ...first, method: 'DELETE' });
  assert.deepEqual(await getRating(product.id), { stars: 2, count: 1 });

  // The grid and the product page show the same rating
  const listed = (await getProducts('plaid')).find(({ id }) => id === product.id);
  assert.deepEqual(listed.rating, await getRating(product.id));

  // Reviews add to the demo rating of 4.5 stars from 87, which stays out of responses
  const socksBuyer = await createBuyer();
  const socksReview = await (await postReview(socksBuyer, { stars: 1 })).json();
  const socks = await (await api(`/api/products/${productId}`)).json();
  assert.deepEqual(socks.rating, { stars: 4.5, count: 88 });
  assert.ok(!('demoRating' in socks));
  await api(`${reviewsPath()}/${socksReview.id}`, { ...socksBuyer, method: 'DELETE' });
  assert.deepEqual(await getRating(productId), { stars: 4.5, count: 87 });

  await api(`/api/admin/products/${product.id}`, { ...await asAdmin(), method: 'DELETE' });
});

test('pays by card through a Checkout Session priced from the database', async () => {
  const visitorId = randomUUID();
  await addToCart(visitorId);
  await api(`/api/cart-items/${productId}`, {
    visitorId, method: 'PUT', body: { quantity: 2, deliveryOptionId: '2' }
  });
  const summary = await (await api('/api/payment-summary', { visitorId })).json();

  // Prices sent by the browser are ignored
  const response = await api('/api/stripe/checkout-sessions', {
    visitorId, method: 'POST', headers: { Origin: baseUrl }, body: { totalCostCents: 1, priceCents: 1 }
  });
  assert.equal(response.status, 201);
  const session = [...stripeSessions.values()].at(-1);

  assert.equal(session.amount_total, summary.totalCostCents);
  const lines = stripeLineItems.get(session.id).map(({ description, quantity, amount_total }) => [description, quantity, amount_total]);
  assert.deepEqual(lines, [
    ['Gray Hand Knit Wool Socks', 2, 2180],
    ['Shipping & handling', 1, 499],
    ['Estimated tax (10%)', 1, 268]
  ]);
  assert.deepEqual(session.metadata, { app: 'react-ecommerce', visitorId });
  assert.equal(session.success_url, `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`);
  // Cancelling goes back to checkout, where the cart is unchanged
  assert.equal(session.cancel_url, `${baseUrl}/checkout`);
  assert.equal((await getCart(visitorId))[0].quantity, 2);
  assert.deepEqual(await getOrders(visitorId), []);
});

test('refuses a Checkout Session for an empty cart or from another site', async () => {
  const visitorId = randomUUID();
  assert.equal((await checkout(visitorId)).status, 400);

  await addToCart(visitorId);
  assert.equal((await checkout(visitorId, 'https://example.com')).status, 400);
  assert.equal((await checkout(visitorId, 'null')).status, 400);
  assert.equal((await checkout({})).status, 400);
  // The development frontend is allowed by CORS_ORIGIN
  assert.equal((await checkout(visitorId, 'http://localhost:5173')).status, 201);
});

for (const [kind, createVisitor] of [
  ['guest', async () => randomUUID()],
  ['user', async () => ({ token: await createToken() })]
]) {
  test(`a paid session makes one card order for a ${kind}, even when the webhook and success page both run`, async () => {
    const visitor = await createVisitor();
    await addToCart(visitor);
    const summary = await (await api('/api/payment-summary', identify(visitor))).json();
    const session = await startCheckout(visitor);

    assert.equal((await getPaidOrder(visitor, session)).status, 409);
    assert.equal((await getCart(visitor)).length, 1);

    session.payment_status = 'paid';
    // Both paths at once, with the success page loaded twice
    const responses = await Promise.all([
      sendWebhook(checkoutCompleted(session)),
      getPaidOrder(visitor, session),
      getPaidOrder(visitor, session)
    ]);
    assert.deepEqual(responses.map(({ status }) => status), [200, 200, 200]);
    const [, first, second] = await Promise.all(responses.map((response) => response.json()));
    assert.equal(first.id, second.id);

    const orders = await getOrders(visitor);
    assert.deepEqual(orders.map(({ id }) => id), [first.id]);
    assert.equal(orders[0].paymentMethod, 'card');
    assert.equal(orders[0].totalCostCents, summary.totalCostCents);
    assert.deepEqual(orders[0].products.map(({ productId, quantity }) => ({ productId, quantity })), [{ productId, quantity: 1 }]);
    assert.deepEqual(await getCart(visitor), []);

    // A late webhook or reload leaves the next cart alone
    await addToCart(visitor);
    assert.equal((await sendWebhook(checkoutCompleted(session))).status, 200);
    assert.equal((await getPaidOrder(visitor, session)).status, 200);
    assert.equal((await getOrders(visitor)).length, 1);
    assert.equal((await getCart(visitor)).length, 1);

    assert.equal((await getPaidOrder(randomUUID(), session)).status, 404);
  });
}

test('orders paid on delivery say so', async () => {
  const visitorId = randomUUID();
  await addToCart(visitorId);
  const order = await (await api('/api/orders', { visitorId, method: 'POST' })).json();
  assert.equal(order.paymentMethod, 'delivery');
});

test('refuses webhooks without a valid Stripe signature', async () => {
  const visitorId = randomUUID();
  await addToCart(visitorId);
  const session = await startCheckout(visitorId);
  session.payment_status = 'paid';
  const event = checkoutCompleted(session);

  assert.equal((await sendWebhook(event, { secret: 'whsec_someone_else' })).status, 400);
  assert.equal((await sendWebhook(event, { body: JSON.stringify({ ...event, id: 'evt_changed' }) })).status, 400);
  const unsigned = await fetch(`${baseUrl}/api/stripe/webhook`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(event)
  });
  assert.equal(unsigned.status, 400);

  assert.deepEqual(await getOrders(visitorId), []);
  assert.equal((await getCart(visitorId)).length, 1);
});

test('ignores Stripe events for sessions of the other app in the sandbox', async () => {
  const visitorId = randomUUID();
  await addToCart(visitorId);
  const session = await startCheckout(visitorId);
  session.payment_status = 'paid';

  for (const metadata of [{ app: 'other-app', visitorId }, { visitorId }, {}]) {
    const response = await sendWebhook(checkoutCompleted({ ...session, metadata }));
    assert.equal(response.status, 200, JSON.stringify(metadata));
  }
  assert.equal((await sendWebhook({ ...checkoutCompleted(session), type: 'payment_intent.succeeded' })).status, 200);
  assert.deepEqual(await getOrders(visitorId), []);
  assert.equal((await getCart(visitorId)).length, 1);

  // Nor does the success page take one
  session.metadata = { ...session.metadata, app: 'other-app' };
  assert.equal((await getPaidOrder(visitorId, session)).status, 404);
  assert.equal((await getPaidOrder(visitorId, { id: 'cs_test_missing' })).status, 404);
});

test('card payment is off without a Stripe test key, and paying on delivery still works', async () => {
  for (const STRIPE_SECRET_KEY of ['', 'sk_live_not_for_a_demo']) {
    await stopServer();
    await startServer({ STRIPE_SECRET_KEY });

    assert.deepEqual(await (await api('/api/stripe/config')).json(), { cardPayment: false }, STRIPE_SECRET_KEY);
    const visitorId = randomUUID();
    await addToCart(visitorId);
    assert.equal((await checkout(visitorId)).status, 404);
    assert.equal((await sendWebhook(checkoutCompleted({ id: 'cs_test_off', metadata: {} }))).status, 404);
    assert.equal((await api('/api/orders', { visitorId, method: 'POST' })).status, 201);
  }

  await stopServer();
  await startServer();
  assert.deepEqual(await (await api('/api/stripe/config')).json(), { cardPayment: true });
});

// Hides the whole catalog, so it runs last
test('deleted products stay deleted after a restart, even when none are left', async () => {
  const admin = await asAdmin();
  for (const { id } of await getProducts()) {
    await api(`/api/admin/products/${id}`, { ...admin, method: 'DELETE' });
  }

  await stopServer();
  await startServer();

  assert.deepEqual(await getProducts(), []);
  assert.equal((await api('/api/admin/images', admin)).status, 200);
});
