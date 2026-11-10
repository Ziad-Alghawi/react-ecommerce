import axios from 'axios';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { PageTitle } from '../../components/PageTitle';
import { CheckoutHeader } from './CheckoutHeader';
import { OrderSummary } from './OrderSummary';
import { PaymentSummary } from './PaymentSummary';
import { ErrorMessage, LoadingMessage } from '../../components/PageStatus';
import type { CartItem, CartStatus, DeliveryOption, LoadCart, PaymentSummary as PaymentSummaryType } from '../../types/store';
import './CheckoutPage.css';

interface CheckoutPageProps {
  cart: CartItem[];
  cartStatus: CartStatus;
  loadCart: LoadCart;
  onRetry: () => void;
}

export function CheckoutPage({ cart, cartStatus, loadCart, onRetry }: CheckoutPageProps) {
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummaryType | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const fetchDeliveryOptions = async () => {
      try {
        const response = await axios.get<DeliveryOption[]>('/api/delivery-options?expand=estimatedDeliveryTime');
        if (!Array.isArray(response.data)) {
          throw new Error('Unexpected delivery options response');
        }
        setDeliveryOptions(response.data);
      } catch {
        setHasError(true);
      }
    };
    fetchDeliveryOptions();
  }, []);

  // Every change to the cart (quantity, delivery option...) changes the totals
  useEffect(() => {
    const fetchPaymentSummary = async () => {
      try {
        const response = await axios.get<PaymentSummaryType>('/api/payment-summary');
        if (typeof response.data !== 'object') {
          throw new Error('Unexpected payment summary response');
        }
        setPaymentSummary(response.data);
      } catch {
        setHasError(true);
      }
    };
    fetchPaymentSummary();
  }, [cart]);

  const isLoading = cartStatus === 'loading' || deliveryOptions.length === 0 || !paymentSummary;

  let pageContent = (
    <div className="checkout-grid">
      <OrderSummary cart={cart} deliveryOptions={deliveryOptions} loadCart={loadCart} />

      <PaymentSummary paymentSummary={paymentSummary} loadCart={loadCart} />
    </div>
  );

  if (hasError || cartStatus === 'failed') {
    pageContent = <ErrorMessage onButtonClick={onRetry} />;
  } else if (isLoading) {
    pageContent = <LoadingMessage />;
  } else if (cart.length === 0) {
    pageContent = (
      <div className="page-status" data-testid="empty-cart-message">
        <div>Your cart is empty</div>
        <Link className="page-status-link link-primary" to="/">Browse products</Link>
      </div>
    );
  }

  return (
    <>
      <PageTitle title="Checkout" />

      <CheckoutHeader cart={cart} />

      <main className="checkout-page page">
        <h1 className="page-title">Review your order</h1>

        {pageContent}
      </main>
    </>
  );
}
