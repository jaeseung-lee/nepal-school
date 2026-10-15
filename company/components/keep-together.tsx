import { Fragment } from "react";

/**
 * "교육·모집부터"처럼 가운뎃점으로 이어진 짧은 어절을 한 덩어리로 묶어,
 * 좁은 화면에서 줄 첫머리에 "·"가 남는 줄바꿈을 막는다. 문구 자체는 바꾸지 않는다.
 */
export default function KeepTogether({ text }: { text: string }) {
  const words = text.split(" ");

  return (
    <>
      {words.map((word, index) => (
        <Fragment key={`${word}-${index}`}>
          {index > 0 ? " " : null}
          {word.includes("·") && word.length <= 14 ? <span className="whitespace-nowrap">{word}</span> : word}
        </Fragment>
      ))}
    </>
  );
}
