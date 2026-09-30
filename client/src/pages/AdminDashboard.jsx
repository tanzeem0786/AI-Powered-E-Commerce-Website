import { createElement, useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, BarChart3, Boxes, Check,
  ChevronLeft, ChevronRight, CircleDollarSign, Eye, LayoutDashboard, LoaderCircle,
  Package, Pencil, Plus, RefreshCw, ShoppingBag, Trash2, Users, X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { axiosInstance } from "../lib/axios.js";
import { formatProductPrice, getProductImage } from "../components/Products/productUtils.js";
import { openAuthPopup } from "../store/slices/popupSlice.js";
import { createProduct, deleteProduct, fetchProducts, updateProduct } from "../store/slices/productSlice.js";
import { deleteAdminOrder, fetchAdminOrders, updateAdminOrderStatus } from "../store/slices/orderSlice.js";

const sections = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "inventory", label: "Inventory", icon: Boxes },
  { id: "users", label: "Users", icon: Users },
  { id: "products", label: "Products", icon: Package },
  { id: "orders", label: "Orders", icon: ShoppingBag },
];

const orderStatuses = ["Processing", "Shipped", "Delivered", "Cancelled"];
const PAGE_SIZE = 10;
const cardClass = "rounded-2xl border border-border bg-card text-card-foreground";
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
const subtleButtonClass = "inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50";
const inputClass = "w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";

const errorMessage = (error, fallback) => error.response?.data?.message || error.message || fallback;
const formatRupees = (amount) => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
}).format(Number(amount) || 0);
const formatDate = (date) => {
  const parsed = new Date(date);
  return date && !Number.isNaN(parsed.getTime())
    ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(parsed)
    : "—";
};
const avatarUrl = (user) => user.avatar?.url || user.avatar?.secure_url || "";
const statusTone = (status) => ({
  Paid: "bg-emerald-500/10 text-emerald-600",
  Delivered: "bg-emerald-500/10 text-emerald-600",
  Shipped: "bg-sky-500/10 text-sky-600",
  Processing: "bg-amber-500/10 text-amber-600",
  Pending: "bg-amber-500/10 text-amber-600",
  "Limited Stock": "bg-amber-500/10 text-amber-600",
  "Out of Stock": "bg-red-500/10 text-red-500",
  Failed: "bg-red-500/10 text-red-500",
  Cancelled: "bg-red-500/10 text-red-500",
}[status] || "bg-secondary text-muted-foreground");

