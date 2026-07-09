import { ImageResponse } from "next/og";

// 동적 Open Graph 이미지 (1200×630) - 카톡·링크드인·X 공유 썸네일
// ImageResponse 기본 폰트에는 한글이 없으므로 영문·기호 위주로 구성한다.
export const alt = "JOONG WOO HRD - Global Human Resource Development";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0b0b0c 0%, #1a1712 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 30,
            letterSpacing: 8,
            color: "#c6a15b",
            fontWeight: 600,
          }}
        >
          JOONG WOO HRD
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 66,
            fontWeight: 800,
            lineHeight: 1.15,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <span>Global Human</span>
          <span>Resource Development</span>
        </div>
        <div
          style={{
            marginTop: 40,
            fontSize: 32,
            color: "#d4d4d4",
          }}
        >
          Nepal, Vietnam to Korea, Japan
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 24,
            color: "#8a8a8a",
          }}
        >
          Train, test, match, visa, settle
        </div>
      </div>
    ),
    { ...size },
  );
}
