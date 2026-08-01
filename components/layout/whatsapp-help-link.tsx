"use client";

import { MessageCircle } from "lucide-react";
import type { ReactNode } from "react";
import { trackWhatsAppClick } from "@/lib/analytics/whatsapp-client";
import { usePlatformConfig } from "@/components/providers/platform-config-provider";
import {
  getContextualWhatsAppHref,
  type WhatsAppHelpContext,
} from "@/lib/settings/contact";
import { cn } from "@/lib/utils";

type WhatsAppHelpLinkProps = {
  context: WhatsAppHelpContext;
  className?: string;
  children?: ReactNode;
  /** When true, render nothing if no WhatsApp number is configured. */
  hideIfUnavailable?: boolean;
};

/** Shared wa.me help link with click attribution. */
export function WhatsAppHelpLink({
  context,
  className,
  children,
  hideIfUnavailable = true,
}: WhatsAppHelpLinkProps) {
  const { config } = usePlatformConfig();
  const contact = config?.contact;
  if (!contact) return hideIfUnavailable ? null : null;
  const href = getContextualWhatsAppHref(contact, {
    ...context,
    pathname: context.pathname || (typeof window !== "undefined" ? window.location.pathname : undefined),
  });
  if (!href) return hideIfUnavailable ? null : null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() =>
        trackWhatsAppClick(context.source, {
          lane: context.lane,
          orderNumber: context.orderNumber,
          productTitle: context.productTitle,
          listingTitle: context.listingTitle,
        })
      }
      className={cn(className)}
    >
      {children ?? (
        <>
          <MessageCircle className="size-4" />
          WhatsApp help
        </>
      )}
    </a>
  );
}
