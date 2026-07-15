import { problem } from "@/lib/api/response";

export async function POST() {
  return problem(
    410,
    "CONTACT_DETAILS_DISABLED",
    "Public owner contact details are no longer available. Please submit an enquiry through HomeLink.",
  );
}
