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
  // Set when an admin deleted it. The shop no longer lists it, but old orders still show it
  deletedAt?: string | null;
}

export interface Review {
  id: string;
  productId: string;
  // The first 2 characters of the reviewer's email followed by "***", or "Customer"
  authorName: string;
  stars: number;
  text: string | null;
  createdAt: string;
  updatedAt: string;
  isMine: boolean;
}

export interface ProductReviews {
  // Newest first
  reviews: Review[];
  // Whether the user has ordered the product, which reviewing needs
  canReview: boolean;
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
export type CartStatus = 'loading' | 'ready' | 'failed';
