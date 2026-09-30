export const getProductImages = (product) => {
  let images = product?.images;
  if (typeof images === "string") {
    try {
      images = JSON.parse(images);
    } catch {
      return [];
    }
  }

  return Array.isArray(images) ? images.filter((image) => image?.url) : [];
};

export const getProductImage = (product) => getProductImages(product)[0]?.url || "/avatar-holder.avif";

export const getStockStatus = (stock) => {
  const quantity = Number(stock);
  if (quantity <= 0) return { label: "Out of Stock", style: "bg-red-500/10 text-red-500" };
  if (quantity <= 5) return { label: "Limited Stock", style: "bg-amber-500/10 text-amber-600" };
  return { label: "In Stock", style: "bg-emerald-500/10 text-emerald-600" };
};

export const formatProductPrice = (price) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(price) / 100);

export const getReviewCount = (product) =>
  Number(product?.review_count ?? product?.reviews?.length ?? 0);
