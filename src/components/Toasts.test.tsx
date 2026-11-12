import { it, expect, describe, vi, afterEach } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toasts } from './Toasts';
import { ToastContext, useToast, useToasts, type ShowToast } from '../hooks/useToast';

let showToast: ShowToast;

function CaptureShowToast() {
  showToast = useToast();
  return null;
}

function ToastHost() {
  const { toasts, showToast, dismissToast } = useToasts();
  return (
    <ToastContext value={showToast}>
      <CaptureShowToast />
      <Toasts toasts={toasts} onDismiss={dismissToast} />
    </ToastContext>
  );
}

describe('Toasts', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps both live regions on the page before any toast, so screen readers announce them', () => {
    render(<ToastHost />);

    expect(screen.getByRole('status', { name: 'Notifications' })).toBeEmptyDOMElement();
    expect(screen.getByRole('alert', { name: 'Errors' })).toBeEmptyDOMElement();
  });

  it('shows a confirmation for a few seconds', () => {
    vi.useFakeTimers();
    render(<ToastHost />);

    act(() => showToast('Added to cart'));
    expect(within(screen.getByRole('status', { name: 'Notifications' })).getByTestId('toast')).toHaveTextContent('Added to cart');

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByTestId('toast')).not.toBeInTheDocument();
  });

  it('keeps an error until it is closed, showing only the latest one', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ToastHost />);

    act(() => showToast('First problem', { isError: true }));
    act(() => showToast('Second problem', { isError: true }));
    act(() => {
      vi.advanceTimersByTime(60000);
    });

    const toast = within(screen.getByRole('alert', { name: 'Errors' })).getByTestId('toast');
    expect(toast).toHaveTextContent('Second problem');
    expect(screen.queryByText('First problem')).not.toBeInTheDocument();

    await user.click(within(toast).getByRole('button', { name: 'Close' }));
    expect(screen.queryByTestId('toast')).not.toBeInTheDocument();
  });

  it('runs the action and closes the toast', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ToastHost />);

    act(() => showToast('Your change wasn\'t saved', { isError: true, action: { label: 'Try again', onClick } }));
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('toast')).not.toBeInTheDocument();
  });

  it('shows at most 3 toasts, dropping the oldest', () => {
    render(<ToastHost />);

    act(() => ['One', 'Two', 'Three', 'Four'].forEach((message) => showToast(message)));

    expect(screen.getAllByTestId('toast').map((toast) => toast.textContent)).toEqual(['Two', 'Three', 'Four']);
  });
});
