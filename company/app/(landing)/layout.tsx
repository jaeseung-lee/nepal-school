import { pretendard } from "@/app/fonts";
import "../globals.css";

export default function LandingLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={pretendard.variable} suppressHydrationWarning>
      <body className="bg-paper font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
