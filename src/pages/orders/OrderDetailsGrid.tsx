import { Link } from 'react-router';
import { CartIcon } from '../../components/Icons';
import { ButtonSpinner } from '../../components/PageStatus';
import { useAction } from '../../hooks/useAction';
import { useAddToCart } from '../../hooks/useAddToCart';
import { formatDeliveryStatus } from '../../utils/date';
import type { LoadCart, Order, OrderProduct } from '../../types/store';

interface BuyAgainButtonProps {
  orderProduct: OrderProduct;
  loadCart: LoadCart;
}

// Its own component, because useAction can't be called inside .map()
function BuyAgainButton({ orderProduct, loadCart }: BuyAgainButtonProps) {
  const addToCart = useAddToCart(loadCart);
  const [buyAgain, isAdding] = useAction(() => addToCart(orderProduct.product, 1));

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
    <div>
      {order.products.map((orderProduct) => (
        <div key={orderProduct.productId} className="order-product">
          <img className="product-thumbnail" src={orderProduct.product.image}
            alt={orderProduct.product.name} width="480" height="480" loading="lazy" />

          <div data-testid="order-product-details">
            <Link className="product-name" to={`/products/${orderProduct.product.id}`}>
              {orderProduct.product.name}
            </Link>
            <div className="product-delivery-date" data-testid="order-product-delivery-date">
              {formatDeliveryStatus(orderProduct.estimatedDeliveryTimeMs)}
            </div>
            <div className="product-quantity">
              Quantity: {orderProduct.quantity}
            </div>

            {orderProduct.product.deletedAt || orderProduct.product.stock === 0 ? (
              <div className="product-unavailable" data-testid="product-unavailable">
                {orderProduct.product.deletedAt ? 'No longer available' : 'Out of stock'}
              </div>
            ) : (
              <BuyAgainButton orderProduct={orderProduct} loadCart={loadCart} />
            )}
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
