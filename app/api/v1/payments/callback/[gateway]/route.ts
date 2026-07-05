import { NextResponse } from "next/server";
import { getPaymentFromPostgres, shouldUsePostgresPayments } from "@/lib/payments/postgres-payment-repository";
import { getStore } from "@/lib/store/app-store";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ gateway: string }> },
) {
  const { gateway } = await params;
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? "success";
  const paymentId = url.searchParams.get("payment_id") ?? url.searchParams.get("id");
  const payment = paymentId
    ? shouldUsePostgresPayments()
      ? await getPaymentFromPostgres(paymentId)
      : getStore().getPaymentById(paymentId)
    : null;
  const isTenancy = payment?.plan === "tenancy_payment";

  const redirectTo =
    status === "cancelled"
      ? `/payments?checkout=cancelled&gateway=${gateway}`
      : isTenancy
        ? `/dashboard/tenancies?checkout=success&gateway=${gateway}`
        : `/dashboard/landlord?checkout=success&gateway=${gateway}`;
  return NextResponse.redirect(new URL(redirectTo, url.origin));
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ gateway: string }> },
) {
  return GET(request, { params });
}
