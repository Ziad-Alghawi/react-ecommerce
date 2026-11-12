import { it, expect, describe, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import type { User } from '@supabase/supabase-js';
import { ForgotPasswordPage } from './ForgotPasswordPage';
import { ResetPasswordPage } from './ResetPasswordPage';
import { AuthContext } from '../hooks/useAuth';
import { ToastContext } from '../hooks/useToast';
import { loadSupabase } from '../utils/supabase';

const { resetPasswordForEmail, updateUser } = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn()
}));

vi.mock('../utils/supabase', () => ({
  loadSupabase: vi.fn()
}));

function CurrentPath() {
  return <div data-testid="current-path">{useLocation().pathname}</div>;
}

describe('password pages', () => {
  let user: ReturnType<typeof userEvent.setup>;
  let showToast: ReturnType<typeof vi.fn>;

  const renderPage = (page: React.ReactNode, loggedInUser: User | null = null) => render(
    <MemoryRouter>
      <AuthContext value={{ user: loggedInUser, isAdmin: false, logOut: vi.fn() }}>
        <ToastContext value={showToast}>
          {page}
          <CurrentPath />
        </ToastContext>
      </AuthContext>
    </MemoryRouter>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadSupabase).mockResolvedValue({ auth: { resetPasswordForEmail, updateUser } } as never);
    showToast = vi.fn();
    user = userEvent.setup();
  });

  describe('ForgotPasswordPage', () => {
    it('emails a link that comes back to the reset page', async () => {
      resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
      renderPage(<ForgotPasswordPage cart={[]} />);

      await user.type(screen.getByTestId('forgot-email-input'), 'ziad@example.com');
      await user.click(screen.getByTestId('forgot-submit-button'));

      expect(resetPasswordForEmail).toHaveBeenCalledWith('ziad@example.com', {
        redirectTo: `${window.location.origin}/reset-password`
      });
      expect(await screen.findByTestId('reset-email-sent')).toHaveTextContent('ziad@example.com');
    });

    it('shows why the email could not be sent', async () => {
      resetPasswordForEmail.mockResolvedValue({ data: null, error: { message: 'Email rate limit exceeded' } });
      renderPage(<ForgotPasswordPage cart={[]} />);

      await user.type(screen.getByTestId('forgot-email-input'), 'ziad@example.com');
      await user.click(screen.getByTestId('forgot-submit-button'));

      expect(await screen.findByTestId('login-error')).toHaveTextContent('Email rate limit exceeded');
      expect(screen.queryByTestId('reset-email-sent')).not.toBeInTheDocument();
    });

    it('says so when the login service cannot be downloaded', async () => {
      vi.mocked(loadSupabase).mockRejectedValue(new Error('Offline'));
      renderPage(<ForgotPasswordPage cart={[]} />);

      await user.type(screen.getByTestId('forgot-email-input'), 'ziad@example.com');
      await user.click(screen.getByTestId('forgot-submit-button'));

      expect(await screen.findByTestId('login-error')).toHaveTextContent("couldn't reach the login service");
    });
  });

  describe('ResetPasswordPage', () => {
    const recoveredUser = { id: 'user-id', email: 'ziad@example.com' } as User;

    const fillIn = async (password: string, confirmation = password) => {
      await user.type(screen.getByTestId('reset-password-input'), password);
      await user.type(screen.getByTestId('reset-confirmation-input'), confirmation);
      await user.click(screen.getByTestId('reset-submit-button'));
    };

    it('saves the new password and goes to the account page', async () => {
      updateUser.mockResolvedValue({ data: { user: recoveredUser }, error: null });
      renderPage(<ResetPasswordPage cart={[]} />, recoveredUser);

      expect(screen.getByRole('heading')).toHaveTextContent('Choose a new password');
      await fillIn('new-secret');

      await waitFor(() => expect(screen.getByTestId('current-path')).toHaveTextContent('/account'));
      expect(updateUser).toHaveBeenCalledWith({ password: 'new-secret' });
      expect(showToast).toHaveBeenCalledWith('Your password is changed');
    });

    it('asks for the same password twice', async () => {
      renderPage(<ResetPasswordPage cart={[]} />, recoveredUser);

      await fillIn('new-secret', 'new-secrets');

      expect(await screen.findByTestId('login-error')).toHaveTextContent("The passwords don't match.");
      expect(updateUser).not.toHaveBeenCalled();
    });

    it('shows why Supabase refused the password', async () => {
      updateUser.mockResolvedValue({
        data: { user: null }, error: { message: 'New password should be different from the old password.' }
      });
      renderPage(<ResetPasswordPage cart={[]} />, recoveredUser);

      await fillIn('old-secret');

      expect(await screen.findByTestId('login-error')).toHaveTextContent('should be different from the old password');
      expect(screen.getByTestId('current-path')).toHaveTextContent(/^\/$/);
    });

    it('offers a new link when this one has expired or was already used', () => {
      renderPage(<ResetPasswordPage cart={[]} />);

      expect(screen.getByTestId('reset-link-invalid')).toHaveTextContent('This link has expired');
      expect(screen.getByRole('link', { name: 'Send a new link' })).toHaveAttribute('href', '/forgot-password');
      expect(screen.queryByTestId('reset-password-input')).not.toBeInTheDocument();
    });
  });
});
