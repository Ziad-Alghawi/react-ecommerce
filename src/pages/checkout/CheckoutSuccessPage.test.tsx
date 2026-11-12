import { it, expect, describe, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import axios from 'axios';
import { CheckoutSuccessPage } from './CheckoutSuccessPage';

vi.mock('axios');

describe('CheckoutSuccessPage component', () => {
  let loadCart;

  beforeEach(() => {
    loadCart = vi.fn();
    axios.isAxiosError.mockImplementation((error) => Boolean(error?.response));
  });

  function renderPage() {
    render(
      <MemoryRouter initialEntries={['/checkout/success?session_id=cs_test_1']}>
        <Routes>
          <Route path="checkout/success" element={<CheckoutSuccessPage cart={[]} loadCart={loadCart} onRetry={vi.fn()} />} />
          <Route path="checkout" element={<div>Checkout page</div>} />
          <Route path="orders" element={<div>Orders page</div>} />
        </Routes>
      </MemoryRouter>
    );
  }

  it('confirms the payment, reloads the emptied cart and shows the orders', async () => {
    axios.get.mockResolvedValueOnce({ data: { id: 'order-1', paymentMethod: 'card' } });
    renderPage();

    expect(screen.getByTestId('loading-message')).toBeInTheDocument();
    expect(await screen.findByText('Orders page')).toBeInTheDocument();
    expect(axios.get).toHaveBeenCalledWith('/api/stripe/checkout-sessions/cs_test_1/order');
    expect(loadCart).toHaveBeenCalled();
  });

  it('sends the customer back to checkout when the payment has not gone through', async () => {
    axios.get.mockRejectedValueOnce({ response: { status: 409 } });
    renderPage();

    expect(await screen.findByTestId('error-message')).toHaveTextContent("Your payment didn't go through");
    expect(loadCart).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Back to checkout' }));
    expect(screen.getByText('Checkout page')).toBeInTheDocument();
  });
});
