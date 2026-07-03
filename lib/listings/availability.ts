export type AvailabilityPreset = "now" | "date" | "transfer";

export function formatAvailableFrom(preset: AvailabilityPreset, dateIso?: string): string {
  if (preset === "now") {
    return "Available now";
  }
  if (preset === "transfer") {
    return "Ready for transfer";
  }
  if (dateIso) {
    const date = new Date(`${dateIso}T12:00:00`);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
  }
  return "Available now";
}

export function parseAvailableFrom(value: string): { preset: AvailabilityPreset; dateIso: string } {
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();

  if (!trimmed || lower === "available now") {
    return { preset: "now", dateIso: "" };
  }
  if (lower === "ready for transfer") {
    return { preset: "transfer", dateIso: "" };
  }

  const parsed = Date.parse(trimmed);
  if (!Number.isNaN(parsed)) {
    const date = new Date(parsed);
    const iso = date.toISOString().slice(0, 10);
    return { preset: "date", dateIso: iso };
  }

  return { preset: "now", dateIso: "" };
}

export function minAvailabilityDateIso(): string {
  return new Date().toISOString().slice(0, 10);
}
