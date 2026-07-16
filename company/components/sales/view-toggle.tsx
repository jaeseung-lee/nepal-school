"use client";

import { CardsThree, Table } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SalesListScope, SalesListView } from "@/lib/sales/listing";
import type { SalesLocale } from "@/lib/sales/i18n";

export default function ViewToggle({ scope, view, locale, labels }: { scope: SalesListScope; view: SalesListView; locale: SalesLocale; labels: { table: string; cards: string; error: string } }) {
  const router = useRouter();
  const [pendingView, setPendingView] = useState<SalesListView | null>(null);
  const [failed, setFailed] = useState(false);
  const activeView = pendingView ?? view;

  async function change(nextView: SalesListView) {
    if (nextView === activeView || pendingView) return;
    setFailed(false);
    setPendingView(nextView);
    try {
      const response = await fetch("/sales/view", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scope, view: nextView }),
      });
      if (!response.ok) throw new Error("view_preference_failed");
      router.refresh();
    } catch {
      setFailed(true);
    } finally {
      setPendingView(null);
    }
  }

  return (
    <div>
      <div className="inline-flex rounded-xl border border-[#d5dde7] bg-[#e9eef4] p-1" aria-label={locale === "ja" ? "表示形式" : "보기 형식"}>
        <ToggleButton active={activeView === "table"} disabled={Boolean(pendingView)} label={labels.table} onClick={() => change("table")} icon={<Table size={16} weight="bold" />} />
        <ToggleButton active={activeView === "cards"} disabled={Boolean(pendingView)} label={labels.cards} onClick={() => change("cards")} icon={<CardsThree size={16} weight="bold" />} />
      </div>
      {failed ? <p className="mt-1 text-right text-[11px] text-red-700">{labels.error}</p> : null}
    </div>
  );
}

function ToggleButton({ active, disabled, label, onClick, icon }: { active: boolean; disabled: boolean; label: string; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5cff] focus-visible:ring-offset-2 active:scale-[0.98] ${active ? "bg-white text-[#17233a] shadow-sm shadow-[#17233a]/10" : "text-[#667286] hover:text-[#17233a]"}`}
    >
      {icon}
      {label}
    </button>
  );
}
