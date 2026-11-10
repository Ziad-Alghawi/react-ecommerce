import { Link, useParams } from 'react-router';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { ErrorMessage, LoadingMessage } from '../components/PageStatus';
import { formatDeliveryStatus } from '../utils/date';
import type { CartItem, Order, OrderProduct } from '../types/store';
import './TrackingPage.css';

interface PackageTrackingProps {
  order: Order;
  orderProduct: OrderProduct;
}

function PackageTracking({ order, orderProduct }: PackageTrackingProps) {
  const totalDeliveryTimeMs = orderProduct.estimatedDeliveryTimeMs - order.orderTimeMs;
  const timePassedMs = Date.now() - order.orderTimeMs;
  const deliveryPercent = Math.min((timePassedMs / totalDeliveryTimeMs) * 100, 100);

  const isPreparing = deliveryPercent < 33;
  const isShipped = deliveryPercent >= 33 && deliveryPercent < 100;
  const isDelivered = deliveryPercent === 100;

  return (
    <div className="order-tracking card">
      <Link className="back-to-orders-link link-primary" to="/orders">
        View all orders
      </Link>

      <h1 className="delivery-date">
        {formatDeliveryStatus(orderProduct.estimatedDeliveryTimeMs)}
      </h1>

      <div className="tracking-product">
        <img className="product-image" src={orderProduct.product.image}
          alt={orderProduct.product.name} width="720" height="720" />
        <div>
          <div className="product-name">{orderProduct.product.name}</div>
          <div className="product-quantity">Quantity: {orderProduct.quantity}</div>
        </div>
      </div>

      <div className="progress-labels-container">
        <div className={isPreparing ? 'current-status' : undefined}>
          Preparing
        </div>
        <div className={isShipped ? 'current-status' : undefined}>
          Shipped
        </div>
        <div className={isDelivered ? 'current-status' : undefined}>
          Delivered
        </div>
      </div>

      <div className="progress-bar-container" role="progressbar"
        aria-label="Delivery progress" aria-valuenow={Math.round(deliveryPercent)}
        aria-valuemin={0} aria-valuemax={100}>
        <div className="progress-bar"
          style={{ width: `${deliveryPercent}%` }}></div>
      </div>
    </div>
  );
}

interface TrackingPageProps {
  cart: CartItem[];
  onRetry: () => void;
}

export function TrackingPage({ cart, onRetry }: TrackingPageProps) {
  const { orderId, productId } = useParams();

  const [order, setOrder] = useState<Order | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await axios.get<Order>(`/api/orders/${orderId}?expand=products`);
        if (!Array.isArray(response.data?.products)) {
          throw new Error('Unexpected order response');
        }
        setOrder(response.data);
      } catch (error) {
        // Trying again can't help when the order doesn't exist
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          setIsNotFound(true);
        } else {
          setHasError(true);
        }
      }
    };
    fetchOrder();
  }, [orderId]);

  const orderProduct = order?.products.find((orderProduct) => {
    return orderProduct.productId === productId;
  });

  let pageContent = <LoadingMessage />;

  if (orderProduct) {
    pageContent = <PackageTracking order={order} orderProduct={orderProduct} />;
  } else if (hasError) {
    pageContent = <ErrorMessage onButtonClick={onRetry} />;
  } else if (isNotFound || order) {
    pageContent = (
      <div className="page-status" data-testid="package-not-found">
        <div>We couldn't find this package</div>
        <Link className="page-status-link link-primary" to="/orders">View all orders</Link>
      </div>
    );
  }

  return (
    <>
      <title>Tracking</title>
      <link rel="icon" type="image/png" href="/tracking-favicon.png" />

      <Header cart={cart} />

      <main className="tracking-page">
        {pageContent}
      </main>
    </>
  );
}
