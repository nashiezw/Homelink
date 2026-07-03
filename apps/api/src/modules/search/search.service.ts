import { Injectable } from "@nestjs/common";

@Injectable()
export class SearchService {
  aiSearch(query: string) {
    return {
      data: {
        originalQuery: query,
        parsed: {
          intent: query.toLowerCase().includes("buy") ? "buy" : "rent",
        },
        matches: [],
      },
    };
  }
}
