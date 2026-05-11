export function formatToMarkdown(data: Record<string, any>): string {
  if (!data || typeof data !== "object") return "";

  const lines: string[] = [];

  for (const [key, value] of Object.entries(data)) {
    // Format key to Title Case (e.g., "press_release" -> "Press Release")
    const formattedKey = key
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    if (Array.isArray(value)) {
      lines.push(`**${formattedKey}**:`);
      value.forEach((item) => {
        lines.push(`- ${item}`);
      });
      lines.push("");
    } else if (value !== null && typeof value === "object") {
      lines.push(`**${formattedKey}**:`);
      lines.push("```json");
      lines.push(JSON.stringify(value, null, 2));
      lines.push("```");
      lines.push("");
    } else {
      const displayValue = value === null || value === undefined ? "" : String(value);
      lines.push(`**${formattedKey}**: ${displayValue}`);
      lines.push("");
    }
  }

  return lines.join("\n").trim();
}
