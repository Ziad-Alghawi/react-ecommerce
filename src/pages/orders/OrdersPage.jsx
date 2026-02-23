import axios from 'axios';
import { useEffect, useState } from 'react';
import { Header } from '../../components/Header';
import { OrderGrid } from './OrderGrid';
import './OrdersPage.css';


export function OrdersPage({ cart }) {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const fetchOrdersData = async () => {
      const response = await axios.get('/api/orders?expand=products')
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

        <OrderGrid orders={orders} />
      </div>
    </>

  );
}