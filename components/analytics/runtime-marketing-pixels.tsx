"use client";

import { useEffect } from "react";
import { usePlatformConfig } from "@/components/providers/platform-config-provider";
import { normaliseGoogleTagId } from "@/lib/integrations/google-tag";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

function normaliseMetaPixelId(value?: string | null) {
  const id = String(value || "").replace(/\D/g, "");
  return /^\d{6,32}$/.test(id) ? id : "";
}

function appendScriptOnce(id: string, src: string) {
  if (document.getElementById(id)) return;
  const script = document.createElement("script");
  script.id = id;
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

function hasScriptSrc(needle: string) {
  return Array.from(document.scripts).some((script) => script.src.includes(needle));
}

function installGoogleTag(tagId: string) {
  if (document.documentElement.dataset.houselinkGoogleTagId === tagId) return;
  if (hasScriptSrc(`googletagmanager.com/gtag/js?id=${encodeURIComponent(tagId)}`) && window.gtag) {
    document.documentElement.dataset.houselinkGoogleTagId = tagId;
    return;
  }

  appendScriptOnce("houselink-google-tag-runtime-src", `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(tagId)}`);

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", tagId);
  document.documentElement.dataset.houselinkGoogleTagId = tagId;
}

function installMetaPixel(pixelId: string) {
  if (document.documentElement.dataset.houselinkMetaPixelId === pixelId) return;
  if (document.getElementById("houselink-meta-pixel") && window.fbq) {
    document.documentElement.dataset.houselinkMetaPixelId = pixelId;
    return;
  }

  if (!window.fbq) {
    type MetaPixelQueue = ((...args: unknown[]) => void) & {
      callMethod?: (...args: unknown[]) => void;
      queue: unknown[];
      push: unknown[];
      loaded: boolean;
      version: string;
    };
    const fbq = ((...args: unknown[]) => {
      if (fbq.callMethod) {
        fbq.callMethod(...args);
      } else {
        fbq.queue.push(args);
      }
    }) as MetaPixelQueue;
    fbq.push = [];
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = [];
    window.fbq = fbq;
    window._fbq = fbq;
    appendScriptOnce("houselink-meta-pixel-runtime-src", "https://connect.facebook.net/en_US/fbevents.js");
  }

  window.fbq?.("init", pixelId);
  window.fbq?.("track", "PageView");
  document.documentElement.dataset.houselinkMetaPixelId = pixelId;
}

export function RuntimeMarketingPixels() {
  const { config } = usePlatformConfig();

  useEffect(() => {
    const integrations = config?.integrations;
    const googleTagId = normaliseGoogleTagId(integrations?.analyticsId);
    const metaPixelId = normaliseMetaPixelId(integrations?.metaPixelId);

    if (googleTagId) installGoogleTag(googleTagId);
    if (metaPixelId) installMetaPixel(metaPixelId);
  }, [config]);

  return null;
}
