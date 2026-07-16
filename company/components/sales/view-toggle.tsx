"use client";

import { CardsThree, Table } from "@phosphor-icons/react";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { SalesLocale } from "@/lib/sales/i18n";
import type { SalesListScope, SalesListView } from "@/lib/sales/listing";

type ViewLabels = {
  table: string;
  cards: string;
  error: string;
};

type SalesListViewContextValue = {
  activeView: SalesListView;
  changeView: (nextView: SalesListView) => void;
  isSaving: boolean;
  saveFailed: boolean;
  locale: SalesLocale;
  labels: ViewLabels;
};

const SalesListViewContext = createContext<SalesListViewContextValue | null>(null);

export function SalesListViewProvider({
  scope,
  initialView,
  locale,
  labels,
  children,
}: {
  scope: SalesListScope;
  initialView: SalesListView;
  locale: SalesLocale;
  labels: ViewLabels;
  children: ReactNode;
}) {
  const [activeView, setActiveView] = useState(initialView);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const requestInFlight = useRef(false);
  const queuedView = useRef<SalesListView | null>(null);

  useEffect(() => {
    setActiveView(initialView);
    setSaveFailed(false);
  }, [initialView]);

  async function persistLatestView() {
    if (requestInFlight.current) return;
    const nextView = queuedView.current;
    if (!nextView) return;

    requestInFlight.current = true;
    queuedView.current = null;
    setIsSaving(true);
    let saved = false;

    try {
      const response = await fetch("/sales/view", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scope, view: nextView }),
      });
      if (!response.ok) throw new Error("view_preference_failed");
      saved = true;
      setSaveFailed(false);
    } catch {
      setSaveFailed(true);
    } finally {
      requestInFlight.current = false;
      setIsSaving(false);

      // A click while the request was in flight is persisted after it completes.
      if (queuedView.current && (!saved || queuedView.current !== nextView)) {
        void persistLatestView();
      }
    }
  }

  function changeView(nextView: SalesListView) {
    if (nextView === activeView) return;
    setActiveView(nextView);
    setSaveFailed(false);
    queuedView.current = nextView;
    void persistLatestView();
  }

  return (
    <SalesListViewContext.Provider value={{ activeView, changeView, isSaving, saveFailed, locale, labels }}>
      {children}
    </SalesListViewContext.Provider>
  );
}

export default function ViewToggle() {
  const { activeView, changeView, isSaving, saveFailed, locale, labels } = useSalesListView();

  return (
    <div>
      <div
        className="inline-flex rounded-xl border border-[#d5dde7] bg-[#e9eef4] p-1"
        aria-label={locale === "ja" ? "表示形式" : "보기 형식"}
        aria-busy={isSaving}
      >
        <ToggleButton active={activeView === "table"} label={labels.table} onClick={() => changeView("table")} icon={<Table size={16} weight="bold" />} saving={isSaving && activeView === "table"} />
        <ToggleButton active={activeView === "cards"} label={labels.cards} onClick={() => changeView("cards")} icon={<CardsThree size={16} weight="bold" />} saving={isSaving && activeView === "cards"} />
      </div>
      {saveFailed ? <p role="alert" className="mt-1 text-right text-[11px] text-red-700">{labels.error}</p> : null}
    </div>
  );
}

export function SalesListViewContent({ table, cards }: { table: ReactNode; cards: ReactNode }) {
  const { activeView } = useSalesListView();
  return activeView === "table" ? table : cards;
}

function ToggleButton({
  active,
  label,
  onClick,
  icon,
  saving,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  icon: ReactNode;
  saving: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d5cff] focus-visible:ring-offset-2 active:scale-[0.98] ${active ? "bg-white text-[#17233a] shadow-sm shadow-[#17233a]/10" : "text-[#667286] hover:text-[#17233a]"}`}
    >
      {icon}
      {label}
      {saving ? <span aria-hidden="true" className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" /> : null}
    </button>
  );
}

function useSalesListView() {
  const context = useContext(SalesListViewContext);
  if (!context) throw new Error("SalesListViewProvider is required");
  return context;
}
