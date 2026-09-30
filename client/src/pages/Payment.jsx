import { useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CreditCard, LockKeyhole, MapPin, ShieldCheck, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import PaymentForm from "../components/PaymentForm.jsx";
import { finishCheckout, placeOrder, clearCheckoutError } from "../store/slices/orderSlice.js";
import { formatProductPrice } from "../components/Products/productUtils.js";
import { toggleAuthPopup } from "../store/slices/popupSlice.js";

const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null;

const emptyShipping = {
  full_name: "",
  state: "",
  city: "",
  country: "",
  address: "",
  pincode: "",
  phone: "",
};

const checkoutSteps = [
  { number: 1, label: "Cart review" },
  { number: 2, label: "Shipping" },
  { number: 3, label: "Order summary" },
  { number: 4, label: "Payment" },
  { number: 5, label: "Payment status" },
  { number: 6, label: "Confirmation" },
];

const validateShipping = (details) => {
  const errors = {};
  const name = details.full_name.trim();
  const phone = details.phone.trim();
  const address = details.address.trim();
  const postalCode = details.pincode.trim();
  const phoneDigits = phone.replace(/\D/g, "").length;

  if (name.length < 3) errors.full_name = "Enter your full name (at least 3 characters).";
  if (!/^\+?[0-9][0-9\s().-]{5,24}$/.test(phone) || phoneDigits < 7 || phoneDigits > 15) {
    errors.phone = "Enter a valid phone number with 7–15 digits.";
  }
  if (address.length < 10) errors.address = "Address must be at least 10 characters.";
  if (!details.city.trim()) errors.city = "City is required.";
  if (!details.state.trim()) errors.state = "State or province is required.";
  if (!details.country.trim()) errors.country = "Country is required.";
  if (!/^[A-Za-z0-9][A-Za-z0-9 -]{1,10}[A-Za-z0-9]$/.test(postalCode)) {
    errors.pincode = "Enter a valid postal or PIN code.";
  }
  return errors;
};

const hasValidCartItems = (items) =>
  items.length > 0 &&
  items.every((item) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item.id || "") &&
    Number.isInteger(Number(item.quantity)) &&
    Number(item.quantity) > 0 &&
    Number.isFinite(Number(item.price)) &&
    Number(item.price) > 0 &&
    Number.isFinite(Number(item.stock)) &&
    Number(item.stock) >= Number(item.quantity)
  );

const fieldClass = (hasError) =>
  `w-full rounded-xl border bg-background px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-ring ${
    hasError ? "border-destructive" : "border-input"
  }`;

