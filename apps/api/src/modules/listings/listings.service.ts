import { Injectable, NotFoundException } from "@nestjs/common";
import { ListListingsDto } from "./dto/list-listings.dto";

@Injectable()
export class ListingsService {
  list(query: ListListingsDto) {
    return {
      data: [],
      meta: {
        query,
        nextCursor: null,
      },
    };
  }

  get(id: string) {
    throw new NotFoundException(`Listing ${id} is not wired to the database yet.`);
  }

  create(body: Record<string, unknown>) {
    return {
      data: {
        id: "draft_pending_database",
        status: "PENDING_REVIEW",
        ...body,
      },
    };
  }

  update(id: string, body: Record<string, unknown>) {
    return {
      data: {
        id,
        ...body,
      },
    };
  }
}
