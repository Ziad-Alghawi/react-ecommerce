import axios from 'axios';
import { useEffect, useState } from 'react';
import { Header } from '../../components/Header';
import { PageTitle } from '../../components/PageTitle';
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
    const fetchOrders = async () => {
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
    };
    fetchOrders();
  }, []);

  let pageContent = <OrderGrid orders={orders} loadCart={loadCart} />;

  if (hasError) {
    pageContent = <ErrorMessage onButtonClick={onRetry} />;
  } else if (!hasLoaded) {
    pageContent = <LoadingMessage />;
  } else if (orders.length === 0) {
    pageContent = (
      <div className="page-status" data-testid="no-orders-message">
        You haven't placed any orders yet
      </div>
    );
  }

  return (
    <>
      <PageTitle title="Your Orders" />

      <Header cart={cart} />

      <main className="orders-page">
        <h1 className="page-title">Your Orders</h1>

        {pageContent}
      </main>
    </>
  );
}
