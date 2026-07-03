import Link from "next/link";
import { cn } from "@/lib/utils";
import { HomeLinkIcon, HL_GREEN, HL_NAVY } from "@/components/brand/homelink-icon";

export { HomeLinkIcon, HL_GREEN, HL_NAVY, HOMELINK_ICON_SRC } from "@/components/brand/homelink-icon";

type BrandVariant = "nav" | "header" | "footer" | "auth" | "icon";

type HomeLinkBrandProps = {
  className?: string;
  variant?: BrandVariant;
  iconOnly?: boolean;
};

const brandFont = "system-ui, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif";

const iconSizes: Record<BrandVariant, string> = {
  nav: "h-14 w-14 md:h-16 md:w-16",
  header: "h-14 w-14 md:h-16 md:w-16",
  footer: "h-14 w-14 sm:h-16 sm:w-16",
  auth: "h-[4.5rem] w-[4.5rem] sm:h-20 sm:w-20",
  icon: "h-10 w-10",
};

/** Nav wordmark: Home (navy) + Link (green) */
function NavWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "whitespace-nowrap text-[1.625rem] font-extrabold leading-none tracking-[-0.02em] md:text-[1.875rem]",
        className,
      )}
      style={{ fontFamily: brandFont }}
    >
      <span style={{ color: HL_NAVY }} className="dark:text-slate-100">
        Home
      </span>
      <span style={{ color: HL_GREEN }} className="dark:text-emerald-400">
        Link
      </span>
    </span>
  );
}

/** Icon + HomeLink — original nav lockup, sized for visibility */
function NavLockup({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 md:gap-3", className)}>
      <HomeLinkIcon className={iconSizes.nav} title="HomeLink" />
      <NavWordmark />
    </span>
  );
}

/** Footer icon in a rounded badge — intentional tile on dark backgrounds */
function FooterIconMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/95 p-1.5 shadow-[0_2px_16px_rgba(0,0,0,0.2)] ring-1 ring-white/20",
        className,
      )}
    >
      <HomeLinkIcon
        className="h-12 w-12 scale-[1.12] object-contain sm:h-14 sm:w-14"
        title="HomeLink"
      />
    </span>
  );
}

function FullWordmark({ variant }: { variant: "footer" | "auth" }) {
  const onDark = variant === "footer";

  return (
    <span className="flex min-w-0 flex-col justify-center">
      <span
        className={cn(
          "text-[1.75rem] font-extrabold leading-none tracking-tight sm:text-[2rem]",
          onDark ? "text-white" : "text-[#1a3560] dark:text-slate-100",
        )}
        style={{ fontFamily: brandFont }}
      >
        <span style={{ color: onDark ? undefined : HL_NAVY }} className={onDark ? "text-white" : ""}>
          Home
        </span>
        <span style={{ color: HL_GREEN }}>Link</span>
      </span>
      <span
        className={cn(
          "mt-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] sm:text-xs",
          onDark ? "text-slate-300" : "text-[#1a3560]/85 dark:text-slate-400",
        )}
      >
        <span className="h-px w-4 bg-[#22a54b]" aria-hidden />
        Zimbabwe
        <span className="h-px w-4 bg-[#22a54b]" aria-hidden />
      </span>
      {variant === "auth" && (
        <span className="mt-2 text-sm font-medium text-[#1a3560]/75 dark:text-slate-400">
          Find Your Next Home with Confidence
        </span>
      )}
    </span>
  );
}

export function HomeLinkBrand({ className, variant = "nav", iconOnly = false }: HomeLinkBrandProps) {
  if (iconOnly) {
    return <HomeLinkIcon className={cn(iconSizes[variant], className)} title="HomeLink" />;
  }

  const isNav = variant === "nav" || variant === "header";

  if (isNav) {
    return (
      <span data-brand="homelink-nav" className={cn("inline-flex shrink-0 items-center", className)}>
        <NavLockup />
      </span>
    );
  }

  if (variant === "footer") {
    return (
      <span
        data-brand="homelink-footer"
        className={cn("inline-flex shrink-0 items-center gap-3 sm:gap-4", className)}
      >
        <FooterIconMark />
        <span className="w-px shrink-0 self-stretch bg-slate-600" aria-hidden />
        <FullWordmark variant="footer" />
      </span>
    );
  }

  return (
    <span
      data-brand="homelink-full"
      className={cn("inline-flex shrink-0 items-center gap-3 sm:gap-4", className)}
    >
      <HomeLinkIcon className={iconSizes[variant]} title="HomeLink" />
      <span className="w-px shrink-0 self-stretch bg-[#1a3560]/20 dark:bg-slate-600" aria-hidden />
      <FullWordmark variant="auth" />
    </span>
  );
}

export function HomeLinkLogoLink({
  className,
  variant = "nav",
  onClick,
}: {
  className?: string;
  variant?: BrandVariant;
  onClick?: () => void;
}) {
  const isNav = variant === "nav" || variant === "header";

  return (
    <Link
      href="/"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center rounded-[10px] py-1 outline-none transition-opacity duration-200 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-emerald-600/40 focus-visible:ring-offset-2",
        className,
      )}
      aria-label="HomeLink Zimbabwe — home"
    >
      {isNav ? (
        <>
          <HomeLinkBrand variant="nav" />
          <span className="sr-only">HomeLink Zimbabwe</span>
        </>
      ) : (
        <HomeLinkBrand variant={variant} />
      )}
    </Link>
  );
}

/** @deprecated Use HomeLinkBrand */
export function HomeLinkLogo({
  className,
  variant = "header",
}: {
  className?: string;
  variant?: "header" | "default" | "large";
  priority?: boolean;
  onDark?: boolean;
}) {
  const mapped: BrandVariant =
    variant === "large" ? "footer" : variant === "default" ? "auth" : "nav";
  return <HomeLinkBrand className={className} variant={mapped} />;
}
