import { Product } from './Product';
import type { LoadCart, Product as ProductType } from '../../types/store';

// Roughly the first row on a wide screen. The rest load as the user scrolls
const EAGER_IMAGE_COUNT = 6;

interface ProductsGridProps {
  products: ProductType[];
  loadCart: LoadCart;
}

export function ProductsGrid({ products, loadCart }: ProductsGridProps) {
  return (
    <div className="products-grid">
      {products.map((product, index) => (
        <Product key={product.id} product={product} loadCart={loadCart}
          lazyLoadImage={index >= EAGER_IMAGE_COUNT} />
      ))}
    </div>
  );
}
