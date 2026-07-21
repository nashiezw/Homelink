"use client";

import { ArrowRight, Mail, MessageCircle, Phone, PlusCircle } from "lucide-react";
import Link from "next/link";
import { HouseLinkBrand } from "@/components/brand/houselink-logo";
import { usePlatformConfig } from "@/components/providers/platform-config-provider";
import { getMailtoHref, getTelHref, getWhatsAppHref } from "@/lib/settings/contact";

const groups = [
  {
    title: "Explore",
    items: [
      ["Search HouseLink properties", "/search"],
      ["Send property request", "/property-request"],
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

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="grid items-start gap-6 sm:gap-8 lg:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]">
          <div className="min-w-0 max-w-xl">
            <div className="flex min-w-0 items-center">
              <HouseLinkBrand variant="footer" />
            </div>

            <p className="mt-4 max-w-lg text-sm leading-6 text-slate-300 sm:leading-7">
              Find your next home with confidence through verified listings, clear comparison tools, and
              Zimbabwe-focused search.
            </p>

            {contact && (supportEmail || phoneNumber || whatsappNumber) && (
              <div className="mt-5 grid min-w-0 gap-2.5 text-sm text-slate-300 sm:flex sm:flex-wrap sm:gap-x-5">
                {supportEmail && (
                  <a
                    href={getMailtoHref(supportEmail)}
                    className="inline-flex min-w-0 items-center gap-2 break-all transition hover:text-emerald-300"
                  >
                    <Mail className="size-4 shrink-0" />
                    <span className="min-w-0">{supportEmail}</span>
                  </a>
                )}
                {phoneNumber && (
                  <a
                    href={getTelHref(contact)}
                    className="inline-flex min-w-0 items-center gap-2 transition hover:text-emerald-300"
                  >
                    <Phone className="size-4 shrink-0" />
                    <span className="min-w-0 break-words">{phoneLabel}</span>
                  </a>
                )}
                {whatsappNumber && (
                  <a
                    href={getWhatsAppHref(contact)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-w-0 items-center gap-2 transition hover:text-emerald-300"
                  >
                    <MessageCircle className="size-4 shrink-0" />
                    <span className="min-w-0 break-words">WhatsApp {whatsappLabel}</span>
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.035] p-4 shadow-lg shadow-black/10 sm:p-5 lg:max-w-xl lg:justify-self-end">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">Tell us what you need</p>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
                  Send your budget, area, and must-haves so HouseLink can match you with the right place.
                </p>
              </div>
              <Link
                href="/property-request"
                className="hover-lift inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-white px-5 py-2.5 text-center text-sm font-semibold text-emerald-800 shadow-lg shadow-black/20 transition hover:bg-emerald-50 sm:w-auto sm:min-w-44"
              >
                Property request
                <ArrowRight className="size-4" />
              </Link>
            </div>

            <div className="mt-4 grid gap-2 border-t border-white/10 pt-4 sm:grid-cols-2">
              <Link
                href="/dashboard/landlord/new"
                className="group inline-flex min-h-12 items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left transition hover:border-emerald-300/50 hover:bg-white/[0.07]"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-md bg-emerald-500/15 text-emerald-300 transition group-hover:bg-emerald-400/20">
                  <PlusCircle className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold leading-5 text-white">List a property</span>
                  <span className="block text-xs leading-5 text-slate-500">For owners and agents</span>
                </span>
              </Link>
              <Link
                href="/contact"
                className="group inline-flex min-h-12 items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left transition hover:border-sky-300/50 hover:bg-white/[0.07]"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-md bg-sky-500/15 text-sky-300 transition group-hover:bg-sky-400/20">
                  <MessageCircle className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold leading-5 text-white">Contact support</span>
                  <span className="block text-xs leading-5 text-slate-500">Talk to HouseLink</span>
                </span>
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-6 sm:mt-10 sm:pt-8">
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
                      className="break-words leading-5 transition hover:translate-x-0.5 hover:text-emerald-300"
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-7 flex flex-col gap-3 border-t border-white/10 pt-5 sm:mt-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Share HouseLink</p>
            <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
              {shareLinks.map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-white/10 px-3 py-1.5 text-center text-xs font-semibold text-slate-300 transition hover:border-emerald-300/50 hover:text-emerald-300"
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
          <p className="leading-5">&copy; {new Date().getFullYear()} HouseLink Zimbabwe. Verified property marketplace.</p>
          <p className="font-medium text-slate-400">houselink.co.zw</p>
        </div>
      </div>
    </footer>
  );
}
