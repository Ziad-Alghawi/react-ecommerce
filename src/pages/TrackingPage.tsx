import { useParams } from 'react-router';
import axios from 'axios';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { ErrorMessage, LoadingMessage } from '../components/PageStatus';
import type { CartItem, Order } from '../types/store';
import './TrackingPage.css';

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

    const fetchOrderData = async () => {
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
    fetchOrderData();

  }, [orderId]);

  const orderProduct = order?.products.find((orderProduct) => {
    return orderProduct.productId === productId;
  });

  if (!orderProduct) {
    let pageContent = <LoadingMessage />;

    if (hasError) {
      pageContent = <ErrorMessage onRetry={onRetry} />;
    } else if (isNotFound || order) {
      pageContent = (
        <div className="page-status" data-testid="package-not-found">
          <div>We couldn't find this package</div>
          <a className="link-primary" href="/orders">View all orders</a>
        </div>
      );
    }

    return (
      <>
        <title>Tracking</title>
        <link rel="icon" type="image/svg+xml" href="/tracking-favicon.png" />

        <Header cart={cart} />

        <div className="tracking-page">
          {pageContent}
        </div>
      </>
    );
  }

  // Calculate delivery progress
  const totalDeliveryTimeMs = orderProduct.estimatedDeliveryTimeMs - order.orderTimeMs;
  const timePassedMs = dayjs().valueOf() - order.orderTimeMs;

  let deliveryPercent = (timePassedMs / totalDeliveryTimeMs) * 100;
  if (deliveryPercent > 100) {
    deliveryPercent = 100;
  }

  // Determine the current status based on delivery percent
  const isPreparing = deliveryPercent < 33;
  const isShipped = deliveryPercent >= 33 && deliveryPercent < 100;
  const isDelivered = deliveryPercent === 100;


  return (
    <>
      <title>Tracking</title>
      <link rel="icon" type="image/svg+xml" href="/tracking-favicon.png" />

      <Header cart={cart} />

      <div className="tracking-page">
        <div className="order-tracking">
          <a className="back-to-orders-link link-primary" href="/orders">
            View all orders
          </a>

          <div className="delivery-date">
            {deliveryPercent >= 100 ? 'Delivered on' : 'Arriving on'}{' '}
            {dayjs(orderProduct.estimatedDeliveryTimeMs).format('dddd, MMMM D')}
          </div>

          <div className="product-info">
            {orderProduct.product.name}
          </div>

          <div className="product-info">
            Quantity: {orderProduct.quantity}
          </div>

          <img className="product-image" src={orderProduct.product.image} />

          <div className="progress-labels-container">
            <div className={`progress-label ${isPreparing && 'current-status'}`}>
              Preparing
            </div>
            <div className={`progress-label ${isShipped && 'current-status'}`}>
              Shipped
            </div>
            <div className={`progress-label ${isDelivered && 'current-status'}`}>
              Delivered
            </div>
          </div>

          <div className="progress-bar-container">
            <div className="progress-bar"
              style={{ width: `${deliveryPercent}%` }}></div>
          </div>
        </div>
      </div>
    </>

  );
}