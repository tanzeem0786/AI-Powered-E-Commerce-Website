import { useEffect, useState } from "react";
import { ArrowLeft, Check, Package, RotateCcw, ShoppingCart, Star, Truck } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { addToCart } from "../store/slices/cartSlice.js";
import { fetchSingleProduct } from "../store/slices/productSlice.js";
import { toggleAuthPopup } from "../store/slices/popupSlice.js";
import { formatProductPrice, getProductImages, getReviewCount, getStockStatus } from "../components/Products/productUtils.js";

const ProductDetail = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { productDetails: product, detailLoading, detailError } = useSelector((state) => state.product);
  const cartItem = useSelector((state) => state.cart.cart.find((item) => item.id === id));
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    setActiveImage(0);
    dispatch(fetchSingleProduct(id));
  }, [dispatch, id]);

  const isAuthenticationError = /login|authenticate|session/i.test(detailError || "");

  if (detailLoading || (!product && !detailError)) {
    return (
      <main className="min-h-[70vh] px-4 pb-16 pt-28">
        <div className="mx-auto grid max-w-6xl animate-pulse gap-8 md:grid-cols-2">
          <div className="aspect-square rounded-3xl bg-secondary" />
          <div className="space-y-5 py-4">
            <div className="h-4 w-1/4 rounded bg-secondary" />
            <div className="h-10 w-3/4 rounded bg-secondary" />
            <div className="h-6 w-1/3 rounded bg-secondary" />
            <div className="h-28 rounded bg-secondary" />
            <div className="h-12 rounded-xl bg-secondary" />
          </div>
        </div>
      </main>
    );
  }

  if (detailError || !product) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-4 pb-16 pt-28">
        <section className="w-full max-w-lg rounded-3xl border border-border bg-card p-8 text-center text-card-foreground">
          <Package size={38} className="mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold">
            {isAuthenticationError ? "Sign in to view product details" : "Product unavailable"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {detailError || "We couldn’t find this product. It may have been removed."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {isAuthenticationError ? (
              <button
                type="button"
                onClick={() => dispatch(toggleAuthPopup())}
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Sign in
              </button>
            ) : (
              <button
                type="button"
                onClick={() => dispatch(fetchSingleProduct(id))}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                <RotateCcw size={16} />
                Retry
              </button>
            )}
            <Link
              to="/products"
              className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-semibold hover:border-primary hover:text-primary"
            >
              <ArrowLeft size={16} />
              Browse products
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const images = getProductImages(product);
  const stock = getStockStatus(product.stock);
  const outOfStock = Number(product.stock) <= 0;
  const reviewCount = getReviewCount(product);

  const handleAddToCart = () => {
    if (outOfStock) return;
    if (cartItem && cartItem.quantity >= Number(product.stock)) {
      toast.error("You’ve reached the available stock for this product.");
      return;
    }
    dispatch(addToCart(product));
    toast.success("Added to cart.");
  };

  return (
    <main className="min-h-screen px-4 pb-16 pt-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link to="/products" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft size={16} />
          Back to products
        </Link>

        <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-12">
          <section>
            <div className="aspect-square overflow-hidden rounded-3xl border border-border bg-secondary/30">
              <img
                src={images[activeImage]?.url || "/avatar-holder.avif"}
                alt={product.name}
                onError={(event) => {
                  event.currentTarget.src = "/avatar-holder.avif";
                }}
                className="h-full w-full object-cover"
              />
            </div>
            {images.length > 1 && (
              <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
                {images.map((image, index) => (
                  <button
                    type="button"
                    key={image.public_id || image.url}
                    onClick={() => setActiveImage(index)}
                    aria-label={`Show product image ${index + 1}`}
                    aria-pressed={activeImage === index}
                    className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 ${
                      activeImage === index ? "border-primary" : "border-border"
                    }`}
                  >
                    <img src={image.url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="pt-1">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">{product.category}</p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{product.name}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <span className="inline-flex items-center gap-1.5">
                <Star size={17} className="fill-amber-400 text-amber-400" />
                <strong>{Number(product.ratings || 0).toFixed(1)}</strong>
                <span className="text-muted-foreground">({reviewCount} {reviewCount === 1 ? "review" : "reviews"})</span>
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${stock.style}`}>{stock.label}</span>
            </div>

            <p className="mt-6 text-3xl font-bold">{formatProductPrice(product.price)}</p>
            <div className="my-6 h-px bg-border" />
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide">Description</h2>
            <p className="whitespace-pre-line leading-7 text-muted-foreground">{product.description}</p>

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={outOfStock}
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-secondary disabled:text-muted-foreground sm:w-auto sm:min-w-56"
            >
              <ShoppingCart size={18} />
              {outOfStock ? "Out of stock" : "Add to cart"}
            </button>
            {cartItem && <p className="mt-2 text-sm text-muted-foreground">{cartItem.quantity} currently in your cart</p>}

            <div className="mt-8 grid gap-3 border-t border-border pt-6 text-sm text-muted-foreground sm:grid-cols-2">
              <p className="flex items-center gap-2"><Truck size={17} className="text-primary" /> Secure checkout</p>
              <p className="flex items-center gap-2"><Check size={17} className="text-primary" /> Stock verified at checkout</p>
            </div>
          </section>
        </div>

        {product.reviews?.length > 0 && (
          <section className="mt-14 border-t border-border pt-10">
            <h2 className="mb-5 text-2xl font-bold">Customer reviews</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {product.reviews.map((review) => (
                <article key={review.review_id} className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{review.reviewer?.name || "Customer"}</p>
                    <span className="inline-flex items-center gap-1 text-sm">
                      <Star size={15} className="fill-amber-400 text-amber-400" />
                      {Number(review.rating).toFixed(1)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{review.comment}</p>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
};

export default ProductDetail;
