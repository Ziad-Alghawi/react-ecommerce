import axios from 'axios';
import { useState, type ChangeEvent } from 'react';
import { CheckIcon } from './Icons';
import { ButtonSpinner } from './PageStatus';
import { useAction } from '../hooks/useAction';
import type { LoadCart, Product } from '../types/store';
import './AddToCart.css';

// The API accepts 1 to 10 of a product per request
const QUANTITY_CHOICES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const ADDED_MESSAGE_MS = 2000;

interface AddToCartProps {
  product: Product;
  loadCart: LoadCart;
}

export function AddToCart({ product, loadCart }: AddToCartProps) {
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
    <>
      <div className="added-to-cart"
        style={{ opacity: showAddedMessage ? 1 : 0 }}>
        <CheckIcon />
        Added
      </div>

      <div className="product-actions">
        <select value={quantity} onChange={selectQuantity}
          aria-label={`Quantity of ${product.name}`}
          data-testid="quantity-select-selector">
          {QUANTITY_CHOICES.map((choice) => (
            <option key={choice} value={choice}>{choice}</option>
          ))}
        </select>

        <button className="add-to-cart-button button-primary"
          data-testid="add-to-cart-button"
          disabled={isAdding}
          aria-busy={isAdding}
          onClick={addToCart}>
          {isAdding && <ButtonSpinner />}
          Add to Cart
        </button>
      </div>
    </>
  );
}
