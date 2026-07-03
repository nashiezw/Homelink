import { Clock3, Mail, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { getMailtoHref, getTelHref, getWhatsAppHref } from "@/lib/settings/contact";
import { getRuntimePlatformSettings } from "@/lib/settings/runtime";

const paths = [
  ["Property owners", "Request management support", "/property-management"],
  ["Landlords", "Manage listings and enquiries", "/dashboard/landlord"],
  ["Seekers", "Browse verified homes", "/search?intent=rent"],
  ["Roommates", "Find rooms and compatible people", "/roommates"],
];

export default function ContactPage() {
  const { contact } = getRuntimePlatformSettings();
  const contactCards = [
    {
      title: "WhatsApp support",
      detail: "Fast help for listing questions, property management, and account access.",
      href: getWhatsAppHref(contact),
      label: contact.whatsappLabel || "Chat on WhatsApp",
      icon: MessageCircle,
    },
    {
      title: "Phone support",
      detail: "Speak to the HomeLink team when an enquiry needs a human voice.",
      href: getTelHref(contact),
      label: contact.phoneLabel || contact.phoneNumber,
      icon: Phone,
    },
    {
      title: "Email desk",
      detail: "Best for documents, verification queries, and partnership requests.",
      href: getMailtoHref(contact.supportEmail),
      label: contact.supportEmail,
      icon: Mail,
    },
  ];

  return (
    <PageShell
      eyebrow="Contact"
      title="Get the right HomeLink help without waiting in the wrong queue."
      description="Reach us for listing support, property management, verification, account access, and marketplace safety."
      highlights={[
        { value: "24h", label: "target response" },
        { value: "4", label: "support paths" },
        { value: "100%", label: "human escalation" },
      ]}
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {contactCards.map(({ title, detail, href, label, icon: Icon }) => (
          <a
            key={title}
            href={href}
            target={href.startsWith("http") ? "_blank" : undefined}
            rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
            className="premium-card group rounded-lg p-6 transition hover:-translate-y-1 hover:border-emerald-300"
          >
            <span className="flex size-12 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-700 group-hover:text-white">
              <Icon className="size-6" aria-hidden="true" />
            </span>
            <h2 className="mt-5 font-semibold text-ink dark:text-white">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{detail}</p>
            <p className="mt-5 text-sm font-semibold text-emerald-700 dark:text-emerald-300">{label}</p>
          </a>
        ))}
      </div>

      <section className="mt-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="surface-panel rounded-lg p-6">
          <Clock3 className="size-7 text-emerald-700" aria-hidden="true" />
          <h2 className="mt-4 text-2xl font-semibold text-ink dark:text-white">Support hours and priority</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {contact.supportHours}
          </p>
          {contact.officeAddress && (
            <p className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-200">{contact.officeAddress}</p>
          )}
          <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
            <ShieldCheck className="mb-2 size-5" aria-hidden="true" />
            Never send deposits before verifying the listing, landlord, and viewing arrangement.
          </div>
        </aside>

        <div className="grid gap-3 sm:grid-cols-2">
          {paths.map(([audience, action, href]) => (
            <Link
              key={audience}
              href={href}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
            >
              <p className="text-sm font-semibold uppercase text-emerald-700 dark:text-emerald-300">{audience}</p>
              <p className="mt-2 font-semibold text-ink dark:text-white">{action}</p>
            </Link>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
