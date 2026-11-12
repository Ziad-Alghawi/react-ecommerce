import { it, expect, describe, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { ProductsGrid } from './ProductsGrid';

describe('ProductsGrid component', () => {
  let products;
  let loadCart;

  beforeEach(() => {
    products = [{
      id: "e43638ce-6aa0-4b85-b27f-e1d07eb678c6",
      image: "images/products/gray-hand-knit-wool-socks.jpg",
      name: "Gray Hand Knit Wool Socks",
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
    }];

    loadCart = vi.fn();
  });

  it('renders the products', async () => {
    render(
      <MemoryRouter>
        <ProductsGrid products={products} loadCart={loadCart} />
      </MemoryRouter>
    );

    const productContainers = await screen.findAllByTestId('product-container');
    expect(productContainers).toHaveLength(2);

    expect(
      within(productContainers[0])
        .getByText('Gray Hand Knit Wool Socks')
    ).toBeInTheDocument();

    expect(
      within(productContainers[1])
        .getByText('Intermediate Size Basketball')
    ).toBeInTheDocument();
  });
});