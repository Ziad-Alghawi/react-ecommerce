import { Link } from 'react-router';
import { getCartQuantity } from '../../utils/cart';
import type { CartItem } from '../../types/store';
import { LockIcon } from '../../components/Icons';
import Logo from '../../assets/images/logo.webp';
import MobileLogo from '../../assets/images/mobile-logo.png';
import './CheckoutHeader.css';

interface CheckoutHeaderProps {
  cart: CartItem[];
}

export function CheckoutHeader({ cart }: CheckoutHeaderProps) {
  const cartQuantity = getCartQuantity(cart);

  return (
    <header className="checkout-header">
      <div className="checkout-header-content" data-testid="checkout-header">
        <Link to="/" className="checkout-header-logo-link">
          <img className="logo" src={Logo} alt="Ziad-Alghawi Store home"
            width="150" height="44" />
          <img className="mobile-logo" src={MobileLogo} alt="Ziad-Alghawi Store home"
            width="26" height="30" />
        </Link>

        <div className="checkout-header-title">
          Checkout (<Link className="link-primary" to="/">
            {cartQuantity} {cartQuantity === 1 ? 'item' : 'items'}
          </Link>)
        </div>

        <div className="checkout-header-secure">
          <LockIcon />
          <span className="checkout-header-secure-text">Secure checkout</span>
        </div>
      </div>
    </header>
  );
}
