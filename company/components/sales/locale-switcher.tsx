"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { SalesLocale } from "@/lib/sales/i18n";

export default function SalesLocaleSwitcher({ locale }: { locale: SalesLocale }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  async function change(nextLocale: SalesLocale) {
    setPending(true);
    await fetch("/sales/locale", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locale: nextLocale }),
    });
    router.refresh();
    setPending(false);
  }

  return (
    <div className="inline-flex rounded-lg bg-[#e8edf3] p-1 text-xs font-semibold">
      {(["ja", "ko"] as const).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => change(item)}
          disabled={pending}
          aria-pressed={locale === item}
          className={`rounded-md px-2.5 py-1.5 transition ${locale === item ? "bg-white text-[#17233a] shadow-sm" : "text-[#6f7b8c]"}`}
        >
          {item.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
