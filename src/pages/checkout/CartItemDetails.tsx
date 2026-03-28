import { useState, type ChangeEvent, type KeyboardEvent } from "react";
import axios from "axios";
import { formatMoney } from "../../utils/money";
import type { CartItem, LoadCart } from "../../types/store";

interface CartItemDetailsProps {
  cartItem: CartItem;
  deleteCartItem: () => Promise<void>;
  loadCart: LoadCart;
}

export function CartItemDetails({ cartItem, deleteCartItem, loadCart }: CartItemDetailsProps) {
  // we update the quantity by making update is interactive then also we update by pressing enter key 
  const [isUpdatingQuantity, setIsUpdatingQuantity] = useState(false);
  const [quantity, setQuantity] = useState(String(cartItem.quantity));

  const updateQuantity = async () => {
    if (isUpdatingQuantity) {
      await axios.put(`/api/cart-items/${cartItem.productId}`, {
        quantity: Number(quantity)
      });
      await loadCart();
      setIsUpdatingQuantity(false);
    } else {
      setIsUpdatingQuantity(true);
    }
  };

  const updateQuantityInput = (event: ChangeEvent<HTMLInputElement>) => {
    setQuantity(event.target.value);
  }

const handleQuantityKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
  const keyPressed = event.key;
  if (keyPressed === 'Enter') {
    updateQuantity();
  } else if (keyPressed === 'Escape') {
    setQuantity(String(cartItem.quantity));
    setIsUpdatingQuantity(false);
    
  }
};

  return (
    <>
      <img className="product-image"
        src={cartItem.product.image} 
        data-testid="cart-item-image"/>

      <div className="cart-item-details">
        <div className="product-name" 
          data-testid="cart-item-name">
          {cartItem.product.name}
        </div>
        <div className="product-price" 
          data-testid="cart-item-price">
          {formatMoney(cartItem.product.priceCents)}
        </div>
        <div className="product-quantity">
          <span data-testid="cart-item-quantity">
            

            Quantity:{isUpdatingQuantity
              ? <input type="text" className="quantity-textbox" value={quantity} 
              onChange={updateQuantityInput} 
              onKeyDown={handleQuantityKeyDown}/>
              : <span className="quantity-label">{cartItem.quantity}</span>
            }


          </span>
          <span className="update-quantity-link link-primary"
            onClick={updateQuantity} >
            Update
          </span>
          <span className="delete-quantity-link link-primary"
            data-testid="cart-item-delete-quantity-link"
            onClick={deleteCartItem}>
            Delete
          </span>
        </div>
      </div>
    </>
  );
}
