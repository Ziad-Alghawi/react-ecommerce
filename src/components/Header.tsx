import { NavLink, useNavigate, useSearchParams } from 'react-router';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { getCartQuantity } from '../utils/cart';
import type { CartItem } from '../types/store';
import { CartIcon, SearchIcon } from './Icons';
import LogoWhite from '../assets/images/logo-white.webp';
import MobileLogoWhite from '../assets/images/mobile-logo-white.png';
import './Header.css';

interface HeaderProps {
  cart: CartItem[];
}

export function Header({ cart }: HeaderProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const cartQuantity = getCartQuantity(cart);

  const updateSearchInput = (event: ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
  };

  const searchProducts = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate(`/?search=${encodeURIComponent(search)}`);
  };

  return (
    <header className="header">
      <NavLink to="/" className="header-logo-link" onClick={() => setSearch('')}>
        <img className="logo" src={LogoWhite} alt="Ziad-Alghawi Store home"
          width="150" height="44" data-testid="header-logo" />
        <img className="mobile-logo" src={MobileLogoWhite} alt="Ziad-Alghawi Store home"
          width="26" height="30" data-testid="header-mobile-logo" />
      </NavLink>

      <form className="search-form" role="search" onSubmit={searchProducts}>
        <input className="search-bar" type="search" placeholder="Search products"
          aria-label="Search products"
          value={search} onChange={updateSearchInput}
          data-testid="header-search-bar" />

        <button className="search-button" type="submit" aria-label="Search"
          data-testid="header-search-button">
          <SearchIcon />
        </button>
      </form>

      <nav className="header-nav">
        <NavLink className="header-link" to="/orders"
          data-testid="header-orders-link">
          Orders
        </NavLink>

        <NavLink className="header-link" to="/checkout"
          aria-label={`Cart, ${cartQuantity} ${cartQuantity === 1 ? 'item' : 'items'}`}
          data-testid="header-cart-link">
          <span className="cart-icon">
            <CartIcon />
            {cartQuantity > 0 && <span className="cart-badge">{cartQuantity}</span>}
          </span>
          Cart
        </NavLink>
      </nav>
    </header>
  );
}
