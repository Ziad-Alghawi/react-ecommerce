import { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Header } from '../components/Header';
import { PageTitle } from '../components/PageTitle';
import { ButtonSpinner } from '../components/PageStatus';
import { AuthContext } from '../hooks/useAuth';
import { useAuthRequest } from '../hooks/useAuthRequest';
import { useToast } from '../hooks/useToast';
import type { CartItem } from '../types/store';
import './LoginPage.css';

interface ResetPasswordPageProps {
  cart: CartItem[];
}

// The link in a password reset email logs the user in and comes here. A logged in user
// can also come here from their account page to change their password
export function ResetPasswordPage({ cart }: ResetPasswordPageProps) {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const showToast = useToast();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');

  const { submitForm, isPending, error } = useAuthRequest(async (supabase) => {
    if (password !== confirmation) {
      return { error: { message: "The passwords don't match." } };
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) {
      showToast('Your password is changed');
      navigate('/account');
    }
    return { error };
  });

  return (
    <>
      <PageTitle title="Choose a new password" />

      <Header cart={cart} />

      <main className="login-page page">
        {auth?.user ? (
          <form className="login-card card" onSubmit={submitForm}>
            <h1 className="page-title">Choose a new password</h1>
            <p className="login-text">
              For <strong>{auth.user.email}</strong>. You stay logged in on this device.
            </p>

            <label className="form-field">
              New password
              <input type="password" required minLength={6} autoComplete="new-password" value={password}
                onChange={(event) => setPassword(event.target.value)}
                data-testid="reset-password-input" />
            </label>

            <label className="form-field">
              Repeat the new password
              <input type="password" required minLength={6} autoComplete="new-password" value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                data-testid="reset-confirmation-input" />
            </label>

            {error && <div className="login-error" role="alert" data-testid="login-error">{error}</div>}

            <button className="login-submit button-primary" type="submit" disabled={isPending}
              data-testid="reset-submit-button">
              {isPending && <ButtonSpinner />}
              Save password
            </button>
          </form>
        ) : (
          // Without a session the link was already used, has expired or was copied wrong
          <div className="login-card card" data-testid="reset-link-invalid">
            <h1 className="page-title">This link has expired</h1>
            <p className="login-text">
              A link to reset your password works once and expires after an hour. Ask for a new one and use
              it in this browser.
            </p>
            <Link className="login-submit button-primary" to="/forgot-password">Send a new link</Link>
          </div>
        )}
      </main>
    </>
  );
}
