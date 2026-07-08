export function generateViewingReference(existingRefs: Iterable<string>): string {
  const year = new Date().getFullYear();
  const used = new Set(existingRefs);
  for (let n = 1; n < 100000; n += 1) {
    const ref = `HL-${year}-${String(n).padStart(5, "0")}`;
    if (!used.has(ref)) return ref;
  }
  return `HL-${year}-${crypto.randomUUID().replace(/-/g, "").slice(0, 5).toUpperCase()}`;
}

export function collectViewingReferenceNumbers(enquiries: Array<{ viewings?: Array<{ referenceNumber?: string }> }>) {
  return enquiries.flatMap((enquiry) =>
    (enquiry.viewings ?? []).map((viewing) => viewing.referenceNumber).filter((ref): ref is string => Boolean(ref)),
  );
}
