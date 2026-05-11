import React, { useState } from "react";
import { formatToMarkdown } from "../utils/markdown-formatter";

export interface OutputActionsProps {
  data: Record<string, any>;
  publicMode?: boolean;
  isSuite?: boolean;
  sectionName?: string;
}

const S = {
  container: {
    display: "flex",
    gap: "0.5rem",
    flexWrap: "wrap" as const,
  },
  btn: {
    background: "transparent",
    border: "1px solid var(--color-forge-border, #2a2a42)",
    borderRadius: "0.375rem",
    padding: "0.375rem 0.75rem",
    color: "var(--color-forge-text, #e8e8f0)",
    fontSize: "0.8125rem",
    fontWeight: 500,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "0.375rem",
    transition: "background 0.15s, border-color 0.15s",
  },
  btnPrimary: {
    background: "rgba(108, 99, 255, 0.1)",
    border: "1px solid rgba(108, 99, 255, 0.3)",
    color: "#6c63ff",
  },
} as const;

export function OutputActions({ data, publicMode = true, isSuite = false, sectionName = "Output" }: OutputActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const md = formatToMarkdown(data);
    navigator.clipboard.writeText(md).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownloadMd = () => {
    const md = formatToMarkdown(data);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sectionName.toLowerCase().replace(/\s+/g, "_")}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadJson = () => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sectionName.toLowerCase().replace(/\s+/g, "_")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportPackage = () => {
    alert("Export Full Package is a premium feature. Upgrade to unlock direct exports to Word, PDF, and Presentation formats.");
  };

  return (
    <div style={S.container}>
      {isSuite ? (
        <>
          <button type="button" style={{ ...S.btn, ...S.btnPrimary }} onClick={handleCopy}>
            {copied ? "Copied!" : "Copy All"}
          </button>
          <button type="button" style={S.btn} onClick={handleExportPackage}>
            Export Package
          </button>
        </>
      ) : (
        <button type="button" style={S.btn} onClick={handleCopy}>
          {copied ? "Copied!" : "Copy Section"}
        </button>
      )}

      <button type="button" style={S.btn} onClick={handleDownloadMd}>
        Download Markdown
      </button>

      {!publicMode && (
        <button type="button" style={S.btn} onClick={handleDownloadJson}>
          Download JSON
        </button>
      )}
    </div>
  );
}
