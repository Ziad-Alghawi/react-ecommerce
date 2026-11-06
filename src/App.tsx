import { useEffect, useState } from 'react';
import axios from 'axios';
import { Routes, Route } from 'react-router';
import { HomePage } from './pages/home/HomePage'
import { CheckoutPage } from './pages/checkout/CheckoutPage';
import { OrdersPage } from './pages/orders/OrdersPage';
import { TrackingPage } from './pages/TrackingPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ErrorMessage } from './components/PageStatus';
import type { CartItem, CartStatus } from './types/store';
import './App.css'


function App() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartStatus, setCartStatus] = useState<CartStatus>('loading');
  const [retryCount, setRetryCount] = useState(0);
  const [actionFailed, setActionFailed] = useState(false);

  const loadCart = async () => {
      const response = await axios.get<CartItem[]>('/api/cart-items?expand=product');
      // A sleeping server or a proxy can answer with an HTML page instead of JSON
      if (!Array.isArray(response.data)) {
        throw new Error('Unexpected cart response');
      }
      setCart(response.data);
      setCartStatus('ready');
    };

  useEffect(() => {
    setCartStatus('loading');
    loadCart().catch(() => setCartStatus('failed'));
  }, [retryCount]);

  useEffect(() => {
    // GET requests show their error on the page. Everything else (add to cart,
    // place order...) is a button click, so show those failures here for all of them.
    const interceptor = axios.interceptors.response.use(undefined, (error) => {
      if (error.config?.method !== 'get') {
        setActionFailed(true);
      }
      return Promise.reject(error);
    });

    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  // Changing the key of <Routes> remounts the page, which loads its data again
  const retry = () => {
    setActionFailed(false);
    setRetryCount((count) => count + 1);
  };


  return (
    <>
    <div className="app-content">
    <Routes key={retryCount}>
      <Route index element={<HomePage cart={cart} loadCart={loadCart} onRetry={retry} />} />

      <Route path="checkout" element={<CheckoutPage cart={cart} cartStatus={cartStatus} loadCart={loadCart} onRetry={retry} />} />

      <Route path="orders" element={<OrdersPage cart={cart} loadCart={loadCart} onRetry={retry} />} />

      <Route path="tracking/:orderId/:productId" element={<TrackingPage cart={cart} />} />

      <Route path="*" element={<NotFoundPage cart={cart} />} />
    </Routes>
    </div>

    {actionFailed && (
      <div className="action-error">
        <ErrorMessage title="Your change wasn't saved" onRetry={retry} />
      </div>
    )}

    <footer className="site-footer" data-testid="site-footer">
      Demo store, data resets regularly
    </footer>
    </>

  )
}

export default App
