import { useContext, useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router';
import { Header } from '../components/Header';
import { PageTitle } from '../components/PageTitle';
import { ButtonSpinner } from '../components/PageStatus';
import { AuthContext } from '../hooks/useAuth';
import { useAction } from '../hooks/useAction';
import { loadSupabase } from '../utils/supabase';
import type { CartItem } from '../types/store';
import './LoginPage.css';

interface LoginPageProps {
  cart: CartItem[];
}

export function LoginPage({ cart }: LoginPageProps) {
  const auth = useContext(AuthContext);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isAwaitingConfirmation, setIsAwaitingConfirmation] = useState(false);

  // Start downloading Supabase while the user types
  useEffect(() => {
    loadSupabase().catch(() => {});
  }, []);

  const [submit, isPending] = useAction(async () => {
    setError(null);
    const supabase = await loadSupabase().catch(() => null);
    if (!supabase) {
      setError("We couldn't reach the login service. Check your connection and try again.");
      return;
    }

    const credentials = { email, password };
    const { data, error } = isSignUp
      // The link in the confirmation email comes back to this site
      ? await supabase.auth.signUp({ ...credentials, options: { emailRedirectTo: window.location.origin } })
      : await supabase.auth.signInWithPassword(credentials);

    if (error) {
      setError(error.message);
    } else if (!data.session) {
      setIsAwaitingConfirmation(true);
    }
  });

  const submitForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit();
  };

  const switchMode = () => {
    setIsSignUp(!isSignUp);
    setError(null);
  };

  if (auth?.user) {
    return <Navigate to="/" replace />;
  }

  const title = isSignUp ? 'Create your account' : 'Log in';

  return (
    <>
      <PageTitle title={title} />

      <Header cart={cart} />

      <main className="login-page page">
        {isAwaitingConfirmation ? (
          <div className="login-card card" role="status" data-testid="login-confirmation">
            <h1 className="page-title">Check your email</h1>
            <p className="login-text">
              We sent a link to <strong>{email}</strong>. Open it to confirm your account and log in.
            </p>
          </div>
        ) : (
          <form className="login-card card" onSubmit={submitForm}>
            <h1 className="page-title">{title}</h1>
            <p className="login-text">
              Your cart and orders are saved to your account, so they follow you to any device.
            </p>

            <label className="login-field">
              Email
              <input type="email" required autoComplete="email" value={email}
                onChange={(event) => setEmail(event.target.value)}
                data-testid="login-email-input" />
            </label>

            <label className="login-field">
              Password
              <input type="password" required minLength={6}
                autoComplete={isSignUp ? 'new-password' : 'current-password'} value={password}
                onChange={(event) => setPassword(event.target.value)}
                data-testid="login-password-input" />
            </label>

            {error && <div className="login-error" role="alert" data-testid="login-error">{error}</div>}

            <button className="login-submit button-primary" type="submit" disabled={isPending}
              data-testid="login-submit-button">
              {isPending && <ButtonSpinner />}
              {isSignUp ? 'Sign up' : 'Log in'}
            </button>

            <div className="login-switch">
              {isSignUp ? 'Already have an account?' : 'New here?'}{' '}
              <button className="link-primary link-button" type="button" onClick={switchMode}
                data-testid="login-switch-button">
                {isSignUp ? 'Log in' : 'Create an account'}
              </button>
            </div>
          </form>
        )}
      </main>
    </>
  );
}
