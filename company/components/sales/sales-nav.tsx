"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string };

export default function SalesNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-1" aria-label="Sales navigation">
      {items.map((item) => {
        const active = item.href === "/sales" ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`block rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              active ? "bg-[#1d5cff] text-white" : "text-[#59667a] hover:bg-[#edf2f7] hover:text-[#17233a]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
