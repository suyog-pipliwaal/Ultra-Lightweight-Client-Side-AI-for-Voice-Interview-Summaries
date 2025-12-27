let summary = [];

export function updateSummary(text) {
  const sentences = text.split(".");
  const last = sentences[sentences.length - 1]?.trim();

  if (!last || last.length < 20) return summary;

  if (
    last.includes("experience") ||
    last.includes("worked") ||
    last.includes("built")
  ) {
    summary.push("• " + last);
  }

  return summary.slice(-5);
}
