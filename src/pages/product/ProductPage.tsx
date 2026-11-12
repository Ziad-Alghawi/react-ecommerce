import axios from 'axios';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Header } from '../../components/Header';
import { PageTitle } from '../../components/PageTitle';
import { ErrorMessage, LoadingMessage } from '../../components/PageStatus';
import { AddToCart } from '../../components/AddToCart';
import { ProductRating } from '../../components/Rating';
import { Reviews } from './Reviews';
import { formatMoney } from '../../utils/money';
import type { CartItem, LoadCart, Product } from '../../types/store';
import './ProductPage.css';

async function fetchProduct(productId: string | undefined) {
  const response = await axios.get<Product>(`/api/products/${productId}`);
  if (typeof response.data?.id !== 'string') {
    throw new Error('Unexpected product response');
  }
  return response.data;
}

interface ProductPageProps {
  cart: CartItem[];
  loadCart: LoadCart;
  onRetry: () => void;
}

export function ProductPage({ cart, loadCart, onRetry }: ProductPageProps) {
  const { productId } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    fetchProduct(productId).then(setProduct, (error) => {
      // Trying again can't help when the product doesn't exist
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        setIsNotFound(true);
      } else {
        setHasError(true);
      }
    });
  }, [productId]);

  let pageContent = <LoadingMessage />;

  if (product) {
    pageContent = (
      <>
        <article className="product-details card">
          <div className="product-details-image-container">
            <img className="product-details-image" src={product.image} alt={product.name}
              width="480" height="480" />
          </div>

          <div className="product-details-info">
            {product.category && (
              <Link className="product-details-category link-primary"
                to={`/?${new URLSearchParams({ category: product.category })}`}
                data-testid="product-category-link">
                {product.category}
              </Link>
            )}
            <h1 className="page-title">{product.name}</h1>
            <ProductRating rating={product.rating} />
            <div className="product-details-price" data-testid="product-price">
              {formatMoney(product.priceCents)}
            </div>

            {product.deletedAt ? (
              <div className="product-details-unavailable" data-testid="product-unavailable">
                No longer available
              </div>
            ) : (
              <AddToCart product={product} loadCart={loadCart} />
            )}
          </div>
        </article>

        <Reviews productId={product.id} onReviewsChange={async () => setProduct(await fetchProduct(productId))} />
      </>
    );
  } else if (hasError) {
    pageContent = <ErrorMessage onButtonClick={onRetry} />;
  } else if (isNotFound) {
    pageContent = (
      <div className="page-status" data-testid="product-not-found">
        <div>We couldn't find this product</div>
        <Link className="page-status-link link-primary" to="/">Browse products</Link>
      </div>
    );
  }

  return (
    <>
      <PageTitle title={product?.name ?? 'Product'} />

      <Header cart={cart} />

      <main className="product-page page">
        {pageContent}
      </main>
    </>
  );
}
