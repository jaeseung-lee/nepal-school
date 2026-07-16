import type { Metadata } from "next";
import GoogleLoginButton from "@/components/sales/google-login-button";
import { getPublicSupabaseConfig } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Sales Login",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

const errorMessages: Record<string, string> = {
  not_allowed: "許可された社内アカウントではありません。 / 허용된 사내 계정이 아닙니다.",
  not_configured: "Supabaseの設定が完了していません。 / Supabase 설정이 필요합니다.",
  oauth_failed: "Google認証を完了できませんでした。 / Google 인증에 실패했습니다.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const configured = Boolean(getPublicSupabaseConfig());
  const nextPath = params.next?.startsWith("/sales") ? params.next : "/sales";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#edf1f5] px-5 py-16 text-[#162238]">
      <section className="w-full max-w-md rounded-[28px] border border-[#d9e0e8] bg-white p-8 shadow-[0_24px_80px_rgba(22,34,56,0.12)] sm:p-10">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1d5cff] text-xs font-bold text-white">JW</span>
          <div>
            <p className="font-semibold">介護営業リード</p>
            <p className="text-xs text-[#6f7b8c]">社内専用 · 사내 전용</p>
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-[-0.02em]">社内ダッシュボード</h1>
        <p className="mt-3 text-sm leading-6 text-[#667286]">
          管理者が許可したGoogleアカウントのみ利用できます。<br />
          관리자가 허용한 Google 계정만 이용할 수 있습니다.
        </p>
        {params.error ? (
          <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">
            {errorMessages[params.error] ?? errorMessages.oauth_failed}
          </p>
        ) : null}
        <div className="mt-8">
          {configured ? (
            <GoogleLoginButton nextPath={nextPath} />
          ) : (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
              `.env.local`にSupabase URLとPublishable Keyを設定してください。<br />
              `.env.local`에 Supabase URL과 Publishable Key를 설정해 주세요.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
