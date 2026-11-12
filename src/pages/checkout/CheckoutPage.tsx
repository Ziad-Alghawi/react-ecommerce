import axios from 'axios';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { PageTitle } from '../../components/PageTitle';
import { CheckoutHeader } from './CheckoutHeader';
import { OrderSummary } from './OrderSummary';
import { PaymentSummary } from './PaymentSummary';
import { ErrorMessage, LoadingMessage } from '../../components/PageStatus';
import { useToast } from '../../hooks/useToast';
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
  // Sent with the order, so the API can check it and work out the discount again
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const showToast = useToast();

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

  // Every change to the cart (quantity, delivery option...) or the coupon changes the totals
  useEffect(() => {
    let isLatestRequest = true;

    const fetchPaymentSummary = async () => {
      try {
        const response = await axios.get<PaymentSummaryType>(couponCode
          ? `/api/payment-summary?couponCode=${encodeURIComponent(couponCode)}`
          : '/api/payment-summary');
        if (typeof response.data !== 'object') {
          throw new Error('Unexpected payment summary response');
        }
        if (isLatestRequest) {
          setPaymentSummary(response.data);
        }
      } catch (error) {
        if (!isLatestRequest) {
          return;
        }
        // The coupon stopped working since it was applied, for example it expired. Carry on without it
        if (couponCode && axios.isAxiosError<{ error?: string }>(error) && error.response?.status === 400) {
          setCouponCode(null);
          showToast(error.response.data?.error ?? `The coupon ${couponCode} can no longer be used.`, { isError: true });
        } else {
          setHasError(true);
        }
      }
    };
    fetchPaymentSummary();

    return () => {
      isLatestRequest = false;
    };
  }, [cart, couponCode, showToast]);

  const isLoading = cartStatus === 'loading' || deliveryOptions.length === 0 || !paymentSummary;

  let pageContent = (
    <div className="checkout-grid">
      <OrderSummary cart={cart} deliveryOptions={deliveryOptions} loadCart={loadCart} />

      <PaymentSummary paymentSummary={paymentSummary} couponCode={couponCode}
        onCouponChange={setCouponCode} loadCart={loadCart} />
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
