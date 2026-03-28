import dayjs from "dayjs";
import type { CartItem, DeliveryOption } from "../../types/store";

interface DeliveryDateProps {
  cartItem: CartItem;
  deliveryOptions: DeliveryOption[];
}

export function DeliveryDate({ cartItem, deliveryOptions }: DeliveryDateProps) {

  const selectedDeliveryOption = deliveryOptions.find((deliveryOption) => {
    return deliveryOption.id === cartItem.deliveryOptionId;
  });

  if (!selectedDeliveryOption) {
    return null;
  }


  return (
    <div className="delivery-date">
      Delivery date: {dayjs(selectedDeliveryOption.estimatedDeliveryTimeMs).format('dddd, MMMM D')}
    </div>

  );
}