import { MyLibraryClient } from "@/components/library/my-library-client";
import { requireServerRole } from "@/lib/auth/server-session";
import { listCustomerLibrary } from "@/lib/library/repository";

export const dynamic = "force-dynamic";

export default async function MyLibraryPage() {
  const user = await requireServerRole([], {
    anySignedIn: true,
    next: "/dashboard/my-library",
  });
  const data = await listCustomerLibrary(user.id);
  return <MyLibraryClient products={data.products} orders={data.orders} downloads={data.downloads} />;
}
