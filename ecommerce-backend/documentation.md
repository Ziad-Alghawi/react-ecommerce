## E-Commerce Backend Documentation
Here's a list of all the URL Paths you can use with this backend and what each URL Path does.

**Products, Delivery Options**
- [GET /api/products](#get-apiproducts)
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

**Payment Summary, Reset**
- [GET /api/payment-summary](#get-apipayment-summary)
- [POST /api/reset](#post-apireset)

**Admin**
- [GET /api/me](#get-apime)
- [GET /api/admin/images](#get-apiadminimages)
- [POST /api/admin/products](#post-apiadminproducts)
- [PUT /api/admin/products/:productId](#put-apiadminproductsproductid)
- [DELETE /api/admin/products/:productId](#delete-apiadminproductsproductid)

**Visitors:** the cart, order and payment summary routes need an `X-Visitor-Id` header with a UUID. Each ID has its own cart and orders, so a browser can keep its own data without an account. Requests without a valid ID get `400`.

**Accounts:** when `SUPABASE_URL` is set, these routes also accept `Authorization: Bearer <access token>` from Supabase Auth. A valid token uses the user's own cart and orders instead of the visitor's, and `X-Visitor-Id` is then optional. If both are sent, the visitor's cart and orders move to the user's account on the first request (quantities of the same product add up). A missing, expired or otherwise invalid token gets `401`, and so does a user's ID sent as `X-Visitor-Id` without their token. The 50-order limit applies to users too, but only guests are dropped when there are more than 500 visitors: a user's cart and orders are always kept.

**Admins:** the `/api/admin` routes need `Authorization: Bearer <access token>` of a user whose ID is in `ADMIN_USER_IDS`. Without a valid token they answer `401`, and for any other user `403`. A deleted product is only hidden: it's left out of `GET /api/products` and can't be added to a cart, but carts and orders that have it still return it, with `deletedAt` set.

**Reviews:** reading reviews works for everyone. Writing, editing and deleting one needs `Authorization: Bearer <access token>`, and the user always comes from the verified token, never from the request body. Only a user who has ordered the product can review it, once. Only the author can edit a review, and the author or an admin can delete it. After every change the product's `rating` is worked out again from its demo rating and its reviews, rounded to the nearest half star.

**Errors:** a rejected request gets a `4xx` status and a JSON body like `{ "error": "Cart is empty" }`. An unexpected server error, such as a failed database call, gets `500` with the same kind of body.

## GET /api/products
Returns a list of products, without the ones an admin deleted.

**Query Parameters:**
- `search=...` (optional): Search term to find products by name or keywords

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
    // Null here. Set on deleted products that a cart or order still returns
    "deletedAt": "string"
  }
]
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
      // The part of the reviewer's email before the @, or "Customer"
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

**Response:**
```js
{
  "id": "uuid",
  "orderTimeMs": "number",
  "totalCostCents": "number",
  "products": [
    {
      "productId": "uuid",
      "quantity": "number",
      "estimatedDeliveryTimeMs": "number",
    }
  ]
}
```
- Side effect: Cart is emptied
- Status 400 if the cart is empty
- Status 409 if the visitor or user already has 50 orders

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

**Response:**
```js
{
  "totalItems": "number",
  "productCostCents": "number",
  "shippingCostCents": "number",
  "totalCostBeforeTaxCents": "number",
  "taxCents": "number",
  "totalCostCents": "number"
}
```

## POST /api/reset
Resets the database to its default state. Only available when `NODE_ENV` is not `production`.

**Response:**
- Status: 204 No Response
- Status: 403 Forbidden when `NODE_ENV` is `production`

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
  "keywords": ["string"]
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
