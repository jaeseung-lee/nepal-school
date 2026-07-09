import Link from "next/link";
import { DOCS } from "@/lib/content";

type KpiColor = "green" | "amber" | "red" | "blue";

interface Kpi {
  label: string;
  value: string;
  unit: string;
  color: KpiColor;
  foot: string;
  bar?: { pct: number; color: string };
}

const KPIS: Kpi[] = [
  {
    label: "개호 5년 수용상한",
    value: "126,900",
    unit: "명",
    color: "green",
    foot: "2026.1.23 운용방침 / 충족률 53.5%",
    bar: { pct: 54, color: "var(--green)" },
  },
  {
    label: "개호 잔여 인력부족",
    value: "16.1만",
    unit: "명",
    color: "green",
    foot: "令和10年度 정부 산정 · 유효구인배율 4.08배",
  },
  {
    label: "숙박 수용상한 / 충족률",
    value: "14,800",
    unit: "명",
    color: "amber",
    foot: "전체 1,968명·네팔 228명 / 충족률 13.3%",
    bar: { pct: 13, color: "var(--amber)" },
  },
  {
    label: "재일 네팔인 (2025.6)",
    value: "27.3만",
    unit: "명",
    color: "blue",
    foot: "외국인 5위 · 증가율 1위(+17.2%)",
  },
  {
    label: "네팔 특정기능1호 (2025.12)",
    value: "12,277",
    unit: "명",
    color: "blue",
    foot: "개호 6,013명·숙박 228명",
  },
  {
    label: "개호+숙박 초기 SAM",
    value: "770~1,285",
    unit: "명/년",
    color: "amber",
    foot: "2025 네팔 순증 2,569명 기반 · 54억~90억원(700만원)",
  },
  {
    label: "네팔 JFT-Basic 도달률",
    value: "39.0",
    unit: "%",
    color: "red",
    foot: "2026.4-5 공식 회차 · 직전 26.5~30.2%",
  },
  {
    label: "방일외객수 (2025)",
    value: "4,268만",
    unit: "명",
    color: "blue",
    foot: "전년비 +15.8% · 숙박업 잔여 부족 2만명",
  },
  {
    label: "700만원 중 회사 마진",
    value: "43",
    unit: "%",
    color: "blue",
    foot: "300만원 / 700만원 · 한국 법인 외주용역 매출",
  },
  {
    label: "한국행 평균 수수료",
    value: "≈1만",
    unit: "USD",
    color: "blue",
    foot: "고용쿼터·숙식제공으로 일자리 희소 / 일본행은 약 절반(700만원)",
  },
];

type VerdictRow = [축: string, 판정: string, 근거: string];

const VERDICT_ROWS: VerdictRow[] = [
  ["제도·비자", "✅ 가능", "회사(개호시설) 직접고용·감독단체 불요, 시험 네팔 실시, MOC 2024.4 갱신 유효, COE→비자 루트 성립"],
  ["시장·수요(개호)", "✅ 매우 큼", "SSW1 상한 126,900명·실적 67,871명·정부 산정 잔여 부족 160,700명"],
  ["시장·수요(숙박)", "⚠️ 제한적", "SSW1 상한 14,800명·실적 1,968명·네팔 실적 228명. 수요는 있으나 절대 규모 작음"],
  ["네팔 송출", "⚠️ 초기 성장", "네팔 SSW1 12,277명, 개호 6,013명. 신규 송출 처리능력은 제휴기관별 실사 필요"],
  ["경쟁·신규비자", "⚠️ 초기전", "Caregiver Academia+Chandani형 결합 모델 존재. 대사관 수요서 인증과 DoFE 활성 송출기관 제휴가 병목"],
  ["수익모델(700만원)", "⚠️ 시장·법률 실사", "일본 지원비용 전가와 분리되도록 설계 가능. 네팔 수수료·교육비 규제와 한국 회계·세무 확인 필요"],
];

export default function Home() {
  return (
    <div>
      <div className="page-head">
        <div className="eyebrow">실현가능성 대시보드</div>
        <h2>네팔 학생을 일본 개호·숙박에 취업시키는 것이 가능한가?</h2>
        <p>
          특정기능1호(特定技能1号) 비자로 네팔 인재를 일본 개호·숙박 분야에 송출하는 사업의 실현가능성을
          제도·시장·송출·비용 4개 축에서 1차 출처 중심으로 검증했습니다.
        </p>
        <div className="updated">최종 업데이트 2026-06-17 · 출처: 출입국재류관리청·후생노동성·JNTO·국제교류기금·네팔 DoFE</div>
      </div>

      <div className="verdict-banner">
        <div className="verdict-pill go">
          <div className="vlabel">개호(介護)</div>
          <div className="vmain">조건부 Yes</div>
          <div className="vsub">직접고용(감독단체 불요) + 구조적 초과수요 + 장기 정주경로. 교육 품질·가격·규제가 변수.</div>
        </div>
        <div className="verdict-pill no">
          <div className="vlabel">숙박(호텔)</div>
          <div className="vmain">병행 모집</div>
          <div className="vsub">네팔 숙박 228명·전체 1,968명. 회화·서비스 적성과 고용처 확보율은 별도 관리.</div>
        </div>
      </div>

      <div className="section-label">핵심 지표</div>
      <div className="kpi-grid">
        {KPIS.map((k) => (
          <div className="kpi-card" key={k.label}>
            <div className="kpi-label">{k.label}</div>
            <div>
              <span className={"kpi-value " + k.color}>{k.value}</span>
              <span className="kpi-unit">{k.unit}</span>
            </div>
            {k.bar && (
              <div className="bar">
                <span style={{ width: `${k.bar.pct}%`, background: k.bar.color }} />
              </div>
            )}
            <div className="kpi-foot">{k.foot}</div>
          </div>
        ))}
      </div>

      <div className="section-label">검증 축별 판정</div>
      <div className="prose">
        <table>
          <thead>
            <tr>
              <th>검증 축</th>
              <th>판정</th>
              <th>근거 요약</th>
            </tr>
          </thead>
          <tbody>
            {VERDICT_ROWS.map((r) => (
              <tr key={r[0]}>
                <td style={{ whiteSpace: "nowrap", fontWeight: 600 }}>{r[0]}</td>
                <td style={{ whiteSpace: "nowrap" }}>{r[1]}</td>
                <td>{r[2]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section-label">문서 바로가기</div>
      <div className="doc-cards">
        {DOCS.map((d) => (
          <Link key={d.slug} href={`/docs/${d.slug}`} className="doc-card">
            <div className="dc-icon">{d.icon}</div>
            <div className="dc-num">{d.num}</div>
            <div className="dc-title">{d.title}</div>
            <div className="dc-desc">{d.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
