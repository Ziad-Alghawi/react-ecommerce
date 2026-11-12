import axios from 'axios';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { PageTitle } from '../../components/PageTitle';
import { CheckoutHeader } from './CheckoutHeader';
import { ErrorMessage, LoadingMessage } from '../../components/PageStatus';
import type { CartItem, LoadCart, Order } from '../../types/store';
import './CheckoutPage.css';

interface CheckoutSuccessPageProps {
  cart: CartItem[];
  loadCart: LoadCart;
  onRetry: () => void;
}

// Stripe sends the customer here after paying. Asking the API for the order creates it
// if the webhook hasn't yet, so this also works locally, where no webhook arrives
export function CheckoutSuccessPage({ cart, loadCart, onRetry }: CheckoutSuccessPageProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [problem, setProblem] = useState<'unpaid' | 'failed' | null>(null);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const confirmPayment = async () => {
      try {
        await axios.get<Order>(`/api/stripe/checkout-sessions/${sessionId}/order`);
        await loadCart();
        navigate('/orders', { replace: true });
      } catch (error) {
        setProblem(axios.isAxiosError(error) && error.response?.status === 409 ? 'unpaid' : 'failed');
      }
    };
    confirmPayment();
  }, [sessionId, loadCart, navigate]);

  let pageContent = <LoadingMessage />;
  if (problem === 'unpaid') {
    pageContent = (
      <ErrorMessage title="Your payment didn't go through"
        detail="Your cart is unchanged, so you can try again."
        buttonText="Back to checkout" onButtonClick={() => navigate('/checkout')} />
    );
  } else if (problem === 'failed') {
    pageContent = (
      <ErrorMessage title="We couldn't confirm your payment"
        detail="If you paid, your order will appear in your orders shortly." onButtonClick={onRetry} />
    );
  }

  return (
    <>
      <PageTitle title="Confirming payment" />

      <CheckoutHeader cart={cart} />

      <main className="checkout-page page" data-testid="checkout-success-page">
        <h1 className="page-title">Confirming your payment</h1>

        {pageContent}
      </main>
    </>
  );
}
