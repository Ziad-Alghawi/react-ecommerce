import { it, expect, describe, vi, beforeEach } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { OrderSummary } from './OrderSummary';

vi.mock('axios');

describe('OrderSummary component', () => {
  let cart;
  let deliveryOptions;
  let loadCart;
  let user;

  beforeEach(() => {
    cart = [{
      productId: 'e43638ce-6aa0-4b85-b27f-e1d07eb678c6',
      quantity: 2,
      deliveryOptionId: '1',
      product: {
        id: "e43638ce-6aa0-4b85-b27f-e1d07eb678c6",
        image: "images/products/gray-hand-knit-wool-socks.jpg",
        name: "Gray Hand Knit Wool Socks",
        rating: {
          stars: 4.5,
          count: 87
        },
        priceCents: 1090,
        keywords: ["socks", "sports", "apparel"]
      }
    }, {
      productId: '15b6fc6f-327a-4ec4-896f-486349e85a3d',
      quantity: 1,
      deliveryOptionId: '2',
      product: {
        id: "15b6fc6f-327a-4ec4-896f-486349e85a3d",
        image: "images/products/intermediate-composite-basketball.jpg",
        name: "Intermediate Size Basketball",
        rating: {
          stars: 4,
          count: 127
        },
        priceCents: 2095,
        keywords: ["sports", "basketballs"]
      }
    }];

    deliveryOptions = [{
      id: '1',
      deliveryDays: 7,
      priceCents: 0,
      estimatedDeliveryTimeMs: 1747597994451,
    }, {
      id: '2',
      deliveryDays: 3,
      priceCents: 499,
      estimatedDeliveryTimeMs: 1747252394451,
    }, {
      id: '3',
      deliveryDays: 1,
      priceCents: 999,
      estimatedDeliveryTimeMs: 1747079594451,
    }];

    loadCart = vi.fn();
    user = userEvent.setup();
  });

  it('renders cart items correctly', () => {
    render(
      <MemoryRouter>
        <OrderSummary
          cart={cart}
          deliveryOptions={deliveryOptions}
          loadCart={loadCart}
        />
      </MemoryRouter>
    );

    const cartItemContainers = screen.getAllByTestId('cart-item-container');
    expect(cartItemContainers.length).toBe(2);

    expect(
      within(cartItemContainers[0]).getByTestId('cart-item-image')
    ).toHaveAttribute('src', 'images/products/gray-hand-knit-wool-socks.jpg');
    expect(
      within(cartItemContainers[0]).getByTestId('cart-item-name')
    ).toHaveTextContent('Gray Hand Knit Wool Socks');
    expect(
      within(cartItemContainers[0]).getByTestId('cart-item-price')
    ).toHaveTextContent('$10.90');
    expect(
      within(cartItemContainers[0]).getByTestId('cart-item-quantity')
    ).toHaveTextContent('Quantity: 2');

    let deliveryOptionInputs = within(cartItemContainers[0])
      .getAllByTestId('delivery-option-input');
    expect(deliveryOptionInputs.length).toBe(3);
    expect(deliveryOptionInputs[0].checked).toBe(true);
    expect(deliveryOptionInputs[1].checked).toBe(false);
    expect(deliveryOptionInputs[2].checked).toBe(false);

    expect(
      within(cartItemContainers[1]).getByTestId('cart-item-image')
    ).toHaveAttribute('src', 'images/products/intermediate-composite-basketball.jpg');
    expect(
      within(cartItemContainers[1]).getByTestId('cart-item-name')
    ).toHaveTextContent('Intermediate Size Basketball');
    expect(
      within(cartItemContainers[1]).getByTestId('cart-item-price')
    ).toHaveTextContent('$20.95');
    expect(
      within(cartItemContainers[1]).getByTestId('cart-item-quantity')
    ).toHaveTextContent('Quantity: 1');

    deliveryOptionInputs = within(cartItemContainers[1])
      .getAllByTestId('delivery-option-input');
    expect(deliveryOptionInputs.length).toBe(3);
    expect(deliveryOptionInputs[0].checked).toBe(false);
    expect(deliveryOptionInputs[1].checked).toBe(true);
    expect(deliveryOptionInputs[2].checked).toBe(false);
  });

  it('deletes a cart item', async () => {
    render(
      <MemoryRouter>
        <OrderSummary cart={cart} deliveryOptions={deliveryOptions} loadCart={loadCart} />
      </MemoryRouter>
    );

    const cartItemContainers = screen.getAllByTestId('cart-item-container');
    expect(cartItemContainers.length).toBe(2);

    await user.click(
      within(cartItemContainers[0]).getByTestId('cart-item-delete-quantity-link')
    );
    expect(axios.delete).toHaveBeenCalledWith(
      '/api/cart-items/e43638ce-6aa0-4b85-b27f-e1d07eb678c6'
    );
    expect(loadCart).toHaveBeenCalledTimes(1);

    await user.click(
      within(cartItemContainers[1]).getByTestId('cart-item-delete-quantity-link')
    );
    expect(axios.delete).toHaveBeenCalledWith(
      '/api/cart-items/15b6fc6f-327a-4ec4-896f-486349e85a3d'
    );
    expect(loadCart).toHaveBeenCalledTimes(2);
  });

  it('disables Update and Delete and shows a spinner while saving a quantity', async () => {
    let finishRequest;
    axios.put.mockReturnValueOnce(new Promise((resolve) => { finishRequest = resolve; }));
    render(
      <MemoryRouter>
        <OrderSummary cart={cart} deliveryOptions={deliveryOptions} loadCart={loadCart} />
      </MemoryRouter>
    );

    const cartItem = screen.getAllByTestId('cart-item-container')[0];
    const updateButton = within(cartItem).getByTestId('cart-item-update-quantity-link');
    const deleteButton = within(cartItem).getByTestId('cart-item-delete-quantity-link');

    await user.click(updateButton);
    const textbox = within(cartItem).getByRole('textbox');
    await user.clear(textbox);
    await user.type(textbox, '5');
    await user.click(updateButton);

    expect(axios.put).toHaveBeenCalledWith(
      '/api/cart-items/e43638ce-6aa0-4b85-b27f-e1d07eb678c6', { quantity: 5 }
    );
    expect(updateButton).toBeDisabled();
    expect(deleteButton).toBeDisabled();
    expect(within(updateButton).getByTestId('button-spinner')).toBeInTheDocument();

    await act(async () => finishRequest({}));

    expect(updateButton).toBeEnabled();
    expect(within(cartItem).queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('disables Delete and shows a spinner while deleting', async () => {
    let finishRequest;
    axios.delete.mockReturnValueOnce(new Promise((resolve) => { finishRequest = resolve; }));
    render(
      <MemoryRouter>
        <OrderSummary cart={cart} deliveryOptions={deliveryOptions} loadCart={loadCart} />
      </MemoryRouter>
    );

    const cartItem = screen.getAllByTestId('cart-item-container')[0];
    const deleteButton = within(cartItem).getByTestId('cart-item-delete-quantity-link');
    await user.click(deleteButton);

    expect(deleteButton).toBeDisabled();
    expect(within(deleteButton).getByTestId('button-spinner')).toBeInTheDocument();

    await act(async () => finishRequest({}));

    expect(deleteButton).toBeEnabled();
    expect(loadCart).toHaveBeenCalledTimes(1);
  });

  it('does not render anything if cart is empty', () => {
    render(
      <MemoryRouter>
        <OrderSummary cart={[]} deliveryOptions={deliveryOptions} loadCart={loadCart} />
      </MemoryRouter>
    );

    expect(screen.queryAllByTestId('cart-item-container').length).toBe(0);
  });
});
