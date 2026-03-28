import { it, expect, describe, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { PaymentSummary } from './PaymentSummary';
import axios from 'axios';
import userEvent from '@testing-library/user-event';

vi.mock('axios');

describe('PaymentSummary', () => {
  let paymentSummary;
  let loadCart;
  let user;

  beforeEach(() => {
    paymentSummary = {
      totalItems: 3,
      productCostCents: 4275,
      shippingCostCents: 499,
      totalCostBeforeTaxCents: 4774,
      taxCents: 477,
      totalCostCents: 5251
    };

    loadCart = vi.fn();
    user = userEvent.setup();
  });

  it('displays the correct details', async () => {
    render(
      <MemoryRouter>
        <PaymentSummary paymentSummary={paymentSummary} loadCart={loadCart} />
      </MemoryRouter>
    );

    expect(
      screen.getByText('Items (3):')
    ).toBeInTheDocument();

    // There are multiple ways to check the text inside an element.
    // 1. within() + getByText() + toBeInTheDocument()
    expect(
      within(screen.getByTestId('payment-summary-product-cost')).getByText('$42.75')
    ).toBeInTheDocument();


    // 2. getByTestId() + toHaveTextContent() >>> cleamer
    expect(
      screen.getByTestId('payment-summary-shipping-cost')
    ).toHaveTextContent('$4.99');

    expect(
      screen.getByTestId('payment-summary-total-before-tax')
    ).toHaveTextContent('$47.74');

    expect(
      screen.getByTestId('payment-summary-tax')
    ).toHaveTextContent('$4.77');

    expect(
      screen.getByTestId('payment-summary-total')
    ).toHaveTextContent('$52.51');


  })

  it('place an order', async () => {
    function Location() {
      const location = useLocation();
      return (
        <div data-testid="url-path">{location.pathname}</div>
      )

    }

    render(
      <MemoryRouter>
        <PaymentSummary
          paymentSummary={paymentSummary}
          loadCart={loadCart} />

        <Location />
      </MemoryRouter>

    );

    const placeOrderButton = screen.getByTestId('place-order-button');
    await user.click(placeOrderButton);


    expect(axios.post).toHaveBeenCalledWith('/api/orders');
    expect(loadCart).toHaveBeenCalled();
    expect(screen.getByTestId('url-path')).toHaveTextContent('/orders'
    )
  });
});