import axios from 'axios';
import { useSearchParams } from 'react-router';
import { useEffect, useState } from 'react';
import { Header } from '../../components/Header';
import { ProductsGrid } from './ProductsGrid';
import './HomePage.css';

export function HomePage({cart, loadCart}) {
  const [products, setProducts] = useState([]);
  // Get the search query from the URL parameters
  const [searchParams] = useSearchParams();
  // Extract the search query from the URL parameters//Get word from URL.
  const search = searchParams.get('search');

  useEffect(() => {
    const getHomeData = async () => {
    //If word exists → load filtered products // If not  load all products 
      const urlPath = search 
      ? `/api/products/search=${search}` 
      : '/api/products';

      const response = await axios.get(urlPath);
    setProducts(response.data);

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
        <ProductsGrid products={products} loadCart={loadCart} />
      </div>
    </>

  );
}