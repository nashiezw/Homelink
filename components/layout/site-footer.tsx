"use client";

import { Mail, MessageCircle, Phone } from "lucide-react";
import Link from "next/link";
import { HomeLinkBrand } from "@/components/brand/homelink-logo";
import { usePlatformConfig } from "@/components/providers/platform-config-provider";
import { getMailtoHref, getTelHref, getWhatsAppHref } from "@/lib/settings/contact";

const groups = [
  {
    title: "Marketplace",
    items: [
      ["Rent rooms", "/search?intent=rent&type=room"],
      ["Buy property", "/search?intent=buy"],
      ["Commercial property", "/search?type=commercial"],
      ["Holiday stays", "/search?type=holiday_home"],
      ["Development land", "/search?type=land"],
      ["Roommate matching", "/roommates"],
      ["Compare", "/compare"],
      ["Property calculators", "/calculators"],
    ],
  },
  {
    title: "Trust",
    items: [
      ["Verification", "/verification"],
      ["Report listing", "/report-listing"],
      ["Safety centre", "/safety"],
      ["Reviews", "/search?verifiedOnly=true"],
      ["Saved alerts", "/saved"],
      ["My enquiries", "/enquiries"],
    ],
  },
  {
    title: "Agents",
    items: [
      ["Become an Agent", "/become-agent"],
      ["Agent dashboard", "/dashboard/agent"],
      ["Apply now", "/become-agent/apply"],
    ],
  },
  {
    title: "Company",
    items: [
      ["About", "/about"],
      ["Careers", "/careers"],
      ["Contact", "/contact"],
      ["Terms", "/terms"],
      ["Privacy", "/privacy"],
      ["Messages", "/messages"],
      ["Enquiry inbox", "/enquiries"],
    ],
  },
];

const shareLinks = [
  ["Facebook", "https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fhomelinkzim.co.zw"],
  ["LinkedIn", "https://www.linkedin.com/shareArticle?mini=true&url=https%3A%2F%2Fhomelinkzim.co.zw"],
  ["WhatsApp", "https://wa.me/?text=Find%20verified%20property%20on%20HomeLink%20Zimbabwe%3A%20https%3A%2F%2Fhomelinkzim.co.zw"],
] as const;

function internalRel(href: string) {
  return href.includes("?") ? "nofollow" : undefined;
}

export function SiteFooter() {
  const { config } = usePlatformConfig();
  const contact = config?.contact;

  return (
    <footer className="relative border-t border-slate-800 bg-ink text-white">
      <div className="section-divider absolute inset-x-0 top-0 opacity-60" />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_2fr] lg:px-8">
        <div>
          <div className="flex items-center">
            <HomeLinkBrand variant="footer" />
          </div>
          <p className="mt-4 max-w-sm text-sm leading-7 text-slate-300">
            Find your next home with confidence through verified listings,
            clear comparison tools, and Zimbabwe-focused search.
          </p>
          {contact && (
            <div className="mt-5 grid gap-2 text-sm text-slate-300">
              <a href={getMailtoHref(contact.supportEmail)} className="inline-flex items-center gap-2 transition hover:text-emerald-300">
                <Mail className="size-4" />
                {contact.supportEmail}
              </a>
              <a href={getTelHref(contact)} className="inline-flex items-center gap-2 transition hover:text-emerald-300">
                <Phone className="size-4" />
                {contact.phoneLabel || contact.phoneNumber}
              </a>
              <a href={getWhatsAppHref(contact)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 transition hover:text-emerald-300">
                <MessageCircle className="size-4" />
                WhatsApp {contact.whatsappLabel || contact.whatsappNumber}
              </a>
            </div>
          )}
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Share HomeLink</p>
            <div className="mt-2 flex flex-wrap gap-2">
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
          <Link
            href="/dashboard/landlord/new"
            className="hover-lift mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-500"
          >
            List your property
          </Link>
        </div>
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          {groups.map((group) => (
            <div key={group.title}>
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
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} HomeLink Zimbabwe. Verified property marketplace.
      </div>
    </footer>
  );
}
