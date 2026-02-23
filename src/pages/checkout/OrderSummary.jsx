
import { DeliveryOptions } from "./DeliveryOptions";
import { CartItemDetails } from "./CartItemDetails";
import { DeliveryDate } from "./DeliveryDate";

export function OrderSummary({ cart, deliveryOptions }) {
  return (

    <div className="order-summary">
      {deliveryOptions.length > 0 && cart.map((cartItem) => {
        



        return (
          <div key={cartItem.id} className="cart-item-container">

            <DeliveryDate cartItem={cartItem} deliveryOptions={deliveryOptions} />

            <div className="cart-item-details-grid">

              <CartItemDetails cartItem={cartItem} deliveryOptions={deliveryOptions} />

              <DeliveryOptions cartItem={cartItem} deliveryOptions={deliveryOptions} />

            </div>
          </div>

        );
      })}
    </div >
  );
}