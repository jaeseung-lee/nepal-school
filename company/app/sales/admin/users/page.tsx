import { addAllowlistAction, updateUserAccessAction } from "@/app/sales/actions";
import { StatusBadge } from "@/components/sales/badges";
import { requireAdminProfile } from "@/lib/sales/auth";
import { getSalesLocale, salesMessages } from "@/lib/sales/i18n";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function UsersAdminPage() {
  await requireAdminProfile();
  const locale = await getSalesLocale();
  const t = salesMessages[locale];
  const supabase = await createServerSupabaseClient();
  const [{ data: allowlistData }, { data: profilesData }] = await Promise.all([
    supabase.from("access_allowlist").select("*").order("created_at", { ascending: false }),
    supabase.from("profiles").select("id,email,display_name,role,active,last:updated_at"),
  ]);
  const profileByEmail = new Map((profilesData ?? []).map((profile) => [profile.email, profile]));

  return (
    <div>
      <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1d5cff]">Admin · Access</p><h1 className="mt-2 text-3xl font-bold">{t.users}</h1></div>
      <form action={addAllowlistAction} className="mt-6 grid gap-3 rounded-2xl border border-[#dce3eb] bg-white p-5 md:grid-cols-[1fr_180px_auto]">
        <input required type="email" name="email" placeholder="name@company.com" className="rounded-lg border border-[#d5dce5] px-3 py-2.5 text-sm" />
        <select name="role" defaultValue="sales" className="rounded-lg border border-[#d5dce5] bg-white px-3 py-2.5 text-sm"><option value="sales">sales</option><option value="admin">admin</option></select>
        <button className="rounded-lg bg-[#17233a] px-5 py-2.5 text-sm font-bold text-white">{t.addUser}</button>
      </form>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-[#dce3eb] bg-white">
        <table className="w-full min-w-[850px] text-left text-sm"><thead className="border-b border-[#dce3eb] bg-[#f8fafc] text-xs text-[#667286]"><tr><th className="px-4 py-3">Email</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">{t.role}</th><th className="px-4 py-3">{t.status}</th><th className="px-4 py-3">Login profile</th><th className="px-4 py-3">Action</th></tr></thead><tbody className="divide-y divide-[#e8edf2]">{(allowlistData ?? []).map((entry) => { const profile = profileByEmail.get(entry.email); return <tr key={entry.email}><td className="px-4 py-4 font-semibold">{entry.email}</td><td className="px-4 py-4">{profile?.display_name ?? "—"}</td><td className="px-4 py-4">{entry.role}</td><td className="px-4 py-4"><StatusBadge status={entry.active ? "active" : "suspended"} label={entry.active ? t.active : t.suspended} /></td><td className="px-4 py-4">{profile ? "connected" : "not signed in"}</td><td className="px-4 py-4"><form action={updateUserAccessAction} className="flex items-center gap-2"><input type="hidden" name="email" value={entry.email} /><input type="hidden" name="role" value={entry.role} /><input type="hidden" name="intent" value={entry.active ? "suspend" : "activate"} /><button className={`rounded-lg px-3 py-1.5 text-xs font-bold ${entry.active ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}>{entry.active ? t.suspended : t.active}</button></form></td></tr>; })}</tbody></table>
      </div>
      <p className="mt-4 text-xs leading-5 text-[#7b8798]">公開登録画面はありません。許可リストに追加したGoogleメールだけが初回ログイン時にプロフィールを作成できます。</p>
    </div>
  );
}
