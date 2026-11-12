import { it, expect, describe, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import type { User } from '@supabase/supabase-js';
import { LoginPage } from './LoginPage';
import { AuthContext } from '../hooks/useAuth';
import { loadSupabase } from '../utils/supabase';

const { signInWithPassword, signUp } = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn()
}));

vi.mock('../utils/supabase', () => ({
  loadSupabase: vi.fn()
}));

const session = { access_token: 'token' };

function CurrentPath() {
  return <div data-testid="current-path">{useLocation().pathname}</div>;
}

function renderLoginPage(user: User | null = null) {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthContext value={{ user, logOut: vi.fn() }}>
        <LoginPage cart={[]} />
        <CurrentPath />
      </AuthContext>
    </MemoryRouter>
  );
}

describe('LoginPage component', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadSupabase).mockResolvedValue({ auth: { signInWithPassword, signUp } } as never);
    user = userEvent.setup();
  });

  const fillIn = async () => {
    await user.type(screen.getByTestId('login-email-input'), 'ziad@example.com');
    await user.type(screen.getByTestId('login-password-input'), 'secret123');
  };

  it('logs in with email and password', async () => {
    signInWithPassword.mockResolvedValue({ data: { session }, error: null } as never);
    renderLoginPage();

    await fillIn();
    await user.click(screen.getByTestId('login-submit-button'));

    expect(signInWithPassword).toHaveBeenCalledWith({ email: 'ziad@example.com', password: 'secret123' });
    expect(screen.queryByTestId('login-error')).not.toBeInTheDocument();
  });

  it('shows why logging in failed', async () => {
    signInWithPassword.mockResolvedValue({
      data: { session: null }, error: { message: 'Invalid login credentials' }
    } as never);
    renderLoginPage();

    await fillIn();
    await user.click(screen.getByTestId('login-submit-button'));

    expect(await screen.findByTestId('login-error')).toHaveTextContent('Invalid login credentials');
    expect(screen.getByTestId('login-submit-button')).toBeEnabled();
  });

  it('asks to confirm the email after signing up', async () => {
    signUp.mockResolvedValue({ data: { session: null }, error: null } as never);
    renderLoginPage();

    await user.click(screen.getByTestId('login-switch-button'));
    expect(screen.getByRole('heading')).toHaveTextContent('Create your account');

    await fillIn();
    await user.click(screen.getByTestId('login-submit-button'));

    expect(signUp).toHaveBeenCalledWith({
      email: 'ziad@example.com',
      password: 'secret123',
      options: { emailRedirectTo: window.location.origin }
    });
    expect(signInWithPassword).not.toHaveBeenCalled();
    expect(await screen.findByTestId('login-confirmation')).toHaveTextContent('ziad@example.com');
  });

  it('says so when the login service cannot be downloaded', async () => {
    vi.mocked(loadSupabase).mockRejectedValue(new Error('Offline'));
    renderLoginPage();

    await fillIn();
    await user.click(screen.getByTestId('login-submit-button'));

    expect(await screen.findByTestId('login-error')).toHaveTextContent("couldn't reach the login service");
    expect(screen.getByTestId('login-submit-button')).toBeEnabled();
  });

  it('links to resetting a forgotten password, only when logging in', async () => {
    renderLoginPage();

    expect(screen.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute('href', '/forgot-password');

    await user.click(screen.getByTestId('login-switch-button'));
    expect(screen.queryByRole('link', { name: 'Forgot password?' })).not.toBeInTheDocument();
  });

  it('sends a logged in user to the home page', () => {
    renderLoginPage({ email: 'ziad@example.com' } as User);

    expect(screen.getByTestId('current-path')).toHaveTextContent(/^\/$/);
  });
});
