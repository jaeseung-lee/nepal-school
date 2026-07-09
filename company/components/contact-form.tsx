"use client";

import { useState } from "react";

const inputCls =
  "mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm focus:border-primary-main focus:ring-0";

/** 문의 양식 — 현재 백엔드 미연동. 제출 시 안내문만 표시(원본 동작 그대로). TODO: 전송 endpoint 연동 */
export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="rounded-[20px] border border-gray-200 bg-gray-50 p-7 lg:p-9">
      <h3 className="text-xl font-bold text-gray-900">문의 양식</h3>
      <p className="mt-1.5 text-sm text-gray-500">* 표시는 필수 항목입니다.</p>
      {/* TODO: 폼 전송 endpoint 연동 필요 (이메일/메신저 알림 + reCAPTCHA) */}
      <form
        className="mt-6 grid gap-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
        }}
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">회사명 *</span>
            <input type="text" required className={inputCls} placeholder="(주)○○" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">담당자명 *</span>
            <input type="text" required className={inputCls} placeholder="홍길동" />
          </label>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">이메일 *</span>
            <input type="email" required className={inputCls} placeholder="name@company.com" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">연락처</span>
            <input type="tel" className={inputCls} placeholder="010-0000-0000" />
          </label>
        </div>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">관심 분야</span>
          <select className={inputCls}>
            <option>한국 취업비자 (E-9 / E-7 / D-2 / D-4 / 계절근로)</option>
            <option>일본 취업비자 (특정기능 · 개호/숙박)</option>
            <option>네팔 직업훈련 · 현지 양성</option>
            <option>제휴 · 파트너십</option>
            <option>기타</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">문의 내용 *</span>
          <textarea required rows={4} className={inputCls} placeholder="채용 희망 직무·인원, 일정 등을 적어 주세요."></textarea>
        </label>
        <label className="flex items-start gap-2 text-sm text-gray-600">
          <input type="checkbox" required className="mt-1" />{" "}
          <span>
            개인정보 수집·이용에 동의합니다. <span className="text-gray-400">(개인정보처리방침 게시 예정)</span>
          </span>
        </label>
        <button type="submit" className="mt-2 inline-flex justify-center items-center gap-2 rounded-full bg-primary-main hover:bg-primary-light transition text-white text-base font-semibold px-7 py-3.5">
          문의 보내기 <span aria-hidden="true">→</span>
        </button>
        <p className={`${submitted ? "" : "hidden "}text-sm text-primary-main bg-primary-main/5 border border-primary-main/20 rounded-lg px-4 py-3`}>
          감사합니다. 폼 전송 기능은 연동 예정입니다 — 현재는 위 연락처로 문의해 주세요.
        </p>
      </form>
    </div>
  );
}
