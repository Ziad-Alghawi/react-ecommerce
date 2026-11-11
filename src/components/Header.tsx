import { NavLink, useNavigate, useSearchParams } from 'react-router';
import { useContext, useState, type ChangeEvent, type FormEvent } from 'react';
import { getCartQuantity } from '../utils/cart';
import { AuthContext } from '../hooks/useAuth';
import type { CartItem } from '../types/store';
import { CartIcon, SearchIcon, UserIcon } from './Icons';
import { Logo } from './Logo';
import './Header.css';

interface HeaderProps {
  cart: CartItem[];
}

export function Header({ cart }: HeaderProps) {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
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
        <Logo white />
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

        {auth?.user ? (
          <button className="header-link" type="button" onClick={auth.logOut}
            aria-label={`Log out of ${auth.user.email}`}
            data-testid="header-log-out-button">
            <UserIcon className="header-link-icon" />
            <span className="header-account">
              <span className="header-account-email">{auth.user.email}</span>
              Log out
            </span>
          </button>
        ) : auth && (
          <NavLink className="header-link" to="/login" data-testid="header-login-link">
            <UserIcon className="header-link-icon" />
            Log in
          </NavLink>
        )}

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
