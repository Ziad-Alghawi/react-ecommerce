import axios from 'axios';
import { useSearchParams } from 'react-router';
import { useEffect, useState } from 'react';
import { Header } from '../../components/Header';
import { ErrorMessage, LoadingMessage } from '../../components/PageStatus';
import { ProductsGrid } from './ProductsGrid';
import type { CartItem, LoadCart, Product } from '../../types/store';
import './HomePage.css';

interface HomePageProps {
  cart: CartItem[];
  loadCart: LoadCart;
  onRetry: () => void;
}

export function HomePage({ cart, loadCart, onRetry }: HomePageProps) {
  const [products, setProducts] = useState<Product[]>([]);
  // Stays false until the first response, so the empty message never flashes while loading
  const [hasLoaded, setHasLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [searchParams] = useSearchParams();
  const search = searchParams.get('search');

  useEffect(() => {
    // Set to false when the search changes, so a slow older response can't replace newer results
    let isLatestRequest = true;
    setHasError(false);

    const fetchProducts = async () => {
      const urlPath = search
        ? `/api/products?search=${encodeURIComponent(search)}`
        : '/api/products';

      try {
        const response = await axios.get<Product[]>(urlPath);
        if (!isLatestRequest) {
          return;
        }
        if (!Array.isArray(response.data)) {
          throw new Error('Unexpected products response');
        }
        setProducts(response.data);
        setHasLoaded(true);
      } catch {
        if (isLatestRequest) {
          setHasError(true);
        }
      }
    };
    fetchProducts();

    return () => {
      isLatestRequest = false;
    };
  }, [search]);

  let pageContent = <ProductsGrid products={products} loadCart={loadCart} />;

  if (hasError) {
    pageContent = <ErrorMessage onButtonClick={onRetry} />;
  } else if (!hasLoaded) {
    pageContent = <LoadingMessage />;
  } else if (products.length === 0) {
    pageContent = (
      <div className="page-status" data-testid="no-products-message">
        {search ? `No products found for "${search}"` : 'No products available'}
      </div>
    );
  }

  return (
    <>
      <title>Ecommerce-project</title>
      <link rel="icon" type="image/png" href="/home-favicon.png" />

      <Header cart={cart} />

      <main className="home-page">
        <div className="home-intro">
          <h1 className="home-intro-title">
            {search ? `Results for "${search}"` : 'Everyday essentials, delivered'}
          </h1>
          {!search && (
            <p className="home-intro-text">
              Home, kitchen and wardrobe basics, with a free delivery option on every order.
            </p>
          )}
        </div>

        {pageContent}
      </main>
    </>
  );
}
