import { it, expect, describe, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import type { User } from '@supabase/supabase-js';
import { AccountPage } from './AccountPage';
import { AuthContext, type Auth } from '../hooks/useAuth';
import { ToastContext } from '../hooks/useToast';

const customer = { id: 'user-id', email: 'ziad@example.com', created_at: new Date(2025, 4, 18).toISOString() } as User;

function CurrentPath() {
  return <div data-testid="current-path">{useLocation().pathname}</div>;
}

function renderAccountPage(auth: Auth, showToast = vi.fn()) {
  return render(
    <MemoryRouter initialEntries={['/account']}>
      <AuthContext value={auth}>
        <ToastContext value={showToast}>
          <AccountPage cart={[]} />
          <CurrentPath />
        </ToastContext>
      </AuthContext>
    </MemoryRouter>
  );
}

describe('AccountPage component', () => {
  it('shows the email, with links to the orders and to change the password', () => {
    renderAccountPage({ user: customer, isAdmin: false, logOut: vi.fn() });

    expect(screen.getByTestId('account-email')).toHaveTextContent('ziad@example.com');
    expect(screen.getByText('May 18, 2025')).toBeInTheDocument();
    expect(screen.getByTestId('account-orders-link')).toHaveAttribute('href', '/orders');
    expect(screen.getByTestId('account-password-link')).toHaveAttribute('href', '/reset-password');
    expect(screen.queryByRole('link', { name: /Manage the store/ })).not.toBeInTheDocument();
  });

  it('links an admin to the admin page', () => {
    renderAccountPage({ user: customer, isAdmin: true, logOut: vi.fn() });

    expect(screen.getByRole('link', { name: /Manage the store/ })).toHaveAttribute('href', '/admin');
  });

  it('logs out and goes to the shop', async () => {
    const logOut = vi.fn(async () => {});
    const showToast = vi.fn();
    renderAccountPage({ user: customer, isAdmin: false, logOut }, showToast);

    await userEvent.setup().click(screen.getByTestId('account-log-out-button'));

    await waitFor(() => expect(screen.getByTestId('current-path')).toHaveTextContent(/^\/$/));
    expect(logOut).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith("You're logged out");
  });

  it('asks a guest to log in', () => {
    renderAccountPage({ user: null, isAdmin: false, logOut: vi.fn() });

    const message = screen.getByTestId('account-login-message');
    expect(message).toHaveTextContent('Log in to see your account');
    expect(within(message).getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
  });
});
