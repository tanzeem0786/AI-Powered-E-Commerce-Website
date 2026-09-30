import { useEffect, useState } from "react";
import { Search, SlidersHorizontal, RotateCcw, PackageSearch } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { categories } from "../data/products.js";
import ProductCard from "../components/Products/ProductCard.jsx";
import Pagination from "../components/Products/Pagination.jsx";
import { fetchProducts } from "../store/slices/productSlice.js";
import { toggleAuthPopup } from "../store/slices/popupSlice.js";

const PRODUCTS_PER_PAGE = 10;

const parseFilters = (params) => {
  const [minimum, maximum] = (params.get("price") || "").split("-");
  return {
    search: params.get("search") || "",
    category: params.get("category") || "",
    minPrice: minimum ? String(Number(minimum) / 100) : "",
    maxPrice: maximum ? String(Number(maximum) / 100) : "",
    ratings: params.get("ratings") || "",
    availability: params.get("availability") || "",
  };
};

const ProductSkeleton = () => (
  <div className="overflow-hidden rounded-2xl border border-border bg-card">
    <div className="aspect-[4/3] animate-pulse bg-secondary/70" />
    <div className="space-y-3 p-5">
      <div className="h-3 w-1/4 animate-pulse rounded bg-secondary" />
      <div className="h-5 w-3/4 animate-pulse rounded bg-secondary" />
      <div className="h-10 animate-pulse rounded bg-secondary" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-secondary" />
      <div className="h-10 animate-pulse rounded-xl bg-secondary" />
    </div>
  </div>
);

