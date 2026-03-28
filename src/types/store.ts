export interface Rating {
  stars: number;
  count: number;
}

export interface Product {
  id: string;
  image: string;
  name: string;
  rating: Rating;
  priceCents: number;
  keywords?: string[];
}

export interface CartItem {
  productId: string;
  quantity: number;
  deliveryOptionId: string;
  product: Product;
}

export interface DeliveryOption {
  id: string;
  deliveryDays?: number;
  priceCents: number;
  estimatedDeliveryTimeMs: number;
}

export interface PaymentSummary {
  totalItems: number;
  productCostCents: number;
  shippingCostCents: number;
  totalCostBeforeTaxCents: number;
  taxCents: number;
  totalCostCents: number;
}

export interface OrderProduct {
  id?: string;
  productId: string;
  quantity: number;
  estimatedDeliveryTimeMs: number;
  product: Product;
}

export interface Order {
  id: string;
  orderTimeMs: number;
  totalCostCents: number;
  products: OrderProduct[];
}

export type LoadCart = () => Promise<void>;