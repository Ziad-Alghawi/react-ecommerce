import { useEffect, useState } from 'react';
import axios from 'axios';
import { Routes, Route, useLocation } from 'react-router';
import { HomePage } from './pages/home/HomePage';
import { CheckoutPage } from './pages/checkout/CheckoutPage';
import { OrdersPage } from './pages/orders/OrdersPage';
import { TrackingPage } from './pages/TrackingPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ErrorMessage } from './components/PageStatus';
import { ActionFailureContext } from './hooks/useAction';
import type { CartItem, CartStatus } from './types/store';
import './App.css';

// The API answers a request it won't accept (4xx) with the reason. Repeating it can't help
function getRejectionReason(error: unknown) {
  if (axios.isAxiosError<{ error?: string }>(error) && error.response && error.response.status < 500) {
    return error.response.data?.error ?? null;
  }
  return null;
}

function App() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartStatus, setCartStatus] = useState<CartStatus>('loading');
  const [retryCount, setRetryCount] = useState(0);
  const [actionFailed, setActionFailed] = useState(false);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  // The button action that failed, so "Try again" can repeat it
  const [failedAction, setFailedAction] = useState<{ retry: () => Promise<void>; path: string } | null>(null);
  const location = useLocation();

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
        setRejectionReason(getRejectionReason(error));
        // Cleared here and set again by useAction, if that's where the request came from
        setFailedAction(null);
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

  const reportActionFailure = (error: unknown, retry: () => Promise<void>) => {
    // Only repeat a change that wasn't saved. If it saved and only reloading
    // the cart failed, repeating it would add the item twice
    if (axios.isAxiosError(error) && error.config?.method !== 'get') {
      setFailedAction({ retry, path: location.pathname });
    }
  };

  const retryFailedAction = () => {
    // The button is only still there if the user stayed on the same page
    if (failedAction && failedAction.path === location.pathname) {
      setActionFailed(false);
      setFailedAction(null);
      failedAction.retry();
    } else {
      retry();
    }
  };

  return (
    <>
      <div className="app-content">
        <ActionFailureContext value={reportActionFailure}>
          <Routes key={retryCount}>
            <Route index element={<HomePage cart={cart} loadCart={loadCart} onRetry={retry} />} />
            <Route path="checkout" element={<CheckoutPage cart={cart} cartStatus={cartStatus} loadCart={loadCart} onRetry={retry} />} />
            <Route path="orders" element={<OrdersPage cart={cart} loadCart={loadCart} onRetry={retry} />} />
            <Route path="tracking/:orderId/:productId" element={<TrackingPage cart={cart} onRetry={retry} />} />
            <Route path="*" element={<NotFoundPage cart={cart} />} />
          </Routes>
        </ActionFailureContext>
      </div>

      {actionFailed && (
        <div className="action-error">
          {rejectionReason ? (
            <ErrorMessage title="Your change wasn't saved" detail={rejectionReason}
              buttonText="Close" onButtonClick={() => setActionFailed(false)} />
          ) : (
            <ErrorMessage title="Your change wasn't saved" onButtonClick={retryFailedAction} />
          )}
        </div>
      )}

      <footer className="site-footer" data-testid="site-footer">
        Demo store, data resets regularly
      </footer>
    </>
  );
}

export default App;
