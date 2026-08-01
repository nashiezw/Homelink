import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LibraryCheckoutConfirmation } from "@/components/library/library-checkout-confirmation";
import { requireServerRole } from "@/lib/auth/server-session";
import { suggestLibraryDigitalUpsells } from "@/lib/library/catalog";
import { getLibraryOrderForUser, listCustomerLibrary, listLibraryProducts } from "@/lib/library/repository";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Library Order Confirmation | HouseLink Zimbabwe",
  description: "Confirmation and payment instructions for your HouseLink Library order.",
  robots: { index: false, follow: false },
};

export default async function LibraryCheckoutConfirmationPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireServerRole([], { anySignedIn: true, next: "/library/checkout" });
  const params = (await searchParams) ?? {};
  const orderId = Array.isArray(params.orderId) ? params.orderId[0] : params.orderId;
  const paymentId = Array.isArray(params.paymentId) ? params.paymentId[0] : params.paymentId;
  const status = Array.isArray(params.status) ? params.status[0] : params.status;
  if (!orderId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-3xl font-semibold text-ink dark:text-white">Library order not found</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">We could not find an order reference in this checkout session.</p>
        <Link href="/library/checkout" className="mt-6 inline-flex rounded-lg bg-emerald-600 px-5 py-3 text-sm font-bold text-white">
          Return to checkout
        </Link>
      </div>
    );
  }
  const order = await getLibraryOrderForUser(orderId, user.id, user.roles);
  if (!order) notFound();
  if (order === "FORBIDDEN") redirect("/dashboard/my-library");
  const [catalog, library] = await Promise.all([
    listLibraryProducts({}),
    listCustomerLibrary(user.id).catch(() => ({ products: [] as Array<{ id: string }> })),
  ]);
  const seedProductIds = (order.items ?? [])
    .map((item) => ("productId" in item ? String((item as { productId?: string }).productId || "") : ""))
    .filter(Boolean);
  const ownedIds = [
    ...seedProductIds,
    ...(library.products ?? []).map((product) => product.id),
  ];
  const nextBooks = suggestLibraryDigitalUpsells({
    catalog,
    seedProductIds,
    excludeProductIds: ownedIds,
    cartProductIds: ownedIds,
    max: 2,
    preferPromoCompanions: true,
  });
  return <LibraryCheckoutConfirmation order={order} paymentId={paymentId} status={status} nextBooks={nextBooks} />;
}
