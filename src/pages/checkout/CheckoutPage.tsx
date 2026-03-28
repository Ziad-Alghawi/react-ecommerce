import axios from 'axios';
import { useEffect, useState } from 'react';
import { CheckoutHeader } from './CheckoutHeader'
import { OrderSummary } from './OrderSummary';
import { PaymentSummary } from './PaymentSummary';
import type { CartItem, DeliveryOption, LoadCart, PaymentSummary as PaymentSummaryType } from '../../types/store';
import './CheckoutPage.css';

interface CheckoutPageProps {
  cart: CartItem[];
  loadCart: LoadCart;
}

export function CheckoutPage({ cart, loadCart }: CheckoutPageProps) {
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummaryType | null>(null);

  useEffect(() => {
    const fetchCheckoutData = async () => {
      const response = await axios.get<DeliveryOption[]>('/api/delivery-options?expand=estimatedDeliveryTime');
      setDeliveryOptions(response.data);
    };

    fetchCheckoutData();
    
  }, []);

    useEffect(() => {
      const fetchPaymentSummary = async () => {
        const response = await axios.get<PaymentSummaryType>('/api/payment-summary');
        setPaymentSummary(response.data);
      };

      fetchPaymentSummary();
      // short way to update or reload payment summary and delivery options when user changes delivery option
    }, [cart]);




  return (
    <>
      <title>Checkout</title>
      <link rel="icon" type="image/svg+xml" href="/cart-favicon.png" />

      <CheckoutHeader cart={cart} />

      <div className="checkout-page">
        <div className="page-title">Review your order</div>

        <div className="checkout-grid">
          <OrderSummary cart={cart} deliveryOptions={deliveryOptions} loadCart={loadCart} />

          <PaymentSummary paymentSummary={paymentSummary} loadCart={loadCart} />
        </div>
      </div>
    </>

  )

}