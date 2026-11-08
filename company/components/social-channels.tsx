import { ArrowUpRight, ChatCircleDots, FacebookLogo, TiktokLogo } from "@phosphor-icons/react/dist/ssr";
import { getMessages, type Locale } from "@/lib/i18n";
import { SITE } from "@/lib/site";

const CHANNEL_ICONS = {
  line: ChatCircleDots,
  facebook: FacebookLogo,
  tiktok: TiktokLogo,
};

export default function SocialChannels({ locale, tone = "light" }: { locale?: Locale; tone?: "light" | "dark" }) {
  const messages = getMessages(locale);
  const linkClassName = tone === "dark"
    ? "border-white/25 text-white/85 hover:border-white/70 hover:bg-white/10 hover:text-white"
    : "border-line bg-surface text-ink hover:border-ink hover:bg-paper";

  return (
    <nav aria-label={messages.common.socialChannels}>
      <ul className="flex flex-wrap gap-2">
        {SITE.socialChannels.map((channel) => {
          const Icon = CHANNEL_ICONS[channel.id];
          return (
            <li key={channel.id}>
              <a
                href={channel.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${linkClassName}`}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{channel.label}</span>
                <ArrowUpRight size={14} aria-hidden="true" />
                <span className="sr-only"> ({messages.common.opensInNewTab})</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
