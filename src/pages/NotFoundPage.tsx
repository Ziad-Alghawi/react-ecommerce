import { Header } from '../components/Header';
import type { CartItem } from '../types/store';
import './NotFoundPage.css';

interface NotFoundPageProps {
  cart: CartItem[];
}

export function NotFoundPage({ cart }: NotFoundPageProps) {
  return (
    <>
      {/* You can choose whatever title and favicon you want. */}
      <title>404 Page Not Found</title>
      <link rel="icon" type="image/svg+xml" href="home-favicon.png" />

      {/* Remember to add the <Header> so it looks like it's
      on the same website. */}
      <Header cart={cart} />

      {/* You can style this message however you want. */}
      <div className="not-found-message">
        Page not found
      </div>
    </>
  );
}