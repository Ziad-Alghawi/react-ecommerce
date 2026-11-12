import { useState, type ChangeEvent, type KeyboardEvent } from 'react';
import axios from 'axios';
import { formatMoney } from '../../utils/money';
import { ButtonSpinner } from '../../components/PageStatus';
import { useAction } from '../../hooks/useAction';
import { useToast } from '../../hooks/useToast';
import { describeStock } from '../../utils/stock';
import type { CartItem, LoadCart } from '../../types/store';

interface CartItemDetailsProps {
  cartItem: CartItem;
  deleteCartItem: () => Promise<void>;
  loadCart: LoadCart;
}

export function CartItemDetails({ cartItem, deleteCartItem, loadCart }: CartItemDetailsProps) {
  const [isUpdatingQuantity, setIsUpdatingQuantity] = useState(false);
  const [quantity, setQuantity] = useState(String(cartItem.quantity));
  const showToast = useToast();

  const [saveQuantity, isSavingQuantity] = useAction(async () => {
    await axios.put(`/api/cart-items/${cartItem.productId}`, {
      quantity: Number(quantity)
    });
    await loadCart();
    setIsUpdatingQuantity(false);
    showToast('Quantity updated');
  });
  const [removeCartItem, isDeleting] = useAction(deleteCartItem);
  // Don't let the user change an item while it's being saved or deleted
  const isBusy = isSavingQuantity || isDeleting;

  const cancelQuantityUpdate = () => {
    setQuantity(String(cartItem.quantity));
    setIsUpdatingQuantity(false);
  };

  const updateQuantity = () => {
    if (!isUpdatingQuantity) {
      setIsUpdatingQuantity(true);
      return;
    }

    const newQuantity = Number(quantity);
    // The API rejects anything else, so go back to the current quantity
    if (!Number.isInteger(newQuantity) || newQuantity < 1) {
      cancelQuantityUpdate();
      return;
    }
    saveQuantity();
  };

  const updateQuantityInput = (event: ChangeEvent<HTMLInputElement>) => {
    setQuantity(event.target.value);
  };

  const handleQuantityKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      updateQuantity();
    } else if (event.key === 'Escape') {
      cancelQuantityUpdate();
    }
  };

  return (
    <>
      <img className="product-thumbnail"
        src={cartItem.product.image} alt={cartItem.product.name}
        width="480" height="480"
        data-testid="cart-item-image" />

      <div className="cart-item-details">
        <div className="product-name"
          data-testid="cart-item-name">
          {cartItem.product.name}
        </div>
        <div className="product-price"
          data-testid="cart-item-price">
          {formatMoney(cartItem.product.priceCents)}
        </div>
        {cartItem.quantity > cartItem.product.stock && (
          <div className="stock-note" data-testid="cart-item-stock-warning">
            {describeStock(cartItem.product.stock)}
          </div>
        )}
        <div className="product-quantity">
          <span data-testid="cart-item-quantity">
            Quantity: {isUpdatingQuantity
              ? <input type="text" className="quantity-textbox" value={quantity}
                aria-label="New quantity" inputMode="numeric"
                onChange={updateQuantityInput}
                onKeyDown={handleQuantityKeyDown} />
              : <span className="quantity-label">{cartItem.quantity}</span>
            }
          </span>
          <button className="update-quantity-link link-primary link-button"
            data-testid="cart-item-update-quantity-link"
            disabled={isBusy}
            aria-busy={isSavingQuantity}
            onClick={updateQuantity}>
            {isSavingQuantity && <ButtonSpinner />}
            Update
          </button>
          <button className="delete-quantity-link link-primary link-button"
            data-testid="cart-item-delete-quantity-link"
            disabled={isBusy}
            aria-busy={isDeleting}
            onClick={removeCartItem}>
            {isDeleting && <ButtonSpinner />}
            Delete
          </button>
        </div>
      </div>
    </>
  );
}
