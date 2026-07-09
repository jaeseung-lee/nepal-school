"use client";

import { useEffect } from "react";

interface MermaidRendererProps {
  contentKey: string;
}

export default function MermaidRenderer({ contentKey }: MermaidRendererProps) {
  useEffect(() => {
    let cancelled = false;

    async function renderMermaid() {
      const nodes = Array.from(
        document.querySelectorAll<HTMLElement>(".prose .mermaid"),
      );
      if (nodes.length === 0) return;

      const mermaid = (await import("mermaid")).default;
      if (cancelled) return;

      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: "base",
        themeVariables: {
          background: "#ffffff",
          mainBkg: "#ffffff",
          primaryColor: "#eff6ff",
          primaryTextColor: "#111827",
          primaryBorderColor: "#2563eb",
          lineColor: "#64748b",
          secondaryColor: "#ecfdf5",
          tertiaryColor: "#f8fafc",
          clusterBkg: "#f8fafc",
          clusterBorder: "#cbd5e1",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, Segoe UI, Apple SD Gothic Neo, Noto Sans KR, sans-serif",
        },
      });

      try {
        await mermaid.run({ nodes });
      } catch (error) {
        for (const node of nodes) {
          node.dataset.mermaidError =
            error instanceof Error ? error.message : "Mermaid render failed";
        }
      }
    }

    renderMermaid();

    return () => {
      cancelled = true;
    };
  }, [contentKey]);

  return null;
}
