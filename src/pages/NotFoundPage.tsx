import { Header } from '../components/Header';
import type { CartItem } from '../types/store';
import './NotFoundPage.css';

interface NotFoundPageProps {
  cart: CartItem[];
}

export function NotFoundPage({ cart }: NotFoundPageProps) {
  return (
    <>
      <title>404 Page Not Found</title>
      <link rel="icon" type="image/png" href="/home-favicon.png" />

      <Header cart={cart} />

      <div className="not-found-message">
        Page not found
      </div>
    </>
  );
}
