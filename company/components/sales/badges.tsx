import { formatStatusLabel, type SalesLocale } from "@/lib/sales/i18n";

export function GradeBadge({ grade }: { grade: string }) {
  const color =
    grade === "A"
      ? "bg-emerald-100 text-emerald-800"
      : grade === "B"
        ? "bg-amber-100 text-amber-800"
        : "bg-slate-100 text-slate-700";
  return <span className={`inline-flex min-w-7 justify-center rounded-full px-2 py-1 text-xs font-bold ${color}`}>{grade}</span>;
}

export function StatusBadge({ status, label, locale }: { status: string; label?: string; locale?: SalesLocale }) {
  const color =
    status === "succeeded" || status === "active" || status === "verified" || status === "won"
      ? "bg-emerald-100 text-emerald-800"
      : status === "failed" || status === "closed" || status === "rejected" || status === "lost"
        ? "bg-red-100 text-red-800"
      : status === "missing" || status === "pending"
          ? "bg-amber-100 text-amber-800"
          : status === "none" || status === "suspended"
            ? "bg-slate-100 text-slate-700"
          : "bg-blue-100 text-blue-800";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>{label ?? (locale ? formatStatusLabel(status, locale) : status)}</span>;
}
