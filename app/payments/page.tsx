import { Suspense } from "react";
import { PaymentsPageClient } from "@/components/pages/payments-page-client";

export default function PaymentsPage() {
  return (
    <Suspense fallback={null}>
      <PaymentsPageClient />
    </Suspense>
  );
}
