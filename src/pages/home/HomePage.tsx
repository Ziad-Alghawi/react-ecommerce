import axios from 'axios';
import { useSearchParams } from 'react-router';
import { useEffect, useState } from 'react';
import { Header } from '../../components/Header';
import { PageTitle } from '../../components/PageTitle';
import { ErrorMessage, LoadingMessage } from '../../components/PageStatus';
import { ProductsGrid } from './ProductsGrid';
import { ProductFilters } from './ProductFilters';
import { getProductsUrl, readProductFilters } from '../../utils/productFilters';
import type { CartItem, LoadCart, Product } from '../../types/store';
import './HomePage.css';

interface HomePageProps {
  cart: CartItem[];
  loadCart: LoadCart;
  onRetry: () => void;
}

export function HomePage({ cart, loadCart, onRetry }: HomePageProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  // Stays false until the first response, so the empty message never flashes while loading
  const [hasLoaded, setHasLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [searchParams] = useSearchParams();
  const filters = readProductFilters(searchParams);
  const { search, category } = filters;
  const productsUrl = getProductsUrl(filters);

  useEffect(() => {
    axios.get<string[]>('/api/products/categories')
      .then(({ data }) => setCategories(Array.isArray(data) ? data : []))
      // The shop still works without the category links
      .catch(() => {});
  }, []);

  useEffect(() => {
    // Set to false when the filters change, so a slow older response can't replace newer results
    let isLatestRequest = true;
    setHasError(false);

    const fetchProducts = async () => {
      try {
        const response = await axios.get<Product[]>(productsUrl);
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
  }, [productsUrl]);

  const title = search ? `Results for "${search}"` : category || undefined;
  let pageContent = <ProductsGrid products={products} loadCart={loadCart} />;

  if (hasError) {
    pageContent = <ErrorMessage onButtonClick={onRetry} />;
  } else if (!hasLoaded) {
    pageContent = <LoadingMessage />;
  } else if (products.length === 0) {
    const hasFilters = Boolean(category || filters.minPrice || filters.maxPrice);
    pageContent = (
      <div className="page-status" data-testid="no-products-message">
        {search ? `No products found for "${search}"` : hasFilters ? 'No products match these filters' : 'No products available'}
      </div>
    );
  }

  return (
    <>
      <PageTitle title={title} />

      <Header cart={cart} />

      <main className="home-page page">
        <div className="home-intro">
          <h1 className="page-title">
            {title ?? 'Everyday essentials, delivered'}
          </h1>
          {!title && (
            <p className="home-intro-text">
              Home, kitchen and wardrobe basics, with a free delivery option on every order.
            </p>
          )}
        </div>

        {!hasError && (
          <ProductFilters categories={categories} filters={filters}
            productCount={hasLoaded ? products.length : null} />
        )}

        {pageContent}
      </main>
    </>
  );
}
