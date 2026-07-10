export function tenancyPaymentRedirectUrl(input: {
  listingId: string;
  paymentId: string;
  status: "pending" | "success" | "failed";
}) {
  const params = new URLSearchParams({
    tenancyPayment: input.paymentId,
    status: input.status,
  });
  return `/listings/${input.listingId}?${params.toString()}`;
}

export function buildCheckoutRedirectUrl(input: {
  plan: string;
  listingId?: string;
  paymentId: string;
  status: "pending" | "success" | "failed";
  gatewaySuccessUrl?: string;
}) {
  if (input.plan === "tenancy_payment" && input.listingId) {
    return tenancyPaymentRedirectUrl({
      listingId: input.listingId,
      paymentId: input.paymentId,
      status: input.status,
    });
  }

  const params = new URLSearchParams({ status: input.status, id: input.paymentId });
  if (input.listingId) params.set("listingId", input.listingId);
  return input.gatewaySuccessUrl?.includes("?")
    ? `${input.gatewaySuccessUrl}&id=${input.paymentId}`
    : `/payments?${params.toString()}`;
}
