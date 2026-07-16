"use client";

import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function GoogleLoginButton({ nextPath = "/sales" }: { nextPath?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setPending(true);
    setError(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const callback = new URL("/auth/callback", window.location.origin);
      callback.searchParams.set("next", nextPath.startsWith("/sales") ? nextPath : "/sales");
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callback.toString() },
      });
      if (oauthError) throw oauthError;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Google login failed");
      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={signIn}
        disabled={pending}
        className="flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-[#162238] px-5 text-sm font-semibold text-white transition hover:bg-[#22314c] disabled:cursor-wait disabled:opacity-60"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-[#4285f4]">G</span>
        {pending ? "接続中… / 연결 중…" : "Googleでログイン / Google로 로그인"}
      </button>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
