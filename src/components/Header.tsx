import { NavLink, useNavigate, useSearchParams } from 'react-router';
import { useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { getCartQuantity } from '../utils/cart';
import type { CartItem } from '../types/store';
import LogoWhite from '../assets/images/logo-white.png';
import MobileLogoWhite from '../assets/images/mobile-logo-white.png';
import CartIcon from '../assets/images/icons/cart-icon.png';
import SearchIcon from '../assets/images/icons/search-icon.png';
import './Header.css';

interface HeaderProps {
  cart: CartItem[];
}

export function Header({ cart }: HeaderProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');

  const updateSearchInput = (event: ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
  };

  const searchProducts = () => {
    navigate(`/?search=${encodeURIComponent(search)}`);
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      searchProducts();
    }
  };

  return (
    <div className="header">
      <div className="left-section">
        <NavLink to="/" className="header-link" onClick={() => setSearch('')}>
          <img className="logo"
            src={LogoWhite}
            data-testid="header-logo" />
          <img className="mobile-logo"
            src={MobileLogoWhite}
            data-testid="header-mobile-logo" />
        </NavLink>
      </div>

      <div className="middle-section">
        <input className="search-bar" type="text" placeholder="Search"
          value={search} onChange={updateSearchInput} onKeyDown={handleSearchKeyDown}
          data-testid="header-search-bar" />

        <button className="search-button"
          onClick={searchProducts}
          data-testid="header-search-button">
          <img className="search-icon" src={SearchIcon} />
        </button>
      </div>

      <div className="right-section">
        <NavLink className="orders-link header-link" to="/orders"
          data-testid="header-orders-link">
          <span className="orders-text">Orders</span>
        </NavLink>

        <NavLink className="cart-link header-link" to="/checkout"
          data-testid="header-cart-link">
          <img className="cart-icon" src={CartIcon} />
          <div className="cart-quantity">{getCartQuantity(cart)}</div>
          <div className="cart-text">Cart</div>
        </NavLink>
      </div>
    </div>
  );
}
