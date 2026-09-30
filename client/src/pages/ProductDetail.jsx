import { useEffect, useState } from "react";
import { ArrowLeft, Check, Minus, Package, Plus, RotateCcw, ShoppingCart, Star, Trash2, Truck, X } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { addToCart } from "../store/slices/cartSlice.js";
import {
  deleteProductReview,
  fetchSingleProduct,
  submitProductReview,
} from "../store/slices/productSlice.js";
import { openAuthPopup } from "../store/slices/popupSlice.js";
import { formatProductPrice, getProductImages, getReviewCount, getStockStatus } from "../components/Products/productUtils.js";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const {
    productDetails: product,
    detailLoading,
    detailError,
    isPostingReview,
    isReviewDeleting,
  } = useSelector((state) => state.product);
  const { authUser } = useSelector((state) => state.auth);
  const cartItem = useSelector((state) => state.cart.cart.find((item) => item.id === id));
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const currentReview = authUser
    ? product?.reviews?.find((review) => review.reviewer?.id === authUser.id)
    : null;

  useEffect(() => {
    setActiveImage(0);
    setQuantity(1);
    dispatch(fetchSingleProduct(id));
  }, [dispatch, id, authUser?.id]);

  useEffect(() => {
    setRating(currentReview ? Number(currentReview.rating) : 0);
    setComment(currentReview?.comment || "");
    setReviewError("");
  }, [currentReview, id]);

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
                onClick={() => dispatch(openAuthPopup())}
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
  const hasPurchased = product.reviewEligibility?.has_purchased === true;
  const hasPaidPurchase = product.reviewEligibility?.has_paid_purchase === true;

  const handleAddToCart = () => {
    if (outOfStock) return;
    if (cartItem && cartItem.quantity + quantity > Number(product.stock)) {
      toast.error("You’ve reached the available stock for this product.");
      return;
    }
    dispatch(addToCart({ product, quantity }));
    toast.success(`${quantity} ${quantity === 1 ? "item" : "items"} added to cart.`);
  };

  const handleBuyNow = () => {
    if (outOfStock) return;
    if (cartItem && cartItem.quantity + quantity > Number(product.stock)) {
      toast.error("You’ve reached the available stock for this product.");
      return;
    }
    dispatch(addToCart({ product, quantity }));
    navigate("/cart");
  };

  const handleReviewSubmit = async (event) => {
    event.preventDefault();
    setReviewError("");
    if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
      setReviewError("Choose a rating between 0 and 5.");
      return;
    }
    if (!comment.trim()) {
      setReviewError("Please enter a comment for your review.");
      return;
    }
    try {
      await dispatch(submitProductReview({ productId: id, rating, comment: comment.trim() })).unwrap();
      dispatch(fetchSingleProduct(id));
    } catch (message) {
      setReviewError(message);
    }
  };

  const handleReviewDelete = async () => {
    try {
      await dispatch(deleteProductReview(id)).unwrap();
      setShowDeleteConfirmation(false);
      setRating(0);
      setComment("");
      dispatch(fetchSingleProduct(id));
    } catch {
      setShowDeleteConfirmation(false);
    }
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

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center rounded-xl border border-border">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  disabled={quantity <= 1 || outOfStock}
                  className="rounded-l-xl p-3 hover:bg-secondary disabled:opacity-40"
                >
                  <Minus size={16} />
                </button>
                <input
                  type="number"
                  aria-label="Quantity"
                  min="1"
                  max={product.stock}
                  value={quantity}
                  onChange={(event) => {
                    const nextQuantity = Number(event.target.value);
                    if (Number.isInteger(nextQuantity)) {
                      setQuantity(Math.max(1, Math.min(nextQuantity, Number(product.stock))));
                    }
                  }}
                  disabled={outOfStock}
                  className="w-12 bg-transparent text-center text-sm font-semibold outline-none disabled:opacity-50"
                />
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => setQuantity((value) => Math.min(Number(product.stock), value + 1))}
                  disabled={outOfStock || quantity >= Number(product.stock)}
                  className="rounded-r-xl p-3 hover:bg-secondary disabled:opacity-40"
                >
                  <Plus size={16} />
                </button>
              </div>
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={outOfStock}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-secondary disabled:text-muted-foreground sm:flex-none"
              >
                <ShoppingCart size={18} />
                {outOfStock ? "Out of stock" : "Add to cart"}
              </button>
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={outOfStock}
                className="inline-flex flex-1 items-center justify-center rounded-xl border border-primary px-5 py-3 font-semibold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:border-border disabled:text-muted-foreground sm:flex-none"
              >
                Buy now
              </button>
            </div>
            {cartItem && <p className="mt-2 text-sm text-muted-foreground">{cartItem.quantity} currently in your cart</p>}

            <div className="mt-8 grid gap-3 border-t border-border pt-6 text-sm text-muted-foreground sm:grid-cols-2">
              <p className="flex items-center gap-2"><Truck size={17} className="text-primary" /> Secure checkout</p>
              <p className="flex items-center gap-2"><Check size={17} className="text-primary" /> Stock verified at checkout</p>
            </div>
          </section>
        </div>

        <section className="mt-14 border-t border-border pt-10">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">Customer reviews</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {reviewCount} {reviewCount === 1 ? "verified review" : "verified reviews"}
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5 text-sm font-semibold text-amber-600">
              <Star size={16} className="fill-amber-400 text-amber-400" />
              {Number(product.ratings || 0).toFixed(1)} / 5
            </div>
          </div>

          {product.reviews?.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {product.reviews.map((review) => (
                <article key={review.review_id} className="rounded-2xl border border-border bg-card p-5 text-card-foreground">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{review.reviewer?.name || "Customer"}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">Verified purchase</p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold">
                      <Star size={15} className="fill-amber-400 text-amber-400" />
                      {Number(review.rating).toFixed(1)}
                    </span>
                  </div>
                  <p className="mt-3 whitespace-pre-line text-sm leading-6 text-muted-foreground">{review.comment}</p>
                  {currentReview?.review_id === review.review_id && (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirmation(true)}
                      className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-destructive hover:underline"
                    >
                      <Trash2 size={15} />
                      Delete your review
                    </button>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No reviews yet. Be the first verified buyer to share your experience.
            </p>
          )}

          <div className="mt-8 rounded-2xl border border-border bg-card p-5 text-card-foreground sm:p-6">
            {!authUser ? (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">Sign in with your account to check review eligibility.</p>
                <button
                  type="button"
                  onClick={() => dispatch(openAuthPopup())}
                  className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  Sign in
                </button>
              </div>
            ) : hasPaidPurchase ? (
              <form onSubmit={handleReviewSubmit} className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">{currentReview ? "Update your review" : "Review this product"}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Reviews are available only after a successful purchase payment.</p>
                </div>

                <fieldset>
                  <legend className="mb-2 text-sm font-medium">Your rating: {rating} out of 5</legend>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRating(value)}
                        aria-label={`Rate ${value} out of 5`}
                        aria-pressed={rating === value}
                        className="rounded p-1 text-amber-400 transition hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                      >
                        <Star size={25} className={value <= rating ? "fill-current" : ""} />
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setRating(0)}
                      aria-pressed={rating === 0}
                      className="ml-2 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary"
                    >
                      0 stars
                    </button>
                  </div>
                </fieldset>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium">Your comment</span>
                  <textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    required
                    maxLength={2000}
                    rows={4}
                    placeholder="What did you think about this product?"
                    className="w-full resize-y rounded-xl border border-input bg-background px-3.5 py-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                  />
                </label>

                {reviewError && (
                  <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm text-destructive" role="alert">
                    {reviewError}
                  </p>
                )}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={isPostingReview}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isPostingReview && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
                    {isPostingReview ? "Saving review…" : currentReview ? "Update review" : "Submit review"}
                  </button>
                  {currentReview && (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirmation(true)}
                      className="inline-flex items-center gap-2 rounded-xl border border-destructive/40 px-5 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 size={16} />
                      Delete review
                    </button>
                  )}
                </div>
              </form>
            ) : hasPurchased ? (
              <p className="text-sm text-muted-foreground">
                You’ve purchased this product, but reviews unlock after payment succeeds.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Only customers who have purchased and paid for this product can leave a review.
              </p>
            )}
          </div>
        </section>
      </div>

      {showDeleteConfirmation && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-6" role="presentation">
          <button
            type="button"
            aria-label="Cancel review deletion"
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setShowDeleteConfirmation(false)}
          />
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-review-title"
            aria-describedby="delete-review-description"
            className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-2xl"
          >
            <button
              type="button"
              aria-label="Close confirmation"
              onClick={() => setShowDeleteConfirmation(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"
            >
              <X size={18} />
            </button>
            <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <Trash2 size={20} />
            </span>
            <h2 id="delete-review-title" className="text-lg font-semibold">Delete your review?</h2>
            <p id="delete-review-description" className="mt-2 text-sm text-muted-foreground">
              This will permanently remove your review and refresh the product rating.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmation(false)}
                disabled={isReviewDeleting}
                className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReviewDelete}
                disabled={isReviewDeleting}
                className="inline-flex items-center gap-2 rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:opacity-90 disabled:opacity-60"
              >
                {isReviewDeleting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
                {isReviewDeleting ? "Deleting…" : "Delete review"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
};

export default ProductDetail;
