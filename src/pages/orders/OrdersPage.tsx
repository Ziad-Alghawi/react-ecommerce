import axios from 'axios';
import { useEffect, useState } from 'react';
import { Header } from '../../components/Header';
import { ErrorMessage, LoadingMessage } from '../../components/PageStatus';
import { OrderGrid } from './OrderGrid';
import type { CartItem, LoadCart, Order } from '../../types/store';
import './OrdersPage.css';

interface OrdersPageProps {
  cart: CartItem[];
  loadCart: LoadCart;
  onRetry: () => void;
}

export function OrdersPage({ cart, loadCart, onRetry }: OrdersPageProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const fetchOrdersData = async () => {
      try {
        const response = await axios.get<Order[]>('/api/orders?expand=products');
        if (!Array.isArray(response.data)) {
          throw new Error('Unexpected orders response');
        }
        setOrders(response.data);
        setHasLoaded(true);
      } catch {
        setHasError(true);
      }
    }
    fetchOrdersData();
  }, []);

  let pageContent = <OrderGrid orders={orders} loadCart={loadCart} />;

  if (hasError) {
    pageContent = <ErrorMessage onRetry={onRetry} />;
  } else if (!hasLoaded) {
    pageContent = <LoadingMessage />;
  } else if (orders.length === 0) {
    pageContent = (
      <div className="no-orders-message" data-testid="no-orders-message">
        You haven't placed any orders yet
      </div>
    );
  }

  return (
    <>
      <title>Orders</title>
      <link rel="icon" type="image/svg+xml" href="/orders-favicon.png" />

      <Header cart={cart} />

      <div className="orders-page">
        <div className="page-title">Your Orders</div>

        {pageContent}
      </div>
    </>

  );
}