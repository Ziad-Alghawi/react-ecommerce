import axios from 'axios';
import { useEffect, useState } from 'react';
import { CheckoutHeader } from './CheckoutHeader'
import { OrderSummary } from './orderSummary';
import { PaymentSummary } from './PaymentSummary';
import './CheckoutPage.css';


export function CheckoutPage({ cart, loadCart }) {
  const [deliveryOptions, setDeliveryOptions] = useState([]);
  const [paymentSummary, setPaymentSummary] = useState(null);

  useEffect(() => {
    const fetchCheckoutData = async () => {
      let response = await axios.get('/api/delivery-options?expand=estimatedDeliveryTime');
        setDeliveryOptions(response.data);

      response =await axios.get('/api/payment-summary');
      setPaymentSummary(response.data);
    };

    fetchCheckoutData();
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

          <PaymentSummary paymentSummary={paymentSummary} />
        </div>
      </div>
    </>

  )

}