import { Product } from "./Product";
import type { LoadCart, Product as ProductType } from "../../types/store";

interface ProductsGridProps {
  products: ProductType[];
  loadCart: LoadCart;
}

export function ProductsGrid({ products, loadCart }: ProductsGridProps) {
  


  return (
    <div className="products-grid">
      {products.map((product) => {

        return (
          <Product key={product.id} product={product} loadCart={loadCart} />
          
        )
      })}

    </div>
  );
}