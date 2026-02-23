import { Fragment } from 'react';
import { OrderHeader } from './OrderHeader';
import { OrderDetailsGrid } from './OrderDetailsGrid';


export function OrderGrid({ orders }) {
  return (

    <div className="orders-grid">
      {orders.map((order) => {
        return (

          <div key={order.id} className="order-container">

            <OrderHeader order={order} />

            <OrderDetailsGrid order={order} />
          </div>
        );
      })}
    </div>


  );
}