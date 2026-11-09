import { useParams } from 'react-router';
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
    <div className="order-tracking">
      <a className="back-to-orders-link link-primary" href="/orders">
        View all orders
      </a>

      <div className="delivery-date">
        {formatDeliveryStatus(orderProduct.estimatedDeliveryTimeMs)}
      </div>

      <div className="product-info">
        {orderProduct.product.name}
      </div>

      <div className="product-info">
        Quantity: {orderProduct.quantity}
      </div>

      <img className="product-image" src={orderProduct.product.image} />

      <div className="progress-labels-container">
        <div className={`progress-label ${isPreparing ? 'current-status' : ''}`}>
          Preparing
        </div>
        <div className={`progress-label ${isShipped ? 'current-status' : ''}`}>
          Shipped
        </div>
        <div className={`progress-label ${isDelivered ? 'current-status' : ''}`}>
          Delivered
        </div>
      </div>

      <div className="progress-bar-container">
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
        <a className="page-status-link link-primary" href="/orders">View all orders</a>
      </div>
    );
  }

  return (
    <>
      <title>Tracking</title>
      <link rel="icon" type="image/png" href="/tracking-favicon.png" />

      <Header cart={cart} />

      <div className="tracking-page">
        {pageContent}
      </div>
    </>
  );
}