const StatusPill = ({ status }) => (
  <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(status)}`}>
    {status || "Pending"}
  </span>
);

const LoadingRows = ({ rows = 4 }) => (
  <div className="space-y-3 p-5" role="status" aria-label="Loading dashboard data">
    {Array.from({ length: rows }, (_, index) => (
      <div key={index} className="h-12 animate-pulse rounded-xl bg-secondary/70" />
    ))}
  </div>
);

const EmptyState = ({ message }) => (
  <div className="px-5 py-12 text-center text-sm text-muted-foreground">{message}</div>
);

const ConfirmDialog = ({ dialog, busy, onClose, onConfirm }) => {
  if (!dialog) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <section className={`${cardClass} w-full max-w-md p-6 shadow-2xl`}>
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle size={21} />
        </div>
        <h2 id="confirm-title" className="text-xl font-bold">{dialog.title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{dialog.message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className={subtleButtonClass} onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="inline-flex items-center justify-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground disabled:opacity-50" onClick={onConfirm} disabled={busy}>
            {busy && <LoaderCircle size={16} className="animate-spin" />}
            Delete
          </button>
        </div>
      </section>
    </div>
  );
};

const RevenueChart = ({ sales }) => {
  const points = useMemo(() => {
    const series = (sales || []).slice(-12);
    if (!series.length) return [];
    const max = Math.max(...series.map((item) => Number(item.totalSales) || 0), 1);
    return series.map((item, index) => ({
      ...item,
      x: series.length === 1 ? 300 : 34 + (index * 532) / (series.length - 1),
      y: 174 - ((Number(item.totalSales) || 0) / max) * 140,
    }));
  }, [sales]);
  const path = points.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" ");

  if (!points.length) return <EmptyState message="No paid sales have been recorded yet." />;
  return (
    <div className="px-4 pb-5 pt-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Sales (INR)</span><span>Last {points.length} months</span>
      </div>
      <svg viewBox="0 0 600 220" role="img" aria-label="Monthly paid sales line chart" className="mt-3 h-56 w-full overflow-visible">
        {[34, 81, 128, 175].map((y) => <line key={y} x1="28" x2="575" y1={y} y2={y} stroke="hsl(var(--border))" strokeDasharray="4 5" />)}
        <path d={`${path} L ${points.at(-1).x} 180 L ${points[0].x} 180 Z`} fill="hsl(var(--primary) / 0.12)" />
        <path d={path} fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point) => (
          <g key={`${point.month}-${point.x}`}>
            <circle cx={point.x} cy={point.y} r="4" fill="hsl(var(--primary))" />
            <text x={point.x} y="207" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10">
              {(point.month || "").split(" ")[0]}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

const ProductForm = ({ product, saving, onCancel, onSave }) => {
  const [form, setForm] = useState({
    name: product?.name || "",
    description: product?.description || "",
    price: product ? (Number(product.price) / 100).toFixed(2) : "",
    category: product?.category || "",
    stock: product?.stock ?? 0,
  });
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);

  useEffect(() => {
    const urls = images.map((image) => URL.createObjectURL(image));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [images]);

  const handleChange = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave(form, images);
      }}
      className={`${cardClass} mb-6 p-5 sm:p-6`}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{product ? "Update catalog" : "New catalog item"}</p>
          <h2 className="mt-1 text-xl font-bold">{product ? "Edit product" : "Create product"}</h2>
        </div>
        <button type="button" onClick={onCancel} aria-label="Close product form" className="rounded-lg p-2 text-muted-foreground hover:bg-secondary"><X size={18} /></button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1.5 text-sm font-medium">Product name
          <input className={inputClass} name="name" value={form.name} onChange={handleChange} minLength="2" maxLength="255" required />
        </label>
        <label className="space-y-1.5 text-sm font-medium">Category
          <input className={inputClass} name="category" value={form.category} onChange={handleChange} maxLength="100" required />
        </label>
        <label className="space-y-1.5 text-sm font-medium">Price (₹)
          <input className={inputClass} type="number" name="price" value={form.price} onChange={handleChange} min="0.01" step="0.01" required />
        </label>
        <label className="space-y-1.5 text-sm font-medium">Stock quantity
          <input className={inputClass} type="number" name="stock" value={form.stock} onChange={handleChange} min="0" step="1" required />
        </label>
        <label className="space-y-1.5 text-sm font-medium md:col-span-2">Description
          <textarea className={`${inputClass} min-h-24 resize-y`} name="description" value={form.description} onChange={handleChange} required />
        </label>
        {!product && (
          <label className="space-y-2 text-sm font-medium md:col-span-2">
            Product images <span className="font-normal text-muted-foreground">(multiple images allowed, up to 5 MB each)</span>
            <input
              className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary`}
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => {
                const selected = Array.from(event.target.files || []);
                if (selected.some((file) => !file.type.startsWith("image/") || file.size > 5 * 1024 * 1024)) {
                  toast.error("Choose image files that are no larger than 5 MB each.");
                  event.target.value = "";
                  setImages([]);
                  return;
                }
                setImages(selected);
              }}
            />
            {previews.length > 0 && (
              <span className="flex flex-wrap gap-2">
                {previews.map((preview) => <img key={preview} src={preview} alt="Selected product preview" className="h-16 w-16 rounded-lg object-cover" />)}
              </span>
            )}
          </label>
        )}
      </div>
      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <button className={subtleButtonClass} type="button" onClick={onCancel} disabled={saving}>Cancel</button>
        <button className={buttonClass} type="submit" disabled={saving}>
          {saving ? <LoaderCircle size={16} className="animate-spin" /> : product ? <Check size={16} /> : <Plus size={16} />}
          {saving ? "Saving…" : product ? "Save changes" : "Create product"}
        </button>
      </div>
    </form>
  );
};

