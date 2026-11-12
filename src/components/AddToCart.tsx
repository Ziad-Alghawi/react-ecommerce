import axios from 'axios';
import { useState, type ChangeEvent } from 'react';
import { CheckIcon } from './Icons';
import { ButtonSpinner } from './PageStatus';
import { useAction } from '../hooks/useAction';
import { describeStock, LOW_STOCK } from '../utils/stock';
import type { LoadCart, Product } from '../types/store';
import './AddToCart.css';

// The API accepts 1 to 10 of a product per request
const MAX_QUANTITY = 10;
const ADDED_MESSAGE_MS = 2000;

interface AddToCartProps {
  product: Product;
  loadCart: LoadCart;
}

export function AddToCart({ product, loadCart }: AddToCartProps) {
  const [quantity, setQuantity] = useState(1);
  const [showAddedMessage, setShowAddedMessage] = useState(false);
  const isOutOfStock = product.stock === 0;
  const quantityChoices = Array.from({ length: Math.min(MAX_QUANTITY, product.stock) || 1 }, (_, index) => index + 1);

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
    <>
      {product.stock <= LOW_STOCK && (
        <div className={`stock-note${isOutOfStock ? ' stock-note-out' : ''}`} data-testid="stock-note">
          {describeStock(product.stock)}
        </div>
      )}

      <div className="added-to-cart"
        style={{ opacity: showAddedMessage ? 1 : 0 }}>
        <CheckIcon />
        Added
      </div>

      <div className="product-actions">
        <select value={quantity} onChange={selectQuantity} disabled={isOutOfStock}
          aria-label={`Quantity of ${product.name}`}
          data-testid="quantity-select-selector">
          {quantityChoices.map((choice) => (
            <option key={choice} value={choice}>{choice}</option>
          ))}
        </select>

        <button className="add-to-cart-button button-primary"
          data-testid="add-to-cart-button"
          disabled={isAdding || isOutOfStock}
          aria-busy={isAdding}
          onClick={addToCart}>
          {isAdding && <ButtonSpinner />}
          Add to Cart
        </button>
      </div>
    </>
  );
}
