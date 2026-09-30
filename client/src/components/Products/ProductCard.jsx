import { ShoppingCart, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { addToCart } from "../../store/slices/cartSlice.js";
import { formatProductPrice, getProductImage, getReviewCount, getStockStatus } from "./productUtils.js";

const ProductCard = ({ product }) => {
  const dispatch = useDispatch();
  const cartItem = useSelector((state) => state.cart.cart.find((item) => item.id === product.id));
  const stockStatus = getStockStatus(product.stock);
  const isOutOfStock = Number(product.stock) <= 0;
  const reviewCount = getReviewCount(product);

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    if (cartItem && cartItem.quantity >= Number(product.stock)) {
      toast.error("You’ve reached the available stock for this product.");
      return;
    }
    dispatch(addToCart(product));
    toast.success("Added to cart.");
  };

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <Link
        to={`/product/${product.id}`}
        aria-label={`View ${product.name} details`}
        className="relative block aspect-[4/3] overflow-hidden bg-secondary/40"
      >
        <img
          src={getProductImage(product)}
          alt={product.name}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.src = "/avatar-holder.avif";
          }}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold ${stockStatus.style}`}>
          {stockStatus.label}
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">{product.category}</p>
        <Link to={`/product/${product.id}`} className="line-clamp-1 text-lg font-semibold hover:text-primary">
          {product.name}
        </Link>
        <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">
          {product.description}
        </p>

        <div className="mt-3 flex items-center gap-1.5 text-sm">
          <Star size={16} className="fill-amber-400 text-amber-400" />
          <span className="font-semibold">{Number(product.ratings || 0).toFixed(1)}</span>
          <span className="text-muted-foreground">({reviewCount} {reviewCount === 1 ? "review" : "reviews"})</span>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="text-xl font-bold">{formatProductPrice(product.price)}</span>
          {cartItem && <span className="text-xs text-muted-foreground">{cartItem.quantity} in cart</span>}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-secondary disabled:text-muted-foreground"
          >
            <ShoppingCart size={16} />
            {isOutOfStock ? "Unavailable" : "Add to cart"}
          </button>
          <Link
            to={`/product/${product.id}`}
            className="inline-flex items-center justify-center rounded-xl border border-border px-3 py-2.5 text-sm font-semibold transition hover:border-primary hover:text-primary"
          >
            View details
          </Link>
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
