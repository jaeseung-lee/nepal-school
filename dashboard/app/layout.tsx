import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import { getSearchIndex } from "@/lib/content";

export const metadata: Metadata = {
  title: "네팔→일본 특정기능 사업 위키",
  description:
    "네팔 학생 일본 개호·숙박 특정기능1호 취업사업 실현가능성 대시보드",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const index = getSearchIndex();
  return (
    <html lang="ko">
      <body>
        <div className="app">
          <Sidebar index={index} />
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
