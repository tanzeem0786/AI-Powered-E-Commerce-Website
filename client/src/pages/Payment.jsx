import { useState } from "react";
import { ArrowLeft, ArrowRight, CreditCard, LockKeyhole, MapPin, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import PaymentForm from "../components/PaymentForm.jsx";
import { placeOrder, clearCheckoutError } from "../store/slices/orderSlice.js";
import { formatProductPrice } from "../components/Products/productUtils.js";
import { toggleAuthPopup } from "../store/slices/popupSlice.js";

const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null;

const emptyShipping = {
  full_name: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  country: "",
  pincode: "",
};

const Payment = () => {
  const dispatch = useDispatch();
  const { cart } = useSelector((state) => state.cart);
  const { authUser, isCheckingAuth } = useSelector((state) => state.auth);
  const { placingOrder, paymentIntent, finalPrice, checkoutError } = useSelector((state) => state.order);
  const [shipping, setShipping] = useState(emptyShipping);
  const [formError, setFormError] = useState("");
  const [paymentComplete, setPaymentComplete] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setShipping((current) => ({ ...current, [name]: value }));
    setFormError("");
    dispatch(clearCheckoutError());
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    if (!authUser) {
      setFormError("Sign in to continue with checkout.");
      dispatch(toggleAuthPopup());
      return;
    }
    if (!cart.length) {
      setFormError("Your cart is empty.");
      return;
    }
    if (!stripePromise) {
      setFormError("Online payment is not configured. Your order was not submitted; please contact support.");
      return;
    }
    try {
      await dispatch(placeOrder(shipping)).unwrap();
    } catch (message) {
      setFormError(message);
    }
  };

  if (isCheckingAuth) {
    return <main className="flex min-h-[70vh] items-center justify-center pt-20 text-muted-foreground">Restoring your session…</main>;
  }

  if (!cart.length && !paymentIntent && !paymentComplete) {
    return (
      <main className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 pt-20 text-center">
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <Link to="/products" className="rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground">Continue shopping</Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 pb-16 pt-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link to="/cart" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft size={16} />
          Back to cart
        </Link>

        {paymentComplete ? (
          <section className="mx-auto max-w-lg rounded-3xl border border-border bg-card p-8 text-center text-card-foreground">
            <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <ShieldCheck size={32} />
            </span>
            <h1 className="text-2xl font-bold">Payment confirmed</h1>
            <p className="mt-2 text-sm text-muted-foreground">Your payment was successful. Thank you for your order.</p>
            <Link to="/products" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground">
              Continue shopping <ArrowRight size={16} />
            </Link>
          </section>
        ) : paymentIntent ? (
          <section className="mx-auto max-w-xl rounded-3xl border border-border bg-card p-6 text-card-foreground shadow-sm sm:p-8">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">Secure payment</p>
            <h1 className="text-2xl font-bold">Complete your payment</h1>
            <p className="mt-2 text-sm text-muted-foreground">Final total calculated by the server.</p>
            <p className="mt-5 text-3xl font-bold">{formatProductPrice(Number(finalPrice) * 100)}</p>
            {stripePromise ? (
              <Elements stripe={stripePromise}>
                <PaymentForm onPaymentComplete={() => setPaymentComplete(true)} />
              </Elements>
            ) : (
              <p className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive" role="alert">
                Online payment is not configured. Your cart is saved; please contact support or try again later.
              </p>
            )}
          </section>
        ) : (
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            <section className="rounded-3xl border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-8">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">Checkout</p>
              <h1 className="text-2xl font-bold">Delivery details</h1>
              <p className="mt-2 text-sm text-muted-foreground">Add a shipping address to continue to secure payment.</p>

              <form onSubmit={handleSubmit} className="mt-7 space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">Full name</span>
                  <input name="full_name" value={shipping.full_name} onChange={handleChange} required maxLength={100} autoComplete="name" className="w-full rounded-xl border border-input bg-background px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">Phone</span>
                  <input name="phone" type="tel" value={shipping.phone} onChange={handleChange} required maxLength={30} autoComplete="tel" className="w-full rounded-xl border border-input bg-background px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">Street address</span>
                  <input name="address" value={shipping.address} onChange={handleChange} required maxLength={300} autoComplete="street-address" className="w-full rounded-xl border border-input bg-background px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium">City</span>
                    <input name="city" value={shipping.city} onChange={handleChange} required maxLength={100} autoComplete="address-level2" className="w-full rounded-xl border border-input bg-background px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium">State / Province</span>
                    <input name="state" value={shipping.state} onChange={handleChange} required maxLength={100} autoComplete="address-level1" className="w-full rounded-xl border border-input bg-background px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium">Country</span>
                    <input name="country" value={shipping.country} onChange={handleChange} required maxLength={100} autoComplete="country-name" className="w-full rounded-xl border border-input bg-background px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium">Postal code</span>
                    <input name="pincode" value={shipping.pincode} onChange={handleChange} required maxLength={20} autoComplete="postal-code" className="w-full rounded-xl border border-input bg-background px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
                  </label>
                </div>

                {(formError || checkoutError) && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive" role="alert">
                    <p className="font-semibold">
                      {/stock|unit|available/i.test(formError || checkoutError)
                        ? "Stock changed — review your cart"
                        : /product|invalid|not found/i.test(formError || checkoutError)
                          ? "A cart item is no longer available"
                          : "We couldn’t start checkout"}
                    </p>
                    <p className="mt-1">{formError || checkoutError}</p>
                    <Link to="/cart" className="mt-2 inline-flex font-semibold underline">Return to cart and update items</Link>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={placingOrder || cart.length === 0}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {placingOrder ? "Verifying prices and stock…" : authUser ? "Continue to payment" : "Sign in to continue"}
                  {!placingOrder && <ArrowRight size={17} />}
                </button>
              </form>
            </section>

            <aside className="rounded-2xl border border-border bg-card p-5 text-card-foreground">
              <h2 className="text-lg font-semibold">Items in your cart</h2>
              <ul className="mt-4 space-y-4">
                {cart.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-4 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{item.name}</span>
                      <span className="text-muted-foreground">Qty {item.quantity}</span>
                    </span>
                    <span className="shrink-0 font-semibold">{formatProductPrice(Number(item.price) * Number(item.quantity))}</span>
                  </li>
                ))}
              </ul>
              <div className="my-4 h-px bg-border" />
              <p className="text-xs leading-5 text-muted-foreground">Final item prices and stock are checked against the latest database records before payment.</p>
              <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><MapPin size={15} /> Shipping address required</p>
              <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><CreditCard size={15} /> <LockKeyhole size={13} /> Secured with Stripe</p>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
};

export default Payment;
