import axios from 'axios';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { formatMoney } from '../../utils/money';
import { ButtonSpinner } from '../../components/PageStatus';
import { useAction } from '../../hooks/useAction';
import { useToast } from '../../hooks/useToast';
import { CouponForm } from './CouponForm';
import type { AppliedCoupon, LoadCart, PaymentSummary as PaymentSummaryType } from '../../types/store';

interface PaymentSummaryProps {
  paymentSummary: PaymentSummaryType | null;
  couponCode: string | null;
  // Suggested next to the coupon field
  featuredCoupon?: AppliedCoupon | null;
  onCouponChange: (couponCode: string | null) => void;
  loadCart: LoadCart;
}

export function PaymentSummary({
  paymentSummary, couponCode, featuredCoupon = null, onCouponChange, loadCart
}: PaymentSummaryProps) {
  const navigate = useNavigate();
  const showToast = useToast();

  const [createOrder, isPlacingOrder] = useAction(async () => {
    await axios.post('/api/orders', { couponCode });
    await loadCart();
    showToast('Order placed. Thank you!');
    navigate('/orders');
  });

  const [isCardPaymentOn, setIsCardPaymentOn] = useState(false);

  useEffect(() => {
    const fetchStripeConfig = async () => {
      try {
        const response = await axios.get<{ cardPayment: boolean }>('/api/stripe/config');
        setIsCardPaymentOn(response.data.cardPayment === true);
      } catch {
        // Paying on delivery still works, so there's nothing to show
      }
    };
    fetchStripeConfig();
  }, []);

  // Stripe's page takes the payment, then sends the customer back to /checkout/success
  const [payWithCard, isRedirecting] = useAction(async () => {
    const response = await axios.post<{ url: string }>('/api/stripe/checkout-sessions', { couponCode });
    window.location.assign(response.data.url);
  });

  const isOrderDisabled = paymentSummary?.totalItems === 0 || isPlacingOrder || isRedirecting;

  return (
    <div className="payment-summary card">
      <h2 className="payment-summary-title">
        Payment Summary
      </h2>

      {paymentSummary && (
        <>
          <div className="payment-summary-row"
            data-testid="payment-summary-product-cost">
            <div>Items ({paymentSummary.totalItems}):</div>
            <div className="payment-summary-money">
              {formatMoney(paymentSummary.productCostCents)}
            </div>
          </div>

          {paymentSummary.discountCents > 0 && (
            <div className="payment-summary-row discount-row"
              data-testid="payment-summary-discount">
              <div>Discount ({paymentSummary.coupon?.code}):</div>
              <div className="payment-summary-money">
                {formatMoney(-paymentSummary.discountCents)}
              </div>
            </div>
          )}

          <div className="payment-summary-row"
            data-testid="payment-summary-shipping-cost">
            <div>Shipping &amp; handling:</div>
            <div className="payment-summary-money">
              {formatMoney(paymentSummary.shippingCostCents)}
            </div>
          </div>

          <div className="payment-summary-row subtotal-row"
            data-testid="payment-summary-total-before-tax">
            <div>Total before tax:</div>
            <div className="payment-summary-money">
              {formatMoney(paymentSummary.totalCostBeforeTaxCents)}
            </div>
          </div>

          <div className="payment-summary-row"
            data-testid="payment-summary-tax">
            <div>Estimated tax (10%):</div>
            <div className="payment-summary-money">
              {formatMoney(paymentSummary.taxCents)}
            </div>
          </div>

          <div className="payment-summary-row total-row"
            data-testid="payment-summary-total">
            <div>Order total:</div>
            <div className="payment-summary-money">
              {formatMoney(paymentSummary.totalCostCents)}
            </div>
          </div>

          <CouponForm appliedCoupon={paymentSummary.coupon} featuredCoupon={featuredCoupon} onApply={onCouponChange}
            onRemove={() => onCouponChange(null)} />

          {isCardPaymentOn && (
            <>
              <button className="place-order-button button-primary"
                data-testid="pay-with-card-button"
                disabled={isOrderDisabled}
                aria-busy={isRedirecting}
                onClick={payWithCard}>
                {isRedirecting && <ButtonSpinner />}
                Pay with card
              </button>
              <p className="card-test-note" data-testid="card-test-note">
                <strong>Test mode:</strong> use card 4242 4242 4242 4242 with any future date and any CVC.
                No real payment is made.
              </p>
            </>
          )}

          <button className={`place-order-button ${isCardPaymentOn ? 'button-secondary' : 'button-primary'}`}
            data-testid="place-order-button"
            disabled={isOrderDisabled}
            aria-busy={isPlacingOrder}
            onClick={createOrder}>
            {isPlacingOrder && <ButtonSpinner />}
            {isCardPaymentOn ? 'Pay on delivery' : 'Place your order'}
          </button>
        </>
      )}
    </div>
  );
}
