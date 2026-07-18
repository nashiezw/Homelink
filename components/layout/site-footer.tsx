"use client";

import { Mail, MessageCircle, Phone } from "lucide-react";
import Link from "next/link";
import { HouseLinkBrand } from "@/components/brand/houselink-logo";
import { usePlatformConfig } from "@/components/providers/platform-config-provider";
import { getMailtoHref, getTelHref, getWhatsAppHref } from "@/lib/settings/contact";

const groups = [
  {
    title: "Explore",
    items: [
      ["Search HouseLink properties", "/search"],
      ["Rent in Harare", "/rent/harare"],
      ["Rooms in Avondale", "/rooms/avondale"],
      ["Buy in Bulawayo", "/property-for-sale/bulawayo"],
      ["Roommate matching", "/roommates"],
    ],
  },
  {
    title: "Services",
    items: [
      ["Property management", "/property-management"],
      ["Compare homes", "/compare"],
      ["Calculators", "/calculators"],
      ["Verification", "/verification"],
    ],
  },
  {
    title: "List & manage",
    items: [
      ["Create property listing", "/dashboard/landlord/new"],
      ["Landlord dashboard", "/dashboard/landlord"],
      ["Become an agent", "/become-agent"],
      ["Agent academy", "/academy"],
    ],
  },
  {
    title: "Account",
    items: [
      ["Sign in", "/auth"],
      ["Saved homes", "/saved"],
      ["My enquiries", "/enquiries"],
      ["Messages", "/messages"],
      ["Payments", "/payments"],
    ],
  },
  {
    title: "Support",
    items: [
      ["Contact", "/contact"],
      ["Safety centre", "/safety"],
      ["Report listing", "/report-listing"],
      ["Maintenance", "/maintenance"],
    ],
  },
  {
    title: "Company",
    items: [
      ["About", "/about"],
      ["Careers", "/careers"],
      ["Terms", "/terms"],
      ["Privacy", "/privacy"],
    ],
  },
];

const shareLinks = [
  ["Facebook", "https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fwww.houselink.co.zw"],
  ["LinkedIn", "https://www.linkedin.com/shareArticle?mini=true&url=https%3A%2F%2Fwww.houselink.co.zw"],
  [
    "WhatsApp",
    "https://wa.me/?text=Find%20verified%20property%20on%20HouseLink%20Zimbabwe%3A%20https%3A%2F%2Fwww.houselink.co.zw",
  ],
] as const;

function internalRel(href: string) {
  return href.includes("?") ? "nofollow" : undefined;
}

export function SiteFooter() {
  const { config } = usePlatformConfig();
  const contact = config?.contact ?? null;
  const supportEmail = contact?.supportEmail?.trim() ?? "";
  const phoneNumber = contact?.phoneNumber?.trim() ?? "";
  const phoneLabel = contact?.phoneLabel?.trim() || phoneNumber;
  const whatsappNumber = contact?.whatsappNumber?.trim() ?? "";
  const whatsappLabel = contact?.whatsappLabel?.trim() || whatsappNumber;

  return (
    <footer className="relative border-t border-slate-800 bg-ink text-white">
      <div className="section-divider absolute inset-x-0 top-0 opacity-60" />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]">
          <div className="max-w-xl">
            <div className="flex items-center">
              <HouseLinkBrand variant="footer" />
            </div>

            <p className="mt-4 max-w-lg text-sm leading-7 text-slate-300">
              Find your next home with confidence through verified listings, clear comparison tools, and
              Zimbabwe-focused search.
            </p>

            {contact && (supportEmail || phoneNumber || whatsappNumber) && (
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2.5 text-sm text-slate-300">
                {supportEmail && (
                  <a
                    href={getMailtoHref(supportEmail)}
                    className="inline-flex items-center gap-2 transition hover:text-emerald-300"
                  >
                    <Mail className="size-4" />
                    {supportEmail}
                  </a>
                )}
                {phoneNumber && (
                  <a
                    href={getTelHref(contact)}
                    className="inline-flex items-center gap-2 transition hover:text-emerald-300"
                  >
                    <Phone className="size-4" />
                    {phoneLabel}
                  </a>
                )}
                {whatsappNumber && (
                  <a
                    href={getWhatsAppHref(contact)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 transition hover:text-emerald-300"
                  >
                    <MessageCircle className="size-4" />
                    WhatsApp {whatsappLabel}
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5 lg:justify-self-end">
            <p className="text-sm font-semibold text-white">Ready to move?</p>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
              Add a listing, compare homes, or contact support from one place.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/dashboard/landlord/new"
                className="hover-lift inline-flex h-11 items-center justify-center rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-500"
              >
                Submit your property listing
              </Link>
              <Link
                href="/contact"
                className="inline-flex h-11 items-center justify-center rounded-lg border border-white/10 px-4 text-sm font-semibold text-slate-200 transition hover:border-emerald-300/50 hover:text-emerald-300"
              >
                Contact HouseLink support
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-8">
          <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {groups.map((group) => (
              <div key={group.title} className="min-w-0">
                <p className="text-sm font-semibold tracking-wide text-white">{group.title}</p>
                <div className="mt-4 grid gap-2.5 text-sm text-slate-400">
                  {group.items.map(([label, href]) => (
                    <Link
                      key={label}
                      href={href}
                      rel={internalRel(href)}
                      className="transition hover:translate-x-0.5 hover:text-emerald-300"
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Share HouseLink</p>
            <div className="flex flex-wrap gap-2">
              {shareLinks.map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-emerald-300/50 hover:text-emerald-300"
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-slate-500 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <p>&copy; {new Date().getFullYear()} HouseLink Zimbabwe. Verified property marketplace.</p>
          <p>houselink.co.zw</p>
        </div>
      </div>
    </footer>
  );
}
