import axios from 'axios';
import { useNavigate } from 'react-router';
import { useToast } from './useToast';
import type { LoadCart, Product } from '../types/store';

// Adds a product, reloads the cart and says so, with a link to the cart
export function useAddToCart(loadCart: LoadCart) {
  const showToast = useToast();
  const navigate = useNavigate();

  return async (product: Product, quantity: number) => {
    await axios.post('/api/cart-items', { productId: product.id, quantity });
    await loadCart();
    showToast(`${quantity > 1 ? `${quantity} × ` : ''}${product.name} added to your cart`, {
      action: { label: 'View cart', onClick: () => navigate('/checkout') }
    });
  };
}