const Payment = () => {
  const dispatch = useDispatch();
  const { cart } = useSelector((state) => state.cart);
  const { authUser, isCheckingAuth } = useSelector((state) => state.auth);
  const { placingOrder, paymentIntent, finalPrice, checkoutError } = useSelector((state) => state.order);
  const [shipping, setShipping] = useState(emptyShipping);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [checkoutStep, setCheckoutStep] = useState(2);
  const [paymentStatus, setPaymentStatus] = useState("idle");
  const [paymentComplete, setPaymentComplete] = useState(false);
  const submitLock = useRef(false);

  const cartIsValid = useMemo(() => hasValidCartItems(cart), [cart]);
  const cartTotals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
    const tax = Math.round(subtotal * 0.025);
    const shippingEstimate = subtotal >= 50000 ? 0 : 10000;
    return { subtotal, tax, shipping: shippingEstimate, total: subtotal + tax + shippingEstimate };
  }, [cart]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setShipping((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
    setFormError("");
    dispatch(clearCheckoutError());
  };

  const handleShippingSubmit = (event) => {
    event.preventDefault();
    setFormError("");
    const validationErrors = validateShipping(shipping);
    setFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length) {
      setFormError("Please correct the highlighted shipping details.");
      return;
    }
    if (!authUser) {
      setFormError("Sign in to continue with checkout.");
      dispatch(toggleAuthPopup());
      return;
    }
    if (!cartIsValid) {
      setFormError("One or more cart items are invalid or no longer available. Return to your cart and refresh product availability.");
      return;
    }

    setShipping((current) => Object.fromEntries(Object.entries(current).map(([key, value]) => [key, value.trim()])));
    setCheckoutStep(3);
  };

  const handlePlaceOrder = async () => {
    if (submitLock.current || placingOrder) return;
    setFormError("");
    if (!authUser) {
      setFormError("Sign in to continue with checkout.");
      dispatch(toggleAuthPopup());
      return;
    }
    if (!cartIsValid) {
      setFormError("One or more items are invalid, stale, or exceed available stock. Return to your cart and refresh products.");
      return;
    }
    if (!stripePromise) {
      setFormError("Online payment is not configured. Your order was not submitted; please contact support.");
      return;
    }

    submitLock.current = true;
    try {
      await dispatch(placeOrder(shipping)).unwrap();
      setCheckoutStep(4);
      setFormError("");
    } catch (message) {
      setFormError(message);
    } finally {
      submitLock.current = false;
    }
  };

  const handlePaymentComplete = () => {
    dispatch(finishCheckout());
    setPaymentComplete(true);
  };

  if (isCheckingAuth) {
    return <main className="flex min-h-[70vh] items-center justify-center pt-20 text-muted-foreground">Restoring your session…</main>;
  }

  if (!cart.length && !paymentIntent && !paymentComplete) {
    return (
      <main className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 pt-20 text-center">
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <p className="text-sm text-muted-foreground">Add products before starting checkout.</p>
        <Link to="/products" className="rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground">Continue shopping</Link>
      </main>
    );
  }

  const activeStep = paymentComplete
    ? 6
    : paymentStatus === "processing" || paymentStatus === "failed"
      ? 5
      : paymentIntent
        ? 4
        : checkoutStep;

  return (
    <main className="min-h-screen px-4 pb-16 pt-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {!paymentComplete && (
          <Link to="/cart" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft size={16} />
            Back to cart
          </Link>
        )}

        <nav aria-label="Checkout progress" className="mb-8 overflow-x-auto pb-2">
          <ol className="flex min-w-[620px] items-start">
            {checkoutSteps.map((step, index) => {
              const complete = step.number < activeStep;
              const current = step.number === activeStep;
              return (
                <li key={step.number} className="relative flex flex-1 flex-col items-center text-center">
                  {index > 0 && (
                    <span className={`absolute right-1/2 top-4 h-0.5 w-full ${complete || current ? "bg-primary" : "bg-border"}`} />
                  )}
                  <span
                    aria-current={current ? "step" : undefined}
                    className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                      complete || current ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"
                    }`}
                  >
                    {complete ? <Check size={15} /> : step.number}
                  </span>
                  <span className={`mt-2 text-[11px] font-medium sm:text-xs ${current ? "text-foreground" : "text-muted-foreground"}`}>
                    {step.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </nav>

        {!cartIsValid && !paymentIntent && !paymentComplete ? (
          <section className="mx-auto max-w-xl rounded-3xl border border-destructive/30 bg-card p-7 text-center text-card-foreground">
            <h1 className="text-2xl font-bold">Cart items need attention</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              A product is invalid, unavailable, or has a quantity above current stock. Checkout is blocked until you update your cart.
            </p>
            <Link to="/cart" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground">
              Review cart <ArrowRight size={16} />
            </Link>
          </section>
        ) : paymentComplete ? (
          <section className="mx-auto max-w-lg rounded-3xl border border-border bg-card p-8 text-center text-card-foreground">
            <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <ShieldCheck size={32} />
            </span>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600">Order confirmed</p>
            <h1 className="text-2xl font-bold">Payment successful</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your payment was confirmed. We’ll ship your order to {shipping.full_name} at {shipping.address}, {shipping.city}.
            </p>
            <p className="mt-4 text-lg font-bold">Paid {formatProductPrice(Number(finalPrice) * 100)}</p>
            <Link to="/products" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground">
              Continue shopping <ArrowRight size={16} />
            </Link>
          </section>
        ) : paymentIntent ? (
          <section className="mx-auto max-w-xl rounded-3xl border border-border bg-card p-6 text-card-foreground shadow-sm sm:p-8">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">Secure payment</p>
            <h1 className="text-2xl font-bold">{paymentStatus === "processing" ? "Confirming payment" : "Complete your payment"}</h1>
            <p className="mt-2 text-sm text-muted-foreground">Order total confirmed by the server.</p>
            <p className="mt-5 text-3xl font-bold">{formatProductPrice(Number(finalPrice) * 100)}</p>
            {paymentStatus === "processing" && (
              <p className="mt-4 rounded-xl bg-primary/5 p-4 text-sm text-muted-foreground" role="status">
                Your payment is being securely confirmed. Please keep this page open.
              </p>
            )}
            {stripePromise ? (
              <Elements stripe={stripePromise}>
                <PaymentForm
                  onPaymentStatus={setPaymentStatus}
                  onPaymentComplete={handlePaymentComplete}
                />
              </Elements>
            ) : (
              <p className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive" role="alert">
                Online payment is not configured. Your cart is saved; please contact support or try again later.
              </p>
            )}
          </section>
        ) : checkoutStep === 2 ? (
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            <section className="rounded-3xl border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-8">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">Step 2 of 6 · Shipping</p>
              <h1 className="text-2xl font-bold">Delivery details</h1>
              <p className="mt-2 text-sm text-muted-foreground">All fields are required. We’ll use these details for delivery.</p>

              <form onSubmit={handleShippingSubmit} noValidate className="mt-7 space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">Full name</span>
                  <input name="full_name" value={shipping.full_name} onChange={handleChange} required maxLength={100} autoComplete="name" aria-invalid={Boolean(fieldErrors.full_name)} aria-describedby={fieldErrors.full_name ? "full-name-error" : undefined} className={fieldClass(fieldErrors.full_name)} />
                  {fieldErrors.full_name && <span id="full-name-error" className="mt-1 block text-xs text-destructive">{fieldErrors.full_name}</span>}
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">Phone</span>
                  <input name="phone" type="tel" value={shipping.phone} onChange={handleChange} required maxLength={30} autoComplete="tel" placeholder="+91 98765 43210" aria-invalid={Boolean(fieldErrors.phone)} aria-describedby={fieldErrors.phone ? "phone-error" : undefined} className={fieldClass(fieldErrors.phone)} />
                  {fieldErrors.phone && <span id="phone-error" className="mt-1 block text-xs text-destructive">{fieldErrors.phone}</span>}
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">Address</span>
                  <textarea name="address" value={shipping.address} onChange={handleChange} required maxLength={300} minLength={10} autoComplete="street-address" rows={3} aria-invalid={Boolean(fieldErrors.address)} aria-describedby={fieldErrors.address ? "address-error" : undefined} className={`${fieldClass(fieldErrors.address)} resize-y`} />
                  {fieldErrors.address && <span id="address-error" className="mt-1 block text-xs text-destructive">{fieldErrors.address}</span>}
                  <span className="mt-1 block text-xs text-muted-foreground">At least 10 characters.</span>
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium">City</span>
                    <input name="city" value={shipping.city} onChange={handleChange} required maxLength={100} autoComplete="address-level2" aria-invalid={Boolean(fieldErrors.city)} className={fieldClass(fieldErrors.city)} />
                    {fieldErrors.city && <span className="mt-1 block text-xs text-destructive">{fieldErrors.city}</span>}
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium">State / Province</span>
                    <input name="state" value={shipping.state} onChange={handleChange} required maxLength={100} autoComplete="address-level1" aria-invalid={Boolean(fieldErrors.state)} className={fieldClass(fieldErrors.state)} />
                    {fieldErrors.state && <span className="mt-1 block text-xs text-destructive">{fieldErrors.state}</span>}
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium">Country</span>
                    <input name="country" value={shipping.country} onChange={handleChange} required maxLength={100} autoComplete="country-name" aria-invalid={Boolean(fieldErrors.country)} className={fieldClass(fieldErrors.country)} />
                    {fieldErrors.country && <span className="mt-1 block text-xs text-destructive">{fieldErrors.country}</span>}
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium">Pincode / Postal code</span>
                    <input name="pincode" value={shipping.pincode} onChange={handleChange} required maxLength={12} autoComplete="postal-code" placeholder="e.g. 110001" aria-invalid={Boolean(fieldErrors.pincode)} aria-describedby={fieldErrors.pincode ? "pincode-error" : undefined} className={fieldClass(fieldErrors.pincode)} />
                    {fieldErrors.pincode && <span id="pincode-error" className="mt-1 block text-xs text-destructive">{fieldErrors.pincode}</span>}
                  </label>
                </div>
                {formError && <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive" role="alert">{formError}</p>}
                <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground hover:opacity-90">
                  Review order <ArrowRight size={17} />
                </button>
              </form>
            </section>

            <OrderSummary cart={cart} totals={cartTotals} />
          </div>
        ) : (
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            <section className="rounded-3xl border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-8">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">Step 3 of 6 · Order summary</p>
              <h1 className="text-2xl font-bold">Review your order</h1>
              <p className="mt-2 text-sm text-muted-foreground">Confirm delivery details and estimated charges before server-side price and stock validation.</p>

              <div className="mt-6 rounded-2xl border border-border p-4">
                <div className="flex items-start gap-3">
                  <MapPin size={19} className="mt-0.5 shrink-0 text-primary" />
                  <div className="min-w-0 text-sm">
                    <p className="font-semibold">{shipping.full_name}</p>
                    <p className="mt-1 text-muted-foreground">{shipping.address}</p>
                    <p className="text-muted-foreground">{shipping.city}, {shipping.state} {shipping.pincode}</p>
                    <p className="text-muted-foreground">{shipping.country}</p>
                    <p className="mt-1 text-muted-foreground">{shipping.phone}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setCheckoutStep(2)} className="mt-3 text-sm font-semibold text-primary hover:underline">
                  Edit shipping details
                </button>
              </div>

              {(formError || checkoutError) && (
                <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive" role="alert">
                  <p className="font-semibold">
                    {/stock|unit|available/i.test(formError || checkoutError)
                      ? "Stock changed — review your cart"
                      : /product|invalid|not found/i.test(formError || checkoutError)
                        ? "A cart item is no longer available"
                        : "We couldn’t verify your order"}
                  </p>
                  <p className="mt-1">{formError || checkoutError}</p>
                  <Link to="/cart" className="mt-2 inline-flex font-semibold underline">Return to cart and update items</Link>
                </div>
              )}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <button type="button" onClick={() => setCheckoutStep(2)} className="rounded-xl border border-border px-5 py-3 text-sm font-semibold hover:border-primary hover:text-primary">
                  Back to shipping
                </button>
                <button
                  type="button"
                  onClick={handlePlaceOrder}
                  disabled={placingOrder || submitLock.current || !cartIsValid}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {placingOrder ? "Verifying prices and stock…" : "Place order & continue to payment"}
                  {!placingOrder && <ArrowRight size={17} />}
                </button>
              </div>
            </section>

            <OrderSummary cart={cart} totals={cartTotals} />
          </div>
        )}
      </div>
    </main>
  );
};

const OrderSummary = ({ cart, totals }) => (
  <aside className="rounded-2xl border border-border bg-card p-5 text-card-foreground">
    <h2 className="text-lg font-semibold">Order summary</h2>
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
    <div className="space-y-2 text-sm">
      <p className="flex justify-between gap-3"><span className="text-muted-foreground">Subtotal estimate</span><span>{formatProductPrice(totals.subtotal)}</span></p>
      <p className="flex justify-between gap-3"><span className="text-muted-foreground">Tax estimate</span><span>{formatProductPrice(totals.tax)}</span></p>
      <p className="flex justify-between gap-3"><span className="text-muted-foreground">Shipping estimate</span><span>{totals.shipping ? formatProductPrice(totals.shipping) : "Free"}</span></p>
      <p className="flex justify-between gap-3 border-t border-border pt-3 text-base font-bold"><span>Estimated total</span><span>{formatProductPrice(totals.total)}</span></p>
    </div>
    <p className="mt-4 text-xs leading-5 text-muted-foreground">Estimates only. The server checks current database prices and stock before creating your order.</p>
    <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><Truck size={15} /> Shipping calculated using current checkout policy</p>
    <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><CreditCard size={15} /><LockKeyhole size={13} /> Secured with Stripe</p>
  </aside>
);

export default Payment;
