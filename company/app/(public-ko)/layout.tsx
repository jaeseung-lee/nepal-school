import type { Metadata } from "next";
import PublicShell from "@/components/public-shell";
import { pretendard } from "@/app/fonts";
import { buildRootMetadata } from "@/lib/seo";
import "../globals.css";

export const metadata: Metadata = buildRootMetadata("ko");

export default function KoreanPublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={pretendard.variable}>
      <body className="bg-paper font-sans text-ink antialiased">
        <PublicShell locale="ko">{children}</PublicShell>
      </body>
    </html>
  );
}
