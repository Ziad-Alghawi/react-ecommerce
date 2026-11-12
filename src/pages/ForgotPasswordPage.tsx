import { useState } from 'react';
import { Link } from 'react-router';
import { Header } from '../components/Header';
import { PageTitle } from '../components/PageTitle';
import { ButtonSpinner } from '../components/PageStatus';
import { useAuthRequest } from '../hooks/useAuthRequest';
import type { CartItem } from '../types/store';
import './LoginPage.css';

interface ForgotPasswordPageProps {
  cart: CartItem[];
}

export function ForgotPasswordPage({ cart }: ForgotPasswordPageProps) {
  const [email, setEmail] = useState('');
  const [isSent, setIsSent] = useState(false);

  const { submitForm, isPending, error } = useAuthRequest(async (supabase) => {
    // The link in the email logs the user in on this site, to the page where they choose a new password
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    setIsSent(!error);
    return { error };
  });

  return (
    <>
      <PageTitle title="Reset your password" />

      <Header cart={cart} />

      <main className="login-page page">
        {isSent ? (
          <div className="login-card card" role="status" data-testid="reset-email-sent">
            <h1 className="page-title">Check your email</h1>
            <p className="login-text">
              If <strong>{email}</strong> has an account, we sent it a link to choose a new password.
              The link works once and expires after an hour.
            </p>
            <Link className="link-primary" to="/login">Back to log in</Link>
          </div>
        ) : (
          <form className="login-card card" onSubmit={submitForm}>
            <h1 className="page-title">Reset your password</h1>
            <p className="login-text">
              Enter the email you log in with, and we'll send you a link to choose a new password.
            </p>

            <label className="form-field">
              Email
              <input type="email" required autoComplete="email" value={email}
                onChange={(event) => setEmail(event.target.value)}
                data-testid="forgot-email-input" />
            </label>

            {error && <div className="login-error" role="alert" data-testid="login-error">{error}</div>}

            <button className="login-submit button-primary" type="submit" disabled={isPending}
              data-testid="forgot-submit-button">
              {isPending && <ButtonSpinner />}
              Send link
            </button>

            <div className="login-switch">
              Remembered it? <Link className="link-primary" to="/login">Log in</Link>
            </div>
          </form>
        )}
      </main>
    </>
  );
}
