export function formatDateDisplay(input: string | Date, mode: "full" | "short" = "full"): string {
  const date =
    typeof input === "string"
      ? new Date(input.includes("T") ? input : `${input}T00:00:00`)
      : new Date(input);

  if (Number.isNaN(date.getTime())) {
    return typeof input === "string" ? input : "";
  }

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();

  if (mode === "short") {
    return `${dd}/${mm}`;
  }

  return `${dd}/${mm}/${yyyy}`;
}
