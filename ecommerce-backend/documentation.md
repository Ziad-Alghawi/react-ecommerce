## E-Commerce Backend Documentation
Here's a list of all the URL Paths you can use with this backend and what each URL Path does.

**Products, Delivery Options**
- [GET /api/products](#get-apiproducts)
- [GET /api/products/categories](#get-apiproductscategories)
- [GET /api/products/:productId](#get-apiproductsproductid)
- [GET /api/delivery-options](#get-apidelivery-options)

**Reviews**
- [GET /api/products/:productId/reviews](#get-apiproductsproductidreviews)
- [POST /api/products/:productId/reviews](#post-apiproductsproductidreviews)
- [PUT /api/products/:productId/reviews/:reviewId](#put-apiproductsproductidreviewsreviewid)
- [DELETE /api/products/:productId/reviews/:reviewId](#delete-apiproductsproductidreviewsreviewid)

**Cart**
- [GET /api/cart-items](#get-apicart-items)
- [POST /api/cart-items](#post-apicart-items)
- [PUT /api/cart-items/:productId](#put-apicart-itemsproductid)
- [DELETE /api/cart-items/:productId](#delete-apicart-itemsproductid)

**Orders**
- [GET /api/orders](#get-apiorders)
- [POST /api/orders](#post-apiorders)
- [GET /api/orders/:orderId](#get-apiordersorderid)

**Payment Summary, Coupons, Reset**
- [GET /api/payment-summary](#get-apipayment-summary)
- [GET /api/coupons/:code](#get-apicouponscode)
- [POST /api/reset](#post-apireset)

**Card Payment**
- [GET /api/stripe/config](#get-apistripeconfig)
- [POST /api/stripe/checkout-sessions](#post-apistripecheckout-sessions)
- [GET /api/stripe/checkout-sessions/:sessionId/order](#get-apistripecheckout-sessionssessionidorder)
- [POST /api/stripe/webhook](#post-apistripewebhook)

**Admin**
- [GET /api/me](#get-apime)
- [GET /api/admin/images](#get-apiadminimages)
- [POST /api/admin/products](#post-apiadminproducts)
- [PUT /api/admin/products/:productId](#put-apiadminproductsproductid)
- [DELETE /api/admin/products/:productId](#delete-apiadminproductsproductid)
- [GET /api/admin/coupons](#get-apiadmincoupons)
- [POST /api/admin/coupons](#post-apiadmincoupons)
- [PUT /api/admin/coupons/:couponId](#put-apiadmincouponscouponid)

**Visitors:** the cart, order, payment summary and Checkout Session routes need an `X-Visitor-Id` header with a UUID. Each ID has its own cart and orders, so a browser can keep its own data without an account. Requests without a valid ID get `400`.

**Accounts:** when `SUPABASE_URL` is set, these routes also accept `Authorization: Bearer <access token>` from Supabase Auth. A valid token uses the user's own cart and orders instead of the visitor's, and `X-Visitor-Id` is then optional. If both are sent, the visitor's cart and orders move to the user's account on the first request (quantities of the same product add up). A missing, expired or otherwise invalid token gets `401`, and so does a user's ID sent as `X-Visitor-Id` without their token. The 50-order limit applies to users too, but only guests are dropped when there are more than 500 visitors: a user's cart and orders are always kept.

**Admins:** the `/api/admin` routes need `Authorization: Bearer <access token>` of a user whose ID is in `ADMIN_USER_IDS`. Without a valid token they answer `401`, and for any other user `403`. A deleted product is only hidden: it's left out of `GET /api/products` and can't be added to a cart, but carts and orders that have it still return it, with `deletedAt` set.

**Reviews:** reading reviews works for everyone. Writing, editing and deleting one needs `Authorization: Bearer <access token>`, and the user always comes from the verified token, never from the request body. Only a user who has ordered the product can review it, once. Only the author can edit a review, and the author or an admin can delete it. After every change the product's `rating` is worked out again from its demo rating and its reviews, rounded to the nearest half star.

**Stock:** a cart can't hold more of a product than its `stock`, and neither payment method orders more than is left. Paying on delivery takes the whole order out of stock at once, or refuses it. A card order takes its items when Stripe says it's paid, and since it's paid by then, an item that sold out meanwhile stops at 0.

**Coupons:** the payment summary, placing an order and starting a card payment all take an optional `couponCode`, in any case. The API looks it up and works out the discount itself every time, so a coupon that expires or is turned off before paying no longer counts, and a discount sent by the browser is ignored. A coupon takes its percentage off the items, before shipping and tax. A code that doesn't exist, is turned off or has expired gets `400` with the reason.

**Card payment:** only on when `STRIPE_SECRET_KEY` is a Stripe test key. Otherwise every `/api/stripe` route except `GET /api/stripe/config` answers `404`. The API sets all prices from the database, and an order paid by card is only created once Stripe says the session is paid.

**Errors:** a rejected request gets a `4xx` status and a JSON body like `{ "error": "Cart is empty" }`. An unexpected server error, such as a failed database call, gets `500` with the same kind of body.

## GET /api/products
Returns a list of products, without the ones an admin deleted. All filters are optional and work together.

**Query Parameters:**
- `search=...`: Search term to find products by name or keywords
- `category=...`: Only products in this category, one of [GET /api/products/categories](#get-apiproductscategories)
- `minPriceCents=...`, `maxPriceCents=...`: Only products with a price in this range, both included, as whole numbers of cents
- `sort=...`: `price-asc`, `price-desc`, `rating` (most stars first, then most ratings) or `newest`. Without it, products keep the store's order

A sort that doesn't exist, a price that isn't a whole number of cents, or a filter given twice gets `400`. A category with no products returns an empty list.

**Response:**
```js
[
  {
    "id": "uuid",
    "image": "string",
    "name": "string",
    "rating": {
      "stars": "number",
      "count": "number"
    },
    "priceCents": "number",
    "keywords": ["string"],
    // One of GET /api/products/categories. Null for a product added before categories, until an admin sets it
    "category": "string",
    // How many can still be ordered. Placing an order lowers it, never below 0
    "stock": "number",
    // Null here. Set on deleted products that a cart or order still returns
    "deletedAt": "string"
  }
]
```

## GET /api/products/categories
Returns the store's categories, in the order the shop shows them.

**Response:**
```js
["Home & Kitchen", "Clothing", "Shoes", "Accessories", "Sports"]
```

## GET /api/products/:productId
Returns one product, in the same shape as [GET /api/products](#get-apiproducts). Unlike the list, it also returns a deleted product, with `deletedAt` set, so links from old orders still work.

**URL Parameters:**
- `productId`: ID of the product

**Response:**
- Status 200 with the product
- Status 404 if the product doesn't exist

## GET /api/products/:productId/reviews
Returns the product's reviews, newest first. Works for guests too. With a token, it also says which review is the user's and whether they can write one.

**Response:**
```js
{
  "reviews": [
    {
      "id": "uuid",
      "productId": "uuid",
      // The first 2 characters of the reviewer's email followed by "***", such as "ja***", or "Customer"
      "authorName": "string",
      // A whole number from 1 to 5
      "stars": "number",
      // Null when the review has no text
      "text": "string",
      "createdAt": "string",
      "updatedAt": "string",
      // Whether the user asking wrote it
      "isMine": "boolean"
    }
  ],
  // Whether the user has ordered the product. Always false for a guest
  "canReview": "boolean"
}
```
- Status 404 if the product doesn't exist
- Status 401 for an invalid or expired token

## POST /api/products/:productId/reviews
Adds the user's review of a product they have ordered.

**Request:**
```js
{
  // Required, a whole number from 1 to 5
  "stars": "number",
  // Optional, up to 500 characters. Spaces around it are removed
  "text": "string"
}
```

**Response:**
- Status 201 with the new review, in the same shape as in [GET /api/products/:productId/reviews](#get-apiproductsproductidreviews)
- Status 400 with the reason if a field is missing or invalid
- Status 401 without a valid token
- Status 403 if the user hasn't ordered the product
- Status 404 if the product doesn't exist
- Status 409 if the user has already reviewed the product

## PUT /api/products/:productId/reviews/:reviewId
Changes the user's own review. Takes the same fields as [POST /api/products/:productId/reviews](#post-apiproductsproductidreviews).

**Response:**
- Status 200 with the changed review
- Status 400 with the reason if a field is missing or invalid
- Status 401 without a valid token
- Status 403 if the review is someone else's, even for an admin
- Status 404 if the product or the review doesn't exist

## DELETE /api/products/:productId/reviews/:reviewId
Deletes a review. The author can delete their own, and an admin can delete any.

**Response:**
- Status 204 (No response)
- Status 401 without a valid token
- Status 403 if the review is someone else's and the user isn't an admin
- Status 404 if the product or the review doesn't exist

## GET /api/delivery-options
Returns a list of all delivery options.

**Query Parameters:**
- `expand=estimatedDeliveryTime` (optional): includes estimated delivery times

**Response:**
```js
[
  {
    "id": "string",
    "deliveryDays": "number",
    "priceCents": "number",
    // Only included when expand=estimatedDeliveryTime
    "estimatedDeliveryTimeMs": "number"
  }
]
```

## GET /api/cart-items
Returns all items in the cart.

**Query Parameters:**
- `expand=product` (optional): include full product details

**Response:**
```js
[
  {
    "productId": "uuid",
    "quantity": "number",
    "deliveryOptionId": "string",
      // product object, only when expand=product
    "product": "object"
  }
]
```

## POST /api/cart-items
Adds a product to the cart.

**Request:**
```js
{
  "productId": "uuid",
  // Must be between 1 and 10
  "quantity": "number"
}
```

**Response:**
```js
{
  "productId": "uuid",
  "quantity": "number",
  "deliveryOptionId": "string",
}
```
- Status 201 with the cart item
- Status 400 if the product doesn't exist or the quantity isn't from 1 to 10
- Status 409 with the reason if the cart would hold more than is in stock

## PUT /api/cart-items/:productId
Updates a cart item.

**URL Parameters:**
- `productId`: ID of the product to update

**Request:**
```js
{
   // Optional, must be ≥ 1
  "quantity": "number",
  
   // Optional
  "deliveryOptionId": "string"
}
```

**Response:**
```js
{
  "productId": "uuid",
  "quantity": "number",
  "deliveryOptionId": "string",
}
```
- Status 409 with the reason if the new quantity is more than is in stock

## DELETE /api/cart-items/:productId
Removes an item from the cart.

**URL Parameters:**
- `productId`: ID of the product to remove

**Response:**
- Status: 204 (No response)

## GET /api/orders
Returns all orders, sorted by most recent first.

**Query Parameters:**
- `expand=products` (optional): include full product details

**Response:**
```js
[
  {
    "id": "uuid",
    "orderTimeMs": "number",
    "totalCostCents": "number",
    // "card" or "delivery"
    "paymentMethod": "string",
    "products": [
      {
        "productId": "uuid",
        "quantity": "number",
        "estimatedDeliveryTimeMs": "number",
         // product object, only when expand=products
        "product": "object"
      }
    ]
  }
]
```

## POST /api/orders
Creates a new order from the current cart items.

**Request:**
```js
{
  // Optional
  "couponCode": "string"
}
```

**Response:**
```js
{
  "id": "uuid",
  "orderTimeMs": "number",
  "totalCostCents": "number",
  // "card" or "delivery"
  "paymentMethod": "string",
  "products": [
    {
      "productId": "uuid",
      "quantity": "number",
      "estimatedDeliveryTimeMs": "number",
    }
  ]
}
```
- Side effect: Cart is emptied, and its items are taken out of stock
- Status 400 if the cart is empty, or with the reason if the coupon can't be used
- Status 409 if the visitor or user already has 50 orders, or with the reason if an item has less stock than the cart has

## GET /api/orders/:orderId
Returns a specific order.

**URL Parameters:**
- `orderId`: ID of the order

**Query Parameters:**
- `expand=products` (optional): include full product details

**Response:**
```js
{
  "id": "uuid",
  "orderTimeMs": "number",
  "totalCostCents": "number",
  // "card" or "delivery"
  "paymentMethod": "string",
  "products": [
    {
      "productId": "uuid",
      "quantity": "number",
      "estimatedDeliveryTimeMs": "number",
        // product object, only when expand=products
      "product": "object"
    }
  ]
}
```

## GET /api/payment-summary
Calculates and returns the payment summary for the current cart.

**Query Parameters:**
- `couponCode=...` (optional): a coupon to take off the items

**Response:**
```js
{
  "totalItems": "number",
  "productCostCents": "number",
  // The coupon used, as saved, or null
  "coupon": { "code": "string", "percentOff": "number" },
  // 0 without a coupon
  "discountCents": "number",
  "shippingCostCents": "number",
  "totalCostBeforeTaxCents": "number",
  "taxCents": "number",
  "totalCostCents": "number"
}
```

- Status 400 with the reason if the coupon can't be used

## GET /api/coupons/:code
Says whether a coupon code can be used now, so checkout can tell the customer before applying it. Works for everyone.

**Response:**
```js
{
  // As saved, in capitals
  "code": "string",
  "percentOff": "number"
}
```
- Status 404 with the reason if the code doesn't exist, is turned off or has expired

## POST /api/reset
Resets the database to its default state. Only available when `NODE_ENV` is not `production`.

**Response:**
- Status: 204 No Response
- Status: 403 Forbidden when `NODE_ENV` is `production`

## GET /api/stripe/config
Tells the frontend whether to offer card payment. Works for everyone.

**Response:**
```js
{
  // False without a Stripe test key
  "cardPayment": "boolean"
}
```

## POST /api/stripe/checkout-sessions
Starts paying for the current cart by card. Creates a Stripe Checkout Session with a line per cart item, priced from the database, plus shipping and tax from [GET /api/payment-summary](#get-apipayment-summary), so it charges exactly the summary's total. The session's metadata has `app: "react-ecommerce"` and the visitor or user ID. The cart stays as it is until the payment is confirmed.

Takes an optional `{ "couponCode": "string" }`. The discount is given to Stripe as a coupon made for this one payment, so the customer sees it on Stripe's page and the charge matches the summary. The `Origin` header must be the store's own address or one of `CORS_ORIGIN`, because Stripe sends the customer back there: to `/checkout/success?session_id=...` after paying, or to `/checkout` on cancel.

**Response:**
```js
{
  // Stripe's payment page, to send the customer to
  "url": "string"
}
```
- Status 201 with the URL
- Status 400 if the cart is empty or the origin isn't the store's, or with the reason if the coupon can't be used
- Status 404 when card payment is off
- Status 409 if the visitor or user already has 50 orders, or with the reason if an item has less stock than the cart has

## GET /api/stripe/checkout-sessions/:sessionId/order
Returns the order a paid Checkout Session made, and creates it first if the webhook hasn't yet. The success page calls it, so card payment also works without a webhook. Repeating it returns the same order. The cart is only emptied when the order is created.

**URL Parameters:**
- `sessionId`: ID of the Checkout Session, `cs_...`

**Response:**
- Status 200 with the order, in the same shape as [GET /api/orders/:orderId](#get-apiordersorderid), with `paymentMethod` `"card"`
- Status 404 if the session doesn't exist, is another visitor's or wasn't made by this store
- Status 409 if the session isn't paid

## POST /api/stripe/webhook
Receives events from Stripe. The body must be exactly what Stripe sent, with its `Stripe-Signature` header, which is checked against `STRIPE_WEBHOOK_SECRET`. For a paid `checkout.session.completed` from this store, it creates the order like [GET /api/stripe/checkout-sessions/:sessionId/order](#get-apistripecheckout-sessionssessionidorder), at most once per session. Other events, and sessions without `app: "react-ecommerce"` in their metadata, are acknowledged and ignored.

**Response:**
- Status 200 with `{ "received": true }`
- Status 400 if the signature is missing or invalid
- Status 404 when card payment is off

## GET /api/me
Tells the frontend who is logged in and whether to show the admin page. Works for guests too.

**Response:**
```js
{
  // Null for a guest
  "userId": "uuid",
  "isAdmin": "boolean"
}
```
- Status 401 for an invalid or expired token

## GET /api/admin/images
Returns the product images an admin can choose from: those of every product, including deleted ones.

**Response:**
```js
["images/products/2-slot-toaster-white.jpg", "..."]
```

## POST /api/admin/products
Adds a product. It starts with a rating of 0 stars from 0 reviews.

**Request:**
```js
{
  // Required, up to 100 characters. Spaces around it are removed
  "name": "string",
  // A whole number from 1 to 1000000 ($10,000)
  "priceCents": "number",
  // One of GET /api/admin/images
  "image": "string",
  // Up to 10, each up to 20 characters and without commas. Can be empty
  "keywords": ["string"],
  // One of GET /api/products/categories
  "category": "string",
  // A whole number from 0 to 100000
  "stock": "number"
}
```

**Response:**
- Status 201 with the new product, in the same shape as [GET /api/products](#get-apiproducts)
- Status 400 with the reason if a field is missing or invalid

## PUT /api/admin/products/:productId
Changes a product. Takes the same fields as [POST /api/admin/products](#post-apiadminproducts), all of them required. The rating can't be changed here: it comes from the demo data and reviews.

**URL Parameters:**
- `productId`: ID of the product to change

**Response:**
- Status 200 with the changed product
- Status 400 with the reason if a field is missing or invalid
- Status 404 if the product doesn't exist or was deleted

## DELETE /api/admin/products/:productId
Hides a product from the store. Carts and orders that have it keep working.

**URL Parameters:**
- `productId`: ID of the product to delete

**Response:**
- Status 204 (No response)
- Status 404 if the product doesn't exist or was already deleted

## GET /api/admin/coupons
Returns every coupon, oldest first, including those turned off or expired.

**Response:**
```js
[
  {
    "id": "uuid",
    "code": "string",
    "percentOff": "number",
    // Null for a coupon that never expires
    "expiresAt": "string",
    "active": "boolean",
    "createdAt": "string",
    "updatedAt": "string"
  }
]
```

## POST /api/admin/coupons
Adds a coupon.

**Request:**
```js
{
  // 3 to 20 letters or digits. Saved in capitals
  "code": "string",
  // A whole number from 1 to 90
  "percentOff": "number",
  // A date, or null for a coupon that never expires
  "expiresAt": "string",
  // Whether customers can use it
  "active": "boolean"
}
```

**Response:**
- Status 201 with the new coupon, in the same shape as [GET /api/admin/coupons](#get-apiadmincoupons)
- Status 400 with the reason if a field is missing or invalid
- Status 409 if another coupon has the same code

## PUT /api/admin/coupons/:couponId
Changes a coupon. Takes the same fields as [POST /api/admin/coupons](#post-apiadmincoupons), all of them required.

**URL Parameters:**
- `couponId`: ID of the coupon to change

**Response:**
- Status 200 with the changed coupon
- Status 400 with the reason if a field is missing or invalid
- Status 404 if the coupon doesn't exist
- Status 409 if another coupon has the same code