const AdminDashboard = () => {
  const dispatch = useDispatch();
  const { authUser, isCheckingAuth } = useSelector((state) => state.auth);
  const productState = useSelector((state) => state.product);
  const orderState = useSelector((state) => state.order);
  const [section, setSection] = useState("overview");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [products, setProducts] = useState([]);
  const [productsTotal, setProductsTotal] = useState(0);
  const [productsPage, setProductsPage] = useState(1);
  const orders = orderState.adminOrders;
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [productToEdit, setProductToEdit] = useState(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [serverForbidden, setServerForbidden] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});

  const setSectionLoading = (key, value) => setLoading((current) => ({ ...current, [key]: value }));
  const setSectionError = (key, message) => setErrors((current) => ({ ...current, [key]: message }));

  const loadStats = useCallback(async () => {
    setSectionLoading("overview", true);
    setSectionError("overview", "");
    try {
      const response = await axiosInstance.get("/admin/fetch/dashboard-stats");
      setStats(response.data);
    } catch (error) {
      const message = errorMessage(error, "Unable to load dashboard statistics.");
      setSectionError("overview", message);
      toast.error(message);
    } finally {
      setSectionLoading("overview", false);
    }
  }, []);

  const loadUsers = useCallback(async (page = usersPage) => {
    setSectionLoading("users", true);
    setSectionError("users", "");
    try {
      const response = await axiosInstance.get("/admin/getallusers", { params: { page } });
      setUsers(response.data.users || []);
      setUsersTotal(Number(response.data.totalUsers) || 0);
    } catch (error) {
      const message = errorMessage(error, "Unable to load users.");
      setSectionError("users", message);
      toast.error(message);
    } finally {
      setSectionLoading("users", false);
    }
  }, [usersPage]);

  const loadProducts = useCallback(async (page = productsPage) => {
    setSectionLoading("products", true);
    setSectionError("products", "");
    try {
      const response = await dispatch(fetchProducts({ page })).unwrap();
      setProducts(response.products || []);
      setProductsTotal(Number(response.totalProducts) || 0);
    } catch (error) {
      setSectionError("products", errorMessage(error, "Unable to load products."));
    } finally {
      setSectionLoading("products", false);
    }
  }, [dispatch, productsPage]);

  const loadOrders = useCallback(async () => {
    setSectionLoading("orders", true);
    setSectionError("orders", "");
    try {
      await dispatch(fetchAdminOrders()).unwrap();
    } catch (error) {
      setSectionError("orders", typeof error === "string" ? error : "Unable to load orders.");
    } finally {
      setSectionLoading("orders", false);
    }
  }, [dispatch]);

  useEffect(() => {
    if (authUser?.role === "Admin") loadStats();
  }, [authUser?.role, loadStats]);

  useEffect(() => {
    const handleForbidden = () => setServerForbidden(true);
    window.addEventListener("app:forbidden", handleForbidden);
    return () => window.removeEventListener("app:forbidden", handleForbidden);
  }, []);

  useEffect(() => {
    if (authUser?.role !== "Admin") return;
    if (section === "users") loadUsers(usersPage);
    if (section === "products") loadProducts(productsPage);
    if (section === "orders") loadOrders();
  }, [authUser?.role, loadOrders, loadProducts, loadUsers, productsPage, section, usersPage]);

  const requestDelete = (kind, item) => {
    const label = kind === "user" ? item.name : kind === "product" ? item.name : `order #${item.id}`;
    setConfirmDialog({
      kind,
      id: item.id,
      title: `Delete ${kind}?`,
      message: `Are you sure you want to permanently delete ${label}? This action cannot be undone.`,
    });
  };

  const confirmDelete = async () => {
    if (!confirmDialog) return;
    const { kind, id } = confirmDialog;
    setBusyAction(`delete-${kind}-${id}`);
    try {
      if (kind === "product") await dispatch(deleteProduct(id)).unwrap();
      else if (kind === "order") await dispatch(deleteAdminOrder(id)).unwrap();
      else {
        const response = await axiosInstance.delete(`/admin/delete/${id}`);
        toast.success(response.data.message || "User deleted.");
      }
      setConfirmDialog(null);
      if (kind === "user") {
        loadStats();
        const nextPage = users.length === 1 && usersPage > 1 ? usersPage - 1 : usersPage;
        if (nextPage !== usersPage) setUsersPage(nextPage);
        else loadUsers(usersPage);
      }
      if (kind === "product") {
        loadStats();
        const nextPage = products.length === 1 && productsPage > 1 ? productsPage - 1 : productsPage;
        if (nextPage !== productsPage) setProductsPage(nextPage);
        else loadProducts(productsPage);
      }
      if (kind === "order") loadStats();
    } catch (error) {
      if (typeof error !== "string") toast.error(errorMessage(error, `Unable to delete ${kind}.`));
    } finally {
      setBusyAction("");
    }
  };

  const saveProduct = async (form, images) => {
    const price = Number(form.price);
    const stock = Number(form.stock);
    if (!Number.isFinite(price) || price <= 0 || !Number.isInteger(stock) || stock < 0) {
      toast.error("Enter a valid positive price and whole-number stock quantity.");
      return;
    }
    try {
      const normalizedForm = {
        name: form.name.trim(),
        description: form.description.trim(),
        price,
        category: form.category.trim(),
        stock,
      };
      if (productToEdit) {
        await dispatch(updateProduct({ productId: productToEdit.id, form: normalizedForm })).unwrap();
      } else {
        await dispatch(createProduct({ form: normalizedForm, images })).unwrap();
        setProductsPage(1);
      }
      loadStats();
      setShowProductForm(false);
      setProductToEdit(null);
      if (productToEdit) loadProducts(productsPage);
      else if (productsPage === 1) loadProducts(1);
    } catch (error) {
      if (typeof error !== "string") toast.error(errorMessage(error, "Unable to save product."));
    }
  };

  const changeOrderStatus = async (orderId, status) => {
    try {
      await dispatch(updateAdminOrderStatus({ orderId, status })).unwrap();
    } catch (error) {
      if (typeof error !== "string") toast.error(errorMessage(error, "Unable to update order status."));
      loadOrders();
    }
  };

  const refreshSection = () => {
    if (section === "overview" || section === "inventory") loadStats();
    if (section === "users") loadUsers(usersPage);
    if (section === "products") loadProducts(productsPage);
    if (section === "orders") loadOrders();
  };

  if (isCheckingAuth) {
    return <main className="min-h-[70vh] px-4 pb-16 pt-28"><div className="mx-auto max-w-7xl animate-pulse space-y-5"><div className="h-12 w-1/3 rounded-xl bg-secondary" /><div className="h-72 rounded-2xl bg-secondary" /></div></main>;
  }

  if (authUser?.role !== "Admin") {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-4 pb-16 pt-24">
        <section className={`${cardClass} w-full max-w-lg p-8 text-center`}>
          <AlertTriangle size={34} className="mx-auto mb-4 text-amber-500" />
          <h1 className="text-2xl font-bold">{authUser ? "Administrator access required" : "Sign in required"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{authUser ? "This dashboard is only available to administrator accounts." : "Sign in with an administrator account to manage the store."}</p>
          <div className="mt-6 flex justify-center gap-3">
            {!authUser && <button type="button" onClick={() => dispatch(openAuthPopup())} className={buttonClass}>Sign in</button>}
            <Link to="/" className={subtleButtonClass}>Return to storefront</Link>
          </div>
        </section>
      </main>
    );
  }

  if (serverForbidden) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-4 pb-16 pt-24">
        <section className={`${cardClass} w-full max-w-lg p-8 text-center`}>
          <AlertTriangle size={34} className="mx-auto mb-4 text-amber-500" />
          <h1 className="text-2xl font-bold">Administrator access denied</h1>
          <p className="mt-2 text-sm text-muted-foreground">The server denied access to this admin resource. Your account is not authorized to continue.</p>
          <Link to="/" className={`${subtleButtonClass} mt-6`}>Return to storefront</Link>
        </section>
      </main>
    );
  }

  const totalUsersPages = Math.ceil(usersTotal / PAGE_SIZE);
  const totalProductsPages = Math.ceil(productsTotal / PAGE_SIZE);
  const statusCounts = stats?.orderStatusCount || {};
  const statusesTotal = Object.values(statusCounts).reduce((sum, count) => sum + (Number(count) || 0), 0);
  const statusColors = { Processing: "#f59e0b", Shipped: "#0ea5e9", Delivered: "#10b981", Cancelled: "#ef4444" };
  let chartCursor = 0;
  const statusGradient = Object.entries(statusCounts).map(([status, count]) => {
    const start = chartCursor;
    chartCursor += statusesTotal ? (Number(count) / statusesTotal) * 100 : 0;
    return `${statusColors[status] || "#64748b"} ${start}% ${chartCursor}%`;
  }).join(", ");
  const bestSellerMax = Math.max(...(stats?.topSellingProducts || []).map((item) => Number(item.total_sold) || 0), 1);
  const revenueGrowth = String(stats?.revenueGrowth || "0%");
  const growthIsPositive = !revenueGrowth.startsWith("-");
  const inventory = stats?.lowStockProducts || [];

  return (
    <main className="min-h-screen px-4 pb-16 pt-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">Store administration</p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Admin dashboard</h1>
            <p className="mt-2 text-sm text-muted-foreground">Monitor sales, inventory, customers, products, and orders.</p>
          </div>
          <button type="button" onClick={refreshSection} className={subtleButtonClass} disabled={Object.values(loading).some(Boolean)}>
            <RefreshCw size={16} className={Object.values(loading).some(Boolean) ? "animate-spin" : ""} /> Refresh
          </button>
        </header>

        <div className="mb-6 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Admin dashboard sections">
          {sections.map(({ id, label, icon }) => (
            <button
              type="button"
              key={id}
              role="tab"
              aria-selected={section === id}
              onClick={() => setSection(id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${section === id ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground hover:text-foreground"}`}
            >
              {createElement(icon, { size: 16 })}{label}
            </button>
          ))}
        </div>

        {(section === "overview" || section === "inventory") && errors.overview && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm" role="alert">
            <span>{errors.overview}</span><button onClick={loadStats} className={subtleButtonClass}><RefreshCw size={15} /> Retry</button>
          </div>
        )}

        {section === "overview" && (loading.overview && !stats ? <LoadingRows rows={7} /> : stats && (
          <div className="space-y-6">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { title: "Total revenue", value: formatRupees(stats.totalRevenueAllTime), note: "From successful payments", icon: CircleDollarSign, color: "text-primary" },
                { title: "Today's revenue", value: formatRupees(stats.todayRevenue), note: "Paid orders today", icon: BarChart3, color: "text-emerald-500" },
                { title: "Yesterday's revenue", value: formatRupees(stats.yesterdayRevenue), note: "Paid orders yesterday", icon: BarChart3, color: "text-sky-500" },
                { title: "Current month sales", value: formatRupees(stats.currentMonthSales), note: "Paid orders this month", icon: CircleDollarSign, color: "text-primary" },
                { title: "Total users", value: Number(stats.totalUsersCount || 0).toLocaleString("en-IN"), note: "Registered customers", icon: Users, color: "text-sky-500" },
                { title: "New users this month", value: Number(stats.newUsersThisMonth || 0).toLocaleString("en-IN"), note: "Joined this month", icon: Users, color: "text-emerald-500" },
                { title: "Revenue growth", value: revenueGrowth, note: "Compared with previous month", icon: growthIsPositive ? ArrowUpRight : ArrowDownRight, color: growthIsPositive ? "text-emerald-500" : "text-red-500" },
              ].map(({ title, value, note, icon, color }) => (
                <article key={title} className={`${cardClass} p-5`}>
                  <div className="flex items-start justify-between gap-4">
                    <div><p className="text-sm text-muted-foreground">{title}</p><p className="mt-2 text-2xl font-bold tracking-tight">{value}</p><p className="mt-2 text-xs text-muted-foreground">{note}</p></div>
                    <span className={`rounded-xl bg-secondary p-3 ${color}`}>{createElement(icon, { size: 20 })}</span>
                  </div>
                </article>
              ))}
            </section>

            <section className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.8fr)]">
              <article className={cardClass}>
                <div className="flex items-center justify-between border-b border-border p-5">
                  <div><h2 className="font-semibold">Monthly sales</h2><p className="mt-1 text-xs text-muted-foreground">Confirmed paid orders</p></div>
                  <BarChart3 size={19} className="text-primary" />
                </div>
                <RevenueChart sales={stats.monthtlySales} />
              </article>
              <article className={`${cardClass} p-5`}>
                <h2 className="font-semibold">Order status</h2>
                <p className="mt-1 text-xs text-muted-foreground">{statusesTotal} total orders</p>
                <div className="my-6 flex items-center justify-center">
                  <div className="relative flex h-44 w-44 items-center justify-center rounded-full" style={{ background: statusesTotal ? `conic-gradient(${statusGradient})` : "hsl(var(--secondary))" }}>
                    <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-card">
                      <span className="text-2xl font-bold">{statusesTotal}</span><span className="text-xs text-muted-foreground">orders</span>
                    </div>
                  </div>
                </div>
                <ul className="grid grid-cols-2 gap-x-3 gap-y-2">
                  {Object.entries(statusCounts).map(([status, count]) => (
                    <li key={status} className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: statusColors[status] || "#64748b" }} />{status}</span>
                      <span className="font-semibold">{count}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
              <article className={cardClass}>
                <div className="flex items-center justify-between border-b border-border p-5">
                  <div><h2 className="font-semibold">Top-selling products</h2><p className="mt-1 text-xs text-muted-foreground">By quantity in paid orders</p></div>
                  <button type="button" onClick={() => setSection("products")} className="text-xs font-semibold text-primary hover:underline">Manage products</button>
                </div>
                {stats.topSellingProducts?.length ? (
                  <ul className="divide-y divide-border px-5">
                    {stats.topSellingProducts.map((product, index) => (
                      <li key={`${product.name}-${index}`} className="flex items-center gap-3 py-3">
                        {product.image ? <img src={product.image} alt="" className="h-11 w-11 rounded-lg bg-secondary object-cover" /> : <span className="grid h-11 w-11 place-items-center rounded-lg bg-secondary"><Package size={18} /></span>}
                        <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{product.name}</p><p className="text-xs text-muted-foreground">{product.category || "Uncategorized"}</p></div>
                        <div className="w-24 text-right"><p className="text-sm font-semibold">{Number(product.total_sold) || 0} sold</p><div className="mt-1 h-1.5 rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (Number(product.total_sold) / bestSellerMax) * 100)}%` }} /></div></div>
                      </li>
                    ))}
                  </ul>
                ) : <EmptyState message="No paid product sales yet." />}
              </article>
              <article className={cardClass}>
                <div className="flex items-center justify-between border-b border-border p-5">
                  <div><h2 className="font-semibold">Low-stock alerts</h2><p className="mt-1 text-xs text-muted-foreground">Products with five or fewer units</p></div>
                  <button type="button" onClick={() => setSection("inventory")} className="text-xs font-semibold text-primary hover:underline">View inventory</button>
                </div>
                {inventory.length ? (
                  <ul className="divide-y divide-border px-5">
                    {inventory.slice(0, 5).map((product) => (
                      <li key={product.id} className="flex items-center justify-between gap-4 py-3">
                        <div className="min-w-0"><p className="truncate text-sm font-medium">{product.name}</p><p className="text-xs text-muted-foreground">{product.category}</p></div>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${Number(product.stock) === 0 ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-600"}`}>{Number(product.stock) === 0 ? "Out of stock" : `${product.stock} left`}</span>
                      </li>
                    ))}
                  </ul>
                ) : <EmptyState message="Inventory is healthy. No low-stock items." />}
              </article>
            </section>
          </div>
        ))}

        {section === "inventory" && (
          <section className={cardClass}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
              <div><h2 className="text-lg font-semibold">Inventory health</h2><p className="mt-1 text-sm text-muted-foreground">{inventory.length} products have five or fewer units; {stats?.outOfStockProducts?.length || 0} are out of stock.</p></div>
              <button type="button" onClick={() => setSection("products")} className={subtleButtonClass}><Pencil size={15} /> Manage products</button>
            </div>
            {loading.overview && !stats ? <LoadingRows /> : inventory.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead className="bg-secondary/50 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-5 py-3">Product</th><th className="px-5 py-3">Category</th><th className="px-5 py-3">Stock</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Action</th></tr></thead>
                  <tbody className="divide-y divide-border">
                    {inventory.map((product) => (
                      <tr key={product.id}>
                        <td className="px-5 py-4 font-medium">{product.name}</td><td className="px-5 py-4 text-muted-foreground">{product.category}</td>
                        <td className="px-5 py-4 font-semibold">{product.stock}</td><td className="px-5 py-4"><StatusPill status={Number(product.stock) === 0 ? "Out of Stock" : "Limited Stock"} /></td>
                        <td className="px-5 py-4"><button onClick={() => setSection("products")} className="text-xs font-semibold text-primary hover:underline">Update stock</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <EmptyState message={errors.overview || "No low-stock or out-of-stock products."} />}
          </section>
        )}

        {section === "users" && (
          <section className={cardClass}>
            <div className="flex items-center justify-between border-b border-border p-5">
              <div><h2 className="text-lg font-semibold">Customer accounts</h2><p className="mt-1 text-sm text-muted-foreground">{usersTotal.toLocaleString("en-IN")} registered users</p></div>
              <Users size={20} className="text-primary" />
            </div>
            {errors.users ? <div role="alert" className="p-5 text-sm text-destructive">{errors.users}<button onClick={() => loadUsers(usersPage)} className="ml-3 underline">Retry</button></div> : loading.users ? <LoadingRows /> : users.length ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left text-sm">
                    <thead className="bg-secondary/50 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Email</th><th className="px-5 py-3">Joined</th><th className="px-5 py-3 text-right">Action</th></tr></thead>
                    <tbody className="divide-y divide-border">
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td className="px-5 py-4"><div className="flex items-center gap-3">{avatarUrl(user) ? <img src={avatarUrl(user)} alt="" className="h-10 w-10 rounded-full bg-secondary object-cover" /> : <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 font-semibold text-primary">{user.name?.slice(0, 1)?.toUpperCase() || "U"}</span>}<span className="font-medium">{user.name}</span></div></td>
                          <td className="px-5 py-4 text-muted-foreground">{user.email}</td><td className="px-5 py-4 text-muted-foreground">{formatDate(user.created_at)}</td>
                          <td className="px-5 py-4 text-right"><button aria-label={`Delete ${user.name}`} onClick={() => requestDelete("user", user)} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 size={17} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pager page={usersPage} pages={totalUsersPages} onChange={setUsersPage} />
              </>
            ) : <EmptyState message="No customer accounts found." />}
          </section>
        )}

        {section === "products" && (
          <>
            {showProductForm && <ProductForm product={productToEdit} saving={productState.creatingProduct || productState.updatingProduct} onCancel={() => { setShowProductForm(false); setProductToEdit(null); }} onSave={saveProduct} />}
            <section className={cardClass}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
                <div><h2 className="text-lg font-semibold">Product catalog</h2><p className="mt-1 text-sm text-muted-foreground">{productsTotal.toLocaleString("en-IN")} products</p></div>
                {!showProductForm && <button type="button" className={buttonClass} onClick={() => { setProductToEdit(null); setShowProductForm(true); }}><Plus size={16} /> Add product</button>}
              </div>
              {errors.products ? <div role="alert" className="p-5 text-sm text-destructive">{errors.products}<button onClick={() => loadProducts(productsPage)} className="ml-3 underline">Retry</button></div> : loading.products ? <LoadingRows /> : products.length ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left text-sm">
                      <thead className="bg-secondary/50 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-5 py-3">Product</th><th className="px-5 py-3">Category</th><th className="px-5 py-3">Price</th><th className="px-5 py-3">Stock</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
                      <tbody className="divide-y divide-border">
                        {products.map((product) => (
                          <tr key={product.id}>
                            <td className="px-5 py-3"><div className="flex items-center gap-3"><img src={getProductImage(product)} alt="" className="h-12 w-12 rounded-lg bg-secondary object-cover" /><span className="max-w-64 truncate font-medium">{product.name}</span></div></td>
                            <td className="px-5 py-3 text-muted-foreground">{product.category}</td><td className="px-5 py-3 font-medium">{formatProductPrice(product.price)}</td>
                            <td className="px-5 py-3"><span className={Number(product.stock) === 0 ? "font-semibold text-destructive" : Number(product.stock) <= 5 ? "font-semibold text-amber-600" : ""}>{product.stock}</span></td>
                            <td className="px-5 py-3"><div className="flex justify-end gap-1">
                              <button aria-label={`Edit ${product.name}`} onClick={() => { setProductToEdit(product); setShowProductForm(true); }} className="rounded-lg p-2 text-muted-foreground hover:bg-primary/10 hover:text-primary"><Pencil size={16} /></button>
                              <button aria-label={`Delete ${product.name}`} onClick={() => requestDelete("product", product)} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 size={16} /></button>
                            </div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pager page={productsPage} pages={totalProductsPages} onChange={setProductsPage} />
                </>
              ) : <EmptyState message="No products are in the catalog yet. Add a product to get started." />}
            </section>
          </>
        )}

        {section === "orders" && (
          <section className={cardClass}>
            <div className="flex items-center justify-between border-b border-border p-5">
              <div><h2 className="text-lg font-semibold">All orders</h2><p className="mt-1 text-sm text-muted-foreground">{orders.length} orders</p></div>
              <ShoppingBag size={20} className="text-primary" />
            </div>
            {errors.orders || orderState.adminOrdersError ? <div role="alert" className="p-5 text-sm text-destructive">{errors.orders || orderState.adminOrdersError}<button onClick={loadOrders} className="ml-3 underline">Retry</button></div> : (loading.orders || orderState.fetchingOrders) ? <LoadingRows rows={6} /> : orders.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="bg-secondary/50 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-5 py-3">Order / buyer</th><th className="px-5 py-3">Date</th><th className="px-5 py-3">Total</th><th className="px-5 py-3">Payment</th><th className="px-5 py-3">Order status</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
                  <tbody className="divide-y divide-border">
                    {orders.map((order) => (
                      <tr key={order.id}>
                        <td className="px-5 py-4"><button className="max-w-56 truncate text-left font-mono text-xs text-primary hover:underline" onClick={() => setSelectedOrder(order)}>#{order.id}</button><p className="mt-1 font-medium">{order.buyer_name || "Customer"}</p><p className="text-xs text-muted-foreground">{order.buyer_email || "—"}</p></td>
                        <td className="px-5 py-4 text-muted-foreground">{formatDate(order.created_at)}</td>
                        <td className="px-5 py-4 font-semibold">{formatProductPrice(order.total_price)}</td>
                        <td className="px-5 py-4"><StatusPill status={order.payment_status || "Pending"} /></td>
                        <td className="px-5 py-4"><select aria-label={`Order status for ${order.id}`} className={`${inputClass} w-36 py-2`} value={order.order_status} disabled={orderState.updatingOrderStatus} onChange={(event) => changeOrderStatus(order.id, event.target.value)}>{orderStatuses.map((status) => <option key={status}>{status}</option>)}</select></td>
                        <td className="px-5 py-4"><div className="flex justify-end gap-1">
                          <button aria-label={`View order ${order.id}`} onClick={() => setSelectedOrder(order)} className="rounded-lg p-2 text-muted-foreground hover:bg-primary/10 hover:text-primary"><Eye size={17} /></button>
                          <button aria-label={`Delete order ${order.id}`} onClick={() => requestDelete("order", order)} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 size={17} /></button>
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <EmptyState message="There are no orders to display." />}
          </section>
        )}
      </div>

      <ConfirmDialog
        dialog={confirmDialog}
        busy={Boolean(confirmDialog && (
          busyAction === `delete-${confirmDialog.kind}-${confirmDialog.id}` ||
          (confirmDialog.kind === "product" && productState.deletingProduct) ||
          (confirmDialog.kind === "order" && orderState.deletingOrder)
        ))}
        onClose={() => setConfirmDialog(null)}
        onConfirm={confirmDelete}
      />
      {selectedOrder && <OrderDrawer order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
    </main>
  );
};

const Pager = ({ page, pages, onChange }) => pages > 1 && (
  <nav aria-label="Table pagination" className="flex items-center justify-center gap-3 border-t border-border px-4 py-4">
    <button type="button" onClick={() => onChange(Math.max(1, page - 1))} disabled={page <= 1} aria-label="Previous page" className="rounded-lg border border-border p-2 disabled:opacity-40"><ChevronLeft size={17} /></button>
    <span className="text-sm text-muted-foreground">Page <strong className="text-foreground">{page}</strong> of {pages}</span>
    <button type="button" onClick={() => onChange(Math.min(pages, page + 1))} disabled={page >= pages} aria-label="Next page" className="rounded-lg border border-border p-2 disabled:opacity-40"><ChevronRight size={17} /></button>
  </nav>
);

const OrderDrawer = ({ order, onClose }) => {
  const shipping = order.shipping_info || {};
  const items = order.order_items || [];
  return (
    <div className="fixed inset-0 z-[75] flex justify-end bg-black/55 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="admin-order-title">
      <button className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close order details" />
      <aside className="relative z-10 h-full w-full max-w-xl overflow-y-auto border-l border-border bg-background p-5 shadow-2xl sm:p-7">
        <header className="mb-6 flex items-start justify-between gap-3">
          <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Admin order details</p><h2 id="admin-order-title" className="mt-1 text-xl font-bold">Order information</h2><p className="mt-1 break-all font-mono text-xs text-muted-foreground">#{order.id}</p></div>
          <button type="button" onClick={onClose} aria-label="Close drawer" className="rounded-lg p-2 hover:bg-secondary"><X size={19} /></button>
        </header>
        <div className="space-y-5">
          <section className={`${cardClass} p-5`}>
            <div className="flex flex-wrap gap-2"><StatusPill status={order.payment_status || "Pending"} /><StatusPill status={order.order_status} /></div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-muted-foreground">Buyer</dt><dd className="mt-1 font-medium">{order.buyer_name || "Customer"}</dd></div>
              <div><dt className="text-muted-foreground">Email</dt><dd className="mt-1 break-all font-medium">{order.buyer_email || "—"}</dd></div>
              <div><dt className="text-muted-foreground">Placed</dt><dd className="mt-1 font-medium">{formatDate(order.created_at)}</dd></div>
              <div><dt className="text-muted-foreground">Order total</dt><dd className="mt-1 font-semibold">{formatProductPrice(order.total_price)}</dd></div>
            </dl>
          </section>
          <section className={`${cardClass} p-5`}>
            <h3 className="mb-3 font-semibold">Items ({items.length})</h3>
            {items.length ? <ul className="divide-y divide-border">{items.map((item) => <li key={item.order_item_id} className="flex items-center gap-3 py-3 first:pt-0">
              {item.image ? <img src={item.image} alt="" className="h-12 w-12 rounded-lg bg-secondary object-cover" /> : <span className="grid h-12 w-12 place-items-center rounded-lg bg-secondary"><Package size={17} /></span>}
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.title}</p><p className="text-xs text-muted-foreground">Qty {item.quantity} · {formatProductPrice(item.price)} each</p></div>
              <span className="text-sm font-semibold">{formatProductPrice(Number(item.price) * Number(item.quantity))}</span>
            </li>)}</ul> : <p className="text-sm text-muted-foreground">No item details.</p>}
          </section>
          <section className={`${cardClass} p-5`}>
            <h3 className="mb-3 font-semibold">Shipping details</h3>
            <p className="text-sm font-medium">{shipping.full_name || "Name unavailable"}</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{[shipping.address, shipping.city, shipping.state, shipping.pincode, shipping.country].filter(Boolean).join(", ") || "Address unavailable"}</p>
            <p className="mt-3 text-sm"><span className="text-muted-foreground">Phone: </span>{shipping.phone || "Unavailable"}</p>
          </section>
        </div>
      </aside>
    </div>
  );
};

export default AdminDashboard;
