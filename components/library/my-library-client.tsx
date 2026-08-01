"use client";

import Link from "next/link";
import { Download, FileText, Heart, PackageCheck, Star, X } from "lucide-react";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { LibraryUpsellRail } from "@/components/library/library-upsell-rail";
import { SetPasswordCard } from "@/components/library/set-password-card";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers/app-provider";
import { trackEvent } from "@/lib/analytics/client";
import { apiFetch } from "@/lib/api/client";
import type { LibraryDigitalUpsellSuggestion, LibraryOrder, LibraryProduct } from "@/lib/library/catalog";
import { libraryOrderStageCopy, libraryOrderStatusLabel } from "@/lib/library/order-stage";

type DownloadAccess = {
  id: string;
  productId: string;
  orderId: string | null;
  productTitle: string;
  fileName: string;
  status: string;
  downloadCount: number;
  downloadLimit: number | null;
  expiresAt: string | null;
};

type LibraryMe = {
  products: LibraryProduct[];
  orders: LibraryOrder[];
  downloads: DownloadAccess[];
  wishlist?: LibraryProduct[];
  wishlistCount?: number;
};

export function MyLibraryClient({
  products,
  orders,
  downloads,
  nextBooks = [],
}: {
  products: LibraryProduct[];
  orders: LibraryOrder[];
  downloads?: DownloadAccess[];
  nextBooks?: LibraryDigitalUpsellSuggestion[];
}) {
  const { showToast, user } = useApp();
  const [library, setLibrary] = useState<LibraryMe>({ products, orders, downloads: downloads ?? [], wishlist: [], wishlistCount: 0 });
  const [reviewProduct, setReviewProduct] = useState<LibraryProduct | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewBody, setReviewBody] = useState("");
  const [reviewDisplayName, setReviewDisplayName] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);
  const [allowGuestNames, setAllowGuestNames] = useState(false);
  const purchased = library.products.filter((product) => product.downloads.length > 0 || library.downloads.some((download) => download.productId === product.id)).slice(0, 6);

  useEffect(() => {
    void apiFetch<LibraryMe>("/api/v1/library/me").then((result) => {
      if (result.data) setLibrary(result.data);
    });
    void apiFetch<{ reviews?: { allowGuestNames?: boolean } }>("/api/v1/library/settings").then((result) => {
      setAllowGuestNames(Boolean(result.data?.reviews?.allowGuestNames));
    });
  }, []);

  async function download(accessId?: string) {
    if (!accessId) return;
    const token = await apiFetch<{ token: string; downloadUrl: string }>(`/api/v1/library/downloads/${accessId}/token`, { method: "POST" });
    if (token.data?.token) {
      trackEvent("library_download_started", accessId);
      window.location.href = `${token.data.downloadUrl}?token=${encodeURIComponent(token.data.token)}`;
    }
  }

  async function submitReview() {
    if (!reviewProduct) return;
    if (reviewTitle.trim().length < 3) {
      showToast("Add a short title (at least 3 characters).", "error");
      return;
    }
    if (reviewBody.trim().length < 20) {
      showToast("Write a review of at least 20 characters.", "error");
      return;
    }
    setReviewBusy(true);
    const result = await apiFetch<{ autoApproved?: boolean }>("/api/v1/library/reviews", {
      method: "POST",
      body: JSON.stringify({
        productId: reviewProduct.id,
        rating,
        title: reviewTitle,
        body: reviewBody,
        displayName: allowGuestNames ? reviewDisplayName : undefined,
      }),
    });
    setReviewBusy(false);
    if (result.error) {
      showToast(result.error.message || "Could not submit review.", "error");
      return;
    }
    showToast(
      result.data?.autoApproved ? "Review published. Thank you." : "Review submitted for moderation. Thank you.",
      "success",
    );
    setReviewProduct(null);
    setReviewTitle("");
    setReviewBody("");
    setReviewDisplayName("");
    setRating(5);
  }

  return (
    <PageShell
      eyebrow="My Library"
      title="Your books, manuals, downloads, and future courses"
      description="Access purchased resources, track orders and downloads, manage reviews, and keep professional documents in one HouseLink account."
      compactHero
      actions={<Link href="/library" className="bg-emerald-600 text-white hover:bg-emerald-500">Browse Library</Link>}
    >
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="min-w-0 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Stat icon={PackageCheck} label="Purchases" value={library.orders.length} />
            <Stat icon={Download} label="Downloads" value={library.downloads.length || purchased.reduce((sum, product) => sum + product.downloads.length, 0)} />
            <Stat icon={Heart} label="Wishlist" value={library.wishlistCount ?? library.wishlist?.length ?? 0} />
          </div>

          <SetPasswordCard />

          <section className="surface-panel min-w-0 max-w-full rounded-lg p-4 sm:p-5">
            <h2 className="text-lg font-semibold text-ink dark:text-white">Purchased Resources</h2>
            <div className="mt-4 grid gap-4">
              {purchased.map((product) => (
                <PurchasedResource key={product.id} product={product} downloads={library.downloads} onDownload={download} />
              ))}
              {!purchased.length && (
                <div className="rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700">
                  Approved Library purchases and downloads will appear here after payment confirmation.
                </div>
              )}
            </div>
          </section>

          <LibraryUpsellRail
            title="Continue learning"
            description="Next soft-copy titles based on what you already own — compact picks, one tap to browse."
            suggestions={nextBooks}
            mode="link"
          />

          {(library.wishlist?.length ?? 0) > 0 && (
            <section className="surface-panel rounded-lg p-5">
              <h2 className="text-lg font-semibold text-ink dark:text-white">Wishlist</h2>
              <div className="mt-4 grid gap-3">
                {library.wishlist?.map((product) => (
                  <Link key={product.id} href={`/library/${product.slug}`} className="rounded-lg border border-slate-200 p-3 text-sm font-semibold hover:border-emerald-500 dark:border-slate-800">
                    {product.title}
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="surface-panel rounded-lg p-5">
            <h2 className="text-lg font-semibold text-ink dark:text-white">Orders</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800">
                  <tr>
                    <th className="py-3">Order</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Total</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {library.orders.map((order) => {
                    const stage = libraryOrderStageCopy({
                      status: order.status,
                      paymentStatus: order.paymentStatus,
                      payment: {
                        id: order.paymentId,
                        status: order.paymentStatus,
                        proofStatus: order.proofStatus,
                        proofUrl: order.proofUrl,
                        adminNote: order.paymentAdminNote,
                      },
                    });
                    return (
                      <tr key={order.id} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="py-3 font-semibold">
                          <Link href={`/dashboard/my-library/orders/${order.id}`} className="hover:text-emerald-700 dark:hover:text-emerald-300">{order.orderNumber}</Link>
                          {(stage.showProofUpload || stage.showProofReceived) && order.paymentId && (
                            <Link
                              href={`/library/checkout/confirmation?orderId=${encodeURIComponent(order.id)}&paymentId=${encodeURIComponent(order.paymentId)}`}
                              className="mt-1 block text-xs font-bold text-amber-700 hover:underline dark:text-amber-300"
                            >
                              {stage.showProofUpload ? "Complete payment" : "View payment status"}
                            </Link>
                          )}
                        </td>
                        <td>{libraryOrderStatusLabel(order.status)}</td>
                        <td>{stage.badge}</td>
                        <td>{order.currency} {order.total.toFixed(2)}</td>
                        <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!library.orders.length && <p className="mt-4 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700">Your Library orders will appear here as soon as checkout creates them.</p>}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="surface-panel rounded-lg p-5">
            <h2 className="text-lg font-semibold text-ink dark:text-white">Secure Downloads</h2>
            <div className="mt-4 space-y-3">
              {library.downloads.length ? library.downloads.map((item) => (
                <button key={item.id} type="button" onClick={() => void download(item.id)} className="flex w-full items-start justify-between gap-3 rounded-lg border border-slate-200 p-3 text-left dark:border-slate-800">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{item.productTitle}</span>
                    <span className="block text-xs text-slate-500">{item.fileName} - {item.downloadCount}{item.downloadLimit ? `/${item.downloadLimit}` : ""} downloads</span>
                  </span>
                  <Download className="size-4 shrink-0 text-emerald-600" />
                </button>
              )) : (
                <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700">Approved purchases will appear here.</p>
              )}
            </div>
          </section>
          <section className="surface-panel rounded-lg p-5">
            <h2 className="text-lg font-semibold text-ink dark:text-white">Review Queue</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Share product reviews after download access is active.</p>
            <div className="mt-4 space-y-3">
              {purchased.slice(0, 4).map((product) => (
                <button key={product.id} type="button" onClick={() => setReviewProduct(product)} className="flex w-full items-center justify-between rounded-lg border border-slate-200 p-3 text-left hover:border-emerald-500 dark:border-slate-800">
                  <span className="min-w-0 truncate text-sm font-semibold">{product.title}</span>
                  <Star className="size-4 text-amber-500" />
                </button>
              ))}
              {!purchased.length && <p className="text-sm text-slate-500">Purchased products will appear here for review.</p>}
            </div>
          </section>
          <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-100">
            <p className="font-semibold">Download security</p>
            <p className="mt-2 leading-6">Links can be limited, expiring, watermarked, and tracked by admins without changing your HouseLink login.</p>
          </section>
        </aside>
      </div>

      {reviewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setReviewProduct(null)}>
          <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl dark:bg-slate-950" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Write a review</p>
                <h3 className="mt-1 text-lg font-semibold text-ink dark:text-white">{reviewProduct.title}</h3>
              </div>
              <button type="button" onClick={() => setReviewProduct(null)} aria-label="Close review form"><X className="size-4" /></button>
            </div>
            <div className="mt-4 flex gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button key={value} type="button" onClick={() => setRating(value)} className="rounded p-1" aria-label={`${value} stars`}>
                  <Star className={`size-5 ${value <= rating ? "fill-current text-amber-500" : "text-slate-300"}`} />
                </button>
              ))}
            </div>
            <input
              value={reviewTitle}
              onChange={(event) => setReviewTitle(event.target.value)}
              placeholder="Review title (required)"
              minLength={3}
              maxLength={120}
              className="mt-4 h-11 w-full rounded-lg border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-900"
            />
            {allowGuestNames ? (
              <input
                value={reviewDisplayName}
                onChange={(event) => setReviewDisplayName(event.target.value)}
                placeholder={user?.name ? `Display name (optional, e.g. ${user.name})` : "Display name (optional)"}
                maxLength={60}
                className="mt-3 h-11 w-full rounded-lg border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-900"
              />
            ) : null}
            <textarea
              value={reviewBody}
              onChange={(event) => setReviewBody(event.target.value)}
              placeholder="What helped you most? (min. 20 characters)"
              rows={4}
              minLength={20}
              maxLength={4000}
              className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setReviewProduct(null)}>Cancel</Button>
              <Button disabled={reviewBusy} onClick={() => void submitReview()}>{reviewBusy ? "Submitting..." : "Submit review"}</Button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

function PurchasedResource({ product, downloads, onDownload }: { product: LibraryProduct; downloads: DownloadAccess[]; onDownload: (accessId?: string) => void }) {
  const access = downloads.find((download) => download.productId === product.id);
  return (
    <article className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">{product.productType.replace(/_/g, " ")}</p>
        <Link href={`/library/${product.slug}`} className="mt-1 block text-lg font-semibold text-ink hover:text-emerald-700 dark:text-white">{product.title}</Link>
        <p className="mt-1 text-sm text-slate-500">{product.downloads.length} secure download{product.downloads.length === 1 ? "" : "s"} - permanent access</p>
      </div>
      <div className="flex flex-wrap gap-2 md:justify-end">
        <Button disabled={!access} onClick={() => onDownload(access?.id)}>
          <Download className="size-4" /> Download
        </Button>
        {access?.orderId && <Link href={`/dashboard/my-library/orders/${access.orderId}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:border-emerald-500 hover:text-emerald-700 dark:border-slate-700 dark:text-slate-200"><FileText className="size-4" /> View order</Link>}
      </div>
    </article>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof PackageCheck; label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <Icon className="size-5 text-emerald-700 dark:text-emerald-400" />
      <p className="mt-3 text-2xl font-bold text-ink dark:text-white">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}
