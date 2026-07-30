import { LibraryStorefront } from "@/components/library/library-storefront";
import { listLibraryProducts } from "@/lib/library/repository";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "HouseLink Library | Books, Manuals, Templates and Courses",
  description: "Browse professional property books, manuals, contracts, forms, templates, toolkits, and digital products from HouseLink Zimbabwe.",
};

export default async function LibraryPage() {
  return <LibraryStorefront products={await listLibraryProducts()} />;
}
