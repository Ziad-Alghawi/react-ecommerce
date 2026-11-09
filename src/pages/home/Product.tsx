import axios from 'axios';
import { useState, type ChangeEvent } from 'react';
import { formatMoney } from '../../utils/money';
import CheckMarkIcon from '../../assets/images/icons/checkmark.png';
import { ButtonSpinner } from '../../components/PageStatus';
import { useAction } from '../../hooks/useAction';
import type { LoadCart, Product as ProductType } from '../../types/store';

// The API accepts 1 to 10 of a product per request
const QUANTITY_CHOICES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const ADDED_MESSAGE_MS = 2000;

interface ProductProps {
  product: ProductType;
  loadCart: LoadCart;
}

export function Product({ product, loadCart }: ProductProps) {
  const [quantity, setQuantity] = useState(1);
  const [showAddedMessage, setShowAddedMessage] = useState(false);

  const [addToCart, isAdding] = useAction(async () => {
    await axios.post('/api/cart-items', {
      productId: product.id,
      quantity
    });
    await loadCart();
    setShowAddedMessage(true);
    setTimeout(() => {
      setShowAddedMessage(false);
    }, ADDED_MESSAGE_MS);
  });

  const selectQuantity = (event: ChangeEvent<HTMLSelectElement>) => {
    setQuantity(Number(event.target.value));
  };

  return (
    <div className="product-container"
      data-testid="product-container">
      <div className="product-image-container">
        <img className="product-image"
          data-testid="product-image"
          src={product.image} />
      </div>

      <div className="product-name limit-text-to-2-lines">
        {product.name}
      </div>

      <div className="product-rating-container">
        <img className="product-rating-stars"
          data-testid="product-rating-stars-image"
          src={`images/ratings/rating-${product.rating.stars * 10}.png`} />
        <div className="product-rating-count link-primary">
          {product.rating.count}
        </div>
      </div>

      <div className="product-price">
        {formatMoney(product.priceCents)}
      </div>

      <div className="product-quantity-container">
        <select value={quantity} onChange={selectQuantity}
          data-testid="quantity-select-selector">
          {QUANTITY_CHOICES.map((choice) => (
            <option key={choice} value={choice}>{choice}</option>
          ))}
        </select>
      </div>

      <div className="product-spacer"></div>

      <div className="added-to-cart"
        style={{ opacity: showAddedMessage ? 1 : 0 }}>
        <img src={CheckMarkIcon} />
        Added
      </div>

      <button className="add-to-cart-button button-primary"
        data-testid="add-to-cart-button"
        disabled={isAdding}
        aria-busy={isAdding}
        onClick={addToCart}>
        {isAdding && <ButtonSpinner />}
        Add to Cart
      </button>
    </div>
  );
}
