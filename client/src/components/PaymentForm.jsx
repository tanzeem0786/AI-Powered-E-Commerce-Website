import { useState } from "react";
import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useDispatch, useSelector } from "react-redux";
import { CreditCard, LockKeyhole } from "lucide-react";
import { toast } from "react-toastify";
import { clearCart } from "../store/slices/cartSlice.js";
import { clearCheckout } from "../store/slices/orderSlice.js";

const PaymentForm = ({ onPaymentComplete }) => {
  const stripe = useStripe();
  const elements = useElements();
  const dispatch = useDispatch();
  const paymentIntent = useSelector((state) => state.order.paymentIntent);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setPaymentError("");

    if (!stripe || !elements) {
      setPaymentError("The secure payment form is still loading. Please try again.");
      return;
    }
    const card = elements.getElement(CardElement);
    if (!card) {
      setPaymentError("Card details are unavailable. Please refresh and try again.");
      return;
    }

    setIsPaying(true);
    try {
      const result = await stripe.confirmCardPayment(
        paymentIntent,
        { payment_method: { card } }
      );
      if (result.error) {
        setPaymentError(result.error.message || "Your payment could not be completed.");
        return;
      }
      if (result.paymentIntent?.status !== "succeeded") {
        setPaymentError("Payment is not complete yet. Please follow the payment confirmation steps.");
        return;
      }

      toast.success("Payment successful.");
      dispatch(clearCart());
      dispatch(clearCheckout());
      onPaymentComplete();
    } catch (error) {
      setPaymentError(error.message || "Payment failed. Please try again.");
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-7 space-y-5">
      <div>
        <label className="mb-2 block text-sm font-medium">Card details</label>
        <div className="rounded-xl border border-input bg-background px-4 py-4 focus-within:ring-2 focus-within:ring-ring">
          <CardElement
            options={{
              hidePostalCode: true,
              style: {
                base: {
                  color: "hsl(var(--foreground))",
                  fontFamily: "inherit",
                  fontSize: "15px",
                  "::placeholder": { color: "hsl(var(--muted-foreground))" },
                },
                invalid: { color: "hsl(var(--destructive))" },
              },
            }}
          />
        </div>
      </div>

      {paymentError && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm text-destructive" role="alert">
          {paymentError}
        </p>
      )}

      <button
        type="submit"
        disabled={!stripe || isPaying}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPaying ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <CreditCard size={17} />
        )}
        {isPaying ? "Confirming payment…" : "Pay securely"}
      </button>

      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <LockKeyhole size={13} />
        Your card details are securely processed by Stripe.
      </p>
    </form>
  );
};

export default PaymentForm;
