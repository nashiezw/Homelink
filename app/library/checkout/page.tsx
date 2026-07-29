import { LibraryCheckoutClient } from "@/components/library/library-checkout-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Library Checkout | HouseLink Zimbabwe",
  description: "Review and pay for HouseLink Library books, manuals, templates, and digital products.",
};

export default function LibraryCheckoutPage() {
  return <LibraryCheckoutClient />;
}
