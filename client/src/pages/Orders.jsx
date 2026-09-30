import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { ArrowRight, ClipboardList, Package, RotateCcw } from "lucide-react";
import { fetchMyOrders } from "../store/slices/orderSlice.js";
import { toggleAuthPopup } from "../store/slices/popupSlice.js";
import OrderStatusBadge from "../components/Orders/OrderStatusBadge.jsx";
import { formatProductPrice } from "../components/Products/productUtils.js";

const formatOrderDate = (date) => {
  if (!date) return "Date unavailable";
  const parsedDate = new Date(date);
  return Number.isNaN(parsedDate.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(parsedDate);
};

const Orders = () => {
  const dispatch = useDispatch();
  const { authUser, isCheckingAuth } = useSelector((state) => state.auth);
  const { myOrders, ordersLoading, ordersError } = useSelector((state) => state.order);

  useEffect(() => {
    if (authUser) dispatch(fetchMyOrders());
  }, [authUser, dispatch]);

  if (isCheckingAuth) {
    return <main className="flex min-h-[70vh] items-center justify-center pt-20 text-muted-foreground">Restoring your account…</main>;
  }

  if (!authUser) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-4 pb-16 pt-24">
        <section className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center text-card-foreground">
          <ClipboardList size={36} className="mx-auto mb-4 text-primary" />
          <h1 className="text-2xl font-bold">Sign in to view your orders</h1>
          <p className="mt-2 text-sm text-muted-foreground">Your order history is private to your account.</p>
          <button
            type="button"
            onClick={() => dispatch(toggleAuthPopup())}
            className="mt-5 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground hover:opacity-90"
          >
            Sign in
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 pb-16 pt-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">Your account</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">My orders</h1>
          <p className="mt-2 text-muted-foreground">A history of purchases made with your account.</p>
        </header>

        {ordersLoading ? (
          <div className="space-y-4" aria-label="Loading orders">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="h-48 animate-pulse rounded-2xl border border-border bg-card" />
            ))}
          </div>
        ) : ordersError ? (
          <section className="rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center" role="alert">
            <p className="font-semibold">We couldn’t load your orders</p>
            <p className="mt-2 text-sm text-muted-foreground">{ordersError}</p>
            <button
              type="button"
              onClick={() => dispatch(fetchMyOrders())}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              <RotateCcw size={16} />
              Retry
            </button>
          </section>
        ) : myOrders.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-border px-6 py-16 text-center">
            <Package size={38} className="mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold">No orders yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">When you place an order, it will appear here.</p>
            <Link to="/products" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
              Browse products <ArrowRight size={16} />
            </Link>
          </section>
        ) : (
          <div className="space-y-5">
            {myOrders.map((order) => {
              const items = Array.isArray(order.order_items) ? order.order_items : [];
              return (
                <article key={order.id} className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
                  <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order ID</p>
                      <p className="mt-1 break-all font-mono text-sm font-semibold">{order.id}</p>
                      <p className="mt-1 text-sm text-muted-foreground">Placed {formatOrderDate(order.created_at)}</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <OrderStatusBadge label="Payment" status={order.payment_status} />
                      <OrderStatusBadge label="Order" status={order.order_status} />
                    </div>
                  </div>

                  <div className="grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_220px]">
                    <div>
                      <p className="mb-3 text-sm font-semibold">Items ({items.length})</p>
                      {items.length ? (
                        <ul className="space-y-3">
                          {items.slice(0, 3).map((item) => (
                            <li key={item.order_item_id} className="flex min-w-0 items-center gap-3">
                              {item.image ? (
                                <img src={item.image} alt="" className="h-12 w-12 shrink-0 rounded-lg bg-secondary object-cover" />
                              ) : (
                                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-secondary"><Package size={18} /></span>
                              )}
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium">{item.title || "Product"}</span>
                                <span className="text-xs text-muted-foreground">Qty {item.quantity}</span>
                              </span>
                              <span className="shrink-0 text-sm font-medium">{formatProductPrice(Number(item.price) * Number(item.quantity))}</span>
                            </li>
                          ))}
                          {items.length > 3 && (
                            <li className="text-xs text-muted-foreground">and {items.length - 3} more item{items.length - 3 === 1 ? "" : "s"}</li>
                          )}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">No item information available.</p>
                      )}
                    </div>

                    <div className="flex flex-col justify-between gap-4 border-t border-border pt-4 md:border-l md:border-t-0 md:pl-5 md:pt-0">
                      <div>
                        <p className="text-sm text-muted-foreground">Order total</p>
                        <p className="mt-1 text-2xl font-bold">{formatProductPrice(order.total_price)}</p>
                      </div>
                      <Link
                        to={`/orders/${order.id}`}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition hover:border-primary hover:text-primary"
                      >
                        View order details <ArrowRight size={16} />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
};

export default Orders;
