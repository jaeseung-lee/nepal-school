"use client";

import { useEffect } from "react";

/** Maps the old `/lp/v1#ja` fragment to the Japanese canonical detail URL. */
export default function LegacyLpLocaleBridge() {
  useEffect(() => {
    if (window.location.hash.toLowerCase() !== "#ja") return;
    window.location.replace(`/ja/services/japan-caregiver${window.location.search}`);
  }, []);

  return null;
}
