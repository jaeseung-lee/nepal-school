"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { salesMessages, type SalesLocale } from "@/lib/sales/i18n";

export default function SalesLocaleSwitcher({ locale }: { locale: SalesLocale }) {
  const router = useRouter();
  const [selectedLocale, setSelectedLocale] = useState(locale);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, startTransition] = useTransition();
  const [hasError, setHasError] = useState(false);
  const requestInFlight = useRef(false);
  const isBusy = isSaving || isRefreshing;

  useEffect(() => {
    setSelectedLocale(locale);
    setHasError(false);
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    if (!isBusy) requestInFlight.current = false;
  }, [isBusy]);

  async function change(nextLocale: SalesLocale) {
    if (requestInFlight.current || isBusy || nextLocale === selectedLocale) return;

    requestInFlight.current = true;
    setSelectedLocale(nextLocale);
    setHasError(false);
    document.documentElement.lang = nextLocale;
    setIsSaving(true);

    try {
      const response = await fetch("/sales/locale", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale: nextLocale }),
      });

      if (!response.ok) throw new Error("Failed to save locale preference");

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setSelectedLocale(locale);
      document.documentElement.lang = locale;
      setHasError(true);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="relative">
      <div
        className="inline-flex rounded-lg bg-[#e8edf3] p-1 text-xs font-semibold"
        aria-busy={isBusy}
      >
        {(["ja", "ko"] as const).map((item) => {
          const isSelected = selectedLocale === item;

          return (
            <button
              key={item}
              type="button"
              onClick={() => change(item)}
              disabled={isBusy}
              aria-pressed={isSelected}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 transition ${isSelected ? "bg-white text-[#17233a] shadow-sm" : "text-[#6f7b8c]"} ${isBusy ? "cursor-wait" : ""}`}
            >
              {item.toUpperCase()}
              {isBusy && isSelected ? (
                <span
                  aria-hidden="true"
                  className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
                />
              ) : null}
            </button>
          );
        })}
      </div>
      {isBusy ? (
        <p
          role="status"
          aria-live="polite"
          className="absolute right-0 top-full mt-1 flex items-center gap-1 whitespace-nowrap text-[11px] font-medium text-[#59667a]"
        >
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
          {salesMessages[selectedLocale].localeSwitching}
        </p>
      ) : hasError ? (
        <p
          role="alert"
          className="absolute right-0 top-full mt-1 whitespace-nowrap text-[11px] font-medium text-red-700"
        >
          {salesMessages[locale].localeSwitchError}
        </p>
      ) : null}
    </div>
  );
}
