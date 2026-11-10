import dayjs from 'dayjs';
import { formatMoney } from '../../utils/money';
import type { Order } from '../../types/store';

interface OrderHeaderProps {
  order: Order;
}

export function OrderHeader({ order }: OrderHeaderProps) {
  return (
    <div className="order-header">
      <div className="order-date">
        <div className="order-header-label">Order placed</div>
        <div data-testid="order-date">
          {dayjs(order.orderTimeMs).format('MMMM D')}
        </div>
      </div>

      <div className="order-total">
        <div className="order-header-label">Total</div>
        <div data-testid="order-total">
          {formatMoney(order.totalCostCents)}
        </div>
      </div>

      <div className="order-id">
        <div className="order-header-label">Order ID</div>
        <div data-testid="order-id">
          {order.id}
        </div>
      </div>
    </div>
  );
}
