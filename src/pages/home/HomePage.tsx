import axios from 'axios';
import { useSearchParams } from 'react-router';
import { useEffect, useState } from 'react';
import { Header } from '../../components/Header';
import { ProductsGrid } from './ProductsGrid';
import type { CartItem, LoadCart, Product } from '../../types/store';
import './HomePage.css';

interface HomePageProps {
  cart: CartItem[];
  loadCart: LoadCart;
}

export function HomePage({ cart, loadCart }: HomePageProps) {
  const [products, setProducts] = useState<Product[]>([]);
  // Stays false until the first response, so the empty message never flashes while loading
  const [hasLoaded, setHasLoaded] = useState(false);
  // Get the search query from the URL parameters
  const [searchParams] = useSearchParams();
  // Extract the search query from the URL parameters//Get word from URL.
  const search = searchParams.get('search');

  useEffect(() => {
    const getHomeData = async () => {
    //If word exists → load filtered products // If not  load all products 
      const urlPath = search 
      ? `/api/products?search=${encodeURIComponent(search)}`
      : '/api/products';

      const response = await axios.get<Product[]>(urlPath);
    setProducts(response.data);
    setHasLoaded(true);

    }
    getHomeData();
    //When search in URL changes reload products
  }, [search]);

  return (
    <>

      <link rel="icon" href="/home-favicon.png" />
      <title>Ecommerce-project</title>
      <Header cart={cart} />

      <div className="home-page">
        {hasLoaded && products.length === 0 ? (
          <div className="no-products-message" data-testid="no-products-message">
            {search ? `No products found for "${search}"` : 'No products available'}
          </div>
        ) : (
          <ProductsGrid products={products} loadCart={loadCart} />
        )}
      </div>
    </>

  );
}