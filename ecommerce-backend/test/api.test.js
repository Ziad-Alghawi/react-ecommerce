import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverFile = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'server.js');
// The database file is saved in the working directory, so use an empty
// folder to keep the real database.sqlite untouched
const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ecommerce-backend-test-'));
const productId = 'e43638ce-6aa0-4b85-b27f-e1d07eb678c6';

let server;
let baseUrl;

function getFreePort() {
  return new Promise((resolve) => {
    const probe = net.createServer().listen(0, () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

async function startServer() {
  const port = await getFreePort();
  baseUrl = `http://localhost:${port}`;
  server = spawn(process.execPath, [serverFile], {
    cwd: workDir,
    // Tests delete visitors, so they only reach Postgres when given a throwaway database
    env: {
      ...process.env,
      PORT: String(port),
      MAX_VISITORS: '3',
      MAX_ORDERS: '2',
      DATABASE_URL: process.env.TEST_DATABASE_URL || ''
    }
  });

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

function api(urlPath, { visitorId, method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (visitorId) headers['X-Visitor-Id'] = visitorId;
  return fetch(baseUrl + urlPath, {
    method,
    headers,
    body: body && JSON.stringify(body)
  });
}

async function addToCart(visitorId) {
  const response = await api('/api/cart-items', {
    visitorId, method: 'POST', body: { productId, quantity: 1 }
  });
  assert.equal(response.status, 201);
}

async function getCart(visitorId) {
  return (await api('/api/cart-items', { visitorId })).json();
}

before(startServer);
after(async () => {
  await stopServer();
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
});

test('refuses new orders once a visitor has reached the limit', async () => {
  // The server was started with room for 2 orders per visitor
  const visitorId = randomUUID();
  const placeOrder = () => api('/api/orders', { visitorId, method: 'POST' });

  for (let i = 0; i < 2; i++) {
    await addToCart(visitorId);
    assert.equal((await placeOrder()).status, 201);
  }

  await addToCart(visitorId);
  const response = await placeOrder();
  assert.equal(response.status, 409);
  assert.match((await response.json()).error, /up to 2 orders/);
  // The cart is kept, so nothing is lost
  assert.equal((await getCart(visitorId)).length, 1);
});

test('cart and order routes need a valid visitor ID', async () => {
  for (const urlPath of ['/api/cart-items', '/api/orders', '/api/payment-summary']) {
    assert.equal((await api(urlPath)).status, 400, `${urlPath} without an ID`);
    assert.equal((await api(urlPath, { visitorId: 'not-a-uuid' })).status, 400, `${urlPath} with a bad ID`);
  }
});

test('a failing database call returns a 500 error and the server keeps running', async () => {
  // Sequelize throws when findByPk gets an object instead of an ID
  const response = await api('/api/cart-items', {
    visitorId: randomUUID(), method: 'POST', body: { productId: {}, quantity: 1 }
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

test('still counts saved visitors after a restart', async () => {
  const [saved, other] = [randomUUID(), randomUUID()];
  await addToCart(saved);
  await addToCart(other);
  const getProducts = async () => (await api('/api/products')).json();
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
