import { ChevronLeft, ChevronRight } from "lucide-react";

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const startPage = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, index) => startPage + index);

  return (
    <nav aria-label="Product pages" className="mt-10 flex items-center justify-center gap-2">
      <button
        type="button"
        aria-label="Previous page"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft size={18} />
      </button>
      {pages.map((page) => (
        <button
          key={page}
          type="button"
          aria-current={page === currentPage ? "page" : undefined}
          onClick={() => onPageChange(page)}
          className={`h-10 min-w-10 rounded-xl px-3 text-sm font-semibold transition ${
            page === currentPage
              ? "bg-primary text-primary-foreground"
              : "border border-border hover:border-primary hover:text-primary"
          }`}
        >
          {page}
        </button>
      ))}
      <button
        type="button"
        aria-label="Next page"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight size={18} />
      </button>
    </nav>
  );
};

export default Pagination;
