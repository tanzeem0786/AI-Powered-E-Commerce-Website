const statusStyles = {
  Processing: "bg-blue-500/10 text-blue-600",
  Shipped: "bg-violet-500/10 text-violet-600",
  Delivered: "bg-emerald-500/10 text-emerald-600",
  Cancelled: "bg-red-500/10 text-red-600",
  Paid: "bg-emerald-500/10 text-emerald-600",
  Pending: "bg-amber-500/10 text-amber-600",
  Failed: "bg-red-500/10 text-red-600",
};

const OrderStatusBadge = ({ status, label }) => {
  const displayStatus = status || "Pending";
  const style = statusStyles[displayStatus] || "bg-secondary text-muted-foreground";

  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      {label && <span className="text-muted-foreground">{label}:</span>}
      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${style}`}>{displayStatus}</span>
    </span>
  );
};

export default OrderStatusBadge;
