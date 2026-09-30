import { useMemo } from "react";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2, Truck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { refreshCart, removeFromCart, setCartQuantity } from "../store/slices/cartSlice.js";
import { formatProductPrice, getProductImage } from "../components/Products/productUtils.js";
import { toggleAuthPopup } from "../store/slices/popupSlice.js";
import { clearCheckoutError } from "../store/slices/orderSlice.js";

const TAX_RATE = 0.025;
const SHIPPING_FEE = 10000;
const FREE_SHIPPING_THRESHOLD = 50000;

const Cart = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { cart } = useSelector((state) => state.cart);
  const { refreshingCart } = useSelector((state) => state.cart);
  const { checkoutError } = useSelector((state) => state.order);
  const { authUser, isCheckingAuth } = useSelector((state) => state.auth);

  const totals = useMemo(() => {
    const subtotal = cart.reduce(
      (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0),
      0
    );
    const tax = Math.round(subtotal * TAX_RATE);
    const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
    return { subtotal, tax, shipping, total: subtotal + tax + shipping };
  }, [cart]);

  const updateQuantity = (item, quantity) => {
    const stock = Number(item.stock);
    if (quantity > stock) {
      toast.error(`Only ${stock} ${stock === 1 ? "unit is" : "units are"} available.`);
      return;
    }
    dispatch(setCartQuantity({ productId: item.id, quantity }));
  };

  const handleCheckout = () => {
    if (isCheckingAuth) {
      toast.info("Restoring your account session. Please try again in a moment.");
      return;
    }
    if (!authUser) {
      toast.info("Sign in before proceeding to checkout.");
      dispatch(toggleAuthPopup());
      return;
    }
    navigate("/payment");
  };

  const handleRefreshCart = async () => {
    const result = await dispatch(refreshCart());
    if (refreshCart.fulfilled.match(result)) dispatch(clearCheckoutError());
  };

  if (cart.length === 0) {
    return (
      <main className="flex min-h-[75vh] items-center justify-center px-4 pb-16 pt-24">
        <section className="w-full max-w-lg rounded-3xl border border-border bg-card px-6 py-12 text-center text-card-foreground shadow-sm">
          <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShoppingBag size={30} />
          </span>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">Your shopping bag</p>
          <h1 className="text-2xl font-bold">Your cart is empty</h1>
          <p className="mt-2 text-sm text-muted-foreground">Looks like you haven’t added anything to your cart yet.</p>
          <Link
            to="/products"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Continue shopping
            <ArrowRight size={16} />
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 pb-16 pt-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">Almost yours</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Shopping cart</h1>
          <p className="mt-2 text-muted-foreground">
            {cart.length} {cart.length === 1 ? "item" : "items"} in your cart
          </p>
        </header>

        {checkoutError && (
          <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-foreground">Cart needs an update before checkout</p>
              <p className="mt-1 text-sm text-muted-foreground">{checkoutError}</p>
            </div>
            <button
              type="button"
              onClick={handleRefreshCart}
              disabled={refreshingCart}
              className="shrink-0 rounded-xl border border-amber-500/40 px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-amber-500/10 disabled:opacity-50"
            >
              {refreshingCart ? "Checking products…" : "Refresh prices & stock"}
            </button>
          </div>
        )}

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="space-y-4" aria-label="Cart items">
            {cart.map((item) => {
              const stock = Number(item.stock) || 0;
              const quantityInvalid = !Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1;
              const quantityExceedsStock = Number(item.quantity) > stock;
              const staleOrUnavailable = stock <= 0 || quantityInvalid;

              return (
                <article
                  key={item.id}
                  className={`grid gap-4 rounded-2xl border bg-card p-4 text-card-foreground sm:grid-cols-[120px_minmax(0,1fr)_auto] sm:items-center sm:p-5 ${
                    staleOrUnavailable ? "border-destructive/50" : "border-border"
                  }`}
                >
                  <Link to={`/product/${item.id}`} className="block aspect-square overflow-hidden rounded-xl bg-secondary/40 sm:h-28 sm:w-28">
                    <img
                      src={getProductImage(item)}
                      alt={item.name}
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.src = "/avatar-holder.avif";
                      }}
                      className="h-full w-full object-cover"
                    />
                  </Link>

                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">{item.category}</p>
                    <Link to={`/product/${item.id}`} className="mt-1 block truncate text-lg font-semibold hover:text-primary">
                      {item.name || "Product no longer available"}
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Unit price: <span className="font-medium text-foreground">{formatProductPrice(item.price)}</span>
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Item total: <span className="font-semibold text-foreground">{formatProductPrice(Number(item.price) * Number(item.quantity))}</span>
                    </p>
                    {stock > 0 ? (
                      <>
                        <p className={`mt-1 text-xs ${quantityExceedsStock ? "text-destructive" : "text-muted-foreground"}`}>
                          {stock} {stock === 1 ? "unit" : "units"} currently available
                        </p>
                        {quantityExceedsStock && <p className="mt-1 text-xs font-medium text-destructive">Reduce quantity to continue.</p>}
                      </>
                    ) : (
                      <p className="mt-1 text-xs font-medium text-destructive">This item is now out of stock.</p>
                    )}
                    {item.availabilityError && <p className="mt-1 text-xs font-medium text-destructive">{item.availabilityError}</p>}
                    {quantityInvalid && <p className="mt-1 text-xs font-medium text-destructive">This cart quantity is invalid.</p>}
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                    <div className="inline-flex items-center rounded-xl border border-border">
                      <button
                        type="button"
                        aria-label={`Decrease ${item.name} quantity`}
                        onClick={() => updateQuantity(item, Number(item.quantity) - 1)}
                        disabled={Number(item.quantity) <= 1 || staleOrUnavailable}
                        className="rounded-l-xl p-2.5 transition hover:bg-secondary disabled:opacity-40"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="min-w-10 text-center text-sm font-semibold" aria-live="polite">{item.quantity}</span>
                      <button
                        type="button"
                        aria-label={`Increase ${item.name} quantity`}
                        onClick={() => updateQuantity(item, Number(item.quantity) + 1)}
                        disabled={staleOrUnavailable || Number(item.quantity) >= stock}
                        className="rounded-r-xl p-2.5 transition hover:bg-secondary disabled:opacity-40"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => dispatch(removeFromCart(item.id))}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Remove ${item.name} from cart`}
                    >
                      <Trash2 size={16} />
                      Remove
                    </button>
                  </div>
                </article>
              );
            })}

            <Link to="/products" className="inline-flex items-center gap-2 pt-2 text-sm font-semibold text-primary hover:underline">
              <ArrowRight size={16} className="rotate-180" />
              Continue shopping
            </Link>
          </section>

          <aside className="rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold">Order summary</h2>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Subtotal estimate</span>
                <span className="font-medium">{formatProductPrice(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Tax estimate (2.5%)</span>
                <span className="font-medium">{formatProductPrice(totals.tax)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Shipping estimate</span>
                <span className="font-medium">{totals.shipping ? formatProductPrice(totals.shipping) : "Free"}</span>
              </div>
              <div className="my-4 h-px bg-border" />
              <div className="flex justify-between gap-4 text-base font-bold">
                <span>Estimated total</span>
                <span>{formatProductPrice(totals.total)}</span>
              </div>
            </div>

            {totals.subtotal > 0 && totals.subtotal < FREE_SHIPPING_THRESHOLD && (
              <div className="mt-5 flex gap-2 rounded-xl bg-primary/5 p-3 text-xs leading-5 text-muted-foreground">
                <Truck size={16} className="mt-0.5 shrink-0 text-primary" />
                Add {formatProductPrice(FREE_SHIPPING_THRESHOLD - totals.subtotal)} more for free shipping.
              </div>
            )}

            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              Estimates only. Final prices and stock are verified by the server at checkout.
            </p>

            <button
              type="button"
              onClick={handleCheckout}
              disabled={cart.some((item) => Number(item.stock) <= 0 || !Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1 || Number(item.quantity) > Number(item.stock))}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Proceed to checkout
              <ArrowRight size={17} />
            </button>
          </aside>
        </div>
      </div>
    </main>
  );
};

export default Cart;
