import Image from "next/image";
import React from "react";
import { BRAND_ASSETS } from "@/lib/brand";

type BrandLogoBaseProps = {
  className?: string;
  priority?: boolean;
};

type LockupBrandLogoProps = BrandLogoBaseProps & {
  kind: "lockup";
  tone?: "color" | "white" | "black";
};

type MarkBrandLogoProps = BrandLogoBaseProps & {
  kind: "mark";
};

export type BrandLogoProps = LockupBrandLogoProps | MarkBrandLogoProps;

export function BrandLogo(props: BrandLogoProps) {
  if (props.kind === "lockup") {
    return (
      <Image
        src={BRAND_ASSETS.lockup[props.tone ?? "color"]}
        alt=""
        aria-hidden="true"
        width={785}
        height={198}
        unoptimized
        className={props.className}
        priority={props.priority}
      />
    );
  }

  return (
    <Image
      src={BRAND_ASSETS.mark.color}
      alt=""
      aria-hidden="true"
      width={277}
      height={198}
      unoptimized
      className={props.className}
      priority={props.priority}
    />
  );
}
