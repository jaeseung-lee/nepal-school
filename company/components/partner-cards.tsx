import { BuildingOffice, Handshake, MapPin, SealCheck } from "@phosphor-icons/react/dist/ssr";

const PARTNERS = [
  {
    country: "NP",
    name: "Richhood Overseas",
    role: "네팔 인력공급기관",
    desc: "근로자 선발, 자격 검증, 출입국 행정 MOU 파트너",
    icon: Handshake,
  },
  { country: "NP", name: "Kathmandu Technical School", role: "직업훈련학교", desc: "현지 직무와 기능 교육", icon: SealCheck },
  { country: "NP", name: "청소년고용노동부", role: "정부 부처", desc: "계절근로자 파견 MOU 주무 기관", icon: BuildingOffice },
  { country: "VN", name: "Vinako", role: "유학과 송출 협력", desc: "한국 방향 유학과 인재 송출 협력", icon: MapPin },
  { country: "KR", name: "대한주택건설협회", role: "산업 단체", desc: "주택건설 산업 현장 수요 연계", icon: BuildingOffice },
  { country: "KR", name: "용인시", role: "지자체", desc: "외국인 계절근로자 프로그램 운영 협력", icon: MapPin },
];

export default function PartnerCards() {
  return (
    <div className="overflow-hidden rounded-[28px] border border-line bg-surface">
      <div className="grid lg:grid-cols-[1.05fr_1.6fr]">
        <div className="border-b border-line bg-cobalt-soft p-7 lg:border-b-0 lg:border-r lg:p-8">
          <p className="text-sm font-semibold text-cobalt">검증된 협력망</p>
          <h3 className="mt-4 font-display text-3xl font-semibold text-ink">
            파트너 명단은 역할과 책임으로 설명합니다
          </h3>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            로고 사용 허락 전까지는 임시 로고를 만들지 않습니다. 각 기관이 맡는 실제 역할만 표시합니다.
          </p>
        </div>
        <ul className="divide-y divide-line">
          {PARTNERS.map((partner) => {
            const Icon = partner.icon;
            return (
              <li key={partner.name} className="grid gap-4 p-5 sm:grid-cols-[72px_1fr] lg:p-6">
                <div className="flex items-start gap-3 sm:block">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-paper text-sm font-bold text-cobalt">
                    {partner.country}
                  </span>
                  <span className="mt-3 hidden text-cobalt sm:block">
                    <Icon size={22} weight="duotone" aria-hidden="true" />
                  </span>
                </div>
                <div>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                    <h4 className="font-semibold text-ink">{partner.name}</h4>
                    <p className="text-sm font-medium text-cobalt">{partner.role}</p>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{partner.desc}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
