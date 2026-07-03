import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ListListingsDto } from "./dto/list-listings.dto";
import { ListingsService } from "./listings.service";

@Controller("listings")
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @Get()
  list(@Query() query: ListListingsDto) {
    return this.listingsService.list(query);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.listingsService.get(id);
  }

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.listingsService.create(body);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.listingsService.update(id, body);
  }
}
