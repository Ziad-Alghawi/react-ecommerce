import { OrderHeader } from './OrderHeader';
import { OrderDetailsGrid } from './OrderDetailsGrid';
import type { LoadCart, Order } from '../../types/store';

interface OrderGridProps {
  orders: Order[];
  loadCart: LoadCart;
}

export function OrderGrid({ orders, loadCart }: OrderGridProps) {
  return (

    <div className="orders-grid">
      {orders.map((order) => {
        return (

          <div key={order.id} className="order-container"
            data-testid="order-container">

            <OrderHeader order={order} />

            <OrderDetailsGrid order={order} loadCart={loadCart} />
          </div>
        );
      })}
    </div>


  );
}