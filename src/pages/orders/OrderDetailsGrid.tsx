import axios from 'axios';
import { Link } from 'react-router';
import { CartIcon } from '../../components/Icons';
import { ButtonSpinner } from '../../components/PageStatus';
import { useAction } from '../../hooks/useAction';
import { formatDeliveryStatus } from '../../utils/date';
import type { LoadCart, Order, OrderProduct } from '../../types/store';

interface BuyAgainButtonProps {
  orderProduct: OrderProduct;
  loadCart: LoadCart;
}

// Its own component, because useAction can't be called inside .map()
function BuyAgainButton({ orderProduct, loadCart }: BuyAgainButtonProps) {
  const [buyAgain, isAdding] = useAction(async () => {
    await axios.post('/api/cart-items', {
      productId: orderProduct.product.id,
      quantity: 1
    });
    await loadCart();
  });

  return (
    <button className="buy-again-button button-primary"
      data-testid="buy-again-button"
      disabled={isAdding}
      aria-busy={isAdding}
      onClick={buyAgain}>
      {/* The spinner takes the icon's place, so the button doesn't change size */}
      {isAdding
        ? <ButtonSpinner />
        : <CartIcon className="buy-again-icon" />}
      <span className="buy-again-message">Add to Cart</span>
    </button>
  );
}

interface OrderDetailsGridProps {
  order: Order;
  loadCart: LoadCart;
}

export function OrderDetailsGrid({ order, loadCart }: OrderDetailsGridProps) {
  return (
    <div className="order-details-grid">
      {order.products.map((orderProduct) => (
        <div key={orderProduct.productId} className="order-product">
          <img className="order-product-image" src={orderProduct.product.image}
            alt={orderProduct.product.name} width="720" height="720" />

          <div className="product-details"
            data-testid="order-product-details">
            <div className="product-name">
              {orderProduct.product.name}
            </div>
            <div className="product-delivery-date" data-testid="order-product-delivery-date">
              {formatDeliveryStatus(orderProduct.estimatedDeliveryTimeMs)}
            </div>
            <div className="product-quantity">
              Quantity: {orderProduct.quantity}
            </div>

            <BuyAgainButton orderProduct={orderProduct} loadCart={loadCart} />
          </div>

          <Link className="track-package-button button-secondary"
            to={`/tracking/${order.id}/${orderProduct.product.id}`}>
            Track package
          </Link>
        </div>
      ))}
    </div>
  );
}
