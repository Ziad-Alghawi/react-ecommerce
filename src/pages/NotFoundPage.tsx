import { Link } from 'react-router';
import { Header } from '../components/Header';
import { PageTitle } from '../components/PageTitle';
import type { CartItem } from '../types/store';

interface NotFoundPageProps {
  cart: CartItem[];
}

export function NotFoundPage({ cart }: NotFoundPageProps) {
  return (
    <>
      <PageTitle title="Page not found" />

      <Header cart={cart} />

      <main className="page-status">
        <h1 className="page-title">Page not found</h1>
        <div className="page-status-detail">
          The page you're looking for doesn't exist or has moved.
        </div>
        <Link className="page-status-link link-primary" to="/">Browse products</Link>
      </main>
    </>
  );
}
