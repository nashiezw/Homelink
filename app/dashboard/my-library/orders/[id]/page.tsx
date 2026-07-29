import { notFound, redirect } from "next/navigation";
import { LibraryOrderClient } from "@/components/library/library-order-client";
import { requireServerRole } from "@/lib/auth/server-session";
import { getLibraryOrderForUser } from "@/lib/library/repository";

export const dynamic = "force-dynamic";

export default async function LibraryOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireServerRole([], { anySignedIn: true, next: "/dashboard/my-library" });
  const { id } = await params;
  const order = await getLibraryOrderForUser(id, user.id, user.roles);
  if (!order) notFound();
  if (order === "FORBIDDEN") redirect("/dashboard/my-library");
  return <LibraryOrderClient initialOrder={order} />;
}
