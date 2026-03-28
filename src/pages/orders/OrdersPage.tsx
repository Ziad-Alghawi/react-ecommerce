import axios from 'axios';
import { useEffect, useState } from 'react';
import { Header } from '../../components/Header';
import { OrderGrid } from './OrderGrid';
import type { CartItem, LoadCart, Order } from '../../types/store';
import './OrdersPage.css';

interface OrdersPageProps {
  cart: CartItem[];
  loadCart: LoadCart;
}

export function OrdersPage({ cart, loadCart }: OrdersPageProps) {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const fetchOrdersData = async () => {
      const response = await axios.get<Order[]>('/api/orders?expand=products')
        setOrders(response.data);
    }
    fetchOrdersData();
  }, []);

  return (
    <>
      <title>Orders</title>
      <link rel="icon" type="image/svg+xml" href="/orders-favicon.png" />

      <Header cart={cart} />

      <div className="orders-page">
        <div className="page-title">Your Orders</div>

        <OrderGrid orders={orders} loadCart={loadCart} />
      </div>
    </>

  );
}