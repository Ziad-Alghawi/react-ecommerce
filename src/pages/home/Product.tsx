import { Link } from 'react-router';
import { formatMoney } from '../../utils/money';
import { AddToCart } from '../../components/AddToCart';
import { ProductRating } from '../../components/Rating';
import type { LoadCart, Product as ProductType } from '../../types/store';

interface ProductProps {
  product: ProductType;
  loadCart: LoadCart;
  lazyLoadImage?: boolean;
}

export function Product({ product, loadCart, lazyLoadImage = false }: ProductProps) {
  const productPath = `/products/${product.id}`;

  return (
    <div className="product-container card"
      data-testid="product-container">
      {/* The name below is the same link, so this one is skipped by keyboard and screen readers */}
      <Link className="product-image-container" to={productPath} tabIndex={-1} aria-hidden="true">
        <img className="product-image"
          data-testid="product-image"
          src={product.image} alt={product.name}
          width="480" height="480" loading={lazyLoadImage ? 'lazy' : 'eager'} />
      </Link>

      <h2 className="product-name limit-text-to-2-lines">
        <Link className="product-link" to={productPath}>{product.name}</Link>
      </h2>

      <ProductRating rating={product.rating} />

      <div className="product-price">
        {formatMoney(product.priceCents)}
      </div>

      <AddToCart product={product} loadCart={loadCart} />
    </div>
  );
}
