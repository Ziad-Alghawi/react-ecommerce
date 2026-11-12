import { it, expect, describe, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { CouponForm } from './CouponForm';

describe('CouponForm component', () => {
  const originalAdapter = axios.defaults.adapter;
  let api: Record<string, { status?: number; data?: unknown }>;
  let onApply: (code: string) => void;
  let onRemove: () => void;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    api = {
      '/api/coupons/welcome10': { data: { code: 'WELCOME10', percentOff: 10 } },
      '/api/coupons/NOPE': { status: 404, data: { error: "NOPE isn't a valid coupon code." } }
    };
    onApply = vi.fn();
    onRemove = vi.fn();
    user = userEvent.setup();

    axios.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      const { status = 200, data } = api[config.url!] ?? { status: 503 };
      const response = { data, status, statusText: '', headers: {}, config };
      if (status >= 400) {
        throw new AxiosError('Request failed', undefined, config, null, response);
      }
      return response;
    };
  });

  afterEach(() => {
    axios.defaults.adapter = originalAdapter;
  });

  it('suggests the welcome coupon', () => {
    render(<CouponForm appliedCoupon={null} onApply={onApply} onRemove={onRemove} />);

    expect(screen.getByLabelText('Coupon code')).toHaveAccessibleDescription('New here? Use WELCOME10 for 10% off your items.');
  });

  it('applies a code the API accepts, as the API spells it', async () => {
    render(<CouponForm appliedCoupon={null} onApply={onApply} onRemove={onRemove} />);

    await user.type(screen.getByLabelText('Coupon code'), ' welcome10 {Enter}');

    expect(onApply).toHaveBeenCalledWith('WELCOME10');
    expect(screen.getByLabelText('Coupon code')).toHaveValue('');
  });

  it('says why a code does not work', async () => {
    render(<CouponForm appliedCoupon={null} onApply={onApply} onRemove={onRemove} />);

    await user.type(screen.getByLabelText('Coupon code'), 'NOPE');
    await user.click(screen.getByTestId('coupon-apply-button'));

    expect(screen.getByRole('alert')).toHaveTextContent("NOPE isn't a valid coupon code.");
    expect(screen.getByLabelText('Coupon code')).toHaveAttribute('aria-invalid', 'true');
    expect(onApply).not.toHaveBeenCalled();
  });

  it('asks to try again when the code could not be checked', async () => {
    render(<CouponForm appliedCoupon={null} onApply={onApply} onRemove={onRemove} />);

    await user.type(screen.getByLabelText('Coupon code'), 'SPRING25{Enter}');

    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't check this code. Please try again.");
  });

  it('does not check an empty code', async () => {
    render(<CouponForm appliedCoupon={null} onApply={onApply} onRemove={onRemove} />);

    await user.type(screen.getByLabelText('Coupon code'), '   {Enter}');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(onApply).not.toHaveBeenCalled();
  });

  it('shows the applied coupon, which can be removed', async () => {
    render(<CouponForm appliedCoupon={{ code: 'WELCOME10', percentOff: 10 }} onApply={onApply} onRemove={onRemove} />);

    expect(screen.getByTestId('coupon-applied')).toHaveTextContent('WELCOME10 applied: 10% off your items');
    await user.click(screen.getByRole('button', { name: 'Remove coupon WELCOME10' }));
    expect(onRemove).toHaveBeenCalled();
  });
});
