import { getHydratedPublicPlatformConfig } from "@/lib/settings/runtime";

function normaliseGoogleAnalyticsId(value?: string | null) {
  const id = String(value || "").trim().toUpperCase();
  return /^G-[A-Z0-9-]+$/.test(id) ? id : "";
}

function normaliseMetaPixelId(value?: string | null) {
  const id = String(value || "").replace(/\D/g, "");
  return /^\d{6,32}$/.test(id) ? id : "";
}

export async function MarketingPixelScripts() {
  const config = await getHydratedPublicPlatformConfig();
  const googleAnalyticsId = normaliseGoogleAnalyticsId(config.integrations.analyticsId);
  const metaPixelId = normaliseMetaPixelId(config.integrations.metaPixelId);

  if (!googleAnalyticsId && !metaPixelId) return null;

  return (
    <>
      {googleAnalyticsId ? (
        <>
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`} />
          <script
            id="houselink-ga-init"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${googleAnalyticsId}');
              `.replace(/</g, "\\u003c"),
            }}
          />
        </>
      ) : null}

      {metaPixelId ? (
        <>
          <script
            id="houselink-meta-pixel"
            dangerouslySetInnerHTML={{
              __html: `
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${metaPixelId}');
                fbq('track', 'PageView');
              `.replace(/</g, "\\u003c"),
            }}
          />
        </>
      ) : null}
    </>
  );
}

export async function MarketingPixelNoScript() {
  const config = await getHydratedPublicPlatformConfig();
  const metaPixelId = normaliseMetaPixelId(config.integrations.metaPixelId);

  if (!metaPixelId) return null;

  return (
    <noscript>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        height="1"
        width="1"
        style={{ display: "none" }}
        alt=""
        src={`https://www.facebook.com/tr?id=${metaPixelId}&ev=PageView&noscript=1`}
      />
    </noscript>
  );
}
