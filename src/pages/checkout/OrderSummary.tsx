import axios from "axios";
import { DeliveryOptions } from "./DeliveryOptions";
import { CartItemDetails } from "./CartItemDetails";
import { DeliveryDate } from "./DeliveryDate";
import type { CartItem, DeliveryOption, LoadCart } from "../../types/store";

interface OrderSummaryProps {
  cart: CartItem[];
  deliveryOptions: DeliveryOption[];
  loadCart: LoadCart;
}

export function OrderSummary({ cart, deliveryOptions, loadCart }: OrderSummaryProps) {
  return (

    <div className="order-summary">
      {deliveryOptions.length > 0 && cart.map((cartItem) => {

        const deleteCartItem = async () => {
          await axios.delete(`/api/cart-items/${cartItem.productId}`);
          await loadCart();
        };
      
        return (
          <div key={cartItem.productId} className="cart-item-container"
            data-testid="cart-item-container">

            <DeliveryDate cartItem={cartItem} deliveryOptions={deliveryOptions} />

            <div className="cart-item-details-grid">

              <CartItemDetails cartItem={cartItem} deleteCartItem={deleteCartItem} loadCart={loadCart} />

              <DeliveryOptions cartItem={cartItem} deliveryOptions={deliveryOptions} loadCart={loadCart} />

            </div>
          </div>

        );
      })}
    </div >
  );
}