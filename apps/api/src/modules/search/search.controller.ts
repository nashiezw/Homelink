import { Body, Controller, Post } from "@nestjs/common";
import { AiSearchDto } from "./dto/ai-search.dto";
import { SearchService } from "./search.service";

@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post("ai")
  aiSearch(@Body() body: AiSearchDto) {
    return this.searchService.aiSearch(body.query);
  }
}