const Products = () => {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryString = searchParams.toString();
  const { products, totalProducts, loading, error } = useSelector((state) => state.product);
  const [filters, setFilters] = useState(() => parseFilters(searchParams));
  const [filterError, setFilterError] = useState("");

  useEffect(() => {
    setFilters(parseFilters(new URLSearchParams(queryString)));
    setFilterError("");
    dispatch(fetchProducts(Object.fromEntries(new URLSearchParams(queryString))));
  }, [dispatch, queryString]);

  const currentPage = Math.max(1, Number(searchParams.get("page")) || 1);
  const totalPages = Math.ceil(totalProducts / PRODUCTS_PER_PAGE);

  const updateFilters = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
    setFilterError("");
  };

  const applyFilters = (event) => {
    event.preventDefault();
    setFilterError("");
    const minimum = filters.minPrice.trim();
    const maximum = filters.maxPrice.trim();

    if ((minimum && !maximum) || (!minimum && maximum)) {
      setFilterError("Enter both the minimum and maximum price.");
      return;
    }
    if (minimum && (!Number.isFinite(Number(minimum)) || !Number.isFinite(Number(maximum)) || Number(minimum) < 0 || Number(maximum) < Number(minimum))) {
      setFilterError("Enter a valid price range.");
      return;
    }

    const params = new URLSearchParams();
    if (filters.search.trim()) params.set("search", filters.search.trim());
    if (filters.category) params.set("category", filters.category);
    if (minimum && maximum) {
      params.set("price", `${Math.round(Number(minimum) * 100)}-${Math.round(Number(maximum) * 100)}`);
    }
    if (filters.ratings) params.set("ratings", filters.ratings);
    if (filters.availability) params.set("availability", filters.availability);
    params.set("page", "1");
    setSearchParams(params);
  };

  const clearFilters = () => {
    setFilterError("");
    setFilters({ search: "", category: "", minPrice: "", maxPrice: "", ratings: "", availability: "" });
    setSearchParams({ page: "1" });
  };

  const changePage = (page) => {
    if (page < 1 || (totalPages > 0 && page > totalPages)) return;
    const params = new URLSearchParams(queryString);
    params.set("page", String(page));
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const isAuthenticationError = /login|authenticate|session/i.test(error || "");

  return (
    <main className="min-h-screen px-4 pb-16 pt-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">The E-Mart collection</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Shop all products</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Find something you’ll love. Search, filter, and explore our latest products.
          </p>
        </header>

        <div className="grid items-start gap-7 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-border bg-card p-5 text-card-foreground">
            <div className="mb-5 flex items-center gap-2">
              <SlidersHorizontal size={18} className="text-primary" />
              <h2 className="text-lg font-semibold">Filters</h2>
            </div>
            <form onSubmit={applyFilters} className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-medium">Search products</span>
                <span className="flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2.5 focus-within:ring-2 focus-within:ring-ring">
                  <Search size={17} className="text-muted-foreground" />
                  <input
                    type="search"
                    name="search"
                    value={filters.search}
                    onChange={updateFilters}
                    placeholder="Name or keyword"
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium">Category</span>
                <select
                  name="category"
                  value={filters.category}
                  onChange={updateFilters}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">All categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.name}>{category.name}</option>
                  ))}
                </select>
              </label>

              <fieldset>
                <legend className="mb-2 text-sm font-medium">Price range (₹)</legend>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    name="minPrice"
                    value={filters.minPrice}
                    onChange={updateFilters}
                    min="0"
                    step="0.01"
                    placeholder="Min"
                    aria-label="Minimum price in rupees"
                    className="min-w-0 rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                  <input
                    type="number"
                    name="maxPrice"
                    value={filters.maxPrice}
                    onChange={updateFilters}
                    min="0"
                    step="0.01"
                    placeholder="Max"
                    aria-label="Maximum price in rupees"
                    className="min-w-0 rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </fieldset>

              <label className="block">
                <span className="mb-2 block text-sm font-medium">Minimum rating</span>
                <select
                  name="ratings"
                  value={filters.ratings}
                  onChange={updateFilters}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Any rating</option>
                  <option value="4">4 stars & up</option>
                  <option value="3">3 stars & up</option>
                  <option value="2">2 stars & up</option>
                  <option value="1">1 star & up</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium">Availability</span>
                <select
                  name="availability"
                  value={filters.availability}
                  onChange={updateFilters}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">All stock statuses</option>
                  <option value="in-stock">In Stock</option>
                  <option value="limited">Limited Stock</option>
                  <option value="out-of-stock">Out of Stock</option>
                </select>
              </label>

              {filterError && <p className="text-sm text-destructive" role="alert">{filterError}</p>}

              <button
                type="submit"
                className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                Apply filters
              </button>
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition hover:border-primary hover:text-primary"
              >
                <RotateCcw size={15} />
                Clear filters
              </button>
            </form>
          </aside>

          <section aria-live="polite">
            <div className="mb-5 flex min-h-10 items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {loading ? "Finding products…" : `${totalProducts} ${totalProducts === 1 ? "product" : "products"} found`}
              </p>
              {currentPage > 1 && <span className="text-sm text-muted-foreground">Page {currentPage}{totalPages ? ` of ${totalPages}` : ""}</span>}
            </div>

            {loading ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }, (_, index) => <ProductSkeleton key={index} />)}
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center" role="alert">
                <PackageSearch size={34} className="mx-auto mb-4 text-destructive" />
                <h2 className="text-xl font-semibold">{isAuthenticationError ? "Sign in to browse products" : "We couldn’t load products"}</h2>
                <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">{error}</p>
                {isAuthenticationError ? (
                  <button
                    type="button"
                    onClick={() => dispatch(toggleAuthPopup())}
                    className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
                  >
                    Sign in
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => dispatch(fetchProducts(Object.fromEntries(new URLSearchParams(queryString))))}
                    className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
                  >
                    Retry
                  </button>
                )}
              </div>
            ) : products.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center">
                <PackageSearch size={36} className="mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-xl font-semibold">No products found</h2>
                <p className="mt-2 text-sm text-muted-foreground">Try a different search or adjust your filters.</p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-5 rounded-xl border border-border px-5 py-2.5 text-sm font-semibold hover:border-primary hover:text-primary"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {products.map((product) => <ProductCard key={product.id} product={product} />)}
                </div>
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={changePage} />
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
};

export default Products;
