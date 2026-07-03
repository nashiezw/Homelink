import { parseNaturalLanguageSearch } from "@/lib/api/ai-search";
import { listListings } from "@/lib/api/listing-service";
import { isAiSearchEnabled } from "@/lib/features";
import { ok, problem } from "@/lib/api/response";

export async function POST(request: Request) {
  if (!isAiSearchEnabled()) {
    return problem(503, "FEATURE_DISABLED", "AI search is currently disabled.");
  }
  const body = await request.json();
  const query = typeof body.query === "string" ? body.query : "";

  if (!query.trim()) {
    return problem(400, "QUERY_REQUIRED", "AI search requires a query string.");
  }

  const parsed = parseNaturalLanguageSearch(query);
  const matches = listListings(parsed);

  return ok({
    parsed,
    matches,
  });
}
