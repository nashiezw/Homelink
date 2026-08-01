import { MyLibraryClient } from "@/components/library/my-library-client";
import { requireServerRole } from "@/lib/auth/server-session";
import { suggestLibraryDigitalUpsells } from "@/lib/library/catalog";
import { listCustomerLibrary, listLibraryProducts } from "@/lib/library/repository";

export const dynamic = "force-dynamic";

export default async function MyLibraryPage() {
  const user = await requireServerRole([], {
    anySignedIn: true,
    next: "/dashboard/my-library",
  });
  const [data, catalog] = await Promise.all([
    listCustomerLibrary(user.id),
    listLibraryProducts({}),
  ]);
  const ownedIds = data.products.map((product) => product.id);
  const nextBooks = suggestLibraryDigitalUpsells({
    catalog,
    seedProductIds: ownedIds,
    excludeProductIds: ownedIds,
    cartProductIds: ownedIds,
    max: 3,
    preferPromoCompanions: true,
  });
  return (
    <MyLibraryClient
      products={data.products}
      orders={data.orders}
      downloads={data.downloads}
      nextBooks={nextBooks}
    />
  );
}
