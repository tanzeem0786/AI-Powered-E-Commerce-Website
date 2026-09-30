import { useEffect } from "react";
import { ArrowLeft, MapPin, Package, RotateCcw, Truck } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchOrderDetails } from "../store/slices/orderSlice.js";
import { openAuthPopup } from "../store/slices/popupSlice.js";
import { formatProductPrice } from "../components/Products/productUtils.js";
import OrderStatusBadge from "../components/Orders/OrderStatusBadge.jsx";

const formatOrderDate = (date) => {
  const parsedDate = new Date(date);
  return date && !Number.isNaN(parsedDate.getTime())
    ? new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeStyle: "short" }).format(parsedDate)
    : "Date unavailable";
};

const OrderDetails = () => {
  const { orderId } = useParams();
  const dispatch = useDispatch();
  const { authUser, isCheckingAuth } = useSelector((state) => state.auth);
  const { orderDetails, orderDetailsLoading, orderDetailsError } = useSelector((state) => state.order);

  useEffect(() => {
    if (authUser && orderId) dispatch(fetchOrderDetails(orderId));
  }, [authUser, dispatch, orderId]);

  if (isCheckingAuth || (authUser && orderDetailsLoading)) {
    return (
      <main className="min-h-[70vh] px-4 pb-16 pt-28">
        <div className="mx-auto max-w-4xl animate-pulse space-y-5">
          <div className="h-10 w-1/3 rounded bg-secondary" />
          <div className="h-48 rounded-2xl bg-secondary" />
          <div className="h-64 rounded-2xl bg-secondary" />
        </div>
      </main>
    );
  }

  if (!authUser) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-4 pb-16 pt-24">
        <section className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center text-card-foreground">
          <h1 className="text-2xl font-bold">Sign in to view this order</h1>
          <p className="mt-2 text-sm text-muted-foreground">Order details are only available to the account that placed the order.</p>
          <button type="button" onClick={() => dispatch(openAuthPopup())} className="mt-5 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground">
            Sign in
          </button>
        </section>
      </main>
    );
  }

  if (orderDetailsError || !orderDetails) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-4 pb-16 pt-24">
        <section className="w-full max-w-lg rounded-3xl border border-border bg-card p-8 text-center text-card-foreground">
          <Package size={36} className="mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Order not available</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {orderDetailsError || "This order could not be found in your account."}
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <button type="button" onClick={() => dispatch(fetchOrderDetails(orderId))} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
              <RotateCcw size={15} /> Retry
            </button>
            <Link to="/orders" className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:border-primary hover:text-primary">
              My orders
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const items = Array.isArray(orderDetails.order_items) ? orderDetails.order_items : [];
  const shipping = orderDetails.shipping_info || {};

  return (
    <main className="min-h-screen px-4 pb-16 pt-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link to="/orders" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft size={16} />
          Back to my orders
        </Link>

        <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">Order details</p>
            <h1 className="text-3xl font-bold">Your order</h1>
            <p className="mt-2 break-all font-mono text-sm text-muted-foreground">#{orderDetails.id}</p>
            <p className="mt-1 text-sm text-muted-foreground">Placed {formatOrderDate(orderDetails.created_at)}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <OrderStatusBadge label="Payment" status={orderDetails.payment_status} />
            <OrderStatusBadge label="Order" status={orderDetails.order_status} />
          </div>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-2xl border border-border bg-card p-5 text-card-foreground sm:p-6">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold">
              <Package size={19} className="text-primary" />
              Items in this order
            </h2>
            {items.length ? (
              <ul className="divide-y divide-border">
                {items.map((item) => (
                  <li key={item.order_item_id} className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center">
                    {item.image ? (
                      <img src={item.image} alt="" className="h-16 w-16 shrink-0 rounded-xl bg-secondary object-cover" />
                    ) : (
                      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-secondary"><Package size={22} /></span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{item.title || "Product"}</p>
                      <p className="mt-1 text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="font-semibold">{formatProductPrice(Number(item.price) * Number(item.quantity))}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatProductPrice(item.price)} each</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No item details are available.</p>
            )}
          </section>

          <div className="space-y-6">
            <section className="rounded-2xl border border-border bg-card p-5 text-card-foreground">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <MapPin size={19} className="text-primary" />
                Shipping address
              </h2>
              <p className="font-semibold">{shipping.full_name || "Name unavailable"}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {[shipping.address, shipping.city, shipping.state, shipping.pincode, shipping.country].filter(Boolean).join(", ") || "Address unavailable"}
              </p>
              <p className="mt-3 text-sm">
                <span className="text-muted-foreground">Phone: </span>
                <span className="font-medium">{shipping.phone || "Unavailable"}</span>
              </p>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5 text-card-foreground">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <Truck size={19} className="text-primary" />
                Status & summary
              </h2>
              <div className="space-y-3">
                <OrderStatusBadge label="Payment" status={orderDetails.payment_status} />
                <OrderStatusBadge label="Order" status={orderDetails.order_status} />
              </div>
              {orderDetails.payment_failure_reason && (
                <p className="mt-3 rounded-xl bg-destructive/10 p-3 text-xs leading-5 text-destructive">
                  {orderDetails.payment_failure_reason}
                </p>
              )}
              <div className="my-4 h-px bg-border" />
              <div className="space-y-2 text-sm">
                <p className="flex justify-between gap-3"><span className="text-muted-foreground">Subtotal</span><span>{formatProductPrice(Number(orderDetails.total_price) - Number(orderDetails.tax_price) - Number(orderDetails.shipping_price))}</span></p>
                <p className="flex justify-between gap-3"><span className="text-muted-foreground">Tax</span><span>{formatProductPrice(orderDetails.tax_price)}</span></p>
                <p className="flex justify-between gap-3"><span className="text-muted-foreground">Shipping</span><span>{Number(orderDetails.shipping_price) ? formatProductPrice(orderDetails.shipping_price) : "Free"}</span></p>
                <p className="flex justify-between gap-3 border-t border-border pt-3 text-base font-bold"><span>Total</span><span>{formatProductPrice(orderDetails.total_price)}</span></p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
};

export default OrderDetails;
