import Link from "next/link";
import { cn } from "@/lib/utils";
import { HouseLinkIcon, HL_GREEN, HL_NAVY } from "@/components/brand/houselink-icon";

export { HouseLinkIcon, HL_GREEN, HL_NAVY, HOUSELINK_ICON_SRC } from "@/components/brand/houselink-icon";

export const HOUSELINK_FULL_LOCKUP_SRC = "/brand/houselink-full-lockup.png";

type BrandVariant = "nav" | "header" | "footer" | "auth" | "icon";

type HouseLinkBrandProps = {
  className?: string;
  variant?: BrandVariant;
  iconOnly?: boolean;
};

const brandFont = "system-ui, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif";

const iconSizes: Record<BrandVariant, string> = {
  nav: "h-10 w-10 md:h-12 md:w-12",
  header: "h-10 w-10 md:h-12 md:w-12",
  footer: "h-14 w-14 sm:h-16 sm:w-16",
  auth: "h-[4.5rem] w-[4.5rem] sm:h-20 sm:w-20",
  icon: "h-10 w-10",
};

/** Nav wordmark: House (navy) + Link (green) */
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
        House
      </span>
      <span style={{ color: HL_GREEN }} className="dark:text-emerald-400">
        Link
      </span>
    </span>
  );
}

/** Icon + HouseLink — original nav lockup, sized for visibility */
function NavLockup({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 md:gap-3", className)}>
      <span className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/95 p-1 shadow-[0_2px_14px_rgba(0,0,0,0.14)] ring-1 ring-slate-200/80 dark:ring-white/15 md:h-14 md:w-14">
        <HouseLinkIcon className={iconSizes.nav} title="HouseLink" />
      </span>
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
      <HouseLinkIcon
        className="h-12 w-12 scale-[1.12] object-contain sm:h-14 sm:w-14"
        title="HouseLink"
      />
    </span>
  );
}

function FullWordmark({ variant }: { variant: "footer" | "auth" }) {
  const onDark = variant === "footer";
  const isAuth = variant === "auth";

  return (
    <span className={cn("flex min-w-0 flex-col justify-center", isAuth && "w-[13rem] sm:w-[14.15rem]")}>
      <span
        className={cn(
          "font-extrabold leading-none tracking-[-0.015em]",
          isAuth ? "text-[2rem] sm:text-[2.2rem]" : "text-[1.75rem] sm:text-[2rem]",
          onDark ? "text-white" : "text-[#1a3560] dark:text-slate-100",
        )}
        style={{ fontFamily: brandFont }}
      >
        <span style={{ color: onDark ? undefined : HL_NAVY }} className={onDark ? "text-white" : ""}>
          House
        </span>
        <span style={{ color: HL_GREEN }}>Link</span>
      </span>
      <span
        className={cn(
          "flex items-center font-semibold uppercase",
          isAuth
            ? "mt-2 w-full justify-between text-[9px] tracking-[0.4em] sm:text-[10px]"
            : "mt-1.5 gap-2 text-[10px] tracking-[0.24em] sm:text-xs",
          onDark ? "text-slate-300" : "text-[#1a3560]/85 dark:text-slate-400",
        )}
      >
        <span className={cn("h-px bg-[#22a54b]", isAuth ? "w-[2.15rem]" : "w-4")} aria-hidden />
        Zimbabwe
        <span className={cn("h-px bg-[#22a54b]", isAuth ? "w-[2.15rem]" : "w-4")} aria-hidden />
      </span>
      {variant === "auth" && (
        <span className="mt-2.5 block w-full whitespace-nowrap text-[12px] font-medium leading-none text-[#1a3560]/75 dark:text-slate-400 sm:text-[13px]">
          Find Your Next Home with Confidence
        </span>
      )}
    </span>
  );
}

export function HouseLinkBrand({ className, variant = "nav", iconOnly = false }: HouseLinkBrandProps) {
  if (iconOnly) {
    return <HouseLinkIcon className={cn(iconSizes[variant], className)} title="HouseLink" />;
  }

  const isNav = variant === "nav" || variant === "header";

  if (isNav) {
    return (
      <span data-brand="houselink-nav" className={cn("inline-flex shrink-0 items-center", className)}>
        <NavLockup />
      </span>
    );
  }

  if (variant === "footer") {
    return (
      <span
        data-brand="houselink-footer"
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
      data-brand="houselink-full"
      className={cn("inline-flex shrink-0 items-center gap-3 sm:gap-4", className)}
    >
      <HouseLinkIcon className={iconSizes[variant]} title="HouseLink" />
      <span className="h-[5.8rem] w-px shrink-0 bg-[#1a3560]/20 dark:bg-slate-600 sm:h-[6.2rem]" aria-hidden />
      <FullWordmark variant="auth" />
    </span>
  );
}

export function HouseLinkLogoLink({
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
      aria-label="HouseLink Zimbabwe — home"
    >
      {isNav ? (
        <>
          <HouseLinkBrand variant="nav" />
          <span className="sr-only">HouseLink Zimbabwe</span>
        </>
      ) : (
        <HouseLinkBrand variant={variant} />
      )}
    </Link>
  );
}

/** @deprecated Use HouseLinkBrand */
export function HouseLinkLogo({
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
  return <HouseLinkBrand className={className} variant={mapped} />;
}
