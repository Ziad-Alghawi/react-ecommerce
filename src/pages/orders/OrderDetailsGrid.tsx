import axios from 'axios';
import { Fragment } from 'react';
import dayjs from 'dayjs';
import BuyAgainIcon from '../../assets/images/icons/buy-again.png';
import { ButtonSpinner } from '../../components/PageStatus';
import { useAction } from '../../hooks/useAction';
import type { LoadCart, Order, OrderProduct } from '../../types/store';

interface BuyAgainButtonProps {
  orderProduct: OrderProduct;
  loadCart: LoadCart;
}

// Its own component, because useAction can't be called inside .map()
function BuyAgainButton({ orderProduct, loadCart }: BuyAgainButtonProps) {
  const [buyAgain, isAdding] = useAction(async () => {
    await axios.post('/api/cart-items', {
      // Note: you can also get the productId from
      // orderProduct.productId
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
      onClick={buyAgain} >
      {/* The spinner takes the icon's place, so the button doesn't change size */}
      {isAdding
        ? <ButtonSpinner />
        : <img className="buy-again-icon" src={BuyAgainIcon} />}
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
      {order.products.map((orderProduct) => {

        return (
          <Fragment key={orderProduct.productId}>
            <div className="product-image-container">
              <img src={orderProduct.product.image} />
            </div>

            <div className="product-details"
              data-testid="order-product-details">
              <div className="product-name">
                {orderProduct.product.name}
              </div>
              <div className="product-delivery-date">
                Arriving on: {dayjs(orderProduct.estimatedDeliveryTimeMs).format('MMMM D')}
              </div>
              <div className="product-quantity">
                Quantity: {orderProduct.quantity}
              </div>




              <BuyAgainButton orderProduct={orderProduct} loadCart={loadCart} />
            </div>

            <div className="product-actions">
              <a href={`/tracking/${order.id}/${orderProduct.product.id}`}>
                <button className="track-package-button button-secondary">
                  Track package
                </button>
              </a>
            </div>


          </Fragment>

        );

      })}
    </div>

  );
}

