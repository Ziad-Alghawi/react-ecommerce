import { useContext } from 'react';
import { Link, useNavigate } from 'react-router';
import { Header } from '../components/Header';
import { PageTitle } from '../components/PageTitle';
import { AuthContext } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { formatDate } from '../utils/date';
import type { CartItem } from '../types/store';
import './AccountPage.css';

interface AccountPageProps {
  cart: CartItem[];
}

export function AccountPage({ cart }: AccountPageProps) {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const showToast = useToast();
  const user = auth?.user;

  const logOut = async () => {
    await auth?.logOut();
    showToast("You're logged out");
    navigate('/');
  };

  return (
    <>
      <PageTitle title="Your account" />

      <Header cart={cart} />

      <main className="account-page page">
        {user ? (
          <>
            <h1 className="page-title">Your account</h1>

            <section className="account-card card" aria-labelledby="account-details-title">
              <h2 id="account-details-title" className="account-card-title">Login details</h2>
              <dl className="account-details">
                <div>
                  <dt>Email</dt>
                  <dd data-testid="account-email">{user.email}</dd>
                </div>
                <div>
                  <dt>Customer since</dt>
                  <dd>{formatDate(user.created_at)}</dd>
                </div>
              </dl>
            </section>

            <nav className="account-links" aria-label="Your account">
              <Link className="account-link card" to="/orders" data-testid="account-orders-link">
                <span className="account-link-title">Your orders</span>
                <span className="account-link-text">Track packages, buy again or review what you bought</span>
              </Link>
              <Link className="account-link card" to="/reset-password" data-testid="account-password-link">
                <span className="account-link-title">Change password</span>
                <span className="account-link-text">Choose a new password for this account</span>
              </Link>
              {auth.isAdmin && (
                <Link className="account-link card" to="/admin">
                  <span className="account-link-title">Manage the store</span>
                  <span className="account-link-text">Products, stock and coupons</span>
                </Link>
              )}
            </nav>

            <button className="button-secondary" type="button" onClick={logOut} data-testid="account-log-out-button">
              Log out
            </button>
          </>
        ) : (
          <div className="page-status" data-testid="account-login-message">
            <div>Log in to see your account</div>
            <Link className="page-status-link link-primary" to="/login">Log in</Link>
          </div>
        )}
      </main>
    </>
  );
}
