import { useEffect, useRef, useState } from "react";
import { AlertCircle, RotateCcw, Search, Sparkles, X } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import ProductCard from "./ProductCard.jsx";
import { searchProductsWithAI } from "../../store/slices/productSlice.js";
import { closeAIModal, openAuthPopup } from "../../store/slices/popupSlice.js";

const examplePrompts = [
  "Show me black headphones under ₹5000",
  "Find furniture for a small living room",
  "Show highly rated fashion products",
];

const AISearchModal = () => {
  const dispatch = useDispatch();
  const { isAIPopupOpen } = useSelector((state) => state.popup);
  const { authUser } = useSelector((state) => state.auth);
  const { aiSearching, aiResults, aiSearchError, aiSearchMessage, aiSearchCompleted } = useSelector((state) => state.product);
  const [prompt, setPrompt] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isAIPopupOpen) return undefined;
    inputRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !aiSearching) dispatch(closeAIModal());
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [aiSearching, dispatch, isAIPopupOpen]);

  if (!isAIPopupOpen) return null;

  const runSearch = (searchPrompt = prompt) => {
    const query = searchPrompt.trim();
    if (!query || aiSearching) return;
    setPrompt(query);
    dispatch(searchProductsWithAI(query));
  };

  const isAuthError = aiSearchError?.kind === "auth" ||
    (aiSearchError?.kind === "api" && /login|authenticate|session/i.test(aiSearchError.message));

  return (
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center overflow-y-auto px-3 py-5 sm:px-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-search-title"
    >
      <button
        type="button"
        aria-label="Close AI search"
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm"
        onClick={() => {
          if (!aiSearching) dispatch(closeAIModal());
        }}
      />

      <section className="relative z-10 my-auto flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-5 sm:px-7">
          <div>
            <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              <Sparkles size={14} /> AI powered discovery
            </p>
            <h2 id="ai-search-title" className="text-2xl font-bold">Find your perfect product</h2>
            <p className="mt-1 text-sm text-muted-foreground">Describe what you need in your own words.</p>
          </div>
          <button
            type="button"
            onClick={() => dispatch(closeAIModal())}
            disabled={aiSearching}
            aria-label="Close AI search"
            className="rounded-full p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:opacity-40"
          >
            <X size={20} />
          </button>
        </header>

        <div className="overflow-y-auto p-5 sm:p-7">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              runSearch();
            }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <label className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-input bg-background px-4 py-3 focus-within:ring-2 focus-within:ring-ring">
              <Search size={19} className="shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                disabled={aiSearching}
                maxLength={500}
                placeholder="e.g. Show me black headphones under ₹5000"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                aria-label="Describe the products you want"
              />
            </label>
            <button
              type="submit"
              disabled={aiSearching || !prompt.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {aiSearching ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Sparkles size={17} />
              )}
              {aiSearching ? "Finding products…" : "Search with AI"}
            </button>
          </form>

          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Try an example</p>
            <div className="flex flex-wrap gap-2">
              {examplePrompts.map((example) => (
                <button
                  key={example}
                  type="button"
                  disabled={aiSearching}
                  onClick={() => runSearch(example)}
                  className="rounded-full border border-border px-3 py-2 text-left text-xs text-muted-foreground transition hover:border-primary hover:text-primary disabled:opacity-50"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          {aiSearching ? (
            <div className="flex min-h-52 flex-col items-center justify-center py-10 text-center" role="status">
              <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles size={23} className="animate-pulse" />
              </span>
              <p className="font-semibold">AI is finding matching products</p>
              <p className="mt-1 text-sm text-muted-foreground">Checking your request against our catalog…</p>
              <div className="mt-5 h-1.5 w-48 overflow-hidden rounded-full bg-secondary">
                <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
              </div>
            </div>
          ) : aiSearchError ? (
            <div className="mt-7 rounded-2xl border border-destructive/30 bg-destructive/5 px-5 py-8 text-center" role="alert">
              <AlertCircle size={30} className="mx-auto mb-3 text-destructive" />
              <h3 className="font-semibold">
                {aiSearchError.kind === "invalid"
                  ? "AI returned an invalid response"
                  : aiSearchError.kind === "quota"
                    ? "AI search is busy"
                    : isAuthError
                      ? "Sign in to use AI search"
                      : "AI search couldn’t complete"}
              </h3>
              <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">{aiSearchError.message}</p>
              {isAuthError ? (
                <button
                  type="button"
                  onClick={() => {
                    dispatch(closeAIModal());
                    dispatch(openAuthPopup());
                  }}
                  className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  Sign in
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => runSearch(prompt)}
                  disabled={!prompt.trim()}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  <RotateCcw size={15} />
                  Retry search
                </button>
              )}
            </div>
          ) : aiResults.length > 0 ? (
            <section className="mt-8" aria-live="polite">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold">Products picked for you</h3>
                  {aiSearchMessage && <p className="mt-1 text-sm text-muted-foreground">{aiSearchMessage}</p>}
                </div>
                <p className="text-sm text-muted-foreground">{aiResults.length} matching {aiResults.length === 1 ? "product" : "products"}</p>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {aiResults.map((product) => <ProductCard key={product.id} product={product} />)}
              </div>
            </section>
          ) : aiSearchCompleted ? (
            <div className="mt-7 rounded-2xl border border-dashed border-border px-5 py-10 text-center" aria-live="polite">
              <Search size={30} className="mx-auto mb-3 text-muted-foreground" />
              <h3 className="font-semibold">No matching products</h3>
              <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
                {aiSearchMessage || "Try describing a different product, category, feature, or budget."}
              </p>
              <button
                type="button"
                onClick={() => runSearch(prompt)}
                disabled={!prompt.trim()}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:border-primary hover:text-primary disabled:opacity-50"
              >
                <RotateCcw size={15} /> Try again
              </button>
            </div>
          ) : !authUser ? (
            <p className="mt-6 text-center text-xs text-muted-foreground">
              Sign in is required to search the personalized product catalog.
            </p>
          ) : (
            <p className="mt-6 text-center text-xs text-muted-foreground">
              Include a category, color, room size, rating, or budget for better recommendations.
            </p>
          )}
        </div>
      </section>
    </div>
  );
};

export default AISearchModal;
