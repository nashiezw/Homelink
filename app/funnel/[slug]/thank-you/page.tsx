import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LibraryCheckoutConfirmation } from "@/components/library/library-checkout-confirmation";
import { requireServerRole } from "@/lib/auth/server-session";
import { getSalesFunnelBySlug } from "@/lib/library/funnels";
import { getLibraryOrderForUser } from "@/lib/library/repository";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const resolved = await getSalesFunnelBySlug(slug);
  if (!resolved) return {};
  return {
    title: `Order Confirmation | ${resolved.product.title} | HouseLink`,
    description: "Payment instructions and access next steps for your HouseLink funnel order.",
    robots: { index: false, follow: false },
  };
}

export default async function FunnelThankYouPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const resolved = await getSalesFunnelBySlug(slug);
  if (!resolved) notFound();

  const user = await requireServerRole([], { anySignedIn: true, next: `/funnel/${resolved.funnel.slug}/checkout` });
  const query = (await searchParams) ?? {};
  const orderId = Array.isArray(query.orderId) ? query.orderId[0] : query.orderId;
  const paymentId = Array.isArray(query.paymentId) ? query.paymentId[0] : query.paymentId;
  const status = Array.isArray(query.status) ? query.status[0] : query.status;

  if (!orderId) {
    return (
      <main className="min-h-screen bg-[#07111f] px-4 py-16 text-white">
        <div className="mx-auto max-w-2xl border border-white/10 bg-white p-8 text-center text-[#07111f] shadow-[12px_12px_0_rgba(11,143,84,0.45)]">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0b8f54]">Missing order reference</p>
          <h1 className="mt-3 text-3xl font-black uppercase">We could not find this funnel order.</h1>
          <p className="mt-4 text-sm font-semibold leading-6 text-slate-600">
            Return to the checkout page and place the order again so the payment reference can be created correctly.
          </p>
          <Link href={`/funnel/${resolved.funnel.slug}/checkout`} className="mt-6 inline-flex h-12 items-center justify-center bg-[#0b8f54] px-5 text-sm font-black uppercase text-white">
            Return to checkout
          </Link>
        </div>
      </main>
    );
  }

  const order = await getLibraryOrderForUser(orderId, user.id, user.roles);
  if (!order) notFound();
  if (order === "FORBIDDEN") redirect("/dashboard/my-library");

  return (
    <LibraryCheckoutConfirmation
      order={order}
      paymentId={paymentId}
      status={status}
      variant="funnel"
      resolvedFunnel={resolved}
    />
  );
}
