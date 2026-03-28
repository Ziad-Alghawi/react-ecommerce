import { it, expect, describe, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { HomePage } from './HomePage';

vi.mock('axios');

describe('HomePage component', () => {
  let loadCart;
  let user;

  axios.get.mockImplementation(async (urlPath) => {
    if (urlPath === '/api/products') {
      return {
        data: [{
    id: "e43638ce-6aa0-4b85-b27f-e1d07eb678c6",
    image: "images/products/athletic-cotton-socks-6-pairs.jpg",
    name: "Black and Gray Athletic Cotton Socks - 6 Pairs",
    rating: {
      stars: 4.5,
      count: 87
    },
    priceCents: 1090,
    keywords: ["socks", "sports", "apparel"]
  },
  {
    id: "15b6fc6f-327a-4ec4-896f-486349e85a3d",
    image: "images/products/intermediate-composite-basketball.jpg",
    name: "Intermediate Size Basketball",
    rating: {
      stars: 4,
      count: 127
    },
    priceCents: 2095,
    keywords: ["sports", "basketballs"]
  }]
      }
    }

  })

  beforeEach(() => {
  loadCart = vi.fn();
  user = userEvent.setup();
});
  it('displays the product correctly', async () => {
    render(
      <MemoryRouter>
        <HomePage cart={[]} loadCart={loadCart} />
      </MemoryRouter>
    );

    const productContainer =await screen.findAllByTestId('product-container');

    expect(productContainer.length).toBe(2);

    // we use within to check specific product 
    expect(
      within(productContainer[0])
      .getByText('Black and Gray Athletic Cotton Socks - 6 Pairs')
    ).toBeInTheDocument();

     expect(
      within(productContainer[1])
      .getByText('Intermediate Size Basketball')
    ).toBeInTheDocument();
    
  });

  
// we will test the add to cart functionality in this test case
  it('adds a product to the cart', async () => {
    render(
      <MemoryRouter>
        <HomePage cart={[]} loadCart={loadCart} />
      </MemoryRouter>
    );

    const productContainer =await screen.findAllByTestId('product-container');
    // we will add 2 products to the cart with different quantities
    const quantitySelector1 = within(productContainer[0]).getByTestId('quantity-select-selector');
    await user.selectOptions(quantitySelector1, '2');
// we will click add for first product
    const addToCartButton1 = within(productContainer[0]).getByTestId('add-to-cart-button');
    await user.click(addToCartButton1);

//////////////////////// 

    // we will add the second product to the cart with a different quantity
    const quantitySelector2 = within(productContainer[1]).getByTestId('quantity-select-selector');
    await user.selectOptions(quantitySelector2, '3');
    // we will click add for  second product
    const addToCartButton2 = within(productContainer[1]).getByTestId('add-to-cart-button');
    await user.click(addToCartButton2);

    // check if the axios.post was called with the correct parameters for both products
    expect(axios.post).toHaveBeenNthCalledWith(1, '/api/cart-items', {
      productId: "e43638ce-6aa0-4b85-b27f-e1d07eb678c6",
      quantity: 2
    });

    expect(axios.post).toHaveBeenNthCalledWith(2, '/api/cart-items', {
      productId: "15b6fc6f-327a-4ec4-896f-486349e85a3d",
      quantity: 3
    });

    expect(loadCart).toHaveBeenCalledTimes(2);

  })
});