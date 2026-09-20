export function normalizeLeadPhone(phone: string | null | undefined) {
  const digits = (phone || "").replace(/\D/g, "");
  return digits.startsWith("0") && digits.length === 10 ? `263${digits.slice(1)}` : digits;
}
