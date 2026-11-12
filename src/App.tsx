import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ComponentType } from 'react';
import axios from 'axios';
import { Routes, Route, useLocation } from 'react-router';
import { HomePage } from './pages/home/HomePage';
import { CheckoutPage } from './pages/checkout/CheckoutPage';
import { CheckoutSuccessPage } from './pages/checkout/CheckoutSuccessPage';
import { OrdersPage } from './pages/orders/OrdersPage';
import { TrackingPage } from './pages/TrackingPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ErrorMessage, LoadingMessage } from './components/PageStatus';
import { Toasts } from './components/Toasts';
import { ActionFailureContext } from './hooks/useAction';
import { ToastContext, useToasts } from './hooks/useToast';
import { AuthContext, useAuthUser, useIsAdmin } from './hooks/useAuth';
import { isAuthEnabled, logOut } from './utils/supabase';
import type { CartItem, CartStatus } from './types/store';
import './App.css';

function PageLoadError() {
  return <ErrorMessage detail="Check your connection and try again." onButtonClick={() => window.location.reload()} />;
}

// Only people who open the page download it. If that fails, for example offline
// or after a new deploy renamed the file, reloading fetches it again
function lazyPage<Props extends object>(loadPage: () => Promise<ComponentType<Props>>) {
  return lazy(() => loadPage().then(
    (Page) => ({ default: Page }),
    () => ({ default: PageLoadError as ComponentType<Props> })
  ));
}

// The login page also brings in Supabase
const LoginPage = lazyPage(() => import('./pages/LoginPage').then((module) => module.LoginPage));
const AdminPage = lazyPage(() => import('./pages/admin/AdminPage').then((module) => module.AdminPage));
const ProductPage = lazyPage(() => import('./pages/product/ProductPage').then((module) => module.ProductPage));

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
  // The button action that failed, so "Try again" can repeat it
  const failedAction = useRef<{ retry: () => Promise<void>; path: string } | null>(null);
  const location = useLocation();
  const currentPath = useRef(location.pathname);
  const { toasts, showToast, dismissToast } = useToasts();
  const user = useAuthUser();
  const isAdmin = useIsAdmin(user?.id);
  // Whose cart and orders are shown. Pages load them again when it changes
  const owner = user === undefined ? null : user?.id ?? 'guest';

  // Stable, so pages can reload the cart from an effect without running it again
  const loadCart = useCallback(async () => {
    const response = await axios.get<CartItem[]>('/api/cart-items?expand=product');
    // A sleeping server or a proxy can answer with an HTML page instead of JSON
    if (!Array.isArray(response.data)) {
      throw new Error('Unexpected cart response');
    }
    setCart(response.data);
    setCartStatus('ready');
  }, []);

  useEffect(() => {
    if (!owner) {
      return;
    }
    setCartStatus('loading');
    loadCart().catch(() => setCartStatus('failed'));
  }, [retryCount, owner, loadCart]);

  useEffect(() => {
    currentPath.current = location.pathname;
  }, [location.pathname]);

  // Changing the key of <Routes> remounts the page, which loads its data again
  const retry = () => {
    setRetryCount((count) => count + 1);
  };

  useEffect(() => {
    // Only repeats the action if the user is still on the page where its button is
    const retryFailedAction = () => {
      const action = failedAction.current;
      failedAction.current = null;
      if (action && action.path === currentPath.current) {
        action.retry();
      } else {
        setRetryCount((count) => count + 1);
      }
    };

    // GET requests show their error on the page. Everything else (add to cart,
    // place order...) is a button click, so report those failures here for all of them.
    const interceptor = axios.interceptors.response.use(undefined, (error) => {
      if (error.config?.method !== 'get') {
        // Cleared here and set again by useAction, if that's where the request came from
        failedAction.current = null;
        const reason = getRejectionReason(error);
        showToast(reason ?? "Your change wasn't saved. The demo server may be waking up, so please try again.", {
          isError: true,
          action: reason ? undefined : { label: 'Try again', onClick: retryFailedAction }
        });
      }
      return Promise.reject(error);
    });

    return () => axios.interceptors.response.eject(interceptor);
  }, [showToast]);

  const reportActionFailure = (error: unknown, retry: () => Promise<void>) => {
    // Only repeat a change that wasn't saved. If it saved and only reloading
    // the cart failed, repeating it would add the item twice
    if (axios.isAxiosError(error) && error.config?.method !== 'get') {
      failedAction.current = { retry, path: location.pathname };
    }
  };

  return (
    <>
      <div className="app-content">
        <AuthContext value={isAuthEnabled ? { user: user ?? null, isAdmin, logOut } : null}>
          <ToastContext value={showToast}>
            <ActionFailureContext value={reportActionFailure}>
              {owner ? (
                <Suspense fallback={<LoadingMessage />}>
                  <Routes key={`${retryCount}-${owner}`}>
                    <Route index element={<HomePage cart={cart} loadCart={loadCart} onRetry={retry} />} />
                    <Route path="products/:productId" element={<ProductPage cart={cart} loadCart={loadCart} onRetry={retry} />} />
                    <Route path="checkout" element={<CheckoutPage cart={cart} cartStatus={cartStatus} loadCart={loadCart} onRetry={retry} />} />
                    <Route path="checkout/success" element={<CheckoutSuccessPage cart={cart} loadCart={loadCart} onRetry={retry} />} />
                    <Route path="orders" element={<OrdersPage cart={cart} loadCart={loadCart} onRetry={retry} />} />
                    <Route path="tracking/:orderId/:productId" element={<TrackingPage cart={cart} onRetry={retry} />} />
                    {isAuthEnabled && <Route path="login" element={<LoginPage cart={cart} />} />}
                    {isAuthEnabled && <Route path="admin" element={<AdminPage cart={cart} onRetry={retry} />} />}
                    <Route path="*" element={<NotFoundPage cart={cart} />} />
                  </Routes>
                </Suspense>
              ) : (
                <LoadingMessage />
              )}
            </ActionFailureContext>
          </ToastContext>
        </AuthContext>
      </div>

      <Toasts toasts={toasts} onDismiss={dismissToast} />

      <footer className="site-footer" data-testid="site-footer">
        <div className="site-footer-content">
          <span>Demo store, data resets regularly. No real orders or payments.</span>
          <a className="site-footer-link" href="https://github.com/Ziad-Alghawi/react-ecommerce"
            target="_blank" rel="noreferrer">
            View the code on GitHub
          </a>
        </div>
      </footer>
    </>
  );
}

export default App;
