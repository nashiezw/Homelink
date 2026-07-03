import { getHomepageData } from "@/lib/homepage/data";

export async function GET() {
  return Response.json(getHomepageData());
}
