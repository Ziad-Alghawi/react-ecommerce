import axios from 'axios';
import { formatMoney } from '../../utils/money';
import { formatDeliveryDate } from '../../utils/date';
import type { CartItem, DeliveryOption, LoadCart } from '../../types/store';

interface DeliveryOptionsProps {
  cartItem: CartItem;
  deliveryOptions: DeliveryOption[];
  loadCart: LoadCart;
}

export function DeliveryOptions({ cartItem, deliveryOptions, loadCart }: DeliveryOptionsProps) {
  return (
    <fieldset className="delivery-options">
      <legend className="delivery-options-title">
        Choose a delivery option:
      </legend>

      {deliveryOptions.map((deliveryOption) => {
        const priceString = deliveryOption.priceCents > 0
          ? `${formatMoney(deliveryOption.priceCents)} - Shipping`
          : 'FREE Shipping';

        const updateDeliveryOption = async () => {
          await axios.put(`/api/cart-items/${cartItem.productId}`, {
            deliveryOptionId: deliveryOption.id
          });
          await loadCart();
        };

        return (
          <label key={deliveryOption.id} className="delivery-option"
            data-testid="delivery-option">
            <input type="radio"
              checked={deliveryOption.id === cartItem.deliveryOptionId}
              onChange={updateDeliveryOption}
              className="delivery-option-input"
              name={`delivery-option-${cartItem.productId}`}
              data-testid="delivery-option-input" />
            <div>
              <div className="delivery-option-date">
                {formatDeliveryDate(deliveryOption.estimatedDeliveryTimeMs)}
              </div>
              <div className="delivery-option-price">
                {priceString}
              </div>
            </div>
          </label>
        );
      })}
    </fieldset>
  );
}
